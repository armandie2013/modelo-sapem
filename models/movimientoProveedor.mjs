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

    // ⏱️ ahora toma la hora del reloj central
    fecha: { type: Date, default: () => clock.date() },

    importe: { type: Number, required: true, min: 0 },

    // snapshot del plan/importe al momento del cargo
    plan: { type: Schema.Types.ObjectId, ref: "Plan" },
    importePlan: { type: Number, min: 0 },

    // quién creó el movimiento (para mostrar en el detalle)
    creadoPor: { type: Schema.Types.ObjectId, ref: "Usuario", default: null },

    // para identificar entradas generadas por procesos automáticos (cron)
    creadoPorSistema: { type: Boolean, default: false },

    bloqueadoParaPago: { type: Boolean, default: false },
  },
  {
    // timestamps también con el reloj central
    timestamps: { currentTime: () => clock.nowMs() },
  }
);

// Campos para Plan de Pago / cuotas / reversas
movimientoProveedorSchema.add({
  planPagoId: { type: Schema.Types.ObjectId, ref: "PlanPago", default: null, index: true },
  cuotaN:     { type: Number, default: null }, // 1..N para cuotas del plan
  aplicaA:    { type: Schema.Types.ObjectId, ref: "MovimientoProveedor", default: null, index: true },
});

movimientoProveedorSchema.index({ proveedor: 1, createdAt: -1 });

// Índice único de cargo mensual SIN plan de pago
movimientoProveedorSchema.index(
  { proveedor: 1, periodo: 1, tipo: 1 },
  { unique: true, partialFilterExpression: { tipo: "cargo", planPagoId: null } }
);

// Completa datos faltantes para 'cargo'
movimientoProveedorSchema.pre("validate", function (next) {
  if (this.tipo === "cargo") {
    if (!this.periodo && this.fecha instanceof Date && !isNaN(this.fecha)) {
      this.periodo = periodoYYYYMM(this.fecha);
    }
    if (!this.concepto && this.plan && typeof this.importePlan === "number" && !this.planPagoId) {
      this.concepto = `Cargo mensual plan ${this.plan} ${this.periodo || ""}`.trim();
    }
  }
  next();
});

export default mongoose.model("MovimientoProveedor", movimientoProveedorSchema);
