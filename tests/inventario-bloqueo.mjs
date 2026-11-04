// node --experimental-vm-modules tests/inventario-bloqueo.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { EventEmitter } from 'node:events';
import * as hooks from 'node:async_hooks';
import * as crypto from 'node:crypto';
import * as os from 'node:os';
const source=fs.readFileSync(new URL('../services/inventarioPersistencia.mjs',import.meta.url),'utf8');
const diferido=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function entorno(){
 let lock=null,gate=null,insertado=null,pendientes=[],restauradas=0;
 const bloqueo={async insertOne(doc){
  if(lock) throw Object.assign(new Error('duplicate'),{code:11000});
  lock={...doc};insertado?.resolve();if(gate)await gate.promise;
 },async findOne(){return lock;},async updateOne(f,u){if(lock?.token!==f.token)return {modifiedCount:0};Object.assign(lock,u.$set);return {modifiedCount:1};},async deleteOne(f){if(lock?.token===f.token)lock=null;}};
 const db={collection(nombre){
  if(nombre==='inv_control_bloqueo')return bloqueo;
  return {async createIndex(){},async insertOne(){},find(){return {async *[Symbol.asyncIterator](){if(nombre==='inv_control_operaciones')yield*pendientes;}};},async updateOne(){restauradas++;pendientes=[];},async deleteMany(){}};
 }};
 const context=vm.createContext({console,process,setTimeout,clearTimeout,Date});
 const mod=new vm.SourceTextModule(source,{context});
 const deps={mongoose:{default:{connection:{db}}},'node:async_hooks':hooks,'node:crypto':crypto,'node:os':os};
 await mod.link(spec=>{const value=deps[spec];const names=Object.keys(value);return new vm.SyntheticModule(names,function(){for(const n of names)this.setExport(n,value[n]);},{context});});
 await mod.evaluate();
 return {api:mod.namespace,get lock(){return lock;},set lock(v){lock=v;},set gate(v){gate=v;},set insertado(v){insertado=v;},get restauradas(){return restauradas;},set pendientes(v){pendientes=v;}};
}
function peticion(){const req=new EventEmitter();req.originalUrl='/inventario/ingresos/documento';const res=new EventEmitter();res.destroyed=false;res.writableEnded=false;return {req,res};}
const tick=()=>new Promise(r=>setTimeout(r,10));
// Reproduce la carrera: se cierra el navegador durante la adquisición en MongoDB.
for(const evento of ['close','finish','aborted']){
 const env=await entorno(),{req,res}=peticion(),gate=diferido(),insertado=diferido();env.gate=gate;env.insertado=insertado;let next=0;
 const p=env.api.accesoInventario(req,res,()=>next++);await insertado.promise;
 (evento==='aborted'?req:res).emit(evento);gate.resolve();await p;
 assert.equal(env.lock,null,`No debe quedar bloqueo tras ${evento} durante adquisición`);assert.equal(next,0);
}
// Se cancela una petición en espera sin tomar ni borrar el bloqueo de otra.
{
 const env=await entorno(),{req,res}=peticion();env.lock={_id:'inventario',token:'otro',host:os.hostname(),pid:process.pid};let next=0;
 const p=env.api.accesoInventario(req,res,()=>next++);await tick();res.emit('close');await p;
 assert.equal(env.lock.token,'otro');assert.equal(next,0);
}
// Fin normal libera; mientras hay una respuesta activa otra petición espera.
{
 const env=await entorno(),a=peticion(),b=peticion();let entradas=0;
 await env.api.accesoInventario(a.req,a.res,()=>entradas++);const token=env.lock.token;
 const segundo=env.api.accesoInventario(b.req,b.res,()=>entradas++);await tick();assert.equal(entradas,1);assert.equal(env.lock.token,token);
 a.res.emit('finish');a.res.emit('close');await segundo;assert.equal(entradas,2);assert.notEqual(env.lock.token,token);
 b.res.emit('finish');await tick();assert.equal(env.lock,null);
}
// Una operación sigue protegida aunque la respuesta se cierre antes de concluir.
{
 const env=await entorno(),{req,res}=peticion(),gate=diferido(),inicio=diferido();let operacion;
 await env.api.accesoInventario(req,res,()=>{operacion=env.api.ejecutarOperacion(async()=>{inicio.resolve();await gate.promise;});});
 await inicio.promise;res.emit('close');await tick();assert(env.lock,'No liberar antes de que termine la operación');
 gate.resolve();await operacion;await tick();assert.equal(env.lock,null);

}
// Recuperación del diario al encontrar un propietario local que ya no existe.
{
 const env=await entorno();env.lock={_id:'inventario',token:'muerto',host:os.hostname(),pid:2147483647};env.pendientes=[{_id:'interrumpida'}];
 await env.api.recuperarInventarioAlIniciar();assert.equal(env.restauradas,1);assert.equal(env.lock,null);
}
console.log('OK: cierre/aborto durante adquisición, cancelación en espera, exclusión de otro propietario, liberación normal y recuperación.');
