/* ==========================================================
   HELPERS — Funciones utilitarias compartidas
   ========================================================== */

// ---------- FORMATEO ----------
function fmt(n) {
  if (n === 0 || n === undefined || n === null || isNaN(n)) return '—';
  return new Intl.NumberFormat(CONFIG.LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtMoney(n, moneda = 'DOP') {
  if (n === 0 || n === undefined || n === null || isNaN(n)) return '—';
  const symbol = moneda === 'USD' ? 'US$' : 'RD$';
  return symbol + ' ' + fmt(n);
}

function fmtFecha(f) {
  if (!f) return '—';
  return f;
}

// ---------- FECHAS ----------
function today() {
  return new Date().toISOString().split('T')[0];
}

function daysBetween(d1, d2) {
  if (!d1 || !d2) return null;
  const a = new Date(d1);
  const b = new Date(d2);
  return Math.floor((b - a) / 86400000);
}

// ---------- ESTADOS ----------
const ESTADO_CSS_MAP = {
  'Aprobado': 'status-aprobado',
  'Exonerado': 'status-exonerado',
  'Sometido en espera DGII': 'status-sometido',
  'Sometido en espera Min Hacienda': 'status-sometido',
  'Re-sometido DGII': 'status-resometido',
  'Pendiente de someter': 'status-pendiente',
  'En revisión': 'status-pendiente',
  'Rechazado DGII': 'status-rechazado',
  'Rechazado definitivo': 'status-rechazado-def',
};

function getStatusClass(estado) {
  return ESTADO_CSS_MAP[estado] || 'status-borrador';
}

function disparaVigencia(estado) {
  return ESTADOS_VIGENCIA.includes(estado);
}

// ---------- BITÁCORA DE ESTADOS (por solicitud) ----------
// Cada solicitud.bitacora es un array de:
//   { estado: string, fecha: 'YYYY-MM-DD', disparaVigencia: bool }
// El "estado actual" es el último (más reciente) de la bitácora.

function estadoActual(sol) {
  if (!sol.bitacora || sol.bitacora.length === 0) return 'Pendiente de someter';
  // Ordenar por fecha ascendente, el último es el actual
  const ordenada = [...sol.bitacora].sort((a, b) => {
    if (!a.fecha) return -1;
    if (!b.fecha) return 1;
    return a.fecha.localeCompare(b.fecha);
  });
  return ordenada[ordenada.length - 1].estado;
}

function eventoDisparador(sol) {
  if (!sol.bitacora) return null;
  return sol.bitacora.find(e => e.disparaVigencia);
}

// ---------- NÚMERO DE SOLICITUD (vive en la bitácora) ----------
// El número actual es el del último evento; el historial son los
// números distintos anteriores en orden cronológico.

function bitacoraOrdenada(sol) {
  if (!sol.bitacora || sol.bitacora.length === 0) return [];
  return [...sol.bitacora].sort((a, b) => {
    if (!a.fecha) return -1;
    if (!b.fecha) return 1;
    return a.fecha.localeCompare(b.fecha);
  });
}

function numeroActual(sol) {
  const ord = bitacoraOrdenada(sol);
  for (let i = ord.length - 1; i >= 0; i--) {
    if (ord[i].numeroSolicitud) return ord[i].numeroSolicitud;
  }
  return sol.noSolicitud || '';
}

function numerosAnteriores(sol) {
  const actual = numeroActual(sol);
  const vistos = [];
  bitacoraOrdenada(sol).forEach(e => {
    const n = e.numeroSolicitud;
    if (n && n !== actual && !vistos.includes(n)) vistos.push(n);
  });
  return vistos;
}

function fechaDisparoVigencia(sol) {
  const ev = eventoDisparador(sol);
  if (!ev || !ev.fecha) return null;
  return ev.fecha;
}

// ---------- VIGENCIA ----------
function fechaVencimiento(sol) {
  if (!aplicaVigencia(sol)) return null;          // ← AGREGAR ESTA LÍNEA
  const fechaDisparo = fechaDisparoVigencia(sol);
  if (!fechaDisparo) return null;
  const d = new Date(fechaDisparo);
  d.setMonth(d.getMonth() + CONFIG.VIGENCIA_MESES);
  return d.toISOString().split('T')[0];
}

function diasParaVencer(sol) {
  const venc = fechaVencimiento(sol);
  if (!venc) return null;
  return daysBetween(today(), venc);
}

function nivelAlertaVencimiento(diasRestantes) {
  if (diasRestantes === null) return null;
  if (diasRestantes < 0) return 'expired';
  if (diasRestantes <= CONFIG.ALERTA_URGENTE_DIAS) return 'urgent';
  if (diasRestantes <= CONFIG.ALERTA_ADVERTENCIA_DIAS) return 'warning';
  return null;
}

// ---------- CÁLCULOS DE DÍAS POR FECHAS ESTRUCTURALES ----------
function diasMH(sol) {
  return daysBetween(sol.fechaSolicitud, sol.fechaAprobacionMH);
}

function diasDGII(sol) {
  // Si hay aprobación MH, contar desde ahí; sino desde solicitud
  const desde = sol.fechaAprobacionMH || sol.fechaSolicitud;
  return daysBetween(desde, sol.fechaAprobacionDGII);
}

function diasRechazo(sol) {
  return daysBetween(sol.fechaSolicitud, sol.fechaRechazo);
}

function diasDesdeAprobacion(sol) {
  const fechaDisparo = fechaDisparoVigencia(sol);
  if (!fechaDisparo) return null;
  return daysBetween(fechaDisparo, today());
}

// ---------- MES (para filtros) ----------
function getMes(fecha) {
  if (!fecha) return '';
  return fecha.substring(0, 7);
}

// ---------- VINCULACIÓN A CONTRATO ----------
function contratoDeSolicitud(sol) {
  if (!sol.contratoId) return null;
  return contratos.find(c => c.id === sol.contratoId) || null;
}

function tipoCompraDerivado(sol) {
  const contrato = contratoDeSolicitud(sol);
  if (contrato) {
    return `Contrato: ${contrato.tipoContrato}`;
  }
  return 'Compra única';
}

function proformasUsadas(contratoId) {
  return solicitudes.filter(s => s.contratoId === contratoId).length;
}

function proformasRestantes(contrato) {
  if (!contrato || !contrato.cantidadProformas) return null;
  return contrato.cantidadProformas - proformasUsadas(contrato.id);
}

function estadoTopeProformas(contrato) {
  if (!contrato || !contrato.cantidadProformas) return 'ok';
  const restantes = proformasRestantes(contrato);
  if (restantes < 0) return 'over';
  if (restantes === 0) return 'warn';
  if (restantes <= 1) return 'warn';
  return 'ok';
}

// ---------- ID GENERATOR ----------
function generarIdSolicitud() {
  if (solicitudes.length === 0) return 1;
  return Math.max(...solicitudes.map(s => s.id || 0)) + 1;
}

// ---------- ESCAPE HTML ----------
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
// ---------- FORMATO DE MONTOS EN INPUTS ----------
function desformatearMonto(str) {
  if (str === null || str === undefined) return 0;
  const limpio = String(str).replace(/,/g, '').trim();
  const n = parseFloat(limpio);
  return isNaN(n) ? 0 : n;
}

function formatearMontoInput(valor) {
  const n = typeof valor === 'number' ? valor : desformatearMonto(valor);
  if (n === 0) return '';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function onBlurMonto(input) {
  input.value = formatearMontoInput(input.value);
}

// ==========================================================
//  RÉGIMEN ADUANAL (DGA) — Fase 2
//  El código pregunta SIEMPRE por la bandera es_aduanas,
//  nunca por el texto "DGA": así la vía se puede renombrar
//  sin que el formulario deje de habilitar el gravamen.
// ==========================================================

function esViaAduanas(via) {
  return VIAS_ADUANAS.includes(via);
}

function esSolicitudAduanal(sol) {
  return esViaAduanas(sol && sol.via);
}

// Total a exonerar = suma de los tres conceptos
function totalImpuestos(sol) {
  if (!sol) return 0;
  return (sol.montoGravamen || 0) + (sol.montoItbis || 0) + (sol.montoIsc || 0);
}

// ¿Esta solicitud genera vigencia de 6 meses y alertas de vencimiento?
function aplicaVigencia(sol) {
  if (!CONFIG.VIGENCIA_APLICA_A_ADUANAS && esSolicitudAduanal(sol)) return false;
  return true;
}

// ---------- Etiquetas que cambian según la vía ----------
function etiquetaNumero(via) {
  return esViaAduanas(via) ? 'No. DUA / Declaración' : 'No. Solicitud (DGII/MH)';
}

function placeholderNumero(via) {
  return esViaAduanas(via) ? 'Ej: 2026-DUA-004512' : 'Ej: 5270394';
}

function etiquetaFecha2(via) {
  return esViaAduanas(via) ? 'F. Liquidación DGA' : 'F. Aprobación Min. Hacienda';
}

function etiquetaFecha3(via) {
  return esViaAduanas(via) ? 'F. Aprobación Exoneración' : 'F. Aprobación DGII';
}

function etiquetaMontoFactura(via) {
  return esViaAduanas(via) ? 'Valor CIF (moneda original)' : 'Monto Factura (moneda original)';
}

function etiquetaDias2(via) {
  return esViaAduanas(via) ? 'Días DGA' : 'Días MH';
}

function etiquetaDias3(via) {
  return esViaAduanas(via) ? 'Días Exoneración' : 'Días DGII';
}
