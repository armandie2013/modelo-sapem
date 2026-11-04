import assert from 'node:assert/strict';
import ejs from 'ejs';
import fs from 'node:fs';
import puppeteer from 'puppeteer';
import { cargarPermisosInventario } from '../middlewares/inventarioAccessMiddleware.mjs';
import { obtenerAreasInicio } from '../controllers/inicioController.mjs';
import { Equipo, Saldo, Movimiento, Borrador } from '../models/inventario.mjs';
import Persona from '../models/personaDisponible.mjs';
for(const modelo of [Equipo,Saldo])assert(modelo.schema.path('estado').enumValues.includes('produccion'));
for(const modelo of [Movimiento,Borrador])assert(modelo.schema.path('tipo').enumValues.includes('produccion'));
assert(Persona.schema.path('modulosPermitidos.inventario.producir'));
for(const rol of ['admin','usuario']){
 for(const permiso of [false,true]){
  const req={session:{usuario:{rol,modulosPermitidos:{inventario:{ver:true,producir:permiso}}}}};
  cargarPermisosInventario(req,{locals:{}},()=>{});assert.equal(req.invPermisos.producir,permiso);
 }
}
assert(!obtenerAreasInicio({rol:'usuario'}).some(a=>a.modulos.some(m=>m.href==='/inventario/produccion')));
assert(obtenerAreasInicio({rol:'usuario',modulosPermitidos:{inventario:{ver:true}}}).some(a=>a.modulos.some(m=>m.href==='/inventario/produccion')));
const id='0123456789abcdef01234567',otro='abcdef012345678901234567';
const producto={_id:id,codigo:'PR0001',nombre:'ROUTER',marca:'MIKROTIK',modelo:'CCR2116',unidad:'unidad',serializado:true};
const item={producto:id,...producto,cantidad:1000,devuelto:0,series:[{serie:'PROD-SERIE',mac:'AA:BB:CC:DD:EE:FF',patrimonio:'SAPEM-001'}]};
const mov={_id:id,tipo:'produccion',numero:9,fecha:'2026-11-04T15:00:00Z',createdAt:'2026-11-04T15:00:00Z',estado:'confirmado',origenNombre:'CAPE',destinoNombre:'NODO CENTRO',entrega:'Diego',recibe:'Responsable',dniRecibe:'12345678',items:[item],documentos:[],creadoPor:{nombre:'Diego'}};
const permisos=Object.fromEntries(['ver','administrar','editar','eliminar','anular','ingresar','asignar','producir','devolver','traspasar'].map(a=>[a,true]));
const base={titulo:'Producción',seccion:'produccion',permisos,csrf:'csrf',clave:'clave',hoy:'2026-11-04',aviso:null,datos:{},borradorId:'',borradorVersion:'',archivosBorrador:[],principal:id,productos:[producto],lugares:[{_id:id,tipo:'deposito',nombre:'CAPE'},{_id:otro,tipo:'destino',nombre:'NODO CENTRO'}],tipo:'produccion',config:{ruta:'produccion',accion:'producir',singular:'Nueva puesta en producción'}};
const panel=new URL('../views/inventarioViews/panel.ejs',import.meta.url).pathname;
fs.mkdirSync(new URL('../tmp/', import.meta.url), {recursive:true});
const browser=await puppeteer.launch({headless:'shell',pipe:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process']});
try{
 const page=await browser.newPage();const errores=[];page.on('pageerror',e=>errores.push(e.message));
 await page.setContent(await ejs.renderFile(panel,{...base,vista:'formularioMovimiento'}));
 assert.equal(await page.$$eval('#filas tr',x=>x.length),0);
 assert((await page.$eval('form',x=>x.textContent)).includes('Ubicación de instalación'));
 await page.type('#buscarMaterialMovimiento','ccr2116');await page.click('.material-resultados button');assert.equal(await page.$$eval('#filas tr',x=>x.length),1);
 const listado={...base,vista:'movimientos',movimientos:[mov],estado:'',seleccion:false,pagina:1,cantidadRegistros:1};
 await page.setContent(await ejs.renderFile(panel,listado));assert(await page.$('a[href="/inventario/produccion/'+id+'/devolucion"]'));
 await page.setContent(await ejs.renderFile(panel,{...listado,permisos:{ver:true}}));
 assert.equal(await page.$('a[href="/inventario/produccion/nuevo"]'),null);
 assert.equal(await page.$('a[href="/inventario/produccion/'+id+'/devolucion"]'),null);
 await page.setContent(await ejs.renderFile(panel,{...base,vista:'formularioDevolucion',mov,pendientes:[item],equiposPendientes:[{producto:id,serie:'PROD-SERIE'}],depositos:[{_id:id,nombre:'CAPE'}]}));
 await page.type('#buscarMaterialDevolucion','ccr2116');await page.click('.material-resultados button');assert.equal(await page.$$eval('.retorno:not([hidden])',x=>x.length),1);
 const html=await ejs.renderFile(new URL('../views/inventarioViews/comprobante.ejs',import.meta.url).pathname,{...base,mov,web:false,logo:fs.readFileSync(new URL('../utils/logoBase64.html',import.meta.url),'utf8').trim()});
 assert(html.includes('Acta de puesta en producción'));
 await page.setContent(html,{waitUntil:'load'});
 await page.pdf({path:new URL('../tmp/produccion-validacion.pdf',import.meta.url).pathname,format:'A4',printBackground:true,margin:{top:'12mm',right:'12mm',bottom:'12mm',left:'12mm'}});
 assert.deepEqual(errores,[]);
 await page.close();
 console.log('OK: modelos reales, permiso explícito incluso admin, Inicio, buscador, devolución, consulta y PDF de producción.');
}finally{await browser.close();}
