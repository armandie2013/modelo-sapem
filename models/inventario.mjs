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
      enum: ["disponible", "revision", "asignado", "produccion", "pendiente_baja"],
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
      enum: ["disponible", "revision", "asignado", "produccion", "pendiente_baja", "baja"],
      required: true,
    },
    baja: ref("InvBaja", false),
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
  retirado: { type: Number, default: 0 },
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
      enum: ["ingreso", "asignacion", "produccion", "devolucion", "traspaso"],
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
    originalTipo: { type: String, enum: ["asignacion", "produccion"] },
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

const baja = new Schema({
  numero: { type: Number, unique: true, required: true },
  equipo: ref('InvEquipo'),
  original: ref('InvMovimiento'),
  comprobanteOriginal: Number,
  serie: text(true),
  producto: text(true),
  codigo: text(),
  marca: text(),
  modelo: text(),
  ubicacion: text(true),
  responsable: text(),
  motivo: { type: String, enum: ['perdida', 'sustraccion'], required: true },
  fecha: { type: Date, required: true },
  observaciones: text(),
  estado: { type: String, enum: ['pendiente', 'confirmada', 'recuperada'], default: 'pendiente' },
  informadoPor: text(true),
  confirmacion: { fecha: Date, usuario: String },
  recuperacion: { fecha: Date, usuario: String, deposito: String, observaciones: String },
}, options);
baja.index({ equipo: 1, numero: 1 });
baja.index({ original: 1, numero: 1 });
baja.index({ estado: 1, numero: -1 });

const archivo = new Schema(
  {
    movimiento: { ...ref("InvMovimiento", false), required() { return !this.baja; } },
    baja: ref("InvBaja", false),
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
archivo.index({ baja: 1 });

const contador = new Schema({
  _id: String,
  valor: {
    type: Number,
    default: 0,
  },
});

const borrador = new Schema({
  tipo: { type: String, enum: ['ingreso', 'asignacion', 'produccion', 'devolucion', 'traspaso'], required: true },
  datos: { type: Schema.Types.Mixed, required: true },
  productos: [Schema.Types.ObjectId], lugares: [Schema.Types.ObjectId],
  version: { type: Number, default: 0 },
  creadoPor: { id: ref('Usuario'), nombre: text(true) }
}, options);
const anulacion = new Schema({
  movimiento: { ...ref('InvMovimiento'), unique: true }, fecha: { type: Date, required: true },
  motivo: text(true), usuario: text(true)
}, options);
const revision = new Schema({
  producto: ref('InvProducto'), lugar: ref('InvLugar'), equipo: ref('InvEquipo', false),
  serie: text(), cantidad: { type: Number, required: true, min: 1000 },
  usuario: ref('Usuario'), operador: text(true),
}, options);
revision.index({ equipo: 1, createdAt: -1 });
for (const esquema of [producto, lugar, saldo, equipo, movimiento, archivo, contador, borrador, anulacion, baja, revision]) esquema.plugin(proteccionInventario);
export const Revision = model("InvRevision", revision);
export const Baja = model("InvBaja", baja);
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
    Baja,
    Revision,
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