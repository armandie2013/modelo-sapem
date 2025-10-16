import mongoose from "mongoose";
import clock from "../utils/clock.mjs"; // reloj centralizado

function periodoYYYYMM(d = clock.date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const pagoSchema = new mongoose.Schema(
  {
    proveedor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proveedor",
      required: true,
      index: true,
    },

    // Link directo al cargo (movimiento) y redundancia de período
    cargo: { type: mongoose.Schema.Types.ObjectId, ref: "MovimientoProveedor", index: true },
    periodo: { type: String, match: /^\d{4}-(0[1-9]|1[0-2])$/ }, // ej: "2025-09"

    // Fecha desde el clock
    fecha: { type: Date, required: true, default: () => clock.date() },

    importe: { type: Number, required: true, min: 0 },

    metodo: {
      type: String,
      enum: ["transferencia", "efectivo", "cheque", "deposito", "otro"],
      default: "transferencia",
      set: (v) => (v || "").toString().trim().toLowerCase(),
    },

    comprobante: { type: String, default: "" },
    observacion: { type: String, default: "" },

    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario", default: null },
  },
  {
    timestamps: { currentTime: () => clock.nowMs() },
  }
);

pagoSchema.index({ proveedor: 1, periodo: 1 });
pagoSchema.index({ createdAt: -1 });

pagoSchema.pre("validate", function (next) {
  if (!this.periodo && this.fecha instanceof Date && !isNaN(this.fecha)) {
    this.periodo = periodoYYYYMM(this.fecha);
  }
  next();
});

export default mongoose.model("Pago", pagoSchema);
