// models/pago.mjs
import mongoose from "mongoose";

const pagoSchema = new mongoose.Schema(
  {
    proveedor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proveedor",
      required: true,
      index: true,
    },
    // 👇 nuevo: link directo al cargo (movimiento) y redundancia de período
    cargo: { type: mongoose.Schema.Types.ObjectId, ref: "MovimientoProveedor" },
    periodo: { type: String, match: /^\d{4}-(0[1-9]|1[0-2])$/ }, // ej: 2025-09

    fecha: { type: Date, required: true, default: Date.now },
    importe: { type: Number, required: true, min: 0 },
    metodo: {
      type: String,
      enum: ["transferencia", "efectivo", "cheque", "deposito", "otro"],
      default: "transferencia",
    },
    comprobante: { type: String, default: "" },
    observacion: { type: String, default: "" },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
  },
  { timestamps: true }
);

export default mongoose.model("Pago", pagoSchema);
