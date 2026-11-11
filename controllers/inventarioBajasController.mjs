import { readFile } from 'node:fs/promises';
import { Archivo, Baja, Equipo, Lugar } from '../models/inventario.mjs';
import { exigir } from '../services/inventarioService.mjs';
import { estadosBaja, motivosBaja, estadosInformables, validarId, informarBaja, resolverBaja, adjuntarABaja } from '../services/inventarioBajasService.mjs';
import { enviarPdf, mostrar } from './inventarioController.mjs';

const ruta = '/inventario/bajas';
const etiquetas = { estadosBaja, motivosBaja };
const actor = req => [req.session.usuario.nombre, req.session.usuario.apellido].filter(Boolean).join(' ') || req.session.usuario.email || String(req.session.usuario._id || req.session.usuario.id);

export async function listado(req, res) {
  const estado = Object.hasOwn(estadosBaja, req.query.estado) ? req.query.estado : '';
  const filtro = estado ? { estado } : {};
  const total = await Baja.countDocuments(filtro);
  const pagina = Math.min(Math.max(1, Number.parseInt(req.query.pagina, 10) || 1), Math.max(1, Math.ceil(total / 25)));
  const bajas = await Baja.find(filtro).sort({ numero: -1 }).skip((pagina - 1) * 25).limit(25).lean();
  mostrar(req, res, 'bajas', 'Bajas de equipos', 'bajas', { ...etiquetas, bajas, estado, pagina, total });
}

export async function formulario(req, res) {
  const filtro = { estado: { $in: estadosInformables }, asignacion: { $exists: true, $ne: null } };
  if (req.query.equipo) filtro._id = validarId(req.query.equipo);
  if (req.query.movimiento) filtro.asignacion = validarId(req.query.movimiento);
  exigir(filtro._id || req.query.movimiento, 'Abrí el formulario desde un equipo o comprobante.');
  const equipos = await Equipo.find(filtro).populate('producto', 'codigo nombre marca modelo').sort({ serie: 1 }).lean();
  mostrar(req, res, 'bajaNueva', 'Registrar pérdida o sustracción', 'bajas', { ...etiquetas, equipos });
}

export async function registrar(req, res) {
  if (typeof req.body.equipo === 'string' && /^[a-f0-9]{24}$/i.test(req.body.equipo)) {
    req.invVolver = `${ruta}/nueva?equipo=${req.body.equipo}`;
  }
  const baja = await informarBaja(req.body, req.files || [], actor(req));
  res.redirect(`${ruta}/${baja._id}`);
}

export async function detalle(req, res) {
  const baja = await Baja.findById(validarId(req.params.id)).lean();
  if (!baja) return res.status(404).send('Incidente inexistente.');
  const [archivos, depositos] = await Promise.all([
    Archivo.find({ baja: baja._id }).select('nombre').lean(),
    Lugar.find({ tipo: 'deposito', activo: { $ne: false } }).sort({ nombre: 1 }).select('nombre').lean(),
  ]);
  mostrar(req, res, 'bajaDetalle', `Baja N.º ${baja.numero}`, 'bajas', { ...etiquetas, baja, archivos, depositos });
}

export function resolver(accion) {
  return async (req, res) => {
    const id = validarId(req.params.id);
    req.invVolver = `${ruta}/${id}`;
    await resolverBaja(id, accion, req.body, req.files || [], actor(req), req.invPermisos);
    res.redirect(req.invVolver);
  };
}

export async function acta(req, res) {
  const baja = await Baja.findById(validarId(req.params.id)).lean();
  if (!baja?.confirmacion?.fecha) return res.status(404).send('El acta todavía no está disponible.');
  const logo = (await readFile(new URL('../utils/logoBase64.html', import.meta.url), 'utf8')).trim();
  return enviarPdf(res, 'bajaActa', { ...etiquetas, baja, logo }, `inventario-baja-${baja.numero}.pdf`);
}

export async function adjuntar(req, res) {
  const id = validarId(req.params.id);
  await adjuntarABaja(id, req.files || []);
  res.redirect(303, `${ruta}/${id}`);
}
