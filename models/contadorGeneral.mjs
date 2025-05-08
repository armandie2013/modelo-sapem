// models/contadorGeneral.mjs
import mongoose from "mongoose";

const contadorGeneralSchema = new mongoose.Schema({
  modulo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  ultimoNumero: {
    type: Number,
    required: true,
    default: 0,
  },
});

const ContadorGeneral = mongoose.model(
  "ContadorGeneral",
  contadorGeneralSchema
);
export default ContadorGeneral;
