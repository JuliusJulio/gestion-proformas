/* ==========================================================
   DATA — Estado global, catálogos iniciales, arrays vacíos
   Esta es la fuente única de verdad en memoria.
   Cuando se conecte Supabase, este archivo se ajustará para
   poblarse desde la base de datos al iniciar.
   ========================================================== */

// ---------- CATÁLOGOS EDITABLES ----------
let DEPARTAMENTOS = [
  'Ingeniería',
  'Presidencia',
  'HR',
  'Legal',
  'Seguridad',
  'Compras',
  'Finanzas',
];

// Tipos de compra — solo dos valores, ambos protegidos
// "Compra única" se usa cuando NO hay contrato atado
// "No aplica" se usa cuando SÍ hay contrato atado (el tipo viene del contrato)
let TIPOS_COMPRA = ['Compra única', 'No aplica'];
const TIPOS_COMPRA_PROTEGIDOS = ['Compra única', 'No aplica'];

// Tipos de contrato — editables
let TIPOS_CONTRATO = [
  'Iguala',
  'Contrato de proyecto',
  'Contrato servicio puntual',
  'Alquiler',
];

// Estados — editables, con la propiedad "dispara_vigencia"
let ESTADOS = [
  'Pendiente de someter',
  'Sometido en espera DGII',
  'Sometido en espera Min Hacienda',
  'En revisión',
  'Aprobado',
  'Rechazado DGII',
  'Re-sometido DGII',
  'Rechazado definitivo',
  'Exonerado',
];

// Estados que disparan la vigencia de 6 meses
let ESTADOS_VIGENCIA = ['Aprobado', 'Exonerado'];

// Vías de sometimiento — editables
let VIAS = [
  'DGII (Oficina Virtual)',
  'Ministerio de Hacienda (Presencial)',
];

// ---------- DATOS PRINCIPALES (vacíos para arrancar) ----------
let solicitudes = [];
let contratos = [];
let proveedores = [];

// ---------- ESTADO DE UI ----------
let filters = {
  estado: '',
  depto: '',
  tipoCompra: '',
  via: '',
  search: '',
  mes: '',
};

let currentSection = 'dashboard';
let editingSolicitudId = null;
let editingContratoId = null;

// ---------- IDs incrementales para nuevos registros ----------
function nextId(arr, prefix = '') {
  if (prefix) {
    let max = 0;
    arr.forEach(item => {
      const m = String(item.id).match(/(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1]));
    });
    return prefix + String(max + 1).padStart(3, '0');
  }
  return arr.length > 0 ? Math.max(...arr.map(x => x.id || 0)) + 1 : 1;
}
