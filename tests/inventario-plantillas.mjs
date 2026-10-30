// Prueba de compilación/renderizado de plantillas sin instalar dependencias.
// No sustituye la prueba con EJS, MongoDB y Chromium reales.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
function compilar(src) {
 let code='let out=""; with(d) {\n', pos=0;
 for(const m of src.matchAll(/<%([=-]?)([\s\S]*?)%>/g)) {
  code+=`out+=${JSON.stringify(src.slice(pos,m.index))};\n`;
  code+=m[1]?`out+=(${m[2]});\n`:m[2]+'\n';pos=m.index+m[0].length;
 }
 return new Function('d',code+`out+=${JSON.stringify(src.slice(pos))}; } return out;`);
}
const templates={};for(const file of fs.readdirSync(root+'/views/inventarioViews').filter(n=>n.endsWith('.ejs')))
 templates[file.slice(0,-4)]=compilar(fs.readFileSync(root+'/views/inventarioViews/'+file,'utf8'));
function render(vista,datos){const d={...datos};d.include=(name,extra={})=>render(name,{...d,...extra});return templates[vista](d);}
const id='0123456789abcdef01234567',otro='abcdef012345678901234567';
const producto={_id:id,codigo:'CCR',nombre:'CCR2004',unidad:'unidad',serializado:true,__v:0};
const deposito={_id:id,nombre:'Central',tipo:'deposito',principal:true,productos:1,__v:0};
const destino={_id:otro,nombre:'Ministerio',tipo:'destino',productos:1};
const item={producto:id,codigo:'CCR',nombre:'CCR2004',unidad:'unidad',serializado:true,cantidad:15000,devuelto:3000,series:[{serie:'A',mac:'MAC'}]};
const mov={_id:id,numero:1,tipo:'asignacion',fecha:new Date(),createdAt:new Date(),origenNombre:'Central',destinoNombre:'Ministerio',entrega:'Diego',recibe:'Juan',creadoPor:{nombre:'Diego'},items:[item],documentos:[]};
const permisos=Object.fromEntries(['ver','administrar','ingresar','asignar','devolver','traspasar','editar','eliminar','anular'].map(a=>[a,true]));
const base={titulo:'Prueba',seccion:'general',permisos,csrf:'csrf',clave:'clave',hoy:'2026-10-29',aviso:null,datos:{},
 pagina:1,cantidadRegistros:1,principal:id,lugares:[deposito,destino],productos:[producto],serie:'',ubicacion:'',estado:'',
 borradorId:'',borradorVersion:'',archivosBorrador:[]};
const casos={
 dashboard:{resumen:[{...producto,disponible:12000,revision:0,asignado:3000,fisico:12000,total:15000}],destinos:[{lugar:destino,productos:1}]},
 lugares:{lugares:[deposito],tipoLugar:'deposito'},ubicacion:{lugar:deposito,saldos:[{producto,cantidad:12000,estado:'disponible'}]},
 equipos:{equipos:[{_id:id,producto,lugar:deposito,serie:'A',estado:'disponible'}]},
 equipo:{equipo:{_id:id,producto,lugar:deposito,serie:'A',estado:'disponible'},movimientos:[mov]},
 movimientos:{movimientos:[mov],tipo:'asignacion',config:{ruta:'asignaciones',accion:'asignar',singular:'Nueva asignación'},seleccion:false},
 productos:{},formularioCatalogo:{tipoCatalogo:'deposito'},formularioMovimiento:{tipo:'ingreso',config:{ruta:'ingresos'}},
 formularioDevolucion:{mov,pendientes:[item],equiposPendientes:[{producto:id,serie:'A'}],depositos:[deposito]},
 documentoIngreso:{},
 editarRegistro:{tipoRegistro:'deposito',registro:deposito},borradores:{usuarioActual:{_id:id},registros:[{_id:id,tipo:'ingreso',version:1,datos:{},updatedAt:new Date(),creadoPor:{nombre:'Diego'}}],accionesTipo:{ingreso:'ingresar'}}
};
for(const [vista,datos]of Object.entries(casos))for(const p of [permisos,{ver:true}]){
 const html=render('panel',{...base,...datos,vista,permisos:p});assert(html.includes('Técnica / Inventario'));
 for(const script of html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)){
  if(script[0].includes('application/json'))JSON.parse(script[1]);else new vm.Script(script[1]);
 }
 if(vista==='dashboard')assert(!html.includes('id="movimiento"'));
 if(vista==='productos')assert.equal(html.includes('Eliminar'),!!p.eliminar);
}
for(const tipoRegistro of ['producto','deposito','destino','equipo'])render('panel',{...base,vista:'editarRegistro',tipoRegistro,registro:{...producto,...deposito,serie:'A'}});
for(const tipo of ['ingreso','asignacion','traspaso']){
 const html=render('panel',{...base,vista:'formularioMovimiento',tipo,config:{ruta:tipo}});
 assert.equal(html.includes('name="documentoNumero"'),tipo==='ingreso');assert(html.includes('Guardar borrador'));
}
const draft={...base,borradorId:id,borradorVersion:1,archivosBorrador:[{_id:otro,nombre:'remito.pdf'}]};
render('panel',{...draft,vista:'formularioMovimiento',tipo:'ingreso',config:{ruta:'ingresos'}});
render('panel',{...draft,productos:[],vista:'formularioMovimiento',tipo:'ingreso',config:{ruta:'ingresos'}});
for(const web of [true,false])for(const estado of ['confirmado','anulado']){
 const html=render('comprobante',{...base,mov:{...mov,estado,anulacion:{motivo:'Prueba',usuario:'Diego',fecha:new Date()}},web,archivos:[],devoluciones:[],original:null,nuevo:true,logo:''});
 assert.equal(html.includes('COMPROBANTE ANULADO'),estado==='anulado');assert.equal(html.includes('Anular movimiento'),web&&estado!=='anulado');
}
for(const directorio of ['models','services','controllers','routes','middlewares'])for(const nombre of fs.readdirSync(root+'/'+directorio).filter(n=>n.endsWith('.mjs'))){
 new vm.SourceTextModule(fs.readFileSync(root+'/'+directorio+'/'+nombre,'utf8'));
}
console.log('OK: sintaxis de módulos, pantallas, permisos, borradores, comprobantes anulados y JavaScript de formularios.');

// Los listados se verifican con filas, vacíos, permisos restringidos y estados distintos.
for (const tipoLugar of ['deposito','destino']) for (const filas of [[],[deposito],[{...deposito,activo:false,principal:false}]]) {
 render('panel',{...base,vista:'lugares',tipoLugar,lugares:filas});
}
for (const tipo of ['ingreso','asignacion','devolucion','traspaso']) for (const estado of ['confirmado','anulado']) {
 const html=render('panel',{...base,vista:'movimientos',tipo,seleccion:false,estado:'',config:{ruta:tipo,accion:tipo==='ingreso'?'ingresar':'asignar',singular:'Nuevo'},movimientos:[{...mov,tipo,estado}]});
 assert(html.includes('row-actions'));
 assert(html.includes('class="list-table"'));
 assert(html.includes('class="button secondary"'));
 render('panel',{...base,vista:'movimientos',tipo,seleccion:false,config:{ruta:tipo,accion:'ver',singular:'Nuevo'},movimientos:[]});
}
for (const vista of ['productos','equipos','borradores']) {
 const datos={...base,...casos[vista],vista,productos:[],equipos:[],registros:[]};
 assert(render('panel',datos).includes('class="empty"'));
}
const interno=render('panel',{...base,vista:'formularioCatalogo',tipoCatalogo:'deposito'});
assert(!interno.includes('class="inv inv-list"'));
console.log('OK: listados vacíos y completos, tipos de movimientos, estados y alcance fuera de formularios.');

const acta=render('comprobante',{...base,mov:{...mov,destinoDireccion:'San Antonio',origenDireccion:'CAPE',items:[{...item,marca:'MikroTik',modelo:'CCR2116'}]},web:true,archivos:[],devoluciones:[],original:null,nuevo:true,logo:''});
assert(acta.includes('DIRECCIÓN DE DESTINO'));
assert(acta.includes('San Antonio'));
assert(acta.includes('MikroTik') && acta.includes('CCR2116'));
assert(!acta.includes('<iframe'));
console.log('OK: direcciones separadas, marca/modelo y acta sin visor duplicado.');
