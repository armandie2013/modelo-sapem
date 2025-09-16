// models/planPago.mjs
import mongoose from "mongoose";
import clock from "../utils/clock.mjs";

const { Schema } = mongoose;

const cuotaSchema = new Schema(
  {
    n: { type: Number, required: true, min: 1 },                           // 1..N
    periodoCuota: { type: String, match: /^\d{4}-(0[1-9]|1[0-2])$/ },       // YYYY-MM (opcional)
    vencimiento: { type: Date, required: true },                            // fecha de vencimiento de la cuota
    importeCuota: { type: Number, required: true, min: 0 },
    saldoCuota: { type: Number, required: true, min: 0 },
    estado: {
      type: String,
      enum: ["pendiente", "parcial", "pagada", "anulada"],
      default: "pendiente",
      index: true,
    },
    // cargo generado en MovimientoProveedor para esta cuota (lo seteás al crear el plan)
    movimientoId: { type: Schema.Types.ObjectId, ref: "MovimientoProveedor", default: null, index: true },
  },
  { _id: false }
);

const planPagoSchema = new Schema(
  {
    proveedor: { type: Schema.Types.ObjectId, ref: "Proveedor", required: true, index: true },

    estado: {
      type: String,
      enum: ["borrador", "activo", "cancelado", "finalizado"],
      default: "borrador",
      index: true,
    },

    // cómo se seleccionaron los comprobantes: FIFO o manual
    criterio: { type: String, enum: ["FIFO", "seleccion-manual"], default: "seleccion-manual" },

    // comprobantes (movimientos) originales incluidos en el plan (cargos / ND)
    movimientosOriginales: [{ type: Schema.Types.ObjectId, ref: "MovimientoProveedor" }],

    totalOriginal: { type: Number, required: true, min: 0 }, // suma de seleccionados
    anticipo: { type: Number, default: 0, min: 0 },

    cuotasCantidad: { type: Number, required: true, enum: [3, 6, 9, 12] },
    importeCuota: { type: Number, required: true, min: 0 },

    cuotas: { type: [cuotaSchema], default: [] },

    // auditoría
    creadoPor: { type: Schema.Types.ObjectId, ref: "Usuario", default: null },
    comentarios: { type: String, trim: true, default: "" },
  },
  {
    timestamps: { currentTime: () => clock.nowMs() },
  }
);

// índices útiles
planPagoSchema.index({ proveedor: 1, createdAt: -1 });

export default mongoose.model("PlanPago", planPagoSchema);