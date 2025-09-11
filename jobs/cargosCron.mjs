import cron from "node-cron";
import { generarCargosMensuales } from "../services/cargosService.mjs";

export function startCargosCron() {
  // 28 de cada mes a las 06:00, horario de Catamarca
  cron.schedule(
    "0 6 28 * *",
    async () => {
      try {
        const r = await generarCargosMensuales(new Date());
        console.log("⏰ Cron cargos ejecutado:", r);
      } catch (e) {
        console.error("⏰ Cron cargos ERROR:", e);
      }
    },
    { timezone: "America/Argentina/Catamarca" }
  );

  console.log("⏰ Cron de cargos listo: 28/mes 06:00 (America/Argentina/Catamarca)");
}