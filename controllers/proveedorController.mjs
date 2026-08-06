import fs from "fs";
import path from "path";
import { crearProveedorService } from "../services/proveedorService.mjs";
import { obtenerSiguienteNumeroDeProveedor } from "../utils/obtenerSiguienteNumeroDeProveedor.mjs";
import { listarPlanesService } from "../services/planesService.mjs";
import Proveedor from "../models/proveedor.mjs";
import Pago from "../models/pago.mjs";
import MovimientoProveedor from "../models/movimientoProveedor.mjs";
import mongoose from "mongoose";
import { cargosPendientesPorProveedor } from "../services/cargosService.mjs";
import clock from "../utils/clock.mjs";
import puppeteer from "puppeteer";
import { cambioService } from "../services/cambioService.mjs";

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

function toBool(v) {
  if (Array.isArray(v)) {
    return v.some(
      (x) => x === true || x === "true" || x === "on" || x === "1" || x === 1
    );
  }
  return v === true || v === "true" || v === "on" || v === "1" || v === 1;
}

function leerLogoDataUriDesdeHtml() {
  try {
    const p = path.resolve(process.cwd(), "utils", "logoBase64.html");
    if (!fs.existsSync(p)) return null;
    const txt = fs.readFileSync(p, "utf8").trim();
    const m = txt.match(/<img[^>]*src=["']([^"']+)["']/i);
    return m && m[1] ? m[1] : txt.startsWith("data:") ? txt : null;
  } catch (e) {
    console.warn("No se pudo leer utils/logoBase64.html:", e?.message || e);
    return null;
  }
}

const ordenarPorNombrePlan = (arr) =>
  [...(arr || [])].sort((a, b) =>
    String(a?.nombre || "").localeCompare(String(b?.nombre || ""), "es", {
      sensitivity: "base",
      numeric: true,
    })
  );

// Arma "Nombre Apellido" o cae en email/guión
function nombreApellido(o) {
  if (!o) return "—";
  const nom = [o.nombre || "", o.apellido || ""].join(" ").trim();
  return nom || o.email || "—";
}

// 🔔 Helper de toasts (levanta y limpia mensajes de sesión o por query)
function popToasts(req) {
  const toastOk = (req.session && req.session.mensaje) || (req.query?.ok ? String(req.query.ok) : null);
  const toastErr = (req.session && req.session.error) || (req.query?.err ? String(req.query.err) : null);
  if (req.session) {
    delete req.session.mensaje;
    delete req.session.error;
  }
  return { toastOk, toastErr };
}

/* =========================================================
 * GET /proveedores/registrar
 * =======================================================*/
export async function mostrarFormularioProveedor(req, res) {
  try {
    const planes = ordenarPorNombrePlan(await listarPlanesService());
    res.render("proveedoresViews/registroProveedor", { datos: {}, planes });
  } catch (err) {
    console.error("Error al cargar formulario proveedor:", err);
    res.status(500).send("Error al cargar formulario proveedor");
  }
}

/* =========================================================
 * POST /proveedores/registrar
 * =======================================================*/
export async function crearProveedorController(req, res) {
  try {
    if (req.erroresValidacion) {
      const planes = ordenarPorNombrePlan(await listarPlanesService());
      return res.status(400).render("proveedoresViews/registroProveedor", {
        errores: req.erroresValidacion,
        datos: req.body,
        planes,
      });
    }

    const nuevoNumero = await obtenerSiguienteNumeroDeProveedor();

    const activo = Object.prototype.hasOwnProperty.call(req.body, "activo")
      ? toBool(req.body.activo)
      : true;

    const plan = req.body.plan || null;

    const nuevoProveedor = {
      numeroProveedor: nuevoNumero,
      nombreFantasia: (req.body.nombreFantasia || "").trim(),
      nombreReal: (req.body.nombreReal || "").trim(),
      cuit: (req.body.cuit || "").trim(),
      domicilio: (req.body.domicilio || "").trim(),
      domicilioFiscal: (req.body.domicilioFiscal || "").trim(),
      telefonoCelular: (req.body.telefonoCelular || "").trim(),
      telefonoFijo: (req.body.telefonoFijo || "").trim(),
      email: (req.body.email || "").trim(),
      cbu: (req.body.cbu || "").trim(),
      categoria: (req.body.categoria || "").trim(),
      condicionIva: (req.body.condicionIva || "").trim(),
      activo,
      plan,
    };

    await crearProveedorService(nuevoProveedor);
    req.session.mensaje = `Proveedor #${nuevoNumero} creado correctamente`;
    res.redirect("/proveedores");
  } catch (error) {
    console.error("Error al crear proveedor:", error);
    res.status(500).send("Error al crear proveedor");
  }
}

/* =========================================================
 * GET /proveedores
 * =======================================================*/
export async function listarProveedoresController(req, res) {
  try {
    const proveedores = await Proveedor.find()
      .populate("plan", "nombre importe activo")
      .lean();

    const [movAgg, pagosAgg] = await Promise.all([
      MovimientoProveedor.aggregate([
        {
          $project: {
            proveedor: 1,
            tipo: 1,
            imp: { $ifNull: ["$importe", 0] },
          },
        },
        {
          $group: {
            _id: "$proveedor",
            totalMovs: {
              $sum: {
                $cond: [
                  { $in: ["$tipo", ["cargo", "debito"]] },
                  "$imp",
                  {
                    $cond: [
                      { $eq: ["$tipo", "credito"] },
                      { $multiply: ["$imp", -1] },
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      ]),
      Pago.aggregate([
        {
          $group: {
            _id: "$proveedor",
            totalPagos: { $sum: { $ifNull: ["$importe", 0] } },
          },
        },
      ]),
    ]);

    const saldoMap = new Map();
    for (const r of movAgg) saldoMap.set(String(r._id), Number(r.totalMovs || 0));
    for (const r of pagosAgg) {
      const k = String(r._id);
      const prev = Number(saldoMap.get(k) || 0);
      saldoMap.set(k, prev - Number(r.totalPagos || 0));
    }

    const proveedoresConSaldo = proveedores.map((p) => ({
      ...p,
      saldoTotal: Number(saldoMap.get(String(p._id)) || 0),
    }));

    const { toastOk, toastErr } = popToasts(req);

    res.render("proveedoresViews/listadoProveedores", {
      proveedores: proveedoresConSaldo,
      toastOk,
      toastErr,
    });
  } catch (error) {
    console.error("Error al listar proveedores:", error);
    res.status(500).send("Error al listar proveedores");
  }
}

/* =========================================================
 * GET /proveedores/:id/ver
 * =======================================================*/
export async function verProveedorController(req, res) {
  try {
    const { id: proveedorId } = req.params;

    if (!mongoose.isValidObjectId(proveedorId)) {
      return res.status(400).send("ID de proveedor inválido");
    }

    const proveedor = await Proveedor.findById(proveedorId)
      .populate("plan", "nombre importe")
      .lean();

    if (!proveedor) {
      return res.status(404).send("Proveedor no encontrado");
    }

    const oid = new mongoose.Types.ObjectId(proveedorId);

    /*
     * Se obtienen:
     * - Cargos, notas de débito y notas de crédito por período.
     * - Total pagado por período.
     * - Fecha del último pago válido de cada período.
     *
     * Los pagos anulados no forman parte del estado de cuenta.
     */
    const [movAgg, pagosAgg] = await Promise.all([
      MovimientoProveedor.aggregate([
        {
          $match: {
            proveedor: oid,
          },
        },
        {
          $group: {
            _id: "$periodo",

            cargo: {
              $sum: {
                $cond: [
                  { $eq: ["$tipo", "cargo"] },
                  { $ifNull: ["$importe", 0] },
                  0,
                ],
              },
            },

            notaDebito: {
              $sum: {
                $cond: [
                  { $eq: ["$tipo", "debito"] },
                  { $ifNull: ["$importe", 0] },
                  0,
                ],
              },
            },

            notaCredito: {
              $sum: {
                $cond: [
                  { $eq: ["$tipo", "credito"] },
                  { $ifNull: ["$importe", 0] },
                  0,
                ],
              },
            },
          },
        },
        {
          $project: {
            _id: 0,
            periodo: "$_id",
            cargo: 1,
            notaDebito: 1,
            notaCredito: 1,
          },
        },
      ]),

      Pago.aggregate([
        {
          $match: {
            proveedor: oid,
            estado: { $ne: "anulado" },
          },
        },
        {
          $group: {
            _id: "$periodo",

            pagos: {
              $sum: {
                $ifNull: ["$importe", 0],
              },
            },

            fechaUltimoPago: {
              $max: {
                $ifNull: ["$fecha", "$createdAt"],
              },
            },

            cantidadPagos: {
              $sum: 1,
            },
          },
        },
        {
          $project: {
            _id: 0,
            periodo: "$_id",
            pagos: 1,
            fechaUltimoPago: 1,
            cantidadPagos: 1,
          },
        },
      ]),
    ]);

    /*
     * Unificamos los movimientos y los pagos en un único mapa,
     * utilizando el período como clave.
     */
    const mapa = new Map();

    for (const r of movAgg) {
      const periodo = String(r.periodo || "");

      if (!periodo) continue;

      mapa.set(periodo, {
        periodo,
        cargo: Number(r.cargo || 0),
        pagos: 0,
        fechaUltimoPago: null,
        cantidadPagos: 0,
        notaDebito: Number(r.notaDebito || 0),
        notaCredito: Number(r.notaCredito || 0),
        saldoPeriodo: 0,
        saldoAcumulado: 0,
      });
    }

    for (const r of pagosAgg) {
      const periodo = String(r.periodo || "");

      if (!periodo) continue;

      const previo = mapa.get(periodo) || {
        periodo,
        cargo: 0,
        pagos: 0,
        fechaUltimoPago: null,
        cantidadPagos: 0,
        notaDebito: 0,
        notaCredito: 0,
        saldoPeriodo: 0,
        saldoAcumulado: 0,
      };

      previo.pagos = Number(r.pagos || 0);
      previo.fechaUltimoPago = r.fechaUltimoPago || null;
      previo.cantidadPagos = Number(r.cantidadPagos || 0);

      mapa.set(periodo, previo);
    }

    /*
     * Para calcular el saldo acumulado correctamente, primero
     * ordenamos desde el período más antiguo al más reciente.
     *
     * Fórmula:
     * saldo anterior
     * + cargos
     * + notas de débito
     * - pagos
     * - notas de crédito
     */
    const detalleCronologico = Array.from(mapa.values()).sort((a, b) =>
      String(a.periodo).localeCompare(String(b.periodo)),
    );

    let saldoAcumulado = 0;

    for (const registro of detalleCronologico) {
      registro.saldoPeriodo =
        Number(registro.cargo || 0) +
        Number(registro.notaDebito || 0) -
        Number(registro.pagos || 0) -
        Number(registro.notaCredito || 0);

      saldoAcumulado += registro.saldoPeriodo;

      /*
       * Se redondea para evitar pequeños errores de coma flotante.
       */
      registro.saldoPeriodo =
        Math.round((registro.saldoPeriodo + Number.EPSILON) * 100) / 100;

      registro.saldoAcumulado =
        Math.round((saldoAcumulado + Number.EPSILON) * 100) / 100;

      /*
       * Conservamos "saldo" como saldo individual del período
       * para no romper otras partes de la vista que ya lo utilicen.
       */
      registro.saldo = registro.saldoPeriodo;
    }

    /*
     * La tabla se muestra como un estado bancario:
     * período más reciente arriba.
     */
    const detallePorPeriodo = detalleCronologico.reverse();

    const totales = detallePorPeriodo.reduce(
      (acc, r) => {
        acc.cargo += Number(r.cargo || 0);
        acc.notaDebito += Number(r.notaDebito || 0);
        acc.notaCredito += Number(r.notaCredito || 0);
        acc.pagos += Number(r.pagos || 0);

        return acc;
      },
      {
        cargo: 0,
        notaDebito: 0,
        notaCredito: 0,
        pagos: 0,
        saldo: 0,
      },
    );

    totales.cargo =
      Math.round((totales.cargo + Number.EPSILON) * 100) / 100;

    totales.notaDebito =
      Math.round((totales.notaDebito + Number.EPSILON) * 100) / 100;

    totales.notaCredito =
      Math.round((totales.notaCredito + Number.EPSILON) * 100) / 100;

    totales.pagos =
      Math.round((totales.pagos + Number.EPSILON) * 100) / 100;

    totales.saldo =
      Math.round(
        (
          totales.cargo +
          totales.notaDebito -
          totales.notaCredito -
          totales.pagos +
          Number.EPSILON
        ) * 100,
      ) / 100;

    /*
     * Movimientos y pagos recientes.
     */
    const [movs, pagos] = await Promise.all([
      MovimientoProveedor.find({
        proveedor: proveedorId,
      })
        .select(
          "tipo concepto periodo fecha importe metodo comprobante creadoPor",
        )
        .sort({
          fecha: -1,
          createdAt: -1,
        })
        .limit(100)
        .populate("creadoPor", "nombre apellido email")
        .lean(),

      Pago.find({
        proveedor: proveedorId,
        estado: { $ne: "anulado" },
      })
        .select(
          "fecha importe metodo comprobante periodo observacion creadoPor",
        )
        .sort({
          fecha: -1,
          createdAt: -1,
        })
        .limit(100)
        .populate("creadoPor", "nombre apellido email")
        .lean(),
    ]);

    const movimientos = [
      ...movs.map((m) => ({
        ...m,
        signo:
          m.tipo === "cargo" || m.tipo === "debito"
            ? 1
            : -1,
        observacion: "",
        creadorNombre: nombreApellido(m.creadoPor),
      })),

      ...pagos.map((p) => ({
        ...p,
        tipo: "pago",
        concepto: `Pago ${p.metodo || ""}`.trim(),
        periodo: p.periodo,
        fecha: p.fecha,
        importe: Number(p.importe || 0),
        metodo: p.metodo,
        comprobante: p.comprobante,
        observacion: p.observacion || "",
        signo: -1,
        creadorNombre: nombreApellido(p.creadoPor),
      })),
    ]
      .sort((a, b) => {
        const fechaA = a.fecha ? new Date(a.fecha).getTime() : 0;
        const fechaB = b.fecha ? new Date(b.fecha).getTime() : 0;

        return fechaB - fechaA;
      })
      .slice(0, 100);

    const pendientes =
      await cargosPendientesPorProveedor(proveedorId);

    const now = clock.date();

    const mesActual = `${now.getFullYear()}-${String(
      now.getMonth() + 1,
    ).padStart(2, "0")}`;

    const saldoVencido = (pendientes || [])
      .filter(
        (r) =>
          r &&
          Number(r.saldo || 0) > 0 &&
          typeof r.periodo === "string" &&
          r.periodo <= mesActual,
      )
      .reduce(
        (acc, r) => acc + Number(r.saldo || 0),
        0,
      );

    const { toastOk, toastErr } = popToasts(req);

    return res.render("proveedoresViews/verProveedor", {
      title: "Proveedor",
      proveedor,
      totales,
      detallePorPeriodo,
      movimientos,
      saldoVencido,
      toastOk,
      toastErr,
    });
  } catch (error) {
    console.error("Error al mostrar el proveedor:", error);

    return res
      .status(500)
      .send("Error al cargar el estado de cuenta del proveedor");
  }
}

/* =========================================================
 * GET /proveedores/:id/editar
 * =======================================================*/
export async function mostrarFormularioEditarProveedor(req, res) {
  try {
    const proveedor = await Proveedor.findById(req.params.id).lean();
    if (!proveedor) return res.status(404).send("Proveedor no encontrado");

    const planes = ordenarPorNombrePlan(await listarPlanesService());
    res.render("proveedoresViews/editarProveedor", { proveedor, planes });
  } catch (error) {
    console.error("Error al cargar proveedor para editar:", error);
    res.status(500).send("Error al cargar proveedor");
  }
}

/* =========================================================
 * POST /proveedores/:id/editar
 * =======================================================*/
export async function actualizarProveedorController(req, res) {
  try {
    if (req.erroresValidacion) {
      const proveedor = await Proveedor.findById(req.params.id).lean();
      const planes = ordenarPorNombrePlan(await listarPlanesService());
      return res.status(400).render("proveedoresViews/editarProveedor", {
        proveedor,
        errores: req.erroresValidacion,
        datos: req.body,
        planes,
      });
    }

    const activo = toBool(req.body.activo);
    const plan = req.body.plan || null;

    const update = {
      nombreFantasia: (req.body.nombreFantasia || "").trim(),
      nombreReal: (req.body.nombreReal || "").trim(),
      cuit: (req.body.cuit || "").trim(),
      domicilio: (req.body.domicilio || "").trim(),
      domicilioFiscal: (req.body.domicilioFiscal || "").trim(),
      telefonoCelular: (req.body.telefonoCelular || "").trim(),
      telefonoFijo: (req.body.telefonoFijo || "").trim(),
      email: (req.body.email || "").trim(),
      cbu: (req.body.cbu || "").trim(),
      categoria: (req.body.categoria || "").trim(),
      condicionIva: (req.body.condicionIva || "").trim(),
      activo,
      plan,
    };

    const proveedor = await Proveedor.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });

    if (!proveedor) return res.status(404).send("Proveedor no encontrado");

    req.session.mensaje = `Proveedor #${proveedor.numeroProveedor} actualizado correctamente`;
    res.redirect("/proveedores");
  } catch (error) {
    console.error("Error al actualizar proveedor:", error);
    res.status(500).send("Error al actualizar proveedor");
  }
}

/* =========================================================
 * DELETE /proveedores/:id
 * =======================================================*/
export async function eliminarProveedorController(req, res) {
  try {
    const proveedor = await Proveedor.findByIdAndDelete(req.params.id);
    if (!proveedor) return res.status(404).send("Proveedor no encontrado");

    req.session.mensaje = `Proveedor #${proveedor.numeroProveedor} eliminado correctamente`;
    res.redirect("/proveedores");
  } catch (error) {
    console.error("Error al eliminar proveedor:", error);
    res.status(500).send("Error al eliminar proveedor");
  }
}

/* =========================================================
 * GET /proveedores/:proveedorId/periodo/:periodo
 * =======================================================*/
export async function verPeriodoProveedorController(req, res) {
  try {
    const { proveedorId, periodo } = req.params;

    if (!mongoose.isValidObjectId(proveedorId)) {
      return res.status(400).send("ID de proveedor inválido");
    }
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
      return res.status(400).send("Formato de período inválido (use YYYY-MM)");
    }

    const proveedor = await Proveedor.findById(proveedorId)
      .select("numeroProveedor nombreFantasia nombreReal cuit condicionIva telefonoCelular activo plan")
      .populate("plan", "nombre importe")
      .lean();

    if (!proveedor) return res.status(404).send("Proveedor no encontrado");

    // Movimientos del período (sin observación) + pagos (con observacion)
    const movs = await MovimientoProveedor.find({
      proveedor: new mongoose.Types.ObjectId(proveedorId),
      periodo: String(periodo),
    })
      .select("tipo concepto periodo fecha importe metodo comprobante creadoPor")
      .sort({ fecha: 1, _id: 1 })
      .populate("creadoPor", "nombre apellido email")
      .lean();

    const pagos = await Pago.find({ proveedor: proveedorId, periodo })
      .select("fecha importe metodo comprobante periodo observacion creadoPor")
      .sort({ fecha: 1, _id: 1 })
      .populate("creadoPor", "nombre apellido email")
      .lean();

    const totales = { cargo: 0, notaDebito: 0, notaCredito: 0, pagos: 0, saldo: 0 };
    const movimientos = [];

    for (const m of movs) {
      const tipo = String(m.tipo || "").toLowerCase();
      const importe = Number(m.importe || 0);
      let signo = 0;

      if (tipo === "cargo") { totales.cargo += importe; signo = +1; }
      else if (tipo === "debito") { totales.notaDebito += importe; signo = +1; }
      else if (tipo === "credito") { totales.notaCredito += importe; signo = -1; }
      else if (tipo === "pago") { totales.pagos += importe; signo = -1; } // por si hubiera registros tipo pago aquí

      movimientos.push({
        _id: m._id,
        tipo,
        concepto: m.concepto || "",
        periodo: m.periodo,
        fecha: m.fecha,
        importe,
        signo,
        metodo: m.metodo,
        comprobante: m.comprobante,
        observacion: "", // en movimientos no hay observacion
        creadorNombre: nombreApellido(m.creadoPor),
      });
    }

    for (const p of pagos) {
      totales.pagos += Number(p.importe || 0);
      movimientos.push({
        _id: p._id,
        tipo: "pago",
        concepto: `Pago ${p.metodo || ""}`.trim(),
        periodo: p.periodo,
        fecha: p.fecha,
        importe: p.importe,
        signo: -1,
        metodo: p.metodo,
        comprobante: p.comprobante,
        observacion: p.observacion || "",
        creadorNombre: nombreApellido(p.creadoPor),
      });
    }

    movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    totales.saldo = totales.cargo + totales.notaDebito - (totales.notaCredito + totales.pagos);

    const { toastOk, toastErr } = popToasts(req);

    return res.render("proveedoresViews/detallePeriodo", {
      proveedor,
      periodo,
      movimientos,
      totales,
      toastOk,
      toastErr,
    });
  } catch (err) {
    console.error("verPeriodoProveedorController error:", err);
    return res.status(500).send("Error al obtener el detalle del período");
  }
}



export async function descargarEstadoCuentaPdfController(req, res) {
  try {
    const { proveedorId } = req.params;

    const proveedor = await Proveedor.findById(proveedorId)
      .select("numeroProveedor nombreFantasia nombreReal cuit condicionIva telefonoCelular plan")
      .populate("plan", "nombre")
      .lean();

    if (!proveedor) return res.status(404).send("Proveedor no encontrado");

    const servicioActual = proveedor?.plan?.nombre || "";

    const logoDataUri = leerLogoDataUriDesdeHtml();

    const now = clock.date();
    const mesActual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const pendientesRaw = await cargosPendientesPorProveedor(proveedorId);
    const pendientes = (pendientesRaw || [])
      .filter((r) => r && Number(r.saldo) > 0 && typeof r.periodo === "string" && r.periodo <= mesActual)
      .sort((a, b) => String(a.periodo).localeCompare(String(b.periodo)));

    const totalPendiente = pendientes.reduce((acc, r) => acc + Number(r.saldo || 0), 0);

    function prevPeriodo(yyyyMm) {
      if (!yyyyMm) return null;
      const [y, m] = String(yyyyMm).split("-").map(Number);
      if (!y || !m) return null;
      const d = new Date(y, m - 2, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }

    let ultimoPago = null;
    const primerDeudor = pendientes?.[0]?.periodo || null;
    if (primerDeudor) {
      const periodoAnterior = prevPeriodo(primerDeudor);
      if (periodoAnterior) {
        ultimoPago = await Pago.findOne({
          proveedor: proveedorId,
          periodo: periodoAnterior,
          estado: { $ne: "anulado" },
        })
          .select("fecha periodo metodo comprobante importe createdAt")
          .sort({ fecha: -1, createdAt: -1 })
          .lean();
      }
    }

    let usdAyer = res.locals.usdAyer || null;
    if (!usdAyer) {
      try {
        usdAyer = await cambioService.usdDiaAnteriorConFallback(
          Number(process.env.USD_MAX_FALLBACK_DAYS || 7)
        );
      } catch {
        usdAyer = null;
      }
    }

    const html = await new Promise((resolve, reject) => {
      res.render(
        "proveedoresViews/estadoCuenta/estadoCuentaImprimir",
        {
          layout: false,
          proveedor,
          servicioActual,
          hoy: new Date(),
          ultimoPago,
          pendientes,
          totalPendiente,
          logoDataUri,
          usdAyer,
        },
        (err, str) => (err ? reject(err) : resolve(str))
      );
    });

    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "18mm", right: "14mm", bottom: "18mm", left: "14mm" },
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="estado-cuenta-${proveedor.numeroProveedor || proveedorId}.pdf"`
      );
      return res.send(pdf);
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error("descargarEstadoCuentaPdfController error:", err);
    return res.status(500).send("Error al generar PDF");
  }
}

export async function descargarEstadoPeriodoCuentaPdfController(req, res) {
  try {
    const { proveedorId, periodo } = req.params;

    const proveedor = await Proveedor.findById(proveedorId)
      .select("numeroProveedor nombreFantasia nombreReal cuit condicionIva telefonoCelular plan")
      .populate("plan", "nombre")
      .lean();

    if (!proveedor) {
      return res.status(404).send("Proveedor no encontrado");
    }

    const servicioActual = proveedor?.plan?.nombre || "";

    const movs = await MovimientoProveedor.find({
      proveedor: proveedorId,
      periodo,
    })
      .sort({ createdAt: 1, fecha: 1 })
      .lean();

    const pagos = await Pago.find({
      proveedor: proveedorId,
      periodo,
      estado: { $ne: "anulado" },
    })
      .sort({ createdAt: 1, fecha: 1 })
      .lean();

    const movimientos = [];
    const totales = {
      cargo: 0,
      notaDebito: 0,
      notaCredito: 0,
      pagos: 0,
      saldo: 0,
    };

    for (const m of movs) {
      const importe = Number(m.importe || 0);

      if (m.tipo === "cargo") {
        totales.cargo += importe;
        movimientos.push({
          fecha: m.fecha || m.createdAt,
          tipo: "Cargo",
          concepto: m.concepto || "Cargo",
          comprobante: m.numeroDeComprobante || "—",
          metodo: "—",
          importe,
          signo: "+",
        });
      } else if (m.tipo === "debito") {
        totales.notaDebito += importe;
        movimientos.push({
          fecha: m.fecha || m.createdAt,
          tipo: "Nota de débito",
          concepto: m.concepto || "Nota de débito",
          comprobante: m.numeroDeComprobante || "—",
          metodo: "—",
          importe,
          signo: "+",
        });
      } else if (m.tipo === "credito") {
        totales.notaCredito += importe;
        movimientos.push({
          fecha: m.fecha || m.createdAt,
          tipo: "Nota de crédito",
          concepto: m.concepto || "Nota de crédito",
          comprobante: m.numeroDeComprobante || "—",
          metodo: "—",
          importe,
          signo: "-",
        });
      }
    }

    for (const p of pagos) {
      const importe = Number(p.importe || 0);
      totales.pagos += importe;
      movimientos.push({
        fecha: p.fecha || p.createdAt,
        tipo: "Pago",
        concepto: p.detalle || "Pago registrado",
        comprobante: p.comprobante || "—",
        metodo: p.metodo || p.medioPago || "—",
        importe,
        signo: "-",
      });
    }

        movimientos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    totales.saldo =
      Number(totales.cargo || 0) +
      Number(totales.notaDebito || 0) -
      Number(totales.notaCredito || 0) -
      Number(totales.pagos || 0);

    const logoDataUri = leerLogoDataUriDesdeHtml();

    let usdAyer = res.locals.usdAyer || null;
    if (!usdAyer) {
      try {
        usdAyer = await cambioService.usdDiaAnteriorConFallback(
          Number(process.env.USD_MAX_FALLBACK_DAYS || 7)
        );
      } catch {
        usdAyer = null;
      }
    }

    const html = await new Promise((resolve, reject) => {
      res.render(
        "proveedoresViews/estadoCuenta/estadoPeriodoCuentaImprimir",
        {
          layout: false,
          proveedor,
          servicioActual,
          periodo,
          hoy: new Date(),
          movimientos,
          totales,
          logoDataUri,
          usdAyer,
        },
        (err, str) => (err ? reject(err) : resolve(str))
      );
    });

    const browser = await puppeteer.launch({ args: ["--no-sandbox"] });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "18mm",
          right: "14mm",
          bottom: "18mm",
          left: "14mm",
        },
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename="estado-periodo-${proveedor.numeroProveedor || proveedorId}-${periodo}.pdf"`
      );

      return res.send(pdf);
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error("descargarEstadoPeriodoCuentaPdfController error:", error);
    return res.status(500).send("Error al generar PDF del período");
  }
}


