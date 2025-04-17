import mongoose from "mongoose";

const contadorSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  valor: { type: Number, default: 1 },
});

export default mongoose.model("Contador", contadorSchema);