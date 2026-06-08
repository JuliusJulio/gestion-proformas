/* ==========================================================
   EXPORT — Exportar solicitudes filtradas a CSV
   ========================================================== */

function exportToCSV() {
  const data = aplicarFiltros(solicitudes);

  if (data.length === 0) {
    alert('No hay solicitudes que coincidan con los filtros actuales.');
    return;
  }

  const headers = [
    'No. Solicitud',
    'Proveedor',
    'Descripción',
    'Tipo Compra',
    'Departamento',
    'Estado Actual',
    'Vía',
    'F. Solicitud',
    'F. Aprobación MH',
    'F. Aprobación DGII',
    'F. Rechazo',
    'Días MH',
    'Días DGII',
    'Días Rechazo',
    'F. Disparo Vigencia',
    'F. Vencimiento',
    'Días Restantes',
    'Moneda',
    'Tasa Cambio',
    'Monto Factura',
    'Monto DOP',
    'Impuesto a Exonerar (DOP)',
    'Contrato',
    'Comentarios',
    'Bitácora',
  ];

  const rows = data.map(s => {
    const contrato = contratoDeSolicitud(s);
    const bitacoraStr = (s.bitacora || [])
      .map(b => `${b.estado || ''}@${b.fecha || ''}${b.disparaVigencia ? '⚡' : ''}`)
      .join(' | ');

    return [
      s.noSolicitud || '#' + s.id,
      s.proveedor,
      s.descripcion,
      tipoCompraDerivado(s),
      s.depto,
      estadoActual(s),
      s.via,
      s.fechaSolicitud || '',
      s.fechaAprobacionMH || '',
      s.fechaAprobacionDGII || '',
      s.fechaRechazo || '',
      diasMH(s) ?? '',
      diasDGII(s) ?? '',
      diasRechazo(s) ?? '',
      fechaDisparoVigencia(s) || '',
      fechaVencimiento(s) || '',
      diasParaVencer(s) ?? '',
      s.moneda,
      s.tasaCambio,
      s.montoFactura,
      s.montoDOP,
      s.impuestoExonerar,
      contrato ? contrato.nombre : 'Compra única',
      s.comentarios || '',
      bitacoraStr,
    ];
  });

  const activos = [];
  if (filters.estado) activos.push(filters.estado.replace(/\s+/g, '_'));
  if (filters.depto) activos.push(filters.depto);
  if (filters.tipoCompra) activos.push(filters.tipoCompra.replace(/[\s:]+/g, '_'));
  if (filters.via) activos.push(filters.via.split('(')[0].trim().replace(/\s+/g, '_'));
  if (filters.mes) activos.push(filters.mes);
  const tag = activos.length > 0 ? '_' + activos.join('-') : '_completo';

  let csv = '\uFEFF' + headers.join(',') + '\n';
  rows.forEach(r => {
    csv += r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',') + '\n';
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `exenciones_ctcr_${today()}${tag}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
