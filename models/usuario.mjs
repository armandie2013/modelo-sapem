import mongoose from "mongoose";

const usuarioSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  rol: {
    type: String,
    enum: ["admin", "usuario"],
    default: "usuario",
  },
  creadoEn: {
    type: Date,
    default: Date.now,
  },
});

const Usuario = mongoose.model("Usuario", usuarioSchema);
export default Usuario;
