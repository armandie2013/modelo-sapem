import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  detalle: { type: String, required: true },
  datoTecnico: { type: String, required: true },
  cantidad: { type: Number, required: true },
  unidad: {
    type: String,
    required: true,
    enum: ["bobina", "metro", "litro", "kilo", "pieza", "unidad"],
  },
});

const pedidoMaterialSchema = new mongoose.Schema(
  {
    fecha: { type: Date, required: true },
    numeroPedido: { type: Number, required: true, unique: true },
    areaSolicitante: { type: String, required: true },
    proyecto: { type: String, required: true },
    items: [itemSchema],
    creadoPor: { type: String },
    editadoPor: { type: String },
  },
  { timestamps: true }
);

const PedidoMaterial = mongoose.model("PedidoMaterial", pedidoMaterialSchema);

export default PedidoMaterial;
