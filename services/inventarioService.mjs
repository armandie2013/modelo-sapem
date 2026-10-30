import mongoose from "mongoose";
import { ejecutarOperacion } from "./inventarioPersistencia.mjs";

import Configuracion from "../models/inventarioConfiguracion.mjs";

import {
  Producto,
  Lugar,
  Saldo,
  Equipo,
  Movimiento,
  Archivo,
  Contador,
} from "../models/inventario.mjs";

export function exigir(ok, mensaje) {
  if (!ok) {
    const error = new Error(mensaje);
    error.status = 400;
    throw error;
  }
}

const limpiar = (valor) => String(valor ?? "").trim();

export function cantidad(valor) {
  const texto = limpiar(valor).replace(",", ".");

  exigir(
    /^\d+$/.test(texto),
    "Cantidad inválida: ingresá un número entero mayor que cero."
  );

  const numero = Math.round(Number(texto) * 1000);

  exigir(
    Number.isSafeInteger(numero) &&
      numero > 0 &&
      numero <= 1000000000000,
    "Cantidad fuera de rango."
  );

  return numero;
}

function fecha(valor) {
  exigir(
    /^\d{4}-\d{2}-\d{2}$/.test(limpiar(valor)),
    "Fecha inválida."
  );

  const resultado = new Date(`${valor}T12:00:00-03:00`);

  exigir(
    Number.isFinite(resultado.getTime()) &&
      resultado.toISOString().slice(0, 10) === valor,
    "Fecha inválida."
  );

  return resultado;
}

export function respaldo(body) {
  const documento = {
    tipo: limpiar(body.documentoTipo),
    numero: limpiar(body.documentoNumero).toUpperCase(),
    fecha: fecha(body.documentoFecha),
    emisor: limpiar(body.emisor).toUpperCase(),
  };

  exigir(
    ["remito", "factura", "nota", "acta", "otro"].includes(
      documento.tipo
    ),
    "Tipo de documento inválido."
  );

  exigir(
    documento.numero && documento.emisor,
    "Completá número de documento y emisor; usá S/N si no tiene número."
  );

  return documento;
}

function validarArchivos(files) {
  for (const archivo of files) {
    const buffer = archivo.buffer;

    const pdf =
      buffer.subarray(0, 5).toString() === "%PDF-";

    const png =
      buffer.subarray(0, 8).toString("hex") ===
      "89504e470d0a1a0a";

    const jpg =
      buffer.length > 3 &&
      buffer[0] === 255 &&
      buffer[1] === 216 &&
      buffer[2] === 255;

    exigir(
      pdf || png || jpg,
      "Adjuntá únicamente PDF, PNG o JPG válidos."
    );

    archivo.mimeSeguro = pdf
      ? "application/pdf"
      : png
        ? "image/png"
        : "image/jpeg";
  }
}

async function guardarArchivos(
  movimientoId,
  files,
  session
) {
  for (const archivo of files) {
    await new Archivo({
      movimiento: movimientoId,

      nombre: archivo.originalname
        .replace(/[\\/\r\n]/g, "_")
        .slice(0, 150),

      mime: archivo.mimeSeguro,
      datos: archivo.buffer,
    }).save({ session });
  }
}

async function operacionInventario(fn) {
  return ejecutarOperacion(() => fn(undefined));
}

async function moverSaldo(
  producto,
  lugar,
  estado,
  diferencia,
  session
) {
  const filtro = {
    producto,
    lugar,
    estado,
  };

  if (diferencia < 0) {
    const resultado = await Saldo.updateOne(
      {
        ...filtro,
        cantidad: { $gte: -diferencia },
      },
      {
        $inc: { cantidad: diferencia },
      },
      { session }
    );

    exigir(
      resultado.modifiedCount === 1,
      "Stock insuficiente en el depósito o destino seleccionado."
    );
  } else {
    await Saldo.updateOne(
      filtro,
      {
        $inc: { cantidad: diferencia },
      },
      {
        upsert: true,
        session,
      }
    );
  }
}

export async function crearMovimiento(
  body,
  usuario,
  files = [],
  opciones = {}
) {
  validarArchivos(files);

  exigir(
    /^[a-f0-9-]{36}$/i.test(limpiar(body.clave)),
    "Identificador del formulario inválido."
  );

  // Evita duplicar la operación al reenviar el formulario.
  const previo = await Movimiento.findOne({
    clave: body.clave,
  });

  if (previo) {
    exigir(
      String(previo.creadoPor.id) === String(usuario._id),
      "Formulario inválido."
    );

    return previo;
  }

  let filas;

  try {
    filas = JSON.parse(body.items);
  } catch {
    exigir(false, "Detalle de artículos inválido.");
  }

  exigir(
    Array.isArray(filas) &&
      filas.length > 0 &&
      filas.length <= 100,
    "Agregá entre 1 y 100 artículos."
  );

  exigir(
    new Set(
      filas.map((fila) => String(fila.producto))
    ).size === filas.length,
    "No repitas el mismo producto en dos filas."
  );

  const tipo = limpiar(body.tipo);

  exigir(
    ["ingreso", "asignacion", "devolucion", "traspaso"].includes(
      tipo
    ),
    "Operación inválida."
  );

  const fechaMovimiento = fecha(body.fecha);

  const documento =
    tipo === "ingreso" ? respaldo(body) : null;

  const entrega = limpiar(body.entrega);
  const recibe = limpiar(body.recibe);

  exigir(
    entrega && recibe,
    "Indicá quién entrega y quién recibe."
  );

  try {
    return await operacionInventario(async (session) => {
      const existente = await Movimiento.findOne({
        clave: body.clave,
      }).session(session);

      if (existente) {
        exigir(
          String(existente.creadoPor.id) ===
            String(usuario._id),
          "Formulario inválido."
        );

        return existente;
      }

      if (documento && body.documentoRepetido !== "si") {
        const repetido = await Movimiento.exists({
          tipo: "ingreso",
          estado: { $ne: "anulado" },

          documentos: {
            $elemMatch: {
              tipo: documento.tipo,
              numero: documento.numero,
              emisor: documento.emisor,
            },
          },
        }).session(session);

        exigir(
          !repetido,
          "Ese documento ya tiene un ingreso. Si es otra recepción parcial, marcá la opción para reutilizarlo."
        );
      }

      const destino = await Lugar.findById(
        body.destino
      ).session(session);

      exigir(destino && destino.activo !== false, "Destino inexistente o inactivo.");

      let original = null;
      let origen = null;

      if (tipo === "devolucion") {
        original = await Movimiento.findById(
          body.original
        ).session(session);

        exigir(
          original?.tipo === "asignacion" && original.estado !== "anulado",
          "Seleccioná una asignación válida."
        );

        exigir(
          fechaMovimiento >= original.fecha,
          "La devolución no puede ser anterior a la asignación."
        );

        origen = await Lugar.findById(
          original.destino
        ).session(session);
      } else if (tipo !== "ingreso") {
        origen = await Lugar.findById(
          body.origen
        ).session(session);
      }

      exigir(
        tipo === "ingreso" || (origen && origen.activo !== false),
        "Origen inexistente."
      );

      exigir(
        !origen || !origen._id.equals(destino._id),
        "Origen y destino deben ser diferentes."
      );

      exigir(
        destino.tipo ===
          (tipo === "asignacion" ? "destino" : "deposito"),
        "Tipo de destino incorrecto."
      );

      exigir(
        !origen ||
          origen.tipo ===
            (tipo === "devolucion" ? "destino" : "deposito"),
        "Tipo de origen incorrecto."
      );

      const estadoEntrada =
        tipo === "asignacion"
          ? "asignado"
          : tipo === "devolucion"
            ? limpiar(body.estadoRecepcion)
            : "disponible";

      exigir(
        ["disponible", "revision", "asignado"].includes(
          estadoEntrada
        ),
        "Estado de recepción inválido."
      );

      exigir(
        tipo !== "devolucion" ||
          ["disponible", "revision"].includes(
            estadoEntrada
          ),
        "Estado de devolución inválido."
      );

      const contador = await Contador.findByIdAndUpdate(
        "movimientos",
        {
          $inc: { valor: 1 },
        },
        {
          new: true,
          session,
        }
      );

      exigir(
        contador,
        "Falta inicializar el módulo de inventario."
      );

      const movimiento = new Movimiento({
        ...(opciones.id ? { _id: opciones.id } : {}),
        numero: contador.valor,
        clave: body.clave,
        tipo,
        fecha: fechaMovimiento,

        origen: origen?._id,
        destino: destino._id,

        origenNombre:
          origen?.nombre || documento?.emisor,

        origenDireccion: origen?.direccion || "",
        destinoNombre: destino.nombre,
        destinoDireccion: destino.direccion,

        original: original?._id,
        originalNumero: original?.numero,

        estadoRecepcion:
          estadoEntrada === "revision"
            ? "revision"
            : "disponible",

        entrega,
        recibe,
        dniRecibe: limpiar(body.dniRecibe),
        observaciones: limpiar(body.observaciones),

        documentos: documento ? [documento] : [],

        creadoPor: {
          id: usuario._id,
          nombre: `${usuario.nombre} ${usuario.apellido}`,
        },
      });

      for (const fila of filas) {
        const producto = await Producto.findById(
          fila.producto
        ).session(session);

        exigir(producto && producto.activo !== false, "Producto inexistente o inactivo.");

        const unidades = cantidad(fila.cantidad);

        const entradas = limpiar(fila.series)
          .split(/\r?\n/)
          .map((linea) => linea.trim())
          .filter(Boolean)
          .map((linea) => {
            const [
              serie,
              mac = "",
              patrimonio = "",
            ] = linea
              .split("|")
              .map((dato) => dato.trim());

            return {
              serie: serie.toUpperCase(),
              mac,
              patrimonio,
            };
          });

        exigir(
          producto.serializado || entradas.length === 0,
          `${producto.nombre}: este producto se controla por cantidad.`
        );

        exigir(
          !producto.serializado ||
            (
              unidades % 1000 === 0 &&
              entradas.length === unidades / 1000
            ),
          `${producto.nombre}: ingresá una serie por cada equipo.`
        );

        exigir(
          new Set(
            entradas.map((entrada) => entrada.serie)
          ).size === entradas.length,
          `${producto.nombre}: hay series repetidas.`
        );

        if (original) {
          const pendiente = original.items.find(
            (item) =>
              item.producto.equals(producto._id)
          );

          exigir(
            pendiente &&
              unidades <=
                pendiente.cantidad - pendiente.devuelto,
            `${producto.nombre}: supera lo pendiente de devolver.`
          );

          if (producto.serializado) {
            const permitidas = new Set(
              pendiente.series.map(
                (equipo) => equipo.serie
              )
            );

            exigir(
              entradas.every((entrada) =>
                permitidas.has(entrada.serie)
              ),
              "Una serie no pertenece a esta asignación."
            );
          }

          pendiente.devuelto += unidades;
        }

        const series = [];

        for (const entrada of entradas) {
          if (tipo === "ingreso") {
            await new Equipo({
              producto: producto._id,
              ...entrada,
              lugar: destino._id,
              estado: estadoEntrada,
            }).save({ session });

            series.push(entrada);
          } else {
            const filtro = {
              producto: producto._id,
              serie: entrada.serie,
              lugar: origen._id,

              estado:
                tipo === "devolucion"
                  ? "asignado"
                  : "disponible",
            };

            if (original) {
              filtro.asignacion = original._id;
            }

            const equipo = await Equipo.findOne(
              filtro
            ).session(session);

            exigir(
              equipo,
              `La serie ${entrada.serie} no está disponible para esta operación.`
            );

            series.push({
              serie: equipo.serie,
              mac: equipo.mac,
              patrimonio: equipo.patrimonio,
            });

            equipo.lugar = destino._id;
            equipo.estado = estadoEntrada;

            equipo.asignacion =
              tipo === "asignacion"
                ? movimiento._id
                : undefined;

            await equipo.save({ session });
          }
        }

        if (origen) {
          await moverSaldo(
            producto._id,
            origen._id,
            tipo === "devolucion"
              ? "asignado"
              : "disponible",
            -unidades,
            session
          );
        }

        await moverSaldo(
          producto._id,
          destino._id,
          estadoEntrada,
          unidades,
          session
        );

        if (tipo === 'ingreso' && (!producto.documentoAlta || producto.pendienteIngreso)) {
          producto.documentoAlta = documento;
          producto.ingresoAlta = movimiento._id; producto.pendienteIngreso = false;
          await producto.save({ session });
        }
        movimiento.items.push({
          producto: producto._id,
          codigo: producto.codigo,
          nombre: producto.nombre,
          marca: producto.marca || "",
          modelo: producto.modelo || "",
          unidad: producto.unidad,
          serializado: producto.serializado,
          cantidad: unidades,
          series,
        });
      }

      if (original) {
        await original.save({ session });
      }

      await movimiento.save({ session });

      await guardarArchivos(
        movimiento._id,
        files,
        session
      );

      return movimiento;
    });
  } catch (error) {
    if (error.code === 11000) {
      const repetido = await Movimiento.findOne({
        clave: body.clave,
      });

      if (
        repetido &&
        String(repetido.creadoPor.id) ===
          String(usuario._id)
      ) {
        return repetido;
      }

      exigir(
        false,
        "Ya existe una de las series o identificadores ingresados."
      );
    }

    throw error;
  }
}

export async function agregarRespaldo(
  id,
  body,
  files
) {
  const documento = respaldo(body);

  validarArchivos(files);

  return operacionInventario(async (session) => {
    const movimiento = await Movimiento.findById(
      id
    ).session(session);

    exigir(
      movimiento?.tipo === "ingreso" && movimiento.estado !== "anulado",
      "El respaldo adicional corresponde a un ingreso."
    );

    const repetido = movimiento.documentos.some(
      (existente) =>
        existente.tipo === documento.tipo &&
        existente.numero.toUpperCase() ===
          documento.numero.toUpperCase() &&
        existente.emisor.toUpperCase() ===
          documento.emisor.toUpperCase()
    );

    exigir(
      !repetido,
      "Ese documento ya está asociado a este ingreso."
    );

    movimiento.documentos.push(documento);

    await movimiento.save({ session });

    await guardarArchivos(
      movimiento._id,
      files,
      session
    );
  });
}

export async function adjuntarArchivos(
  id,
  files
) {
  exigir(
    files.length > 0,
    "Seleccioná al menos un archivo."
  );

  validarArchivos(files);

  await operacionInventario(async (session) => {
    exigir(
      await Movimiento.exists({
        _id: id,
      }).session(session),
      "Movimiento inexistente."
    );

    await guardarArchivos(
      id,
      files,
      session
    );
  });
}

// Crear un depósito o destinatario.
// Si se marca como principal, guardar también la configuración.
export async function crearLugarInventario(datos) {
  const { principal, ...campos } = datos;

  exigir(
    ["deposito", "destino"].includes(campos.tipo),
    "Tipo de ubicación inválido."
  );

  exigir(
    !principal || campos.tipo === "deposito",
    "Solamente un depósito puede ser principal."
  );

  if (!principal) {
    return Lugar.create(campos);
  }

  await Configuracion.init();

  return operacionInventario(async (session) => {
    const lugar = await new Lugar(campos).save({
      session,
    });

    await Configuracion.findByIdAndUpdate(
      "general",
      {
        $set: {
          depositoPrincipal: lugar._id,
        },
      },
      {
        upsert: true,
        session,
      }
    );

    return lugar;
  });
}

// Marcar un depósito existente como principal.
export async function marcarDepositoPrincipal(id) {
  await Configuracion.init();

  return operacionInventario(async (session) => {
    const lugar = await Lugar.findById(id).session(
      session
    );

    exigir(
      lugar?.tipo === "deposito" && lugar.activo !== false,
      "Seleccioná un depósito válido."
    );

    await Configuracion.findByIdAndUpdate(
      "general",
      {
        $set: {
          depositoPrincipal: lugar._id,
        },
      },
      {
        upsert: true,
        session,
      }
    );
  });
}