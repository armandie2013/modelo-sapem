import mongoose from "mongoose";

const escuelaSchema = new mongoose.Schema({
  fechaDeCreacion: { type: Date, required: true },
  nombre: { type: String, required: true, trim: true },
  predio: { type: String, required: true, trim: true },
  cue: { type: String, required: true, trim: true },
  provincia: { type: String, required: true, trim: true },
  departamento: { type: String, required: true, trim: true },
  ciudad: { type: String, required: true, trim: true },
  direccion: { type: String, required: true, trim: true },
  proveedor: { type: String, required: true, trim: true },
  detalleDelCaso: { type: String, required: true },
  observacionesTecnica: { type: String, default: "" },
  numeroTicket: { type: Number, required: true, unique: true },
  creadoPor: { type: String, required: true },
  editadoPor: { type: String, default: null },
  imagenes: { type: [String], default: [] },
  estado: { type: String, enum: ['Abierto', 'Cerrado'], default: 'Abierto' }
});

const Escuela = mongoose.models.Escuela || mongoose.model("Escuela", escuelaSchema);
export default Escuela;