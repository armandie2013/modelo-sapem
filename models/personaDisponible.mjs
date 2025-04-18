import mongoose from "mongoose";

const personaSchema = new mongoose.Schema({
  numeroOrden: { type: Number, required: true },
  legajo: { type: String, required: true },
  nombreApellido: { type: String, required: true },
  dni: { type: String, required: true, unique: true },
  cargo: { type: String, required: true },
  modulosPermitidos: { type: [String], default: [] }, // ← Nuevo campo
});

const PersonaDisponible = mongoose.model("PersonaDisponible", personaSchema);
export default PersonaDisponible;