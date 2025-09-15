// models/pago.mjs
import mongoose from "mongoose";
import clock from "../utils/clock.mjs"; // ⏱️ reloj centralizado

const { Schema } = mongoose;

function periodoYYYYMM(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const pagoSchema = new Schema(
  {
    proveedor: {
      type: Schema.Types.ObjectId,
      ref: "Proveedor",
      required: true,
      index: true,
    },

    // Link directo al cargo y redundancia de período (para consultas rápidas)
    cargo:   { type: Schema.Types.ObjectId, ref: "MovimientoProveedor", index: true },
    periodo: { type: String, match: /^\d{4}-(0[1-9]|1[0-2])$/ }, // ej: "2025-09"

    // ⏱️ Fecha tomada del reloj central (guardada en UTC)
    fecha: { type: Date, required: true, default: () => clock.date() },

    importe: { type: Number, required: true, min: 0 },

    metodo: {
      type: String,
      enum: ["transferencia", "efectivo", "cheque", "deposito", "otro"],
      default: "transferencia",
      set: (v) => (v || "").toString().trim().toLowerCase(), // normaliza
    },

    comprobante: { type: String, default: "" },
    observacion: { type: String, default: "" },

    creadoPor: { type: Schema.Types.ObjectId, ref: "Usuario" },
  },
  {
    // createdAt/updatedAt con el reloj central
    timestamps: { currentTime: () => clock.nowMs() },
  }
);

// Índices útiles
pagoSchema.index({ proveedor: 1, periodo: 1 });
pagoSchema.index({ proveedor: 1, fecha: -1 });
pagoSchema.index({ createdAt: -1 });

// Si no enviaron "periodo", lo inferimos desde "fecha"
pagoSchema.pre("validate", function (next) {
  if (!this.periodo && this.fecha instanceof Date && !isNaN(this.fecha)) {
    this.periodo = periodoYYYYMM(this.fecha);
  }
  next();
});

// Si viene cargo pero no periodo, intentamos copiar el periodo del cargo
pagoSchema.pre("save", async function (next) {
  try {
    if (this.isNew && this.cargo && !this.periodo) {
      // Evitamos import circular usando el registro de Mongoose
      const MovimientoProveedor =
        mongoose.models.MovimientoProveedor ||
        (await import("./movimientoProveedor.mjs")).default;

      const cargoDoc = await MovimientoProveedor.findById(this.cargo).lean();
      if (cargoDoc?.periodo) {
        this.periodo = cargoDoc.periodo;
      } else if (!this.periodo && this.fecha) {
        // fallback por las dudas
        this.periodo = periodoYYYYMM(this.fecha);
      }
    }
    next();
  } catch (err) {
    next(err);
  }
});

export default mongoose.model("Pago", pagoSchema);