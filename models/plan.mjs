import mongoose from "mongoose";

const planSchema = new mongoose.Schema({
  nombre:  { type: String, required: true, trim: true, unique: true },
  detalle: { type: String, trim: true, default: "" },
  importe: { type: Number, required: true, min: 0 },
  activo:  { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("Plan", planSchema);