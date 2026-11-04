import assert from 'node:assert/strict';
import ejs from 'ejs';
import puppeteer from 'puppeteer';
const id='0123456789abcdef01234567',dest='abcdef012345678901234567',segundo='111111111111111111111111';
const producto={_id:id,codigo:'PR0001',nombre:'ROUTER',marca:'MIKROTIK',modelo:'CCR2116',unidad:'unidad',serializado:true};
const equipos=[{producto:id,lugar:id,serie:'SERIE-A',mac:'AA:BB',patrimonio:'PAT-1'},{producto:id,lugar:id,serie:'SERIE-B'},{producto:id,lugar:segundo,serie:'OTRO-DEPOSITO'}];
const permisos=Object.fromEntries(['ver','administrar','editar','eliminar','anular','ingresar','asignar','producir','devolver','traspasar'].map(a=>[a,true]));
const base={titulo:'Series',seccion:'produccion',permisos,csrf:'csrf',clave:'clave',hoy:'2026-11-04',aviso:null,datos:{},borradorId:'',borradorVersion:'',archivosBorrador:[],principal:id,productos:[producto],equiposDisponibles:equipos,lugares:[{_id:id,tipo:'deposito',nombre:'CAPE'},{_id:segundo,tipo:'deposito',nombre:'Otro'},{_id:dest,tipo:'destino',nombre:'Nodo'}]};
const panel=new URL('../views/inventarioViews/panel.ejs',import.meta.url).pathname;
const browser=await puppeteer.launch({headless:'shell',pipe:true,args:['--no-sandbox','--disable-dev-shm-usage','--no-zygote','--single-process']});
try {
 const page=await browser.newPage();const errores=[];page.on('pageerror',e=>errores.push(e.message));
 const cambiar=async(selector,value)=>page.$eval(selector,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input',{bubbles:true}));},value);
 for(const tipo of ['asignacion','produccion','traspaso']){
  const ruta={asignacion:'asignaciones',produccion:'produccion',traspaso:'traspasos'}[tipo];
  await page.setContent(await ejs.renderFile(panel,{...base,tipo,config:{ruta},vista:'formularioMovimiento'}));
  await page.type('#buscarMaterialMovimiento','ROUTER');await page.click('.material-resultados button');
  assert.equal(await page.$$eval('.series-opcion',e=>e.length),2);
  assert((await page.$eval('.selector-series',e=>e.textContent)).includes('PAT-1'));
  await page.click('.series-opcion input');assert.equal(await page.$eval('.cantidad',e=>e.value),'1');
  await page.click('.series-todas');assert.equal(await page.$eval('.cantidad',e=>e.value),'2');
  await cambiar('.selector-series input[type=search]','PAT-1');assert.equal(await page.$$eval('.series-opcion:not([hidden])',e=>e.length),1);
  await cambiar('.series','serie-b');assert.equal(await page.$$eval('.series-opcion input:checked',e=>e.length),1);
  await cambiar('.series','SERIE-A\nSERIE-A');assert.equal(await page.$eval('.series',e=>e.checkValidity()),false);
  await cambiar('.series','SERIE-A');
  await page.select('[name=origen]',segundo);assert.equal(await page.$eval('.series',e=>e.checkValidity()),false);
  await page.click('.series-ninguna');await page.click('.series-todas');assert.equal(await page.$eval('.series',e=>e.value),'OTRO-DEPOSITO');
  // El envío de borrador contiene exactamente las series y la cantidad elegidas.
  await page.evaluate(()=>document.querySelector('form').addEventListener('submit',e=>e.preventDefault()));
  await page.click('[data-accion=borrador]');
  const items=await page.$eval('#items',e=>JSON.parse(e.value));assert.equal(items[0].series,'OTRO-DEPOSITO');assert.equal(items[0].cantidad,'1');
  await page.setContent(await ejs.renderFile(panel,{...base,tipo,config:{ruta},vista:'formularioMovimiento',datos:{items:JSON.stringify([{producto:id,series:'SERIE-B',cantidad:'1'}])}}));
  assert.equal(await page.$$eval('.series-opcion input:checked',e=>e.length),1);
  assert.equal(await page.$eval('.cantidad',e=>e.value),'1');
 }
 const mov={_id:id,tipo:'produccion',numero:1,fecha:new Date(),destinoNombre:'Nodo'};
 const item={...producto,producto:id,cantidad:2000,devuelto:0};
 const retorno={...base,vista:'formularioDevolucion',mov,pendientes:[item],equiposPendientes:equipos.slice(0,2),depositos:[{_id:id,nombre:'CAPE'}]};
 await page.setContent(await ejs.renderFile(panel,retorno));
 await page.type('#buscarMaterialDevolucion','ROUTER');await page.click('.material-resultados button');
 await page.click('.series-todas');assert.equal(await page.$eval('.cantidadRetorno',e=>e.value),'2');
 await cambiar('.seriesManual','SERIE-B');assert.equal(await page.$$eval('.serieRetorno:checked',e=>e.length),1);
 await cambiar('.seriesManual','DEVUELTA-O-AJENA');assert.equal(await page.$eval('.seriesManual',e=>e.checkValidity()),false);
 await cambiar('.seriesManual','SERIE-A');
 await page.evaluate(()=>document.querySelector('form').addEventListener('submit',e=>e.preventDefault()));await page.click('[data-accion=borrador]');
 assert.equal(await page.$eval('#itemsDevolucion',e=>JSON.parse(e.value)[0].series),'SERIE-A');
 await page.setContent(await ejs.renderFile(panel,{...retorno,datos:{items:JSON.stringify([{producto:id,series:'SERIE-B',cantidad:'1'}])}}));
 assert.equal(await page.$$eval('.retorno:not([hidden])',e=>e.length),1);assert.equal(await page.$$eval('.serieRetorno:checked',e=>e.length),1);
 await page.click('.material-quitar');assert.equal(await page.$eval('.seriesManual',e=>e.value),'');
 // Ingresos mantienen carga manual y no seleccionan equipos existentes.
 await page.setContent(await ejs.renderFile(panel,{...base,tipo:'ingreso',config:{ruta:'ingresos'},vista:'formularioMovimiento'}));
 await page.type('#buscarMaterialMovimiento','ROUTER');await page.click('.material-resultados button');assert.equal(await page.$('.selector-series'),null);assert.equal(await page.$eval('.cantidad',e=>e.readOnly),false);
 assert.deepEqual(errores,[]);
 console.log('OK: selección visual/manual, búsqueda MAC/patrimonio, todos, origen, validación, borradores, devoluciones e ingreso manual.');
} finally {await browser.close();}
