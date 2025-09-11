// controllers/cargosController.mjs
import { generarCargosMensuales } from "../services/cargosService.mjs";

/**
 * POST /tareas/cargos/mensual
 * Body opcional: { periodo: "YYYY-MM" }
 */
export async function postGenerarCargosMes(req, res) {
  try {
    const { periodo } = req.body;
    let fecha = new Date();

    if (typeof periodo === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) {
      const [y, m] = periodo.split("-").map(Number);
      fecha = new Date(y, m - 1, 1);
    }

    const r = await generarCargosMensuales(fecha);

    // Si el cliente espera HTML, redirigimos con flash; si espera JSON, respondemos JSON
    if (!req.accepts("json")) {
      req.session.mensaje = `Cargos ${r.periodo}: creados ${r.creados}, existentes ${r.existentes}`;
      return res.redirect("/proveedores");
    }
    return res.json(r);
  } catch (err) {
    console.error("postGenerarCargosMes", err);
    if (!req.accepts("json")) {
      req.session.error = "Hubo un error al generar los cargos.";
      return res.redirect("/proveedores");
    }
    return res.status(500).json({ error: "Hubo un error al generar los cargos" });
  }
}