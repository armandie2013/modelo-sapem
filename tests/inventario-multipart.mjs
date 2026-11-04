// node --experimental-vm-modules tests/inventario-multipart.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import express from 'express';
import multer from 'multer';
import * as hooks from 'node:async_hooks';
import * as crypto from 'node:crypto';
import * as os from 'node:os';
let lock=null,adquisiciones=0,duplicados=0,confirmadas=0;
const bloqueo={async insertOne(d){if(lock){duplicados++;throw Object.assign(new Error('duplicate'),{code:11000});}lock={...d};adquisiciones++;},async findOne(){return lock;},async deleteOne(f){if(lock?.token===f.token)lock=null;}};
const db={collection(n){return n==='inv_control_bloqueo'?bloqueo:{async createIndex(){},async insertOne(){},async updateOne(){},async deleteMany(){},find(){return {async *[Symbol.asyncIterator](){}};}};}};
// Acelerar únicamente el plazo del test para detectar el doble bloqueo sin esperar 30 s.
let reloj=Date.now();class Reloj extends Date {static now(){return reloj+=31001;}}
const context=vm.createContext({console,process,setTimeout,Date:Reloj});
const mod=new vm.SourceTextModule(fs.readFileSync(new URL('../services/inventarioPersistencia.mjs',import.meta.url),'utf8'),{context});
const deps={mongoose:{default:{connection:{db}}},'node:async_hooks':hooks,'node:crypto':crypto,'node:os':os};
await mod.link(spec=>{const v=deps[spec],names=Object.keys(v);return new vm.SyntheticModule(names,function(){for(const n of names)this.setExport(n,v[n]);},{context});});await mod.evaluate();
const ruta=process.argv[2]||new URL('../routes/inventarioRoutes.mjs',import.meta.url);
const texto=fs.readFileSync(ruta,'utf8');
const inicio=texto.indexOf(texto.includes('const procesarAdjuntos =')?'const procesarAdjuntos =':'const upload =');
const fragmento=texto.slice(inicio,texto.indexOf('router.use(',inicio));
const upload=new Function('multer','AsyncResource',fragmento+'\nreturn upload;')(multer,hooks.AsyncResource);
const app=express();app.use((req,res,next)=>{req.session={usuario:{_id:'prueba',nombre:'Prueba',apellido:'Inventario'}};next();});
app.use(mod.namespace.accesoInventario);
app.post('/documento',upload,async(req,res,next)=>{try{await mod.namespace.ejecutarOperacion(async()=>{confirmadas++;});res.json({documento:req.body.numero,archivos:req.files.length});}catch(e){next(e);}});
app.use((e,req,res,next)=>res.status(e.status||400).json({error:e.message}));
const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const url=`http://127.0.0.1:${server.address().port}/documento`;
try {
 for(const adjunto of [false,true]){
  const form=new FormData();form.set('numero','R-1');if(adjunto)form.append('archivos',new Blob(['documento']), 'remito.txt');
  const response=await fetch(url,{method:'POST',body:form});const data=await response.json();
  assert.equal(response.status,200,JSON.stringify(data));assert.equal(data.archivos,adjunto?1:0);
 }
 // Errores del parser también deben liberar el bloqueo sin ejecutar el servicio.
 const form=new FormData();form.append('campoNoPermitido',new Blob(['x']),'x.txt');
 const response=await fetch(url,{method:'POST',body:form});assert.equal(response.status,400);await response.text();
 assert.equal(confirmadas,2);assert.equal(duplicados,0,'El POST no debe intentar adquirir dos veces');assert.equal(adquisiciones,3);assert.equal(lock,null);
 console.log('OK: POST multipart HTTP real, con/sin archivo, una adquisición por petición, commit, error Multer y liberación.');
} finally {await new Promise(r=>server.close(r));}
