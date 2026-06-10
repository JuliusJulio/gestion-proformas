/* ==========================================================
   DATA — Estado global en memoria
   Estos arrays se llenan desde Supabase al iniciar la app.
   ========================================================== */

// ---------- CATÁLOGOS (se cargan desde Supabase) ----------
let DEPARTAMENTOS = [];

// Tipos de compra — siempre fijos, no vienen de Supabase
let TIPOS_COMPRA = ['Compra única', 'No aplica'];
const TIPOS_COMPRA_PROTEGIDOS = ['Compra única', 'No aplica'];

let TIPOS_CONTRATO = [];
let ESTADOS = [];
let ESTADOS_VIGENCIA = [];
let VIAS = [];

// ---------- DATOS PRINCIPALES (se cargan desde Supabase) ----------
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
