// Pruebas con adaptadores de MongoDB/Mongoose en memoria.
// Ejecutar: node --experimental-vm-modules tests/inventario-logica.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
let secuencia=1;
class Id { constructor(v){this.v=String(v||String(secuencia++).padStart(24,'0'));} toString(){return this.v;} equals(x){return this.v===String(x);} toJSON(){return this.v;} }
const copiar=x=>x instanceof Id?new Id(x.v):x instanceof Date?new Date(x):Buffer.isBuffer(x)?Buffer.from(x):Array.isArray(x)?x.map(copiar):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,copiar(v)])):x;
const igual=(a,b)=>a instanceof Id||b instanceof Id?String(a)===String(b):a instanceof Date||b instanceof Date?+new Date(a)===+new Date(b):a===b;
function valores(obj,camino){const partes=camino.split('.');let fila=[obj];for(const p of partes)fila=fila.flatMap(v=>Array.isArray(v)?v.flatMap(i=>i?.[p]):[v?.[p]]);return fila.flatMap(v=>Array.isArray(v)?v:[v]);}
function condicion(a,b){
 if(b&&typeof b==='object'&&!(b instanceof Id)&&!(b instanceof Date))return Object.entries(b).every(([op,v])=>{
  if(op==='$gte')return a>=v;if(op==='$gt')return a>v;if(op==='$lt')return a<v;
  if(op==='$ne')return !igual(a,v);if(op==='$in')return v.some(x=>igual(a,x));
  if(op==='$elemMatch')return Array.isArray(a)&&a.some(x=>coincide(x,v));
  return false;
 });
 return igual(a,b);
}
function coincide(doc,f={}){return Object.entries(f).every(([k,v])=>{
 if(k==='$or')return v.some(x=>coincide(doc,x));
 if(k==='$and')return v.every(x=>coincide(doc,x));
 if(v?.$elemMatch)return condicion(doc[k],v);
 const vs=valores(doc,k);return v?.$ne!==undefined?vs.every(x=>condicion(x,v)):vs.some(x=>condicion(x,v));
});}
const tablas=new Map();const filas=nombre=>{if(!tablas.has(nombre))tablas.set(nombre,[]);return tablas.get(nombre);};
function duplicado(){return Object.assign(new Error('Clave duplicada'),{code:11000});}
const uniques=new Map();let fallo=null;
const db={collection(nombre){return {
 collectionName:nombre,name:nombre,async createIndex(){},
 async findOne(f){return copiar(filas(nombre).find(d=>coincide(d,f))||null);},
 find(f={}){const result=filas(nombre).filter(d=>coincide(d,f)).map(copiar);return {async *[Symbol.asyncIterator](){yield*result;},async toArray(){return result;}};},
 async insertOne(d){const doc=copiar(d);doc._id??=new Id();
  if(filas(nombre).some(x=>igual(x._id,doc._id)))throw duplicado();
  for(const keys of uniques.get(nombre)||[])if(filas(nombre).some(x=>keys.every(k=>igual(x[k],doc[k]))))throw duplicado();
  filas(nombre).push(doc);return {insertedId:doc._id};},
 async deleteOne(f){const i=filas(nombre).findIndex(d=>coincide(d,f));if(i<0)return {deletedCount:0};filas(nombre).splice(i,1);return {deletedCount:1};},
 async deleteMany(f){const antes=filas(nombre).length;tablas.set(nombre,filas(nombre).filter(d=>!coincide(d,f)));return {deletedCount:antes-filas(nombre).length};},
 async updateOne(f,u,o={}){let doc=filas(nombre).find(d=>coincide(d,f));let nuevo=false;
  if(!doc&&o.upsert){doc=Object.fromEntries(Object.entries(f).filter(([k,v])=>!k.startsWith('$')&&(!v||typeof v!=='object'||v instanceof Id)));doc={...copiar(doc),...copiar(u.$setOnInsert||{})};doc._id??=new Id();await this.insertOne(doc);doc=filas(nombre).find(x=>igual(x._id,doc._id));nuevo=true;}
  if(!doc)return {modifiedCount:0,matchedCount:0};
  for(const [k,v]of Object.entries(u.$set||{}))doc[k]=copiar(v);
  for(const [k,v]of Object.entries(u.$inc||{}))doc[k]=(doc[k]||0)+v;
  return {modifiedCount:1,matchedCount:1,upsertedId:nuevo?doc._id:null};}
 };},admin(){return {command:async()=>({})};}};
class Schema {
 static Types={ObjectId:Id,Mixed:Object};
 constructor(def={},opts={}){this.def=def;this.opts=opts;this.hooks={};this.indices=[];}
 pre(op,fn){(this.hooks[op]||=[]).push(fn);}
 index(keys,opts){this.indices.push([keys,opts]);}
 plugin(fn){fn(this);}
 path(p){return {cast:v=>this.def[p]===String?String(v):v instanceof Id?v:new Id(v)};}
}
const modelos={};
function model(nombre,schema){
 const col=nombre.toLowerCase()+'s';
 const u=Object.entries(schema.def).filter(([k,v])=>v?.unique).map(([k])=>[k]);
 for(const[k,o]of schema.indices)if(o?.unique)u.push(Object.keys(k));uniques.set(col,u);
 class Modelo{
  constructor(datos={}){Object.assign(this,copiar(datos));this._id??=schema.def._id===String?undefined:new Id();this.__v??=0;
   for(const[k,v]of Object.entries(schema.def))if(this[k]===undefined&&v?.default!==undefined)this[k]=typeof v.default==='function'?v.default():copiar(v.default);
   for(const k of ['producto','lugar','origen','destino','original','asignacion','depositoPrincipal'])if(this[k])this[k]=new Id(this[k]);
   if(nombre==='InvMovimiento'){
    this.items??=[];this.documentos??=[];this.items=this.items.map(i=>({...i,producto:new Id(i.producto),devuelto:i.devuelto||0}));
    const push=this.items.push.bind(this.items);this.items.push=i=>push({...i,producto:new Id(i.producto),devuelto:i.devuelto||0});
   }
   if(nombre==='InvBorrador'){this.productos??=[];this.lugares??=[];}
   if(schema.opts.timestamps){this.createdAt??=new Date();this.updatedAt??=new Date();}
  }
  increment(){this.__v++;}
  async save(){for(const fn of schema.hooks.save||[])await fn.call(this);
   if(schema.opts.timestamps)this.updatedAt=new Date();
   const old=filas(col).findIndex(d=>igual(d._id,this._id));if(old>=0)filas(col).splice(old,1);
   await db.collection(col).insertOne({...this});
   if(fallo?.coleccion===col&&!--fallo.restantes){const e=fallo.error;fallo=null;throw e;}
   return this;
  }
  static schema=schema;static collection=db.collection(col);
  static async init(){}
  static async create(d){return new this(d).save();}
  static find(f={}){return new Consulta(this,'find',f);}
  static findOne(f={}){return new Consulta(this,'findOne',f);}
  static findById(id){return this.findOne({_id:id});}
  static exists(f){return this.findOne(f);}
  static updateOne(f,u,o={}){return new Consulta(this,'updateOne',f,u,o);}
  static updateMany(f,u,o={}){return new Consulta(this,'updateMany',f,u,o);}
  static deleteOne(f){return new Consulta(this,'deleteOne',f);}
  static deleteMany(f){return new Consulta(this,'deleteMany',f);}
  static findByIdAndUpdate(id,u,o={}){return new Consulta(this,'findOneAndUpdate',{_id:id},u,o);}
 }
 modelos[nombre]=Modelo;return Modelo;
}
class Consulta{
 constructor(m,op,f,u,o={}){Object.assign(this,{model:m,op,f,u,o});this.limite=Infinity;}
 populate(campo){this.campo=campo;return this;}sort(){return this;}
 session(){return this;}select(){return this;}lean(){this.plano=true;return this;}limit(n){this.limite=n;return this;}
 getFilter(){return this.f;}getOptions(){return this.o;}getUpdate(){return this.u;}setUpdate(u){this.u=u;}
 then(ok,err){return this.ejecutar().then(ok,err);}
 async ejecutar(){
  for(const fn of this.model.schema.hooks[this.op]||[])await fn.call(this);
  const c=this.model.collection, todos=await c.find(this.f).toArray();
  if(this.op==='find'){
   if(this.campo==='lugar')for(const d of todos)d.lugar=await modelos.InvLugar.collection.findOne({_id:d.lugar});
   return todos.slice(0,this.limite).map(d=>this.plano?d:new this.model(d));
  }
  if(this.op==='findOne')return todos[0]?(this.plano?todos[0]:new this.model(todos[0])):null;
  if(this.op==='deleteOne')return c.deleteOne(this.f);if(this.op==='deleteMany')return c.deleteMany(this.f);
  if(this.op==='updateMany'){for(const d of todos)await c.updateOne({_id:d._id},this.u,this.o);return {modifiedCount:todos.length};}
  if(this.op==='updateOne')return c.updateOne(this.f,this.u,this.o);
  if(this.op==='findOneAndUpdate'){await c.updateOne(this.f,this.u,this.o);const d=await c.findOne(todos[0]?{_id:todos[0]._id}:this.f);return d?new this.model(d):null;}
 }
}
const mongoose={Schema,model,Types:{ObjectId:Id},isValidObjectId:x=>/^[a-f0-9]{24}$/i.test(String(x||'')),connection:{db}};
const cache=new Map();
function cargar(url){
 if(cache.has(url))return cache.get(url);
 const modulo=new vm.SourceTextModule(fs.readFileSync(fileURLToPath(url),'utf8'),{identifier:url});cache.set(url,modulo);return modulo;
}
async function resolver(spec,ref){
 if(spec==='mongoose'){
  if(!cache.has(spec))cache.set(spec,new vm.SyntheticModule(['default'],function(){this.setExport('default',mongoose);}));return cache.get(spec);
 }
 if(spec.startsWith('node:')){
  if(!cache.has(spec)){const n=await import(spec);cache.set(spec,new vm.SyntheticModule(Object.keys(n),function(){for(const[k,v]of Object.entries(n))this.setExport(k,v);}));}return cache.get(spec);
 }
 return cargar(new URL(spec,ref.identifier).href);
}
const entrada = new vm.SourceTextModule(`import * as crud from './services/inventarioCrudService.mjs'; import * as documento from './services/inventarioDocumentoService.mjs'; import * as controlador from './controllers/inventarioController.mjs'; export { crud, documento, controlador };`, {identifier:pathToFileURL(root+'/entrada-prueba.mjs').href});
await entrada.link(resolver);await entrada.evaluate();
const crud={namespace:entrada.namespace.crud}, documento=entrada.namespace.documento, controlador=entrada.namespace.controlador;
const servicio=cache.get(pathToFileURL(root+'/services/inventarioService.mjs').href).namespace;
const persistencia=cache.get(pathToFileURL(root+'/services/inventarioPersistencia.mjs').href).namespace;
const m=cache.get(pathToFileURL(root+'/models/inventario.mjs').href).namespace;
const Config=modelos.InvConfiguracion;
await m.prepararInventario();
const usuario={_id:String(new Id()),nombre:'Diego',apellido:'Prueba'};
const p=await m.Producto.create({codigo:'CCR',nombre:'CCR2004',marca:'MikroTik',modelo:'CCR2004',unidad:'unidad',serializado:true});
const central=await servicio.crearLugarInventario({nombre:'Central',tipo:'deposito',principal:true});
const destino=await servicio.crearLugarInventario({nombre:'Ministerio',tipo:'destino',principal:false});
assert.equal(String((await Config.findById('general')).depositoPrincipal),String(central._id));
const serie=Array.from({length:15},(_,i)=>'SERIE'+(i+1));
const base={fecha:'2026-10-29',entrega:'Diego',recibe:'Juan'};
const item=(n,s=[])=>({producto:String(p._id),cantidad:String(n),series:s.join('\n')});
const ingreso={...base,tipo:'ingreso',destino:String(central._id),documentoTipo:'remito',documentoNumero:'R1',documentoFecha:'2026-10-29',emisor:'Proveedor'};
const crear=(datos,items)=>servicio.crearMovimiento({...datos,clave:randomUUID(),items:JSON.stringify(items)},usuario);
const recibido=await crear(ingreso,[item(15,serie)]);
const asignado=await crear({...base,tipo:'asignacion',origen:String(central._id),destino:String(destino._id)},[item(10,serie.slice(0,10))]);
assert.equal(asignado.items[0].marca,'MikroTik');
assert.equal(asignado.items[0].modelo,'CCR2004');
const guardado=await m.Producto.findById(p._id);guardado.marca='Marca corregida';await guardado.save();
assert.equal((await m.Movimiento.findById(asignado._id)).items[0].marca,'MikroTik');
const saldo=async(lugar,estado)=>((await m.Saldo.findOne({producto:p._id,lugar:lugar._id,estado}))?.cantidad||0);
assert.equal(await saldo(central,'disponible'),5000);assert.equal(await saldo(destino,'asignado'),10000);
await assert.rejects(crud.namespace.eliminarRegistro('deposito',String(central._id)));
await assert.rejects(crud.namespace.eliminarRegistro('producto',String(p._id)));
const devuelto=await crear({...base,tipo:'devolucion',original:String(asignado._id),destino:String(central._id),estadoRecepcion:'disponible'},[item(3,serie.slice(0,3))]);
assert.equal(await saldo(central,'disponible'),8000);assert.equal(await saldo(destino,'asignado'),7000);
await assert.rejects(crud.namespace.anularMovimiento(String(asignado._id),'Error de entrega',usuario));
await crud.namespace.anularMovimiento(String(devuelto._id),'Devolución cargada por error',usuario);
assert.equal(await saldo(central,'disponible'),5000);assert.equal(await saldo(destino,'asignado'),10000);
await crud.namespace.anularMovimiento(String(asignado._id),'Asignación cargada por error',usuario);
assert.equal(await saldo(central,'disponible'),15000);assert.equal(await saldo(destino,'asignado'),0);
const inutil=await servicio.crearLugarInventario({nombre:'Mal cargado',tipo:'deposito',principal:false});
await crud.namespace.editarRegistro('deposito',String(inutil._id),{version:0,nombre:'Corregido',direccion:'CAPE',responsable:'Diego',dni:''});
await assert.rejects(crud.namespace.editarRegistro('deposito',String(inutil._id),{version:0,nombre:'Viejo'}));
await crud.namespace.eliminarRegistro('deposito',String(inutil._id));assert.equal(await m.Lugar.findById(inutil._id),null);
await crud.namespace.cambiarActivo('destino',String(destino._id),false);assert.equal((await m.Lugar.findById(destino._id)).activo,false);
await crud.namespace.cambiarActivo('destino',String(destino._id),true);
const b=await crud.namespace.guardarBorrador({...ingreso,documentoNumero:'R2',clave:randomUUID(),items:JSON.stringify([item(1,['DRAFT1'])])},usuario);
assert.equal(await saldo(central,'disponible'),15000);
const confirmado=await crud.namespace.confirmarBorrador({...b.datos,borradorId:String(b._id),borradorVersion:b.version},usuario,[]);
assert.equal(String(confirmado._id),String(b._id));assert.equal(await m.Borrador.findById(b._id),null);assert.equal(await saldo(central,'disponible'),16000);
await crud.namespace.anularMovimiento(String(confirmado._id),'Ingreso de prueba',usuario);
const fotografia=()=>JSON.stringify([...tablas.entries()].filter(([n])=>!n.startsWith('inv_control_')));
const antes=fotografia();
await assert.rejects(crear({...ingreso,documentoRepetido:'si'},[item(2,['NUEVA',serie[0]])]));
assert.equal(fotografia(),antes,'El error debe revertir también los equipos creados antes de detectar la serie duplicada.');
fallo={coleccion:'invequipos',restantes:1,error:Object.assign(new Error('Conexión perdida'),{name:'MongoNetworkError'})};
await assert.rejects(crear({...ingreso,documentoRepetido:'si'},[item(1,['CRASH'])]));
const lock=filas('inv_control_bloqueo')[0];assert(lock);lock.pid=2147483647;
await persistencia.recuperarInventarioAlIniciar();
assert.equal(fotografia(),antes,'El reinicio debe recuperar la operación interrumpida.');
await crud.namespace.anularMovimiento(String(recibido._id),'Ingreso inicial incorrecto',usuario);
assert.equal(await saldo(central,'disponible'),0);
assert.equal((await m.Equipo.find()).length,0);
await assert.rejects(crud.namespace.eliminarRegistro('producto',String(p._id)),'Aunque se anule, se conserva el historial.');
await crud.namespace.cambiarActivo('producto',String(p._id),false);assert.equal((await m.Producto.findById(p._id)).activo,false);
await crud.namespace.cambiarActivo('producto',String(p._id),true);
await assert.rejects(crud.namespace.cambiarActivo('deposito',String(central._id),false));
const concurrencia = await crear({...ingreso,documentoNumero:'R3'},[item(1,['CONCURRENTE'])]);
const asignacionDatos = {...base,tipo:'asignacion',origen:String(central._id),destino:String(destino._id)};
const simultaneas = await Promise.allSettled([
 crear(asignacionDatos,[item(1,['CONCURRENTE'])]), crear(asignacionDatos,[item(1,['CONCURRENTE'])])
]);
assert.equal(simultaneas.filter(r=>r.status==='fulfilled').length,1,'Solo una asignación concurrente puede usar el equipo.');
assert.equal(await saldo(destino,'asignado'),1000);
const ganadora=simultaneas.find(r=>r.status==='fulfilled').value;
await crud.namespace.anularMovimiento(String(ganadora._id),'Prueba concurrente terminada',usuario);
await crud.namespace.anularMovimiento(String(concurrencia._id),'Prueba de ingreso terminada',usuario);
const descartable = await crud.namespace.guardarBorrador({...ingreso,items:'[]',clave:randomUUID()},usuario);
await assert.rejects(crud.namespace.eliminarBorrador(String(descartable._id),0));
await crud.namespace.eliminarBorrador(String(descartable._id),descartable.version);
assert.equal(await m.Borrador.findById(descartable._id),null);
await assert.rejects(documento.registrarDocumento({documentoTipo:'remito'},usuario,[]),'No debe abrir el ingreso sin un documento válido.');
const doc = await documento.registrarDocumento({...ingreso,documentoNumero:'DOC-NUEVO'},usuario,[]);
const nuevoProducto = await documento.crearProductoDocumentado(String(doc._id),{codigo:'NUEVO-DOC',nombre:'Equipo respaldado',unidad:'unidad',serializado:'si'});
assert.equal(nuevoProducto.documentoAlta,undefined);assert.notEqual(nuevoProducto.pendienteIngreso,true);
assert.equal(await m.Saldo.findOne({producto:nuevoProducto._id}),null);
await assert.rejects(documento.crearProductoDocumentado(String(new Id()),{codigo:'SIN-RESPALDO'}));
let actualizado = await m.Borrador.findById(doc._id);
await assert.rejects(crud.namespace.confirmarBorrador({...actualizado.datos,borradorId:String(doc._id),borradorVersion:actualizado.version},usuario,[]));
assert.notEqual((await m.Producto.findById(nuevoProducto._id)).pendienteIngreso,true);
const recepcion = await crud.namespace.confirmarBorrador({...actualizado.datos,borradorId:String(doc._id),borradorVersion:actualizado.version,
 items:JSON.stringify([{producto:String(nuevoProducto._id),cantidad:'1',series:'RESPALDADO-1'}])},usuario,[]);
assert.equal((await m.Producto.findById(nuevoProducto._id)).pendienteIngreso,false);
assert.equal(String((await m.Producto.findById(nuevoProducto._id)).ingresoAlta),String(recepcion._id));
const descartado=await documento.registrarDocumento({...ingreso,documentoNumero:'DESCARTAR'},usuario,[]);
const temporal=await documento.crearProductoDocumentado(String(descartado._id),{codigo:'TEMPORAL-DOC',nombre:'Temporal',unidad:'unidad',serializado:'no'});
actualizado=await m.Borrador.findById(descartado._id);
await crud.namespace.eliminarBorrador(String(descartado._id),actualizado.version);
assert.ok(await m.Producto.findById(temporal._id),'Eliminar un ingreso pendiente conserva las fichas del catálogo.');
const catalogo = cache.get(pathToFileURL(root+'/services/inventarioCatalogoService.mjs').href).namespace;
const cantAntes=(await m.Producto.find()).length;
await controlador.catalogo({body:{catalogo:'producto',codigo:'CAT-5009',nombre:'MikroTik RB5009',marca:'MikroTik',modelo:'RB5009',descripcion:'Router de laboratorio',unidad:'unidad',serializado:'si'},session:{}},{redirect(){}});
assert.equal((await m.Producto.find()).length,cantAntes+1);
const ficha = await m.Producto.findOne({modelo:'RB5009'});
assert.match(ficha.codigo,/^PR\d{4}$/);
const codigoFijo=ficha.codigo;
assert.equal(await m.Saldo.findOne({producto:ficha._id}),null);
assert.equal(await m.Equipo.findOne({producto:ficha._id}),null);
assert.equal(ficha.modelo,'RB5009');
assert.equal(catalogo.sonSimilares({nombre:'Switch Cisco'},{nombre:'Cisco Switch'}),true);
await assert.rejects(crud.namespace.guardarBorrador({...ingreso,documentoNumero:'DECIMAL',items:JSON.stringify([{producto:String(ficha._id),cantidad:'1.5'}])},usuario));
assert.ok((await catalogo.similaresProducto({nombre:'MK 5009'})).some(p=>String(p._id)===String(ficha._id)));
await assert.rejects(catalogo.crearProductoCatalogo({codigo:'CAT-OTRO',nombre:'MK 5009',serializado:'si'}),/similares/);
await catalogo.crearProductoCatalogo({codigo:'CAT-OTRO',nombre:'MK 5009',serializado:'si',confirmarSimilar:'si'});
const otroCodigo = await catalogo.crearProductoCatalogo({codigo:'cat-5009',nombre:'Otro',serializado:'si',confirmarSimilar:'si'});
assert.notEqual(otroCodigo.codigo,ficha.codigo);
assert.notEqual(otroCodigo.codigo,'CAT-5009');
assert.equal(servicio.cantidad('2'),2000);
for (const invalido of ['1.5','2,1','0','-1','NaN','1e3']) assert.throws(()=>servicio.cantidad(invalido));
await crud.namespace.editarRegistro('producto',String(ficha._id),{version:ficha.__v||0,codigo:'CAT-5009',nombre:'Router central',marca:'MikroTik',modelo:'RB5009',descripcion:'Descripción corregida',unidad:'unidad',serializado:'si',confirmarSimilar:'si'});
assert.equal((await m.Producto.findById(ficha._id)).descripcion,'Descripción corregida');
assert.equal((await m.Producto.findById(ficha._id)).codigo,codigoFijo);
await crud.namespace.eliminarRegistro('producto',String(ficha._id));
assert.equal(await m.Producto.findById(ficha._id),null);
let pantalla;
await controlador.nuevoMovimiento('ingreso')({query:{},path:'/ingresos/nuevo',session:{},invPermisos:{ver:true,ingresar:true}}, {render(vista,datos){pantalla=datos.vista;}});
assert.equal(pantalla,'documentoIngreso');
console.log('OK: stock 15/10/3, anulaciones en orden, CRUD, permisos referenciales, versiones, borradores, duplicados, concurrencia y recuperación de una interrupción. Documento obligatorio para existencias, catálogo independiente, similitudes, edición, borrado y cantidades enteras. Adaptadores simulados.');

const numeroAnterior = (await m.Contador.findById('productos')).valor;
const reservado = await m.Producto.create({codigo:'PR0900',nombre:'Importado',unidad:'unidad',serializado:false});
const generado = await catalogo.crearProductoCatalogo({nombre:'Artículo de prueba consecutivo',serializado:'no',confirmarSimilar:'si'});
assert.equal(generado.codigo,'PR0901');
await crud.namespace.eliminarRegistro('producto',String(generado._id));
const posterior = await catalogo.crearProductoCatalogo({nombre:'Artículo posterior',serializado:'no',confirmarSimilar:'si'});
assert.equal(posterior.codigo,'PR0902');
const antesFallo=(await m.Contador.findById('productos')).valor;
await assert.rejects(catalogo.crearProductoCatalogo({nombre:'',serializado:'no'}));
assert.equal((await m.Contador.findById('productos')).valor,antesFallo);
console.log('OK: consecutivos PR, código manual ignorado, código inmutable, importaciones, eliminación sin reutilizar e intento fallido sin consumir número.');
const simultaneos=await Promise.all([
 catalogo.crearProductoCatalogo({nombre:'Alta simultánea A',serializado:'no',confirmarSimilar:'si'}),
 catalogo.crearProductoCatalogo({nombre:'Alta simultánea B',serializado:'no',confirmarSimilar:'si'})
]);
assert.notEqual(simultaneos[0].codigo,simultaneos[1].codigo);
console.log('OK: dos altas simultáneas reciben códigos diferentes.');

// Circuito de producción independiente de las asignaciones comunes.
const equipoProd = await m.Producto.create({codigo:'PR-PROD',nombre:'Router de producción',marca:'MIKROTIK',modelo:'CCR2004',unidad:'unidad',serializado:true});
const granelProd = await m.Producto.create({codigo:'CABLE-PROD',nombre:'Cable producción',unidad:'unidad',serializado:false});
const destinoProd = await servicio.crearLugarInventario({nombre:'Nodo CAPE',tipo:'destino'});
const filaProd=(n,series=[])=>({producto:String(equipoProd._id),cantidad:String(n),series:series.join('\n')});
const filaCable=n=>({producto:String(granelProd._id),cantidad:String(n),series:''});
await crear({...ingreso,documentoNumero:'PROD-INGRESO'},[filaProd(3,['PROD-A','PROD-B','PROD-C']),filaCable(15)]);
const puesta = await crear({...base,tipo:'produccion',origen:String(central._id),destino:String(destinoProd._id)},[filaProd(2,['PROD-A','PROD-B']),filaCable(10)]);
assert.equal(puesta.tipo,'produccion');
assert.equal((await m.Equipo.findOne({serie:'PROD-A'})).estado,'produccion');
assert.equal(String((await m.Equipo.findOne({serie:'PROD-A'})).asignacion),String(puesta._id));
assert.equal((await m.Saldo.findOne({producto:equipoProd._id,lugar:central._id,estado:'disponible'})).cantidad,1000);
assert.equal((await m.Saldo.findOne({producto:equipoProd._id,lugar:destinoProd._id,estado:'produccion'})).cantidad,2000);
await assert.rejects(crear({...base,tipo:'asignacion',origen:String(central._id),destino:String(destino._id)},[filaProd(1,['PROD-A'])]));
const retiro = await crear({...base,tipo:'devolucion',original:String(puesta._id),destino:String(central._id),estadoRecepcion:'revision'},[filaProd(1,['PROD-A']),filaCable(3)]);
assert.equal(retiro.originalTipo,'produccion');
assert.equal((await m.Equipo.findOne({serie:'PROD-A'})).estado,'revision');
assert.equal((await m.Movimiento.findById(puesta._id)).items[0].devuelto,1000);
assert.equal((await m.Saldo.findOne({producto:granelProd._id,lugar:destinoProd._id,estado:'produccion'})).cantidad,7000);
await assert.rejects(crud.namespace.anularMovimiento(String(puesta._id),'No debe permitir anular con retiros',usuario));
await crud.namespace.anularMovimiento(String(retiro._id),'Revertir retiro de prueba',usuario);
assert.equal((await m.Equipo.findOne({serie:'PROD-A'})).estado,'produccion');
assert.equal((await m.Movimiento.findById(puesta._id)).items[0].devuelto,0);
const totalProd = await crear({...base,tipo:'devolucion',original:String(puesta._id),destino:String(central._id),estadoRecepcion:'disponible'},[filaProd(2,['PROD-A','PROD-B']),filaCable(10)]);
assert.equal((await m.Movimiento.findById(puesta._id)).items[0].devuelto,2000);
await assert.rejects(crear({...base,tipo:'devolucion',original:String(puesta._id),destino:String(central._id),estadoRecepcion:'disponible'},[filaProd(1,['PROD-A'])]));
await crud.namespace.anularMovimiento(String(totalProd._id),'Revertir devolución total',usuario);
await crud.namespace.anularMovimiento(String(puesta._id),'Revertir puesta en producción',usuario);
assert.equal((await m.Equipo.findOne({serie:'PROD-A'})).estado,'disponible');
assert.equal((await m.Saldo.findOne({producto:granelProd._id,lugar:central._id,estado:'disponible'})).cantidad,15000);
const bProd=await crud.namespace.guardarBorrador({...base,tipo:'produccion',origen:String(central._id),destino:String(destinoProd._id),items:JSON.stringify([filaProd(1,['PROD-C'])])},usuario,[]);
const confirmadaProd=await crud.namespace.confirmarBorrador({...bProd.datos,borradorId:String(bProd._id),borradorVersion:bProd.version},usuario,[]);
assert.equal(confirmadaProd.tipo,'produccion');
assert.equal((await m.Equipo.findOne({serie:'PROD-C'})).estado,'produccion');
console.log('OK: producción por serie y cantidad, retiro parcial/a revisar/total, sobredevolución rechazada, reversión y borrador.');

const consulta=cache.get(pathToFileURL(root+'/services/inventarioConsultasService.mjs').href).namespace;
const generalProd=await consulta.consultarGeneral();
const resumenProd=generalProd.resumen.find(p=>String(p._id)===String(equipoProd._id));
assert.equal(resumenProd.fisico,2000);
assert.equal(resumenProd.produccion,1000);
assert.equal(resumenProd.asignado,0);
assert.equal(resumenProd.total,3000);
assert(generalProd.destinos.some(d=>d.estado==='produccion' && String(d.lugar._id)===String(destinoProd._id)));
console.log('OK: General separa físico/asignado/producción y conserva total SAPEM.');

const moduloBajas = cargar(pathToFileURL(root + '/services/inventarioBajasService.mjs').href);
await moduloBajas.link(resolver);
await moduloBajas.evaluate();
const { informarBaja, resolverBaja } = moduloBajas.namespace;
const asignacionBaja = await crear({
  ...base, tipo: 'asignacion', origen: String(central._id), destino: String(destino._id),
}, [filaProd(2, ['PROD-A', 'PROD-B'])]);
const serieA = await m.Equipo.findOne({ serie: 'PROD-A' });
const parte = { equipo: String(serieA._id), motivo: 'sustraccion', fecha: '2026-11-10' };
const respaldoBaja = { originalname: 'denuncia.pdf', buffer: Buffer.from('%PDF-1.4') };
const permisosBaja = { informarBajas: true, autorizarBajas: true };

const incidente = await informarBaja(parte, [], 'Operador');
const incidenteId = String(incidente._id);
assert.equal((await m.Equipo.findById(serieA._id)).estado, 'pendiente_baja');
assert.equal((await m.Equipo.findOne({ serie: 'PROD-B' })).estado, 'asignado');
assert.equal((await m.Movimiento.findById(asignacionBaja._id)).items[0].retirado, 1000);
const saldoGeneral = async () => (await consulta.consultarGeneral()).resumen.find(p => String(p._id) === String(equipoProd._id));
assert.equal((await saldoGeneral()).pendiente_baja, 1000);
assert.equal((await saldoGeneral()).total, 3000);
await assert.rejects(informarBaja(parte, [], 'Operador'));
await assert.rejects(resolverBaja(incidenteId, 'confirmar', {}, [], 'Operador', permisosBaja), /respaldo/);
await assert.rejects(resolverBaja(incidenteId, 'confirmar', {}, [respaldoBaja], 'Operador', { informarBajas: true }), /permiso/);
await assert.rejects(crud.namespace.anularMovimiento(String(asignacionBaja._id), 'Revertir asignación', usuario), /incidentes/);

const devolucionBaja = { ...base, tipo: 'devolucion', estadoRecepcion: 'disponible', original: String(asignacionBaja._id), destino: String(central._id) };
await assert.rejects(crear(devolucionBaja, [filaProd(1, ['PROD-A'])]));
await crear(devolucionBaja, [filaProd(1, ['PROD-B'])]);
await resolverBaja(incidenteId, 'confirmar', {}, [respaldoBaja], 'Responsable', permisosBaja);
assert.equal((await saldoGeneral()).total, 2000);
await m.Saldo.updateOne({ producto: equipoProd._id, lugar: destino._id, estado: 'asignado' }, { $inc: { cantidad: 1000 } });
assert.equal((await saldoGeneral()).total, 2000);
assert.equal((await consulta.consultarUbicacion(String(destino._id))).saldos.some(saldo => saldo.producto.codigo === equipoProd.codigo), false);
assert.equal((await m.Equipo.findById(serieA._id)).estado, 'baja');
assert.equal((await m.Archivo.findOne({ baja: incidente._id })).nombre, 'denuncia.pdf');

const recuperar = { deposito: String(central._id) };
await assert.rejects(resolverBaja(incidenteId, 'recuperar', recuperar, [], 'Operador', { informarBajas: true }), /permiso/);
await resolverBaja(incidenteId, 'recuperar', recuperar, [], 'Responsable', permisosBaja);
assert.equal((await saldoGeneral()).total, 3000);
assert.equal((await m.Equipo.findById(serieA._id)).estado, 'revision');
assert.equal((await m.Baja.findById(incidente._id)).confirmacion.usuario, 'Responsable');
await assert.rejects(resolverBaja(incidenteId, 'recuperar', recuperar, [], 'Responsable', permisosBaja), /resuelto/);
assert.equal((await saldoGeneral()).total, 3000);
console.log('OK: baja por serie, respaldo y permisos obligatorios, devolución de otra serie y recuperación sin duplicar existencias.');

const prodC = await m.Equipo.findOne({ serie: 'PROD-C' });
const bajaProduccion = await informarBaja({ ...parte, equipo: String(prodC._id) }, [], 'Operador');
await resolverBaja(String(bajaProduccion._id), 'confirmar', {}, [respaldoBaja], 'Responsable', permisosBaja);
await m.Producto.updateOne({ _id: equipoProd._id }, { $set: { serializado: false } });
await m.Saldo.updateOne({ producto: equipoProd._id, lugar: destinoProd._id, estado: 'produccion' }, { $inc: { cantidad: 1000 } });
const generalBajaProduccion = await saldoGeneral();
assert.equal(generalBajaProduccion.baja, 1000);
assert.equal(generalBajaProduccion.produccion, 0);
assert.equal(generalBajaProduccion.total, 2000);
console.log('OK: producción a baja con saldo anterior y catálogo legado.');

const moduloRevision = cargar(pathToFileURL(root + '/services/inventarioRevisionService.mjs').href);
await moduloRevision.link(resolver);
await moduloRevision.evaluate();
const { listarRevision, liberarRevision } = moduloRevision.namespace;
const seleccionRevision = { operacion: String(new Id()), equipo: String(serieA._id), producto: String(equipoProd._id), lugar: String(central._id) };
const pendientesRevision = await listarRevision();
assert.match(pendientesRevision.filas.find(fila => String(fila.equipo) === String(serieA._id)).origen.texto, /Recuperación de baja/);
const totalAntesRevision = (await saldoGeneral()).total;
await liberarRevision(seleccionRevision, usuario);
assert.equal((await m.Equipo.findById(serieA._id)).estado, 'disponible');
assert.equal((await saldoGeneral()).total, totalAntesRevision);
await assert.rejects(liberarRevision({ ...seleccionRevision, operacion: String(new Id()) }, usuario), /ya no está pendiente/);
const secundario = await servicio.crearLugarInventario({ nombre: 'Depósito revisión', tipo: 'deposito' });
const transferenciaRevision = await crear({
  ...base, tipo: 'traspaso', origen: String(central._id), destino: String(secundario._id), estadoRecepcion: 'revision',
}, [filaCable(3)]);
const seleccionCantidad = { operacion: String(new Id()), producto: String(granelProd._id), lugar: String(secundario._id), cantidad: '2' };
await liberarRevision(seleccionCantidad, usuario);
assert.equal((await m.Saldo.findOne({ producto: granelProd._id, lugar: secundario._id, estado: 'revision' })).cantidad, 1000);
await liberarRevision(seleccionCantidad, usuario);
assert.equal((await m.Saldo.findOne({ producto: granelProd._id, lugar: secundario._id, estado: 'revision' })).cantidad, 1000);
await assert.rejects(liberarRevision({ ...seleccionCantidad, operacion: String(new Id()) }, usuario));
await assert.rejects(crud.namespace.anularMovimiento(String(transferenciaRevision._id), 'Anulación de traspaso', usuario));
console.log('OK: recuperación visible, liberación individual, traspaso a revisión y liberación parcial.');

const historial = await consulta.consultarEquipo({ params: { id: String(serieA._id) }, query: {} });
assert.deepEqual(Array.from(historial.eventos.slice(-4), evento => evento.operacion), [
  'Sustracción informada', 'Baja confirmada', 'Recuperación', 'Revisión completada',
]);
assert.deepEqual(Array.from(historial.eventos, evento => evento.numero), Array.from({ length: historial.eventos.length }, (_, i) => i + 1));
