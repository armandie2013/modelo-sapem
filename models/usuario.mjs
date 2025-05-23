import mongoose from "mongoose";

const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, trim: true },
  apellido: { type: String, required: true, trim: true },
  dni: { type: Number, required: true, unique: true, trim: true },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: { type: String, required: true },
  rol: { type: String, enum: ["admin", "usuario"], default: "usuario" },
  creadoEn: { type: Date, default: Date.now },
});

// // crea índices únicos en MongoDB si aún no existen
// usuarioSchema.index({ dni: 1 }, { unique: true });

const Usuario = mongoose.model("Usuario", usuarioSchema);
export default Usuario;
