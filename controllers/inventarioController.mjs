import { crearProductoCatalogo } from '../services/inventarioCatalogoService.mjs';
import { formularioDocumento } from './inventarioDocumentoController.mjs';
import { puedeCompletarIngreso } from '../services/inventarioDocumentoService.mjs';
import { ejecutarOperacion } from "../services/inventarioPersistencia.mjs";
import { obtenerBorrador, guardarBorrador, confirmarBorrador } from "../services/inventarioCrudService.mjs";
import { randomUUID, randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

import Configuracion from "../models/inventarioConfiguracion.mjs";

import {
  Producto,
  Lugar,
  Equipo,
  Movimiento,
  Archivo,
} from "../models/inventario.mjs";

import {
  crearMovimiento,
  agregarRespaldo,
  adjuntarArchivos,
  exigir,
  respaldo,
  crearLugarInventario,
  marcarDepositoPrincipal,
} from "../services/inventarioService.mjs";

import {
  tiposMovimiento,
  idValido,
  consultarGeneral,
  consultarLugares,
  consultarUbicacion,
  consultarMovimientos,
  consultarEquipos,
  consultarEquipo,
} from "../services/inventarioConsultasService.mjs";

const hoy = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());

export function mostrar(
  req,
  res,
  vista,
  titulo,
  seccion,
  contenido = {}
) {
  req.session.invCsrf ||=
    randomBytes(32).toString("hex");

  const aviso = req.session.invAviso || null;
  const guardado = req.session.invDatos;

  const datos =
    guardado?.ruta === req.path
      ? guardado.body
      : (contenido.datosBorrador || {});

  delete req.session.invAviso;
  delete req.session.invDatos;

  res.render("inventarioViews/panel", {
    title: `${titulo} · Inventario`,
    titulo,
    seccion,
    vista,
    permisos: req.invPermisos,
    csrf: req.session.invCsrf,
    clave: contenido.datosBorrador?.clave || randomUUID(),
    borradorId: "", borradorVersion: "", archivosBorrador: [],
    hoy: hoy(),
    aviso,
    datos,
    ...contenido,
  });
}

export async function dashboard(req, res) {
  mostrar(
    req,
    res,
    "dashboard",
    "Inventario general",
    "general",
    await consultarGeneral()
  );
}

export async function depositos(req, res) {
  mostrar(
    req,
    res,
    "lugares",
    "Depósitos",
    "depositos",
    {
      tipoLugar: "deposito",
      lugares: await consultarLugares("deposito"),
    }
  );
}

export async function destinatarios(req, res) {
  mostrar(
    req,
    res,
    "lugares",
    "Destinatarios",
    "destinatarios",
    {
      tipoLugar: "destino",
      lugares: await consultarLugares("destino"),
    }
  );
}

export async function ubicacion(req, res) {
  const contenido = await consultarUbicacion(
    req.params.id
  );

  mostrar(
    req,
    res,
    "ubicacion",
    contenido.lugar.nombre,
    contenido.lugar.tipo === "deposito"
      ? "depositos"
      : "destinatarios",
    contenido
  );
}

export async function equipos(req, res) {
  mostrar(
    req,
    res,
    "equipos",
    "Equipos individuales",
    "equipos",
    await consultarEquipos(req)
  );
}

export async function equipo(req, res) {
  const contenido = await consultarEquipo(req);

  mostrar(
    req,
    res,
    "equipo",
    `Equipo ${contenido.equipo.serie}`,
    "equipos",
    contenido
  );
}

export const listado = (tipo) => async (req, res) => {
  const config = tiposMovimiento[tipo];

  mostrar(
    req,
    res,
    "movimientos",
    config.titulo,
    config.ruta,
    {
      tipo,
      config,
      seleccion: false,
      ...await consultarMovimientos(req, tipo),
    }
  );
};

export async function seleccionarDevolucion(
  req,
  res
) {
  mostrar(
    req,
    res,
    "movimientos",
    "Elegir asignación para devolver",
    "devoluciones",
    {
      tipo: "asignacion",
      config: tiposMovimiento.devolucion,
      seleccion: true,
      ...await consultarMovimientos(
        req,
        "asignacion",
        true
      ),
    }
  );
}

export const nuevoMovimiento =
  (tipo) => async (req, res) => {
    const config = tiposMovimiento[tipo];
    if (tipo === 'ingreso' && !req.query.borrador) return formularioDocumento(req, res);
    const borrador = req.query.borrador ? await obtenerBorrador(req.query.borrador) : null;
    exigir(!borrador || (borrador.tipo === tipo && (req.invPermisos.editar || puedeCompletarIngreso(borrador, req.session.usuario, req.invPermisos))), 'Borrador inválido o sin permiso.');
    if (tipo === 'ingreso') respaldo(borrador.datos);

    const [
      productos,
      lugares,
      configuracion,
    ] = await Promise.all([
      Producto.find({ activo: { $ne: false } })
        .sort({ nombre: 1 })
        .lean(),

      Lugar.find({ activo: { $ne: false } })
        .sort({ nombre: 1 })
        .lean(),

      Configuracion.findById("general").lean(),
    ]);

    const archivosBorrador = borrador ? await Archivo.find({ movimiento: borrador._id }).select('-datos').lean() : [];
    mostrar(
      req,
      res,
      "formularioMovimiento",
      config.singular,
      config.ruta,
      {
        tipo,
        config,
        productos,
        lugares,
        datosBorrador: borrador?.datos, borradorId: borrador?._id || '', borradorVersion: borrador?.version ?? '', archivosBorrador,
        principal: String(
          configuracion?.depositoPrincipal || ""
        ),
      }
    );
  };

export async function formularioDevolucion(
  req,
  res
) {
  const mov = await Movimiento.findById(
    idValido(req.params.id)
  ).lean();

  exigir(
    mov?.tipo === "asignacion",
    "Asignación inexistente."
  );

  exigir(mov.estado !== 'anulado', 'La asignación está anulada.');
  const borrador = req.query.borrador ? await obtenerBorrador(req.query.borrador) : null;
  exigir(!borrador || (borrador.tipo === 'devolucion' && String(borrador.datos.original) === String(mov._id) && req.invPermisos.editar), 'Borrador inválido o sin permiso.');
  const archivosBorrador = borrador ? await Archivo.find({ movimiento: borrador._id }).select('-datos').lean() : [];
  const pendientes = mov.items.filter(
    (item) => item.cantidad > item.devuelto
  );

  const [
    depositos,
    equiposPendientes,
    configuracion,
  ] = await Promise.all([
    Lugar.find({ tipo: "deposito", activo: { $ne: false } })
      .sort({ nombre: 1 })
      .lean(),

    Equipo.find({ asignacion: mov._id })
      .select("producto serie")
      .lean(),

    Configuracion.findById("general").lean(),
  ]);

  mostrar(
    req,
    res,
    "formularioDevolucion",
    `Devolver asignación N.º ${mov.numero}`,
    "devoluciones",
    {
      mov,
      pendientes,
      depositos,
      equiposPendientes,
      datosBorrador: borrador?.datos, borradorId: borrador?._id || '', borradorVersion: borrador?.version ?? '', archivosBorrador,
      principal: String(
        configuracion?.depositoPrincipal || ""
      ),
    }
  );
}

export async function productos(req, res) {
  mostrar(
    req,
    res,
    "productos",
    "Productos",
    "productos",
    {
      productos: await Producto.find()
        .sort({ nombre: 1 })
        .lean(),
    }
  );
}

export const formularioCatalogo =
  (tipo) => (req, res) => {
    const titulo = {
      producto: "Nuevo producto",
      deposito: "Nuevo depósito",
      destino: "Nuevo destinatario",
    }[tipo];

    const seccion = {
      producto: "productos",
      deposito: "depositos",
      destino: "destinatarios",
    }[tipo];

    mostrar(
      req,
      res,
      "formularioCatalogo",
      titulo,
      seccion,
      { tipoCatalogo: tipo }
    );
  };

export async function catalogo(req, res) {
  const body = req.body;

  const seccion =
    body.catalogo === "producto"
      ? "productos"
      : body.tipoLugar === "deposito"
        ? "depositos"
        : "destinatarios";

  req.invVolver =
    `/inventario/${seccion}/nuevo`;

  await ejecutarOperacion(async () => {
  if (body.catalogo === "producto") {
    await crearProductoCatalogo(body);
  } else {
    exigir(
      body.catalogo === "lugar",
      "Catálogo inválido."
    );

    await crearLugarInventario({
      nombre: body.nombre,
      tipo: body.tipoLugar,
      direccion: body.direccion,
      responsable: body.responsable,
      dni: body.dni,
      principal: body.principal === "si",
    });
  }

  });

  req.session.invAviso = {
    ok: true,
    texto: "Registro creado.",
  };

  res.redirect(
    303,
    `/inventario/${seccion}`
  );
}

export async function principal(req, res) {
  req.invVolver = "/inventario/depositos";

  await marcarDepositoPrincipal(
    idValido(req.params.id)
  );

  req.session.invAviso = {
    ok: true,
    texto: "Depósito principal actualizado.",
  };

  res.redirect(303, "/inventario/depositos");
}

export async function registrar(req, res) {
  if (req.body.borradorId) {
    const b = await obtenerBorrador(req.body.borradorId);
    exigir(req.invPermisos.editar || puedeCompletarIngreso(b, req.session.usuario, req.invPermisos), 'No tenés permiso para editar este ingreso.');
  }
  if (req.body.tipo === 'ingreso') exigir(req.body.borradorId, 'Primero registrá el documento desde Ingresos → Nuevo ingreso.');
  if (req.body.accion === 'borrador') {
    const b = await guardarBorrador(req.body, req.session.usuario, req.files || []);
    req.session.invAviso = { ok: true, texto: 'Borrador guardado. No se modificaron existencias.' };
    return res.redirect(303, b.tipo === 'ingreso' ? `/inventario/ingresos/nuevo?borrador=${b._id}` : req.invPermisos.editar ? `/inventario/borradores/${b._id}/editar` : '/inventario/borradores');
  }
  const mov = req.body.borradorId
    ? await confirmarBorrador(req.body, req.session.usuario, req.files || [])
    : await crearMovimiento(req.body, req.session.usuario, req.files || []);
  res.redirect(303, `/inventario/movimientos/${mov._id}?nuevo=1`);
}

export async function documento(req, res) {
  await agregarRespaldo(
    req.params.id,
    req.body,
    req.files || []
  );

  res.redirect(
    303,
    `/inventario/movimientos/${req.params.id}`
  );
}

export async function adjuntar(req, res) {
  const mov = await Movimiento.findById(
    req.params.id
  )
    .select("tipo")
    .lean();

  exigir(mov, "Movimiento inexistente.");

  const accion = {
    ingreso: "ingresar",
    asignacion: "asignar",
    devolucion: "devolver",
    traspaso: "traspasar",
  }[mov.tipo];

  if (!req.invPermisos[accion]) {
    return res.status(403).send(
      "Sin permiso para adjuntar a este movimiento."
    );
  }

  await adjuntarArchivos(
    mov._id,
    req.files || []
  );

  res.redirect(
    303,
    `/inventario/movimientos/${mov._id}`
  );
}

export async function detalle(req, res) {
  const mov = await Movimiento.findById(
    req.params.id
  ).lean();

  exigir(mov, "Movimiento inexistente.");

  const archivos = await Archivo.find({
    movimiento: mov._id,
  })
    .select("-datos")
    .lean();

  const devoluciones =
    mov.tipo === "asignacion"
      ? await Movimiento.find({
          original: mov._id,
        })
          .sort({ numero: 1 })
          .select("numero fecha")
          .lean()
      : [];

  const original = mov.original
    ? await Movimiento.findById(mov.original)
        .select("numero")
        .lean()
    : null;

  req.session.invCsrf ||=
    randomBytes(32).toString("hex");

  const aviso = req.session.invAviso || null;
  delete req.session.invAviso;

  const datos = {
    aviso,
    mov,
    archivos,
    devoluciones,
    original,
    web: req.params.formato !== "pdf",
    csrf: req.session.invCsrf,
    clave: randomUUID(),
    hoy: hoy(),
    permisos: req.invPermisos,
    nuevo: req.query.nuevo === "1",

    logo: (
      await readFile(
        new URL(
          "../utils/logoBase64.html",
          import.meta.url
        ),
        "utf8"
      )
    ).trim(),
  };

  if (datos.web) {
    return res.render(
      "inventarioViews/comprobante",
      {
        ...datos,
        layout: false,
      }
    );
  }

  const [
    { default: ejs },
    { default: puppeteer },
  ] = await Promise.all([
    import("ejs"),
    import("puppeteer"),
  ]);

  const html = await ejs.renderFile(
    fileURLToPath(
      new URL(
        "../views/inventarioViews/comprobante.ejs",
        import.meta.url
      )
    ),
    datos
  );

  const browser = await puppeteer.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "load",
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "12mm",
        right: "12mm",
        bottom: "12mm",
        left: "12mm",
      },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition":
        `inline; filename="inventario-${mov.numero}.pdf"`,
    });

    res.send(Buffer.from(pdf));
  } finally {
    await browser.close();
  }
}

export async function archivo(req, res) {
  const adjunto = await Archivo.findById(
    req.params.id
  ).select("+datos");

  exigir(adjunto, "Archivo inexistente.");

  res.set({
    "Content-Type": adjunto.mime,
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition":
      `attachment; filename*=UTF-8''${
        encodeURIComponent(adjunto.nombre)
      }`,
  });

  res.send(Buffer.from(adjunto.datos));
}

export function errorInventario(
  err,
  req,
  res,
  next
) {
  if (res.headersSent) {
    return next(err);
  }

  console.error("Inventario:", err.message);

  let texto =
    [400, 503].includes(err.status)
      ? err.message
      : "No se pudo completar la operación.";

  if (err.code === 11000) {
    texto =
      "Ya existe un registro con ese código, nombre o serie.";
  }

  if (
    err.name === "ValidationError" ||
    err.name === "CastError"
  ) {
    texto =
      "Revisá los datos y las selecciones del formulario.";
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    texto =
      "Cada adjunto puede pesar hasta 10 MB.";
  }

  if (
    err.code === "LIMIT_FILE_COUNT" ||
    err.code === "LIMIT_UNEXPECTED_FILE"
  ) {
    texto =
      "Adjuntá hasta tres archivos por operación.";
  }

  if (req.method === "GET") {
    return res.status(err.status === 503 ? 503 : 400).send(texto);
  }

  let ruta = req.invVolver || "/inventario";
  const body = req.body || {};

  if (
    !req.invVolver &&
    body.tipo &&
    tiposMovimiento[body.tipo]
  ) {
    ruta =
      "/inventario/" +
      tiposMovimiento[body.tipo].ruta +
      "/nuevo";

    if (body.tipo === "devolucion") {
      ruta = /^[a-f0-9]{24}$/i.test(
        String(body.original || "")
      )
        ? `/inventario/asignaciones/${body.original}/devolucion`
        : "/inventario/devoluciones/nueva";
    }
  } else if (
    !req.invVolver &&
    /^[a-f0-9]{24}$/i.test(
      String(req.params.id || "")
    )
  ) {
    ruta =
      `/inventario/movimientos/${req.params.id}`;
  }

  if (body.borradorId && mongooseIdValido(body.borradorId) && ruta.includes('/nuevo')) ruta += '?borrador=' + body.borradorId;
  if (body.borradorId && mongooseIdValido(body.borradorId) && ruta.endsWith('/devolucion')) ruta += '?borrador=' + body.borradorId;
  req.session.invAviso = {
    ok: false,
    texto:
      `${texto} Si adjuntaste archivos, volvé a seleccionarlos.`,
  };

  req.session.invDatos = {
    ruta: ruta.split("?")[0].replace("/inventario", "") || "/",
    body,
  };

  res.redirect(303, ruta);
}
function mongooseIdValido(id) { return /^[a-f0-9]{24}$/i.test(String(id || "")); }
