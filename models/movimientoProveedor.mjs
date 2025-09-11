import mongoose from "mongoose";
const { Schema } = mongoose;

const movimientoProveedorSchema = new Schema({
  proveedor: { type: Schema.Types.ObjectId, ref: "Proveedor", required: true, index: true },
  tipo: { type: String, enum: ["cargo","pago","credito","debito"], required: true },
  concepto: { type: String, trim: true },
  periodo: { type: String, match: /^\d{4}-\d{2}$/ }, // YYYY-MM para cargos mensuales
  fecha: { type: Date, default: Date.now },
  importe: { type: Number, required: true, min: 0 },

  // snapshot del plan/importe al momento del cargo (para que cambios futuros no afecten el histórico)
  plan: { type: Schema.Types.ObjectId, ref: "Plan" },
  importePlan: { type: Number, min: 0 },
}, { timestamps: true });

// Evita duplicar el cargo del mismo período
movimientoProveedorSchema.index(
  { proveedor: 1, periodo: 1, tipo: 1 },
  { unique: true, partialFilterExpression: { tipo: "cargo" } }
);

export default mongoose.model("MovimientoProveedor", movimientoProveedorSchema);