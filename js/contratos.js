/* ==========================================================
   CONTRATOS — CRUD y render, lógica de tope de proformas
   ========================================================== */

function renderContratos() {
  const container = document.getElementById('section-contratos');
  if (!container) return;

  const rows = contratos.map(c => {
    const usadas = proformasUsadas(c.id);
    const restantes = proformasRestantes(c);
    const estadoTope = estadoTopeProformas(c);

    const counterClass = estadoTope === 'over' ? 'over' : estadoTope === 'warn' ? 'warn' : 'ok';
    const counterText = c.cantidadProformas
      ? `${usadas} / ${c.cantidadProformas}${usadas > c.cantidadProformas ? ' ⚠' : ''}`
      : `${usadas}`;

    return `
      <tr>
        <td class="num-cell">${escapeHtml(c.id)}</td>
        <td style="font-weight:500">${escapeHtml(c.nombre)}</td>
        <td>${escapeHtml(c.proveedor)}</td>
        <td>${escapeHtml(c.tipoContrato || '—')}</td>
        <td>${escapeHtml(c.depto)}</td>
        <td class="mono" style="font-size:12px">${c.fechaInicio || '—'} — ${c.fechaFin || '—'}</td>
        <td class="money">${c.moneda} ${fmt(c.montoTotal)}</td>
        <td style="text-align:center"><span class="proforma-counter ${counterClass}">${counterText}</span></td>
        <td>
          <button class="action-link" onclick="abrirEditarContrato('${escapeHtml(c.id)}')">Editar</button>
        </td>
      </tr>
    `;
  }).join('');

  const empty = contratos.length === 0
    ? `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-dim)">No hay contratos registrados. Agrega el primero con el botón "+ Nuevo Contrato".</td></tr>`
    : rows;

  container.querySelector('.content-inner').innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Contratos</div>
        <div class="section-subtitle">Contratos firmados que pueden tener varias proformas asociadas a lo largo de su vigencia.</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="abrirNuevoContrato()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nuevo Contrato
      </button>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">Lista de Contratos <span class="card-count">${contratos.length}</span></div>
        <span style="font-size:11px;color:var(--text-muted)">Contador: proformas usadas / planificadas</span>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Proveedor</th>
            <th>Tipo</th>
            <th>Depto</th>
            <th>Vigencia</th>
            <th class="money-header">Monto</th>
            <th style="text-align:center">Proformas</th>
            <th></th>
          </tr></thead>
          <tbody>${empty}</tbody>
        </table>
      </div>
    </div>
  `;
}

function abrirNuevoContrato() {
  editingContratoId = null;
  renderModalContrato(null);
}

function abrirEditarContrato(id) {
  editingContratoId = id;
  const c = contratos.find(x => x.id === id);
  if (!c) return;
  renderModalContrato(c);
}

function renderModalContrato(c) {
  const isEdit = c !== null;
  const tiposOpts = TIPOS_CONTRATO.map(t => `<option value="${escapeHtml(t)}" ${c && c.tipoContrato === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('');
  const provOpts = proveedores.map(p => `<option value="${escapeHtml(p.nombre)}" ${c && c.proveedor === p.nombre ? 'selected' : ''}>${escapeHtml(p.nombre)}</option>`).join('');
  const deptoOpts = DEPARTAMENTOS.map(d => `<option value="${escapeHtml(d)}" ${c && c.depto === d ? 'selected' : ''}>${escapeHtml(d)}</option>`).join('');

  document.getElementById('modalTitle').textContent = isEdit ? 'Editar Contrato' : 'Nuevo Contrato';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-section">
      <div class="form-section-title">Datos del Contrato</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Código *</label>
          <input type="text" id="fcCodigo" value="${c ? escapeHtml(c.id) : ''}" ${isEdit ? 'disabled' : ''} placeholder="Ej: C-2026-001">
        </div>
        <div class="form-group">
          <label>Tipo de Contrato *</label>
          <select id="fcTipo">
            <option value="">— Seleccionar —</option>
            ${tiposOpts}
          </select>
        </div>
        <div class="form-group full">
          <label>Nombre / Descripción *</label>
          <input type="text" id="fcNombre" value="${c ? escapeHtml(c.nombre) : ''}" placeholder="Ej: Construcción Fase 1">
        </div>
        <div class="form-group">
          <label>Proveedor *</label>
          <select id="fcProv">
            <option value="">— Seleccionar —</option>
            ${provOpts}
          </select>
        </div>
        <div class="form-group">
          <label>Departamento *</label>
          <select id="fcDepto">
            <option value="">— Seleccionar —</option>
            ${deptoOpts}
          </select>
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Vigencia y Montos</div>
      <div class="form-grid">
        <div class="form-group">
          <label>Fecha Inicio</label>
          <input type="date" id="fcInicio" value="${c ? (c.fechaInicio || '') : ''}">
        </div>
        <div class="form-group">
          <label>Fecha Fin</label>
          <input type="date" id="fcFin" value="${c ? (c.fechaFin || '') : ''}">
        </div>
        <div class="form-group">
          <label>Moneda</label>
          <select id="fcMoneda">
            <option value="DOP" ${c && c.moneda === 'DOP' ? 'selected' : ''}>DOP</option>
            <option value="USD" ${c && c.moneda === 'USD' ? 'selected' : ''}>USD</option>
          </select>
        </div>
        <div class="form-group">
          <label>Monto Total</label>
          <input type="number" id="fcMonto" value="${c ? c.montoTotal : ''}" step="0.01" placeholder="0.00">
        </div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">Planificación de Proformas</div>
      <div class="form-grid">
        <div class="form-group full">
          <label>Cantidad de proformas planificadas *</label>
          <input type="number" id="fcCantProformas" value="${c ? c.cantidadProformas : ''}" min="1" step="1" placeholder="Ej: 4">
          <div class="help-text">
            Es el total de proformas que se planea generar durante la vigencia del contrato.
            Al llegar al tope, el sistema avisa con bypass (permite continuar bajo confirmación).
          </div>
        </div>
        ${isEdit && c.cantidadProformas ? `
          <div class="form-group full">
            <div class="alert-info">
              <strong>Estado actual:</strong> ${proformasUsadas(c.id)} de ${c.cantidadProformas} proformas usadas
              ${proformasUsadas(c.id) > c.cantidadProformas ? ` <span style="color:var(--red-text)">(${proformasUsadas(c.id) - c.cantidadProformas} sobre el tope)</span>` : ''}
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  const enUso = isEdit ? proformasUsadas(c.id) : 0;
  document.getElementById('modalFooter').innerHTML = `
    ${isEdit && enUso === 0 ? `<button class="btn btn-danger btn-sm" onclick="eliminarContrato('${escapeHtml(c.id)}')">Eliminar</button>` : (isEdit ? `<span class="text-dim" style="font-size:11px">En uso en ${enUso} solicitud(es)</span>` : '')}
    <div class="spacer"></div>
    <button class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="guardarContrato()">Guardar</button>
  `;
  abrirModal();
}

async function guardarContrato() {
  const codigo = document.getElementById('fcCodigo').value.trim();
  const tipo = document.getElementById('fcTipo').value;
  const nombre = document.getElementById('fcNombre').value.trim();
  const prov = document.getElementById('fcProv').value;
  const depto = document.getElementById('fcDepto').value;
  const inicio = document.getElementById('fcInicio').value;
  const fin = document.getElementById('fcFin').value;
  const moneda = document.getElementById('fcMoneda').value;
  const monto = parseFloat(document.getElementById('fcMonto').value) || 0;
  const cantProformas = parseInt(document.getElementById('fcCantProformas').value) || 0;

  // Validaciones
  if (!codigo) { alert('El código es obligatorio.'); return; }
  if (!tipo) { alert('Selecciona el tipo de contrato.'); return; }
  if (!nombre) { alert('El nombre/descripción es obligatorio.'); return; }
  if (!prov) { alert('Selecciona un proveedor.'); return; }
  if (!depto) { alert('Selecciona un departamento.'); return; }
  if (cantProformas < 1) { alert('La cantidad de proformas debe ser al menos 1.'); return; }

  const proveedorId = proveedorIdByName(prov);
  if (!proveedorId) {
    alert('No se encontró el proveedor seleccionado.');
    return;
  }

  const datos = {
    id: codigo,
    nombre,
    tipoContrato: tipo,
    depto,
    fechaInicio: inicio,
    fechaFin: fin,
    moneda,
    montoTotal: monto,
    cantidadProformas: cantProformas,
  };

  await withLoading('Guardando contrato...', async () => {
    if (!editingContratoId) {
      if (contratos.find(c => c.id === codigo)) {
        throw new Error('Ya existe un contrato con ese código.');
      }
      await api.contratos.create(datos, proveedorId);
      contratos.push({ ...datos, proveedor: prov, proveedor_id: proveedorId });
    } else {
      await api.contratos.update(editingContratoId, datos, proveedorId);
      const c = contratos.find(x => x.id === editingContratoId);
      if (c) {
        c.nombre = nombre;
        c.tipoContrato = tipo;
        c.proveedor = prov;
        c.proveedor_id = proveedorId;
        c.depto = depto;
        c.fechaInicio = inicio;
        c.fechaFin = fin;
        c.moneda = moneda;
        c.montoTotal = monto;
        c.cantidadProformas = cantProformas;
      }
    }
  });

  cerrarModal();
  renderContratos();
  renderAll();
}

async function eliminarContrato(id) {
  const c = contratos.find(x => x.id === id);
  if (!c) return;
  if (!confirm(`¿Eliminar el contrato "${c.nombre}"?`)) return;

  await withLoading('Eliminando...', async () => {
    await api.contratos.delete(id);
    contratos = contratos.filter(x => x.id !== id);
  });

  cerrarModal();
  renderContratos();
}

// Devuelve contratos disponibles para un proveedor (para el dropdown en solicitud)
function contratosDeProveedor(nombreProveedor) {
  return contratos.filter(c => c.proveedor === nombreProveedor);
}
