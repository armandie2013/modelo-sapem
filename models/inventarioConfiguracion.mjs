import mongoose from "mongoose";
import { proteccionInventario } from "../services/inventarioPersistencia.mjs";

const schema = new mongoose.Schema({
  _id: String,

  depositoPrincipal: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "InvLugar",
    required: true,
  },
});

schema.plugin(proteccionInventario);

export default mongoose.model(
  "InvConfiguracion",
  schema
);