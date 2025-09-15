// models/movimientoProveedor.mjs
import mongoose from "mongoose";
import clock from "../utils/clock.mjs";

const { Schema } = mongoose;

function periodoYYYYMM(d = clock.date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const movimientoProveedorSchema = new Schema(
  {
    proveedor: { type: Schema.Types.ObjectId, ref: "Proveedor", required: true, index: true },

    // TIPOS: 'cargo', 'pago', 'credito', 'debito'
    tipo: {
      type: String,
      enum: ["cargo", "pago", "credito", "debito"],
      required: true,
      set: (v) => (v || "").toString().trim().toLowerCase(),
      index: true,
    },

    concepto: { type: String, trim: true },

    // YYYY-MM para cargos mensuales
    periodo: { type: String, match: /^\d{4}-(0[1-9]|1[0-2])$/ },

    // Fecha desde el reloj central
    fecha: { type: Date, default: () => clock.date() },

    importe: { type: Number, required: true, min: 0 },

    // snapshot del plan/importe al momento del cargo
    plan: { type: Schema.Types.ObjectId, ref: "Plan" },
    importePlan: { type: Number, min: 0 },
  },
  {
    timestamps: { currentTime: () => clock.nowMs() },
  }
);

// Índices útiles
movimientoProveedorSchema.index({ proveedor: 1, createdAt: -1 });

// Evita duplicar el cargo del mismo período
movimientoProveedorSchema.index(
  { proveedor: 1, periodo: 1, tipo: 1 },
  { unique: true, partialFilterExpression: { tipo: "cargo" } }
);

// Completa datos faltantes para 'cargo'
movimientoProveedorSchema.pre("validate", function (next) {
  if (this.tipo === "cargo") {
    if (!this.periodo && this.fecha instanceof Date && !isNaN(this.fecha)) {
      this.periodo = periodoYYYYMM(this.fecha);
    }
    if (!this.concepto && this.plan && typeof this.importePlan === "number") {
      this.concepto = `Cargo mensual plan ${this.plan} ${this.periodo || ""}`.trim();
    }
  }
  next();
});

export default mongoose.model("MovimientoProveedor", movimientoProveedorSchema);
