import { Producto, Contador } from '../models/inventario.mjs';
import { ejecutarOperacion } from './inventarioPersistencia.mjs';

const texto = valor => String(valor ?? '').trim();

const mayusculas = valor =>
  texto(valor).toLocaleUpperCase('es-AR');

function primeraMayuscula(valor) {
  return texto(valor).replace(
    /\p{L}/u,
    letra => letra.toLocaleUpperCase('es-AR')
  );
}

function exigir(condicion, mensaje) {
  if (!condicion) {
    const error = new Error(mensaje);
    error.status = 400;
    throw error;
  }
}

export function normalizarProducto(valor) {
  return texto(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\b(MK|MIKROTI)\b/g, 'MIKROTIK')
    .replace(/[^A-Z0-9]/g, '');
}

export function sonSimilares(a, b) {
  const nombreA = normalizarProducto(a.nombre);
  const nombreB = normalizarProducto(b.nombre);
  const modeloA = normalizarProducto(a.modelo);
  const modeloB = normalizarProducto(b.modelo);

  if (
    (
      nombreA &&
      nombreB &&
      (
        nombreA.includes(nombreB) ||
        nombreB.includes(nombreA)
      )
    ) ||
    (modeloA && modeloB && modeloA === modeloB)
  ) {
    return true;
  }

  const tokens = valor =>
    texto(valor)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .match(/[A-Z0-9]+/g) || [];

  const tokensA = tokens(a.nombre);
  const tokensB = tokens(b.nombre);

  if (
    tokensA.length >= 2 &&
    tokensB.length >= 2 &&
    tokensA.filter(token => tokensB.includes(token)).length /
      Math.max(tokensA.length, tokensB.length) >= 0.75
  ) {
    return true;
  }

  const numerosA =
    String(a.modelo || a.nombre || '').match(/\d{3,}/g) || [];

  const numerosB =
    String(b.modelo || b.nombre || '').match(/\d{3,}/g) || [];

  return numerosA.some(numero => numerosB.includes(numero));
}

export async function similaresProducto(body, excluir = '') {
  const productos = await Producto.find().lean();

  return productos
    .filter(producto =>
      String(producto._id) !== String(excluir) &&
      sonSimilares(body, producto)
    )
    .slice(0, 12);
}

export async function datosProducto(body, excluir = '') {
  const ficha = excluir
    ? await Producto.findById(excluir)
    : null;

  exigir(!excluir || ficha, 'Producto inexistente.');

  if (ficha) {
    body = {
      ...body,
      codigo: ficha.codigo
    };
  }

  const datos = {
    codigo: texto(body.codigo).toUpperCase(),
    nombre: mayusculas(body.nombre),
    marca: mayusculas(body.marca),
    modelo: mayusculas(body.modelo),
    descripcion: primeraMayuscula(body.descripcion),
    unidad: texto(body.unidad) || 'unidad',
    serializado: body.serializado === 'si'
  };

  exigir(
    datos.codigo && datos.codigo.length <= 60,
    'Ingresá un código de hasta 60 caracteres.'
  );

  exigir(
    datos.nombre && datos.nombre.length <= 180,
    'Ingresá un nombre de hasta 180 caracteres.'
  );

  exigir(
    datos.marca.length <= 100 &&
    datos.modelo.length <= 100 &&
    datos.descripcion.length <= 2000 &&
    datos.unidad.length <= 30,
    'Los datos del producto superan el largo permitido.'
  );

  exigir(
    ['si', 'no'].includes(body.serializado),
    'Indicá el tipo de control.'
  );

  const existente = await Producto.findOne({
    codigo: datos.codigo
  });

  exigir(
    !existente || String(existente._id) === String(excluir),
    'Ya existe un producto con ese código.'
  );

  const similares = await similaresProducto(datos, excluir);

  exigir(
    !similares.length || body.confirmarSimilar === 'si',
    'Hay productos similares: ' +
      similares
        .map(producto =>
          `${producto.codigo} · ${producto.nombre} ` +
          `(${producto.marca || ''} ${producto.modelo || ''})`
        )
        .join('; ') +
      '. Revisá las fichas existentes o marcá que se trata de un producto distinto.'
  );

  return datos;
}

export async function crearProductoCatalogo(body) {
  return ejecutarOperacion(async () => {
    const codigos = await Producto.find()
      .select('codigo')
      .lean();

    const maximo = codigos.reduce((max, producto) => {
      const coincidencia = /^PR(\d{4})$/.exec(
        producto.codigo || ''
      );

      return coincidencia
        ? Math.max(max, Number(coincidencia[1]))
        : max;
    }, 0);

    await Contador.updateOne(
      { _id: 'productos' },
      { $setOnInsert: { valor: maximo } },
      { upsert: true }
    );

    const actual = await Contador.findById('productos');

    if (actual.valor < maximo) {
      await Contador.updateOne(
        { _id: 'productos' },
        { $set: { valor: maximo } }
      );
    }

    const contador = await Contador.findByIdAndUpdate(
      'productos',
      { $inc: { valor: 1 } },
      { new: true }
    );

    exigir(
      contador.valor <= 9999,
      'Se agotaron los códigos PR0001 a PR9999. Debe ampliarse el formato.'
    );

    const codigo =
      `PR${String(contador.valor).padStart(4, '0')}`;

    return Producto.create(
      await datosProducto({
        ...body,
        codigo
      })
    );
  });
}