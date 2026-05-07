import mongoose from "mongoose";

const tecnologiasPermitidas = [
  "FTTH",
  "Radio Enlace",
  "RADIOENLACE",
  "Satelital",
  "Cable",
  "Fibra Óptica",
  "Wireless",
  "Otro",
];

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
      enum: tecnologiasPermitidas,
      trim: true,
    },
  },
  { timestamps: true }
);

const PredioEscuela =
  mongoose.models.PredioEscuela ||
  mongoose.model("PredioEscuela", predioEscuelaSchema);

export default PredioEscuela;