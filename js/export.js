/* ==========================================================
   EXPORT — Exportar solicitudes filtradas a CSV
   Exporta SOLO lo que está visible con los filtros actuales.
   ========================================================== */

function exportToCSV() {
  const data = aplicarFiltros(solicitudes);

  if (data.length === 0) {
    alert('No hay solicitudes que coincidan con los filtros actuales.');
    return;
  }

  const headers = [
    'No. Solicitud / DUA',
    'Números Anteriores',
    'Régimen',
    'Vía',
    'Proveedor',
    'Descripción',
    'Partida Arancelaria',
    'Tipo Compra',
    'Contrato',
    'Departamento',
    'Estado Actual',
    // Fechas
    'F. Solicitud',
    'F. Aprob. MH / Liquidación DGA',
    'F. Aprob. DGII / Exoneración',
    'F. Rechazo',
    // Días
    'Días MH / DGA',
    'Días DGII / Exon.',
    'Días Rechazo',
    // Vigencia
    'F. Disparo Vigencia',
    'F. Vencimiento',
    'Días Restantes',
    // Montos
    'Moneda',
    'Tasa Cambio',
    'Monto Factura / Valor CIF',
    'Monto DOP',
    // Desglose de impuestos
    'Gravamen Arancelario (DOP)',
    'ITBIS (DOP)',
    'ISC (DOP)',
    'Total a Exonerar (DOP)',
    // Resto
    'Comentarios',
    'Bitácora',
  ];

  const rows = data.map(s => {
    const contrato = contratoDeSolicitud(s);
    const esAd = esSolicitudAduanal(s);

    // Cada evento: estado@fecha #número ⚡(si dispara vigencia)
    const bitacoraStr = (s.bitacora || [])
      .map(b => {
        const num = b.numeroSolicitud ? ` #${b.numeroSolicitud}` : '';
        const vig = b.disparaVigencia ? ' ⚡' : '';
        return `${b.estado || ''}@${b.fecha || ''}${num}${vig}`;
      })
      .join(' | ');

    return [
      numeroActual(s) || '#' + s.id,
      numerosAnteriores(s).join(' | '),
      esAd ? 'Importación (DGA)' : 'Interno (DGII / MH)',
      s.via,
      s.proveedor,
      s.descripcion,
      esAd ? (s.partidaArancelaria || '') : '',
      tipoCompraDerivado(s),
      contrato ? contrato.nombre : 'Compra única',
      s.depto,
      estadoActual(s),
      // Fechas
      s.fechaSolicitud || '',
      s.fechaAprobacionMH || '',
      s.fechaAprobacionDGII || '',
      s.fechaRechazo || '',
      // Días
      diasMH(s) ?? '',
      diasDGII(s) ?? '',
      diasRechazo(s) ?? '',
      // Vigencia (vacía en régimen aduanal: la exoneración se agota al despachar)
      fechaDisparoVigencia(s) || '',
      fechaVencimiento(s) || '',
      diasParaVencer(s) ?? '',
      // Montos
      s.moneda,
      s.tasaCambio,
      s.montoFactura,
      s.montoDOP,
      // Desglose
      esAd ? (s.montoGravamen || 0) : '',
      s.montoItbis || 0,
      s.montoIsc || 0,
      s.impuestoExonerar || 0,
      // Resto
      s.comentarios || '',
      bitacoraStr,
    ];
  });

  // ---------- Nombre del archivo según los filtros activos ----------
  const activos = [];
  if (filters.estado) activos.push(filters.estado.replace(/\s+/g, '_'));
  if (filters.depto) activos.push(filters.depto);
  if (filters.tipoCompra) activos.push(filters.tipoCompra.replace(/[\s:]+/g, '_'));
  if (filters.via) activos.push(filters.via.split('(')[0].trim().replace(/\s+/g, '_'));
  if (filters.mes) activos.push(filters.mes);
  const tag = activos.length > 0 ? '_' + activos.join('-') : '_completo';

  // ---------- Armado del CSV ----------
  let csv = '﻿' + headers.join(',') + '\n';
  rows.forEach(r => {
    csv += r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
  });

  // ---------- Fila de totales ----------
  // Las columnas de montos se totalizan para cuadrar contra la pantalla.
  // Se redondea a 2 decimales: acumular flotantes produce colas como
  // 7609503.720000001 que en un archivo contable no deben aparecer.
  const sum = (campo) =>
    Math.round(data.reduce((a, s) => a + (s[campo] || 0), 0) * 100) / 100;
  const totales = new Array(headers.length).fill('');
  totales[0] = `TOTALES (${data.length} solicitudes)`;
  totales[headers.indexOf('Monto DOP')] = sum('montoDOP');
  totales[headers.indexOf('Gravamen Arancelario (DOP)')] = sum('montoGravamen');
  totales[headers.indexOf('ITBIS (DOP)')] = sum('montoItbis');
  totales[headers.indexOf('ISC (DOP)')] = sum('montoIsc');
  totales[headers.indexOf('Total a Exonerar (DOP)')] = sum('impuestoExonerar');
  csv += totales.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',') + '\n';

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `exenciones_ctcr_${today()}${tag}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
