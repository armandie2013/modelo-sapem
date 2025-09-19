import mongoose from "mongoose";

const personaSchema = new mongoose.Schema({
  numeroOrden: { type: Number, required: true },
  legajo: { type: String, required: true },
  nombreApellido: { type: String, required: true },
  dni: { type: String, required: true, unique: true },
  cargo: { type: String, required: true },
  modulosPermitidos: {
    viaticos: {
      ver: { type: Boolean, default: false },
      crear: { type: Boolean, default: false },
      editar: { type: Boolean, default: false },
      eliminar: { type: Boolean, default: false },
    },
    materiales: {
      ver: { type: Boolean, default: false },
      crear: { type: Boolean, default: false },
      editar: { type: Boolean, default: false },
      eliminar: { type: Boolean, default: false },
    },
    escuelas: {
      ver: { type: Boolean, default: false },
      crear: { type: Boolean, default: false },
      editar: { type: Boolean, default: false },
      eliminar: { type: Boolean, default: false },
    },
    proveedores: {
      ver: { type: Boolean, default: false },
      crear: { type: Boolean, default: false },
      editar: { type: Boolean, default: false },
      eliminar: { type: Boolean, default: false },
    },
    planes: {
      ver: { type: Boolean, default: false },
      crear: { type: Boolean, default: false },
      editar: { type: Boolean, default: false },
      eliminar: { type: Boolean, default: false },
    },
    pagos: {
      ver: { type: Boolean, default: false },
      crear: { type: Boolean, default: false },
      editar: { type: Boolean, default: false },
      eliminar: { type: Boolean, default: false },
    },
    notasCredito: {
      ver: { type: Boolean, default: false },
      crear: { type: Boolean, default: false },
      editar: { type: Boolean, default: false },
      eliminar: { type: Boolean, default: false },
    },
    notasDebito: {
      ver: { type: Boolean, default: false },
      crear: { type: Boolean, default: false },
      editar: { type: Boolean, default: false },
      eliminar: { type: Boolean, default: false },
    },
    planesPago: {
      ver: { type: Boolean, default: false },
      crear: { type: Boolean, default: false },
      editar: { type: Boolean, default: false },
      eliminar: { type: Boolean, default: false },
    },

    // 🔹 NUEVO: módulo de tareas programadas
    tareas: {
      ver: { type: Boolean, default: false },       // Ver /tareas/cargos
      ejecutar: { type: Boolean, default: false },  // Disparar manualmente generación
    },

    // (otros módulos a futuro…)
  },
});

const PersonaDisponible = mongoose.model("PersonaDisponible", personaSchema);
export default PersonaDisponible;
