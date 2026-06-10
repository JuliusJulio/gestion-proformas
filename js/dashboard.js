/* ==========================================================
   DASHBOARD — KPIs, gráficas, alertas
   ========================================================== */

function renderDashboard() {
  const container = document.getElementById('section-dashboard');
  if (!container) return;

  container.querySelector('.content-inner').innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Dashboard Ejecutivo</div>
        <div class="section-subtitle">Resumen general — KPIs, alertas de vigencia y visualizaciones</div>
      </div>
    </div>
    <div class="kpi-grid" id="kpiGrid"></div>
    <div id="alertPanel"></div>
    <div class="charts-grid" id="chartsGrid"></div>
    <div class="filters-bar" id="dashFilters"></div>
    <div class="card" id="dashTable"></div>
  `;

  const data = aplicarFiltros(solicitudes);
  renderKPIs(data);
  renderAlertasVigencia();
  renderCharts(data);
  renderFiltros('dashFilters');
  renderTablaSolicitudes('dashTable', data);
}

// ---------- KPIs ----------
function renderKPIs(data) {
  const aprobados = data.filter(s => disparaVigencia(estadoActual(s)));
  const sometidos = data.filter(s => {
    const e = estadoActual(s);
    return e.startsWith('Sometido') || e === 'En revisión';
  });
  const rechazados = data.filter(s => estadoActual(s).startsWith('Rechazado'));

  const totalSol = data.reduce((a, s) => a + (s.impuestoExonerar || 0), 0);
  const totalApr = aprobados.reduce((a, s) => a + (s.impuestoExonerar || 0), 0);

  const diasProm = aprobados.length > 0
    ? Math.round(aprobados.map(s => diasDesdeAprobacion(s)).filter(x => x !== null).reduce((a, b) => a + b, 0) / aprobados.length * 10) / 10
    : 0;

  const proxVencer = aprobados.filter(s => {
    const d = diasParaVencer(s);
    return d !== null && d >= 0 && d <= CONFIG.ALERTA_ADVERTENCIA_DIAS;
  }).length;

  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi-card accent">
      <div class="kpi-label">Total Impuesto Solicitado</div>
      <div class="kpi-value text-accent">RD$ ${fmt(totalSol)}</div>
      <div class="kpi-sub">${data.length} solicitudes</div>
    </div>
    <div class="kpi-card green">
      <div class="kpi-label">Total Impuesto Exonerado</div>
      <div class="kpi-value" style="color:var(--green-text)">RD$ ${fmt(totalApr)}</div>
      <div class="kpi-sub">${aprobados.length} aprobadas</div>
    </div>
    <div class="kpi-card blue">
      <div class="kpi-label">Tasa de Aprobación</div>
      <div class="kpi-value" style="color:var(--blue-text)">${totalSol > 0 ? Math.round(totalApr / totalSol * 100) : 0}%</div>
      <div class="kpi-sub">del monto solicitado</div>
    </div>
    <div class="kpi-card yellow">
      <div class="kpi-label">Días Vigencia Promedio</div>
      <div class="kpi-value" style="color:var(--yellow-text)">${diasProm || 0}</div>
      <div class="kpi-sub">desde disparo de vigencia</div>
    </div>
    <div class="kpi-card purple">
      <div class="kpi-label">Expedientes</div>
      <div class="kpi-value" style="color:var(--purple-text)">${aprobados.length}</div>
      <div class="kpi-sub">${sometidos.length} en espera · ${rechazados.length} rechazadas</div>
    </div>
    <div class="kpi-card red">
      <div class="kpi-label">Próximas a Vencer</div>
      <div class="kpi-value" style="color:var(--red-text)">${proxVencer}</div>
      <div class="kpi-sub">en los próximos ${CONFIG.ALERTA_ADVERTENCIA_DIAS} días</div>
    </div>
  `;
}

// ---------- ALERTAS DE VIGENCIA ----------
function renderAlertasVigencia() {
  const panel = document.getElementById('alertPanel');
  if (!panel) return;

  // Tomar TODAS las solicitudes (no filtradas) — las alertas son globales
  const vigentes = solicitudes.filter(s => disparaVigencia(estadoActual(s)) && fechaDisparoVigencia(s));

  const items = [];
  vigentes.forEach(s => {
    const d = diasParaVencer(s);
    if (d === null) return;
    const nivel = nivelAlertaVencimiento(d);
    if (nivel) {
      items.push({ sol: s, dias: d, nivel, vencimiento: fechaVencimiento(s) });
    }
  });

  if (items.length === 0) {
    panel.innerHTML = '';
    return;
  }

  // Ordenar: vencidas > urgentes > advertencias, dentro de cada grupo por días asc
  const orden = { expired: 0, urgent: 1, warning: 2 };
  items.sort((a, b) => {
    if (orden[a.nivel] !== orden[b.nivel]) return orden[a.nivel] - orden[b.nivel];
    return a.dias - b.dias;
  });

  const exp = items.filter(x => x.nivel === 'expired').length;
  const urg = items.filter(x => x.nivel === 'urgent').length;
  const adv = items.filter(x => x.nivel === 'warning').length;

  const partes = [];
  if (exp) partes.push(`${exp} vencida${exp > 1 ? 's' : ''}`);
  if (urg) partes.push(`${urg} urgente${urg > 1 ? 's' : ''}`);
  if (adv) partes.push(`${adv} próxima${adv > 1 ? 's' : ''}`);

  const rows = items.map(a => {
    const icon = a.nivel === 'expired' ? '⛔' : a.nivel === 'urgent' ? '🔴' : '🟠';
    const label = a.dias < 0 ? `Venció hace ${Math.abs(a.dias)}d` : `${a.dias}d restantes`;
    const contrato = contratoDeSolicitud(a.sol);
    const accion = contrato ? 'Preparar nueva proforma' : 'Verificar vigencia';
    const totalDias = CONFIG.VIGENCIA_MESES * 30;
    const usados = totalDias - a.dias;
    const pct = Math.min(100, Math.max(0, (usados / totalDias) * 100));
    const barColor = a.nivel === 'expired' || a.nivel === 'urgent' ? 'var(--red)' : 'var(--orange)';

    return `
      <div class="alert-row">
        <div class="alert-icon ${a.nivel}">${icon}</div>
        <div class="alert-info">
          <div class="alert-title">${escapeHtml(a.sol.proveedor)} — ${escapeHtml(a.sol.descripcion)}</div>
          <div class="alert-sub">
            No. ${escapeHtml(a.sol.noSolicitud || '#' + a.sol.id)} · Vence: ${a.vencimiento} ·
            <span class="vigencia-bar"><span class="vigencia-bar-fill" style="width:${pct}%;background:${barColor}"></span></span>
            ${Math.round(pct)}% consumido
          </div>
        </div>
        <span class="alert-days ${a.nivel}">${label}</span>
        <button class="action-link" onclick="abrirEditarSolicitud(${a.sol.id})">${accion}</button>
      </div>
    `;
  }).join('');

  panel.innerHTML = `
    <div class="alert-panel fade-in">
      <div class="alert-panel-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        Alertas de Vigencia — ${partes.join(' · ')}
        <span style="font-size:11px;color:var(--text-dim);font-weight:400;margin-left:8px">
          (Exenciones aprobadas: vigencia ${CONFIG.VIGENCIA_MESES} meses)
        </span>
      </div>
      ${rows}
    </div>
  `;
}

// ---------- CHARTS ----------
function renderCharts(data) {
  const byEstado = {};
  const byDepto = {};
  ESTADOS.forEach(e => byEstado[e] = 0);
  DEPARTAMENTOS.forEach(d => byDepto[d] = 0);

  data.forEach(s => {
    const e = estadoActual(s);
    if (byEstado[e] !== undefined) byEstado[e] += (s.impuestoExonerar || 0);
    if (byDepto[s.depto] !== undefined) byDepto[s.depto] += (s.impuestoExonerar || 0);
  });

  const statusColors = {
    'Aprobado': 'var(--green)',
    'Exonerado': 'var(--green)',
    'Sometido en espera DGII': 'var(--blue)',
    'Sometido en espera Min Hacienda': '#6a9ff7',
    'Re-sometido DGII': 'var(--purple)',
    'Pendiente de someter': 'var(--yellow)',
    'En revisión': '#e0a030',
    'Rechazado DGII': 'var(--orange)',
    'Rechazado definitivo': 'var(--red)',
  };

  // Pie chart
  const pieData = Object.entries(byEstado).filter(([, v]) => v > 0);
  const pieTotal = pieData.reduce((a, [, v]) => a + v, 0) || 1;
  const pieColors = pieData.map(([k]) => statusColors[k] || 'var(--text-dim)');

  let cumAngle = 0;
  const slices = pieData.map(([, v], i) => {
    const pct = v / pieTotal;
    const ang = pct * 360;
    const start = cumAngle;
    cumAngle += ang;
    const large = ang > 180 ? 1 : 0;
    const r = 55, cx = 65, cy = 65;
    const r1 = (start - 90) * Math.PI / 180;
    const r2 = (start + ang - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(r1);
    const y1 = cy + r * Math.sin(r1);
    const x2 = cx + r * Math.cos(r2);
    const y2 = cy + r * Math.sin(r2);
    if (pct >= 0.999) return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${pieColors[i]}" opacity="0.9"/>`;
    return `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="${pieColors[i]}" opacity="0.9"/>`;
  }).join('');

  const pieLegend = pieData.map(([k, v], i) => `
    <div class="pie-legend-item">
      <div class="pie-legend-dot" style="background:${pieColors[i]}"></div>
      ${escapeHtml(k).replace('Sometido en espera ', 'Esp. ')}
      <span class="pie-legend-value">${Math.round(v / pieTotal * 100)}%</span>
    </div>
  `).join('');

  // Bars por depto
  const deptoEntries = Object.entries(byDepto).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const deptoColors = ['var(--accent)', 'var(--blue)', 'var(--green)', 'var(--purple)', 'var(--yellow)', 'var(--orange)', 'var(--red)'];
  const maxDepto = Math.max(...deptoEntries.map(([, v]) => v), 1);
  const deptoBars = deptoEntries.map(([k, v], i) => `
    <div class="chart-bar-row">
      <div class="chart-bar-label">${escapeHtml(k)}</div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${(v / maxDepto * 100).toFixed(1)}%;background:${deptoColors[i % deptoColors.length]}"></div>
      </div>
      <div class="chart-bar-value">${fmt(v)}</div>
    </div>
  `).join('');

  // Via
  const byVia = {};
  VIAS.forEach(v => byVia[v] = { total: 0, count: 0 });
  data.forEach(s => {
    if (byVia[s.via]) {
      byVia[s.via].total += (s.impuestoExonerar || 0);
      byVia[s.via].count++;
    }
  });
  const maxVia = Math.max(...Object.values(byVia).map(x => x.total), 1);
  const viaBars = Object.entries(byVia).map(([k, v]) => `
    <div class="chart-bar-row">
      <div class="chart-bar-label" style="width:160px">${escapeHtml(k.split('(')[0].trim())}</div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${(v.total / maxVia * 100).toFixed(1)}%;background:var(--blue)"></div>
      </div>
      <div class="chart-bar-value">${fmt(v.total)} <span class="text-dim">(${v.count})</span></div>
    </div>
  `).join('');

  document.getElementById('chartsGrid').innerHTML = `
    <div class="chart-card">
      <div class="chart-title">Distribución por Estado</div>
      ${pieData.length > 0 ? `
      <div class="pie-container">
        <svg class="pie-svg" viewBox="0 0 130 130">${slices}</svg>
        <div class="pie-legend">${pieLegend}</div>
      </div>
      ` : `<div class="text-dim" style="padding:20px;text-align:center">Sin datos para mostrar</div>`}
    </div>
    <div class="chart-card">
      <div class="chart-title">Impuesto por Departamento</div>
      ${deptoEntries.length > 0 ? deptoBars : `<div class="text-dim" style="padding:20px;text-align:center">Sin datos</div>`}
    </div>
    <div class="chart-card">
      <div class="chart-title">Montos por Vía</div>
      ${viaBars}
    </div>
    <div class="chart-card">
      <div class="chart-title">Resumen Rápido</div>
      <div style="display:flex;flex-direction:column;gap:10px;font-size:13px">
        <div style="display:flex;justify-content:space-between"><span class="text-muted">Tasa cambio ref.</span><span class="mono">${CONFIG.TASA_CAMBIO_DEFAULT} DOP/USD</span></div>
        <div style="display:flex;justify-content:space-between"><span class="text-muted">Solicitudes este mes</span><span class="mono">${data.filter(s => getMes(s.fechaSolicitud) === getMes(today())).length}</span></div>
        <div style="display:flex;justify-content:space-between"><span class="text-muted">Con contrato</span><span class="mono">${data.filter(s => s.contratoId).length}</span></div>
        <div style="display:flex;justify-content:space-between"><span class="text-muted">Compras únicas</span><span class="mono">${data.filter(s => !s.contratoId).length}</span></div>
        <div style="display:flex;justify-content:space-between"><span class="text-muted">Proveedores activos</span><span class="mono">${new Set(data.map(s => s.proveedor)).size}</span></div>
      </div>
    </div>
  `;
}
