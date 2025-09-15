// models/proveedor.mjs
import mongoose from "mongoose";
import clock from "../utils/clock.mjs";

const proveedorSchema = new mongoose.Schema(
  {
    numeroProveedor: { type: Number, required: true, unique: true, index: true },

    nombreFantasia:  { type: String, required: true, trim: true },
    nombreReal:      { type: String, required: true, trim: true },

    // Normaliza CUIT a solo dígitos; si preferís, podés agregar unique: true
    cuit:            { type: String, required: true, trim: true, set: v => (v || "").replace(/\D/g, ""), index: true },

    domicilio:       { type: String, required: true, trim: true },
    domicilioFiscal: { type: String, required: true, trim: true },

    telefonoCelular: { type: String, trim: true },
    telefonoFijo:    { type: String, trim: true },
    email:           { type: String, trim: true, lowercase: true },
    cbu:             { type: String, trim: true },

    categoria:   { type: String, required: true, trim: true },
    condicionIva:{ type: String, required: true, enum: ["Responsable Inscripto","Monotributo","Exento","Consumidor Final","Otro"] },

    // Estado y plan asignado
    activo: { type: Boolean, default: true },
    plan:   { type: mongoose.Schema.Types.ObjectId, ref: "Plan", default: null },

    // ✅ Override opcional del importe del plan (en USD) usado en las vistas
    // Si está definido, mostrás este en lugar del plan.importe
    precioPlan: { type: Number, min: 0, default: undefined },
  },
  {
    // ⏱️ timestamps basados en el reloj central
    timestamps: { currentTime: () => clock.nowMs() },
  }
);

export default mongoose.model("Proveedor", proveedorSchema);