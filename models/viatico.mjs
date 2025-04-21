import mongoose from "mongoose";

const viaticoSchema = new mongoose.Schema({
  fechaDeCreacion: { type: Date, required: true },
  areaSolicitante: { type: String, required: true },
  cantidadDeViajantes: { type: Number, required: true },
  viajantes: [
    {
      nombre: { type: String, required: true },
      cargo: { type: String, required: true },
      importe: { type: Number, required: true },
    },
  ],

  numeroDeViaje: { type: Number, required: true },
  motivoDelViaje: { type: String, required: true },
  origen: { type: String, required: true },
  destino: { type: String, required: true },
  fechaDeSalida: { type: Date, required: true },
  fechaDeLlegada: { type: Date, required: true },
  montoTotalViatico: { type: Number, required: true },
  adicionalEnEfectivo: { type: Number, required: true },
  devolucionEnEfectivo: { type: Number, required: true },
  pendienteDeRendicion: { type: Number, required: true },
  valesCombustible: { type: Boolean, default: false },
  valorVale: { type: Number },
  cantidadVale: { type: Number },
  totalVale: { type: Number },
  vehiculoUtilizado: { type: String },
  creadoPor: { type: String },
});

const Viatico = mongoose.model("Viatico", viaticoSchema, "viaticos");

export default Viatico;
