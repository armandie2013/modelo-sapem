import mongoose from "mongoose";

const proveedorSchema = new mongoose.Schema({
  numeroProveedor: { type: Number, required: true, unique: true },

  nombreFantasia:   { type: String, required: true, trim: true },
  nombreReal:       { type: String, required: true, trim: true },
  cuit:             { type: String, required: true, trim: true },
  domicilio:        { type: String, required: true, trim: true },
  domicilioFiscal:  { type: String, required: true, trim: true },

  telefonoCelular:  { type: String, trim: true },
  telefonoFijo:     { type: String, trim: true },
  email:            { type: String, trim: true },
  cbu:              { type: String, trim: true },

  categoria:   { type: String, required: true, trim: true },
  condicionIva:{ type: String, required: true, enum: ["Responsable Inscripto","Monotributo","Exento","Consumidor Final","Otro"] },

  // ✅ Solo estos dos para planes
  activo: { type: Boolean, default: true },
  plan:   { type: mongoose.Schema.Types.ObjectId, ref: "Plan", default: null },
}, { timestamps: true });

export default mongoose.model("Proveedor", proveedorSchema);