/* ==========================================================
   SOLICITUDES — Render, filtros, modal con bitácora
   ========================================================== */

// ---------- FILTROS ----------
function aplicarFiltros(data) {
  return data.filter(s => {
    const estado = estadoActual(s);
    const tipoCompra = tipoCompraDerivado(s);

    if (filters.estado && estado !== filters.estado) return false;
    if (filters.depto && s.depto !== filters.depto) return false;
    if (filters.tipoCompra) {
      // Si el filtro es "Compra única" o "No aplica", aplicar directo
      // Si es un tipo de contrato, validar
      if (filters.tipoCompra === 'Compra única') {
        if (s.contratoId) return false;
      } else if (filters.tipoCompra.startsWith('Contrato:')) {
        const tipo = filters.tipoCompra.replace('Contrato: ', '');
        const c = contratoDeSolicitud(s);
        if (!c || c.tipoContrato !== tipo) return false;
      }
    }
    if (filters.via && s.via !== filters.via) return false;
    if (filters.mes && getMes(s.fechaSolicitud) !== filters.mes) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const t = (s.proveedor + ' ' + s.descripcion + ' ' + s.noSolicitud + ' ' + (s.comentarios || '')).toLowerCase();
      if (!t.includes(q)) return false;
    }
    return true;
  });
}

function renderFiltros(containerId) {
  const meses = [...new Set(solicitudes.map(s => getMes(s.fechaSolicitud)).filter(Boolean))].sort();
  const tiposCompraFiltro = ['Compra única', ...TIPOS_CONTRATO.map(t => `Contrato: ${t}`)];

  const html = `
    <div class="search-wrapper">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input type="text" class="search-input" placeholder="Buscar proveedor, solicitud..." value="${escapeHtml(filters.search)}" oninput="filters.search=this.value;renderAll()">
    </div>
    <div class="filter-group">
      <span class="filter-label">Estado</span>
      <select onchange="filters.estado=this.value;renderAll()">
        <option value="">Todos</option>
        ${ESTADOS.map(e => `<option value="${escapeHtml(e)}" ${filters.estado === e ? 'selected' : ''}>${escapeHtml(e)}</option>`).join('')}
      </select>
    </div>
    <div class="filter-group">
      <span class="filter-label">Depto</span>
      <select onchange="filters.depto=this.value;renderAll()">
        <option value="">Todos</option>
        ${DEPARTAMENTOS.map(d => `<option value="${escapeHtml(d)}" ${filters.depto === d ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('')}
      </select>
    </div>
    <div class="filter-group">
      <span class="filter-label">Tipo</span>
      <select onchange="filters.tipoCompra=this.value;renderAll()">
        <option value="">Todos</option>
        ${tiposCompraFiltro.map(t => `<option value="${escapeHtml(t)}" ${filters.tipoCompra === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
      </select>
    </div>
    <div class="filter-group">
      <span class="filter-label">Vía</span>
      <select onchange="filters.via=this.value;renderAll()">
        <option value="">Todas</option>
        ${VIAS.map(v => `<option value="${escapeHtml(v)}" ${filters.via === v ? 'selected' : ''}>${escapeHtml(v.split('(')[0].trim())}</option>`).join('')}
      </select>
    </div>
    <div class="filter-group">
      <span class="filter-label">Mes</span>
      <select onchange="filters.mes=this.value;renderAll()">
        <option value="">Todos</option>
        ${meses.map(m => `<option value="${m}" ${filters.mes === m ? 'selected' : ''}>${m}</option>`).join('')}
      </select>
    </div>
    <button class="btn btn-ghost btn-sm" onclick="filters={estado:'',depto:'',tipoCompra:'',via:'',search:'',mes:''};renderAll()">Limpiar</button>
  `;
  document.getElementById(containerId).innerHTML = html;
}

// ---------- TABLA PRINCIPAL ----------
function renderTablaSolicitudes(containerId, data) {
  const totalImpuesto = data.reduce((a, s) => a + (s.impuestoExonerar || 0), 0);
  const totalMonto = data.reduce((a, s) => a + (s.montoDOP || 0), 0);

  const rows = data.map(s => {
    const estado = estadoActual(s);
    const tipoC = tipoCompraDerivado(s);
    const dMH = diasMH(s);
    const dDGII = diasDGII(s);
    const dRech = diasRechazo(s);
    const dV = diasParaVencer(s);
    const isVigencia = disparaVigencia(estado) && fechaDisparoVigencia(s);

    // Celda de vigencia
    let vigenciaCell;
    if (isVigencia && dV !== null) {
      const totalDias = CONFIG.VIGENCIA_MESES * 30;
      const diasUsados = totalDias - dV;
      const pct = Math.min(100, Math.max(0, (diasUsados / totalDias) * 100));
      const nivel = nivelAlertaVencimiento(dV);
      const barColor = nivel === 'expired' || nivel === 'urgent' ? 'var(--red)' :
                       nivel === 'warning' ? 'var(--orange)' : 'var(--green)';
      const textColor = nivel === 'expired' || nivel === 'urgent' ? 'var(--red-text)' :
                        nivel === 'warning' ? 'var(--orange-text)' : 'var(--green-text)';
      const label = dV < 0 ? 'Vencida' : `${dV}d`;
      vigenciaCell = `
        <td class="vigencia-cell" title="Vence: ${fechaVencimiento(s)}">
          <span class="vigencia-bar"><span class="vigencia-bar-fill" style="width:${pct}%;background:${barColor}"></span></span>
          <span class="mono" style="font-size:11px;font-weight:600;color:${textColor}">${label}</span>
        </td>
      `;
    } else {
      vigenciaCell = `<td class="days-empty" style="text-align:center">—</td>`;
    }

    const renderDias = (d) => {
      if (d === null) return '<span class="days-empty">—</span>';
      return `<span class="days-badge ${d > 30 ? 'days-warn' : 'days-ok'}">${d}</span>`;
    };

    return `
      <tr>
        <td class="num-cell">${escapeHtml(s.noSolicitud || '#' + s.id)}</td>
        <td style="font-weight:500">${escapeHtml(s.proveedor)}</td>
        <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis" title="${escapeHtml(s.descripcion)}">${escapeHtml(s.descripcion)}</td>
        <td style="font-size:12px">${escapeHtml(tipoC)}</td>
        <td>${escapeHtml(s.depto)}</td>
        <td><span class="status-badge ${getStatusClass(estado)}"><span class="dot"></span>${escapeHtml(estado)}</span></td>
        <td class="mono" style="font-size:12px">${s.fechaSolicitud || '—'}</td>
        <td style="text-align:center">${renderDias(dMH)}</td>
        <td style="text-align:center">${renderDias(dDGII)}</td>
        <td style="text-align:center">${renderDias(dRech)}</td>
        ${vigenciaCell}
        <td class="money">${fmt(s.montoDOP)}</td>
        <td class="money" style="color:var(--accent);font-weight:600">${fmt(s.impuestoExonerar)}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;color:var(--text-dim);font-size:12px" title="${escapeHtml(s.comentarios || '')}">${escapeHtml(s.comentarios || '')}</td>
        <td><button class="action-link" onclick="abrirEditarSolicitud(${s.id})">Editar</button></td>
      </tr>
    `;
  }).join('');

  const empty = data.length === 0
    ? `<tr><td colspan="15" style="text-align:center;padding:30px;color:var(--text-dim)">
        ${solicitudes.length === 0 ? 'No hay solicitudes registradas. Crea la primera con el botón "+ Nueva Solicitud" arriba.' : 'Ningún resultado coincide con los filtros aplicados.'}
       </td></tr>`
    : rows;

  document.getElementById(containerId).innerHTML = `
    <div class="card-header">
      <div class="card-title">
        Seguimiento de Solicitudes de Exención
        <span class="card-count">${data.length}</span>
      </div>
    </div>
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>No. Solicitud</th>
            <th>Suplidor</th>
            <th>Descripción</th>
            <th>Tipo Compra</th>
            <th>Depto.</th>
            <th>Estado</th>
            <th>F. Solicitud</th>
            <th style="text-align:center" title="Fecha aprobación MH − Fecha solicitud">Días MH</th>
            <th style="text-align:center" title="Fecha aprobación DGII − Fecha aprobación MH (o solicitud)">Días DGII</th>
            <th style="text-align:center" title="Fecha rechazo − Fecha solicitud">Días Rechazo</th>
            <th style="text-align:center">Vigencia</th>
            <th class="money-header">Monto DOP</th>
            <th class="money-header">Imp. Exonerar</th>
            <th>Comentarios</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${empty}
          ${data.length > 0 ? `
            <tr class="totals-row">
              <td colspan="11" style="text-align:right;font-size:12px">TOTALES · ${data.length} registros</td>
              <td class="money">${fmt(totalMonto)}</td>
              <td class="money">${fmt(totalImpuesto)}</td>
              <td colspan="2"></td>
            </tr>
          ` : ''}
        </tbody>
      </table>
    </div>
    <div class="card-footer">
      <span>Los totales se recalculan al modificar los filtros · Vigencia: ${CONFIG.VIGENCIA_MESES} meses</span>
      <span>Corporación Turística Cabo Rojo S.A.</span>
    </div>
  `;
}

// ---------- SECCIÓN COMPLETA SOLICITUDES ----------
function renderSeccionSolicitudes() {
  const container = document.getElementById('section-solicitudes');
  if (!container) return;
  container.querySelector('.content-inner').innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Solicitudes de Exención</div>
        <div class="section-subtitle">Gestiona aquí todas las solicitudes con su bitácora de estados y fechas.</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="abrirNuevaSolicitud()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nueva Solicitud
      </button>
    </div>
    <div class="filters-bar" id="solFilters"></div>
    <div class="card" id="solTable"></div>
  `;

  const data = aplicarFiltros(solicitudes);
  renderFiltros('solFilters');
  renderTablaSolicitudes('solTable', data);
}

// ---------- MODAL: NUEVA / EDITAR SOLICITUD ----------
let tempBitacora = [];

function abrirNuevaSolicitud() {
  editingSolicitudId = null;
  tempBitacora = [];
  renderModalSolicitud(null);
}

function abrirEditarSolicitud(id) {
  const s = solicitudes.find(x => x.id === id);
  if (!s) return;
  editingSolicitudId = id;
  tempBitacora = JSON.parse(JSON.stringify(s.bitacora || []));
  renderModalSolicitud(s);
}

function renderModalSolicitud(s) {
  const isEdit = s !== null;
  const provOpts = proveedores.map(p => `<option value="${escapeHtml(p.nombre)}" ${s && s.proveedor === p.nombre ? 'selected' : ''}>${escapeHtml(p.nombre)}</option>`).join('');
  const deptoOpts = DEPARTAMENTOS.map(d => `<option value="${escapeHtml(d)}" ${s && s.depto === d ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('');
  const viaOpts = VIAS.map(v => `<option value="${escapeHtml(v)}" ${s && s.via === v ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');

  document.getElementById('modalTitle').textContent = isEdit ? 'Editar Solicitud' : 'Nueva Solicitud de Exención';

  document.getElementById('modalBody').innerHTML = `

    <!-- SECCIÓN 1: INFORMACIÓN BÁSICA -->
    <div class="form-section">
      <div class="form-section-title">Información Básica</div>
      <div class="form-grid">
        <div class="form-group">
          <label>No. Solicitud (DGII/MH)</label>
          <input type="text" id="fNoSol" value="${s ? escapeHtml(s.noSolicitud || '') : ''}" placeholder="Ej: 5270394">
        </div>
        <div class="form-group">
          <label>Departamento *</label>
          <select id="fDepto">
            <option value="">— Seleccionar —</option>
            ${deptoOpts}
          </select>
        </div>
        <div class="form-group">
          <label>Proveedor *</label>
          <select id="fProveedor" onchange="actualizarContratoSelect()">
            <option value="">— Seleccionar —</option>
            ${provOpts}
          </select>
        </div>
        <div class="form-group">
          <label>Vía de Sometimiento *</label>
          <select id="fVia">
            <option value="">— Seleccionar —</option>
            ${viaOpts}
          </select>
        </div>
        <div class="form-group full">
          <label>Descripción *</label>
          <input type="text" id="fDesc" value="${s ? escapeHtml(s.descripcion) : ''}" placeholder="Descripción del bien o servicio">
        </div>
      </div>
    </div>

    <!-- SECCIÓN 2: VINCULACIÓN A CONTRATO -->
    <div class="form-section">
      <div class="form-section-title">Vinculación</div>
      <div class="checkbox-group">
        <input type="checkbox" id="fVincular" ${s && s.contratoId ? 'checked' : ''} onchange="toggleVincularContrato()">
        <label for="fVincular">Vincular esta solicitud a un contrato existente</label>
      </div>
      <div id="contratoSelectWrap" style="margin-top:12px;${s && s.contratoId ? '' : 'display:none'}">
        <div class="form-group">
          <label>Contrato *</label>
          <select id="fContrato" onchange="onSelectContrato()">
            <option value="">— Seleccionar contrato del proveedor —</option>
          </select>
          <div id="contratoInfo" class="help-text"></div>
        </div>
      </div>
      <div class="help-text" style="margin-top:8px">
        Si no marcas el cotejo, esta solicitud se registra como <strong>Compra única</strong>.
        Si lo marcas, aparecerán solo los contratos del proveedor seleccionado.
      </div>
    </div>

    <!-- SECCIÓN 3: FECHAS ESTRUCTURALES -->
    <div class="form-section">
      <div class="form-section-title">Fechas Estructurales</div>
      <div class="help-text" style="margin-bottom:10px;font-style:normal">
        Estas fechas calculan los días en la tabla principal (Días MH, Días DGII, Días Rechazo).
      </div>
      <div class="form-grid">
        <div class="form-group">
          <label>Fecha de Solicitud *</label>
          <input type="date" id="fFechaSol" value="${s ? (s.fechaSolicitud || '') : today()}">
        </div>
        <div class="form-group">
          <label>Fecha Aprobación Min. Hacienda</label>
          <input type="date" id="fFechaAprobMH" value="${s ? (s.fechaAprobacionMH || '') : ''}">
        </div>
        <div class="form-group">
          <label>Fecha Aprobación DGII</label>
          <input type="date" id="fFechaAprobDGII" value="${s ? (s.fechaAprobacionDGII || '') : ''}">
        </div>
        <div class="form-group">
          <label>Fecha de Rechazo</label>
          <input type="date" id="fFechaRechazo" value="${s ? (s.fechaRechazo || '') : ''}">
        </div>
      </div>
    </div>

    <!-- SECCIÓN 4: BITÁCORA DE ESTADOS -->
    <div class="form-section">
      <div class="form-section-title">Bitácora de Estados</div>
      <div class="help-text" style="margin-bottom:10px;font-style:normal">
        Registra cada cambio de estado con su fecha. El estado actual será el más reciente.
        Marca con ⚡ el estado que dispara la vigencia de ${CONFIG.VIGENCIA_MESES} meses (solo uno).
      </div>
      <div id="bitacoraContainer"></div>
      <button class="bitacora-add" onclick="agregarEntradaBitacora()">+ Agregar estado a la bitácora</button>
    </div>

    <!-- SECCIÓN 5: MONTOS -->
    <div class="form-section">
      <div class="form-section-title">Montos</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Moneda</label>
          <select id="fMoneda" onchange="recalcularMontoDOP()">
            <option value="DOP" ${s && s.moneda === 'DOP' ? 'selected' : ''}>DOP</option>
            <option value="USD" ${s && s.moneda === 'USD' ? 'selected' : ''}>USD</option>
          </select>
        </div>
        <div class="form-group">
          <label>Tasa Cambio</label>
          <input type="number" id="fTasa" value="${s ? s.tasaCambio : CONFIG.TASA_CAMBIO_DEFAULT}" step="0.0001" oninput="recalcularMontoDOP()">
        </div>
        <div class="form-group">
          <label>Monto Factura (moneda original)</label>
          <input type="number" id="fMontoFact" value="${s ? s.montoFactura : ''}" step="0.01" oninput="recalcularMontoDOP()" placeholder="0.00">
        </div>
        <div class="form-group">
          <label>Monto en DOP (calculado)</label>
          <input type="number" id="fMontoDOP" value="${s ? s.montoDOP : ''}" step="0.01" placeholder="0.00">
        </div>
        <div class="form-group full">
          <label>Impuesto a Exonerar (DOP) *</label>
          <input type="number" id="fImpuesto" value="${s ? s.impuestoExonerar : ''}" step="0.01" placeholder="0.00">
        </div>
      </div>
    </div>

    <!-- SECCIÓN 6: COMENTARIOS -->
    <div class="form-section">
      <div class="form-section-title">Comentarios</div>
      <textarea id="fComentarios" placeholder="Observaciones, notas internas...">${s ? escapeHtml(s.comentarios || '') : ''}</textarea>
    </div>
  `;

  const enUso = isEdit;
  document.getElementById('modalFooter').innerHTML = `
    ${isEdit ? `<button class="btn btn-danger btn-sm" onclick="eliminarSolicitud(${s.id})">Eliminar</button>` : ''}
    <div class="spacer"></div>
    <button class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="guardarSolicitud()">Guardar</button>
  `;

  // Aplicar valores iniciales que requieren JS
  actualizarContratoSelect();
  if (s && s.contratoId) {
    document.getElementById('fContrato').value = s.contratoId;
    onSelectContrato();
  }
  renderBitacora();

  abrirModal('lg');
}

// ---------- VINCULACIÓN A CONTRATO ----------
function toggleVincularContrato() {
  const checked = document.getElementById('fVincular').checked;
  document.getElementById('contratoSelectWrap').style.display = checked ? '' : 'none';
  if (!checked) {
    document.getElementById('fContrato').value = '';
    document.getElementById('contratoInfo').innerHTML = '';
  }
}

function actualizarContratoSelect() {
  const provNombre = document.getElementById('fProveedor').value;
  const select = document.getElementById('fContrato');
  if (!select) return;
  const filtrados = contratosDeProveedor(provNombre);
  select.innerHTML = `<option value="">— Seleccionar contrato del proveedor —</option>` +
    filtrados.map(c => {
      const usadas = proformasUsadas(c.id);
      const tope = c.cantidadProformas || 0;
      const enTope = tope > 0 && usadas >= tope;
      return `<option value="${escapeHtml(c.id)}">${escapeHtml(c.nombre)} (${c.tipoContrato}) — ${usadas}/${tope} proformas${enTope ? ' ⚠' : ''}</option>`;
    }).join('');
  document.getElementById('contratoInfo').innerHTML = '';

  if (filtrados.length === 0 && provNombre) {
    document.getElementById('contratoInfo').innerHTML = `<span style="color:var(--orange-text)">⚠ No hay contratos registrados para este proveedor. Créalo primero en la sección Contratos.</span>`;
  }
}

function onSelectContrato() {
  const id = document.getElementById('fContrato').value;
  const info = document.getElementById('contratoInfo');
  if (!id) { info.innerHTML = ''; return; }
  const c = contratos.find(x => x.id === id);
  if (!c) return;
  const usadas = proformasUsadas(c.id);
  const tope = c.cantidadProformas || 0;
  const restantes = tope - usadas;
  let estadoMsg;
  if (restantes > 1) {
    estadoMsg = `<span style="color:var(--green-text)">✓ Quedan ${restantes} proformas disponibles de ${tope}</span>`;
  } else if (restantes === 1) {
    estadoMsg = `<span style="color:var(--orange-text)">⚠ Última proforma disponible (${usadas}/${tope})</span>`;
  } else if (restantes === 0) {
    estadoMsg = `<span style="color:var(--red-text)">⚠ Ya se usó el tope (${usadas}/${tope}). Al guardar el sistema pedirá confirmación para exceder.</span>`;
  } else {
    estadoMsg = `<span style="color:var(--red-text)">⚠ Excedido en ${Math.abs(restantes)} (${usadas}/${tope}). El sistema pedirá confirmación para guardar.</span>`;
  }
  info.innerHTML = `
    <strong>Tipo:</strong> ${escapeHtml(c.tipoContrato)} ·
    <strong>Tipo de compra derivado:</strong> "Contrato: ${escapeHtml(c.tipoContrato)}"<br>
    ${estadoMsg}
  `;
}

// ---------- BITÁCORA DE ESTADOS ----------
function renderBitacora() {
  const container = document.getElementById('bitacoraContainer');
  if (!container) return;

  if (tempBitacora.length === 0) {
    container.innerHTML = `<div class="bitacora bitacora-empty">No hay estados registrados. Agrega el primero con el botón de abajo.</div>`;
    return;
  }

  // Ordenar por fecha ascendente
  const ordenada = [...tempBitacora].map((b, originalIdx) => ({ ...b, originalIdx }))
    .sort((a, b) => {
      if (!a.fecha) return -1;
      if (!b.fecha) return 1;
      return a.fecha.localeCompare(b.fecha);
    });

  const ultimoIdx = ordenada[ordenada.length - 1].originalIdx;

  const rows = ordenada.map((b) => {
    const estadosOpts = ESTADOS.map(e => `<option value="${escapeHtml(e)}" ${b.estado === e ? 'selected' : ''}>${escapeHtml(e)}</option>`).join('');
    const esDisparable = b.estado && disparaVigencia(b.estado);
    const esUltimo = b.originalIdx === ultimoIdx;

    return `
      <div class="bitacora-row">
        <select onchange="cambiarBitacoraEstado(${b.originalIdx}, this.value)">
          ${estadosOpts}
        </select>
        <input type="date" value="${b.fecha || ''}" onchange="cambiarBitacoraFecha(${b.originalIdx}, this.value)">
        <div class="bitacora-vigencia ${b.disparaVigencia ? 'active' : ''}"
             onclick="toggleBitacoraDisparador(${b.originalIdx})"
             title="${esDisparable ? 'Marcar este evento como disparador de vigencia' : 'El estado seleccionado no dispara vigencia. Cambia el estado a uno que sí lo haga o márcalo en Catálogos.'}">
          <input type="checkbox" ${b.disparaVigencia ? 'checked' : ''} ${!esDisparable ? 'disabled' : ''}>
          ⚡ Dispara vigencia
        </div>
        <button class="bitacora-remove" onclick="eliminarEntradaBitacora(${b.originalIdx})" title="Eliminar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
  }).join('');

  // Determinar estado actual y disparador
  const estadoAct = ordenada[ordenada.length - 1].estado;
  const disparador = tempBitacora.find(b => b.disparaVigencia);

  let resumen = `<strong>Estado actual:</strong> <span class="status-badge ${getStatusClass(estadoAct)}"><span class="dot"></span>${escapeHtml(estadoAct || '—')}</span>`;
  if (disparador) {
    resumen += ` &nbsp;·&nbsp; <strong>Disparador vigencia:</strong> ${escapeHtml(disparador.estado)} (${disparador.fecha || 'sin fecha'})`;
  } else {
    resumen += ` &nbsp;·&nbsp; <span style="color:var(--text-dim)">Sin disparador de vigencia</span>`;
  }

  container.innerHTML = `
    <div class="bitacora">
      <div class="bitacora-header">
        <span>Estado</span>
        <span style="display:flex;gap:60px"><span>Fecha</span><span>Disparador</span></span>
      </div>
      ${rows}
      <div class="bitacora-summary">${resumen}</div>
    </div>
  `;
}

function agregarEntradaBitacora() {
  tempBitacora.push({
    estado: ESTADOS[0] || '',
    fecha: today(),
    disparaVigencia: false,
  });
  renderBitacora();
}

function cambiarBitacoraEstado(idx, valor) {
  tempBitacora[idx].estado = valor;
  // Si el estado ya no dispara, quitar disparador
  if (!disparaVigencia(valor)) {
    tempBitacora[idx].disparaVigencia = false;
  }
  renderBitacora();
}

function cambiarBitacoraFecha(idx, valor) {
  tempBitacora[idx].fecha = valor;
  renderBitacora();
}

function toggleBitacoraDisparador(idx) {
  const b = tempBitacora[idx];
  if (!disparaVigencia(b.estado)) {
    alert(`El estado "${b.estado}" no está marcado como disparador de vigencia.\n\nPara que un evento pueda disparar los ${CONFIG.VIGENCIA_MESES} meses de vigencia, el estado debe estar marcado con ⚡ en Catálogos.`);
    return;
  }
  // Solo uno puede estar activo a la vez
  const yaActivo = b.disparaVigencia;
  tempBitacora.forEach(x => x.disparaVigencia = false);
  if (!yaActivo) {
    b.disparaVigencia = true;
  }
  renderBitacora();
}

function eliminarEntradaBitacora(idx) {
  tempBitacora.splice(idx, 1);
  renderBitacora();
}

// ---------- RECÁLCULO MONTO DOP ----------
function recalcularMontoDOP() {
  const moneda = document.getElementById('fMoneda').value;
  const tasa = parseFloat(document.getElementById('fTasa').value) || 1;
  const monto = parseFloat(document.getElementById('fMontoFact').value) || 0;
  const dop = moneda === 'USD' ? monto * tasa : monto;
  document.getElementById('fMontoDOP').value = dop.toFixed(2);
}

// ---------- GUARDAR ----------
function guardarSolicitud() {
  // Validaciones
  const proveedor = document.getElementById('fProveedor').value;
  const depto = document.getElementById('fDepto').value;
  const desc = document.getElementById('fDesc').value.trim();
  const via = document.getElementById('fVia').value;
  const fechaSol = document.getElementById('fFechaSol').value;
  const impuesto = parseFloat(document.getElementById('fImpuesto').value) || 0;

  if (!proveedor) { alert('Selecciona un proveedor.'); return; }
  if (!depto) { alert('Selecciona un departamento.'); return; }
  if (!desc) { alert('La descripción es obligatoria.'); return; }
  if (!via) { alert('Selecciona la vía de sometimiento.'); return; }
  if (!fechaSol) { alert('La fecha de solicitud es obligatoria.'); return; }

  // Contrato
  const vincular = document.getElementById('fVincular').checked;
  let contratoId = null;
  if (vincular) {
    contratoId = document.getElementById('fContrato').value || null;
    if (!contratoId) {
      alert('Marcaste vincular a contrato pero no seleccionaste ninguno.');
      return;
    }
    // Verificar tope de proformas (BYPASS con confirmación)
    const c = contratos.find(x => x.id === contratoId);
    if (c && c.cantidadProformas) {
      const usadas = proformasUsadas(c.id);
      // No contar a sí misma si está editando
      const ajuste = editingSolicitudId && solicitudes.find(s => s.id === editingSolicitudId)?.contratoId === c.id ? 1 : 0;
      const usadasReales = usadas - ajuste;
      if (usadasReales >= c.cantidadProformas) {
        const exceso = usadasReales + 1 - c.cantidadProformas;
        if (!confirm(`⚠ Aviso de tope de proformas\n\nEl contrato "${c.nombre}" tiene planificadas ${c.cantidadProformas} proformas y ya tiene ${usadasReales} usadas.\n\nAl guardar esta solicitud el conteo quedará en ${usadasReales + 1} (excedido por ${exceso}).\n\n¿Confirmas guardar y exceder el tope?`)) {
          return;
        }
      }
    }
  }

  const solicitud = {
    id: editingSolicitudId || generarIdSolicitud(),
    noSolicitud: document.getElementById('fNoSol').value.trim(),
    proveedor,
    descripcion: desc,
    depto,
    via,
    contratoId,
    fechaSolicitud: fechaSol,
    fechaAprobacionMH: document.getElementById('fFechaAprobMH').value,
    fechaAprobacionDGII: document.getElementById('fFechaAprobDGII').value,
    fechaRechazo: document.getElementById('fFechaRechazo').value,
    bitacora: tempBitacora,
    moneda: document.getElementById('fMoneda').value,
    tasaCambio: parseFloat(document.getElementById('fTasa').value) || 1,
    montoFactura: parseFloat(document.getElementById('fMontoFact').value) || 0,
    montoDOP: parseFloat(document.getElementById('fMontoDOP').value) || 0,
    impuestoExonerar: impuesto,
    comentarios: document.getElementById('fComentarios').value.trim(),
  };

  if (editingSolicitudId) {
    const idx = solicitudes.findIndex(s => s.id === editingSolicitudId);
    if (idx >= 0) solicitudes[idx] = solicitud;
  } else {
    solicitudes.push(solicitud);
  }

  cerrarModal();
  renderAll();
}

function eliminarSolicitud(id) {
  if (!confirm('¿Eliminar esta solicitud?')) return;
  solicitudes = solicitudes.filter(s => s.id !== id);
  cerrarModal();
  renderAll();
}
