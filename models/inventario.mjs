import mongoose from "mongoose";
import { proteccionInventario, recuperarInventarioAlIniciar } from "../services/inventarioPersistencia.mjs";

const { Schema, model } = mongoose;

const ref = (name, required = true) => ({
  type: Schema.Types.ObjectId,
  ref: name,
  required,
});

const text = (required = false) => ({
  type: String,
  trim: true,
  required,
});

const options = { timestamps: true };

const respaldoProducto = new Schema({
  tipo: { type: String, enum: ['remito', 'factura', 'nota', 'acta', 'otro'], required: true },
  numero: text(true), fecha: { type: Date, required: true }, emisor: text(true)
}, { _id: false });

const producto = new Schema(
  {
    codigo: {
      ...text(true),
      uppercase: true,
      unique: true,
    },
    nombre: text(true),
    marca: text(false), modelo: text(false), descripcion: text(false),
    unidad: {
      ...text(true),
      default: "unidad",
    },
    documentoAlta: { type: respaldoProducto, required: false },
    altaBorrador: ref('InvBorrador', false), ingresoAlta: ref('InvMovimiento', false),
    pendienteIngreso: { type: Boolean, default: false },
    activo: { type: Boolean, default: true },
    serializado: {
      type: Boolean,
      default: false,
    },
  },
  options
);

const lugar = new Schema(
  {
    nombre: {
      ...text(true),
      unique: true,
    },
    tipo: {
      type: String,
      enum: ["deposito", "destino"],
      required: true,
    },
    activo: { type: Boolean, default: true },
    direccion: text(),
    responsable: text(),
    dni: text(),
  },
  options
);

// Cantidades en milésimas: una unidad equivale a 1000.
const saldo = new Schema(
  {
    producto: ref("InvProducto"),
    lugar: ref("InvLugar"),
    estado: {
      type: String,
      enum: ["disponible", "revision", "asignado"],
      required: true,
    },
    cantidad: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  options
);

saldo.index(
  { producto: 1, lugar: 1, estado: 1 },
  { unique: true }
);

const equipo = new Schema(
  {
    producto: ref("InvProducto"),
    serie: {
      ...text(true),
      uppercase: true,
      unique: true,
    },
    mac: text(),
    patrimonio: text(),
    lugar: ref("InvLugar"),
    estado: {
      type: String,
      enum: ["disponible", "revision", "asignado"],
      required: true,
    },
    asignacion: ref("InvMovimiento", false),
  },
  options
);

const identidad = new Schema(
  {
    serie: text(true),
    mac: text(),
    patrimonio: text(),
  },
  { _id: false }
);

const item = new Schema({
  producto: ref("InvProducto"),
  codigo: text(true),
  nombre: text(true),
  marca: text(),
  modelo: text(),
  unidad: text(true),
  serializado: Boolean,
  cantidad: {
    type: Number,
    required: true,
    min: 1,
  },
  devuelto: {
    type: Number,
    default: 0,
  },
  series: [identidad],
});

const documento = new Schema(
  {
    tipo: {
      type: String,
      enum: ["remito", "factura", "nota", "acta", "otro"],
      required: true,
    },
    numero: text(true),
    fecha: {
      type: Date,
      required: true,
    },
    emisor: text(true),
  },
  { _id: false }
);

const movimiento = new Schema(
  {
    estado: { type: String, enum: ['confirmado', 'anulado'], default: 'confirmado' },
    anulacion: { fecha: Date, motivo: String, usuario: String, registro: Schema.Types.ObjectId },
    numero: {
      type: Number,
      unique: true,
      required: true,
    },
    clave: {
      ...text(true),
      unique: true,
    },
    tipo: {
      type: String,
      enum: ["ingreso", "asignacion", "devolucion", "traspaso"],
      required: true,
    },
    fecha: {
      type: Date,
      required: true,
    },
    origen: ref("InvLugar", false),
    destino: ref("InvLugar"),

    // Se conservan los nombres usados al registrar la operación.
    origenNombre: text(),
    origenDireccion: text(),
    destinoNombre: text(true),
    destinoDireccion: text(),

    original: ref("InvMovimiento", false),
    originalNumero: Number,

    estadoRecepcion: {
      type: String,
      enum: ["disponible", "revision"],
      default: "disponible",
    },

    entrega: text(true),
    recibe: text(true),
    dniRecibe: text(),
    observaciones: text(),

    documentos: [documento],
    items: [item],

    creadoPor: {
      id: ref("Usuario"),
      nombre: text(true),
    },
  },
  options
);

movimiento.index({ fecha: -1 });

const archivo = new Schema(
  {
    movimiento: ref("InvMovimiento"),
    nombre: text(true),
    mime: text(true),
    datos: {
      type: Buffer,
      required: true,
      select: false,
    },
  },
  options
);

archivo.index({ movimiento: 1 });

const contador = new Schema({
  _id: String,
  valor: {
    type: Number,
    default: 0,
  },
});

const borrador = new Schema({
  tipo: { type: String, enum: ['ingreso', 'asignacion', 'devolucion', 'traspaso'], required: true },
  datos: { type: Schema.Types.Mixed, required: true },
  productos: [Schema.Types.ObjectId], lugares: [Schema.Types.ObjectId],
  version: { type: Number, default: 0 },
  creadoPor: { id: ref('Usuario'), nombre: text(true) }
}, options);
const anulacion = new Schema({
  movimiento: { ...ref('InvMovimiento'), unique: true }, fecha: { type: Date, required: true },
  motivo: text(true), usuario: text(true)
}, options);
for (const esquema of [producto, lugar, saldo, equipo, movimiento, archivo, contador, borrador, anulacion]) esquema.plugin(proteccionInventario);
export const Borrador = model('InvBorrador', borrador);
export const Anulacion = model('InvAnulacion', anulacion);
export const Producto = model("InvProducto", producto);
export const Lugar = model("InvLugar", lugar);
export const Saldo = model("InvSaldo", saldo);
export const Equipo = model("InvEquipo", equipo);
export const Movimiento = model("InvMovimiento", movimiento);
export const Archivo = model("InvArchivo", archivo);
export const Contador = model("InvContador", contador);

export async function prepararInventario() {
  for (const modelo of [
    Producto,
    Lugar,
    Saldo,
    Equipo,
    Movimiento,
    Archivo,
    Contador,
    Borrador,
    Anulacion,
  ]) {
    await modelo.init();
  }

  await recuperarInventarioAlIniciar();

  await Contador.updateOne(
    { _id: "movimientos" },
    { $setOnInsert: { valor: 0 } },
    { upsert: true }
  );
}