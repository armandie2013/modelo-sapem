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
 session(){return this;}select(){return this;}lean(){this.plano=true;return this;}limit(n){this.limite=n;return this;}
 getFilter(){return this.f;}getOptions(){return this.o;}getUpdate(){return this.u;}setUpdate(u){this.u=u;}
 then(ok,err){return this.ejecutar().then(ok,err);}
 async ejecutar(){
  for(const fn of this.model.schema.hooks[this.op]||[])await fn.call(this);
  const c=this.model.collection, todos=await c.find(this.f).toArray();
  if(this.op==='find')return todos.slice(0,this.limite).map(d=>this.plano?d:new this.model(d));
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
const ficha = await m.Producto.findOne({codigo:'CAT-5009'});
assert.equal(await m.Saldo.findOne({producto:ficha._id}),null);
assert.equal(await m.Equipo.findOne({producto:ficha._id}),null);
assert.equal(ficha.modelo,'RB5009');
assert.equal(catalogo.sonSimilares({nombre:'Switch Cisco'},{nombre:'Cisco Switch'}),true);
await assert.rejects(crud.namespace.guardarBorrador({...ingreso,documentoNumero:'DECIMAL',items:JSON.stringify([{producto:String(ficha._id),cantidad:'1.5'}])},usuario));
assert.ok((await catalogo.similaresProducto({nombre:'MK 5009'})).some(p=>String(p._id)===String(ficha._id)));
await assert.rejects(catalogo.crearProductoCatalogo({codigo:'CAT-OTRO',nombre:'MK 5009',serializado:'si'}),/similares/);
await catalogo.crearProductoCatalogo({codigo:'CAT-OTRO',nombre:'MK 5009',serializado:'si',confirmarSimilar:'si'});
await assert.rejects(catalogo.crearProductoCatalogo({codigo:'cat-5009',nombre:'Otro',serializado:'si',confirmarSimilar:'si'}),/código/);
assert.equal(servicio.cantidad('2'),2000);
for (const invalido of ['1.5','2,1','0','-1','NaN','1e3']) assert.throws(()=>servicio.cantidad(invalido));
await crud.namespace.editarRegistro('producto',String(ficha._id),{version:ficha.__v||0,codigo:'CAT-5009',nombre:'Router central',marca:'MikroTik',modelo:'RB5009',descripcion:'Descripción corregida',unidad:'unidad',serializado:'si',confirmarSimilar:'si'});
assert.equal((await m.Producto.findById(ficha._id)).descripcion,'Descripción corregida');
await crud.namespace.eliminarRegistro('producto',String(ficha._id));
assert.equal(await m.Producto.findById(ficha._id),null);
let pantalla;
await controlador.nuevoMovimiento('ingreso')({query:{},path:'/ingresos/nuevo',session:{},invPermisos:{ver:true,ingresar:true}}, {render(vista,datos){pantalla=datos.vista;}});
assert.equal(pantalla,'documentoIngreso');
console.log('OK: stock 15/10/3, anulaciones en orden, CRUD, permisos referenciales, versiones, borradores, duplicados, concurrencia y recuperación de una interrupción. Documento obligatorio para existencias, catálogo independiente, similitudes, edición, borrado y cantidades enteras. Adaptadores simulados.');
