// controllers/tareasController.mjs
import MovimientoProveedor from "../models/movimientoProveedor.mjs";
import { generarCargosMensuales } from "../services/cargosService.mjs";
// Si tenés un reloj centralizado, podés usarlo. Si no, usamos Date() nativo.
// import clock from "../utils/clock.mjs";

function now() {
  // return clock.date(); // si usás clock
  return new Date();
}

// Próxima ejecución: día 28 a las 03:00 (hora local)
function proximaEjecucion(baseDate = now()) {
  const y = baseDate.getFullYear();
  const m = baseDate.getMonth();
  let target = new Date(y, m, 28, 3, 0, 0, 0);
  if (baseDate >= target) target = new Date(y, m + 1, 28, 3, 0, 0, 0);
  return target;
}

/**
 * GET /tareas/cargos
 */
export async function vistaTareasCargos(req, res) {
  try {
    const hoy = now();
    const proxima = proximaEjecucion(hoy);

    // último período con cargos (tomado de MovimientoProveedor tipo "cargo")
    const ultimo = await MovimientoProveedor
      .find({ tipo: "cargo" })
      .select("periodo -_id")
      .sort({ periodo: -1 })
      .limit(1)
      .lean();
    const ultimaPeriodo = ultimo?.[0]?.periodo || null;

    // permisos
    const perms = (req.session?.usuario?.modulosPermitidos) || {};
    const puedeGenerar = !!(perms.tareas?.ejecutar);
    const puedeVer = !!(perms.tareas?.ver);

    // flashes (mensaje de éxito / error)
    const mensaje = req.session?.mensaje || null;
    const error = req.session?.error || null;
    if (req.session) {
      delete req.session.mensaje;
      delete req.session.error;
    }

    // si no tiene permiso para ver, podés redirigir o mostrar la vista sin botón
    if (!puedeVer && !puedeGenerar) {
      // opcional: return res.status(403).send("No autorizado");
      // mostramos igual la vista pero sin acciones
    }

    return res.render("tareasViews/cargos", {
      hoy,
      proxima,
      ultimaPeriodo,
      puedeGenerar,
      mensaje,
      error
    });
  } catch (e) {
    console.error("vistaTareasCargos error:", e);
    return res.status(500).send("Error al cargar la vista de tareas");
  }
}

/**
 * POST /cargos/mensual
 * Body opcional: { periodo: "YYYY-MM" }
 * Redirige a /tareas/cargos mostrando un flash.
 */
export async function postGenerarCargosMes(req, res) {
  try {
    let fecha = now();
    const periodo = req.body?.periodo;
    if (typeof periodo === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
      const [y, m] = periodo.split("-").map(Number);
      fecha = new Date(y, m - 1, 1);
    }

    const r = await generarCargosMensuales(fecha);
    // Seteamos flash y redirigimos a la vista
    req.session.mensaje = `Cargos del período ${r.periodo}: creados ${r.creados}, existentes ${r.existentes}.`;
    return res.redirect("/tareas/cargos");
  } catch (err) {
    console.error("postGenerarCargosMes", err);
    req.session.error = "Hubo un error al generar los cargos.";
    return res.redirect("/tareas/cargos");
  }
}
