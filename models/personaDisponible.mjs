import mongoose from "mongoose";

const personaDisponibleSchema = new mongoose.Schema({
  numeroOrden: { type: Number, required: true },
  legajo: { type: String, required: true },
  nombreApellido: { type: String, required: true },
  dni: { type: String, required: true, unique: true },
  cargo: { type: String, required: true },
});

export default mongoose.model("PersonaDisponible", personaDisponibleSchema);