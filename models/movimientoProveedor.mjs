// models/movimientoProveedor.mjs
import mongoose from "mongoose";
import clock from "../utils/clock.mjs";

const { Schema } = mongoose;

function periodoYYYYMM(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const movimientoProveedorSchema = new Schema(
  {
    proveedor: {
      type: Schema.Types.ObjectId,
      ref: "Proveedor",
      required: true,
      index: true,
    },

    // TIPOS: cargo | pago | credito | debito
    tipo: {
      type: String,
      enum: ["cargo", "pago", "credito", "debito"],
      required: true,
      set: (v) => (v || "").toString().trim().toLowerCase(),
      index: true,
    },

    concepto: { type: String, trim: true },

    // YYYY-MM (lo usamos principalmente en 'cargo', opcional en el resto)
    periodo: { type: String, match: /^\d{4}-(0[1-9]|1[0-2])$/ },

    // ⏱️ Fecha tomada del reloj central (se guarda en UTC en Mongo)
    fecha: { type: Date, default: () => clock.date() },

    importe: { type: Number, required: true, min: 0 },

    // Snapshot del plan al momento del cargo (no se ve afectado por cambios futuros)
    plan:        { type: Schema.Types.ObjectId, ref: "Plan" },
    planNombre:  { type: String, trim: true }, // opcional, pero útil para concepto
    importePlan: { type: Number, min: 0 },
  },
  {
    // createdAt/updatedAt usando el reloj central
    timestamps: { currentTime: () => clock.nowMs() },
  }
);

// Índices útiles
movimientoProveedorSchema.index({ proveedor: 1, createdAt: -1 });

// Evita duplicar el cargo del mismo período para un proveedor
// (aplica solo cuando tipo='cargo')
movimientoProveedorSchema.index(
  { proveedor: 1, periodo: 1, tipo: 1 },
  { unique: true, partialFilterExpression: { tipo: "cargo" } }
);

// Completar/inferir campos para 'cargo'
movimientoProveedorSchema.pre("validate", function (next) {
  if (this.tipo === "cargo") {
    // Si no vino periodo, lo inferimos desde la fecha (que ya viene del clock)
    if (!this.periodo && this.fecha instanceof Date && !isNaN(this.fecha)) {
      this.periodo = periodoYYYYMM(this.fecha);
    }

    // Concepto estándar si no lo definieron
    if (!this.concepto) {
      const nombre = this.planNombre || "Plan";
      const sufPeriodo = this.periodo ? ` ${this.periodo}` : "";
      this.concepto = `Cargo mensual ${nombre}${sufPeriodo}`.trim();
    }
  }
  next();
});

export default mongoose.model("MovimientoProveedor", movimientoProveedorSchema);