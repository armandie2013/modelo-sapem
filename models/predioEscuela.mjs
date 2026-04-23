import mongoose from "mongoose";

const predioEscuelaSchema = new mongoose.Schema(
  {
    predio: { type: String, required: true, trim: true, index: true },
    cue: { type: String, required: true, trim: true, index: true },
    nombreEscuela: { type: String, required: true, trim: true },
    direccion: { type: String, required: true, trim: true },
    ciudad: { type: String, required: true, trim: true },
    departamento: { type: String, required: true, trim: true },
    megabytesAsignados: { type: Number, required: true, min: 0 },
    isp: { type: String, required: true, trim: true },
    tecnologia: {
      type: String,
      required: true,
      enum: ["FTTH", "Radio Enlace", "Cable", "Fibra Óptica", "Wireless", "Otro"],
      trim: true,
    },
  },
  { timestamps: true }
);

const PredioEscuela =
  mongoose.models.PredioEscuela ||
  mongoose.model("PredioEscuela", predioEscuelaSchema);

export default PredioEscuela;