// routes/cambioRoutes.mjs
import { Router } from "express";
import { obtenerUsd } from "../controllers/cambioController.mjs";

const router = Router();

// /api/cambio/usd[?fecha=YYYY-MM-DD][&fallback=true|false][&maxDias=7]
router.get("/usd", obtenerUsd);

export default router;
