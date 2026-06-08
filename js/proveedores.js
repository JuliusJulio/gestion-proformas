/* ==========================================================
   PROVEEDORES — CRUD y render
   ========================================================== */

function renderProveedores() {
  const container = document.getElementById('section-proveedores');
  if (!container) return;

  const rows = proveedores.map(p => {
    const count = solicitudes.filter(s => s.proveedor === p.nombre).length;
    return `
      <tr>
        <td style="font-weight:500">${escapeHtml(p.nombre)}</td>
        <td class="num-cell">${escapeHtml(p.rnc || '—')}</td>
        <td>${escapeHtml(p.contacto || '—')}</td>
        <td style="text-align:center" class="mono">${count}</td>
        <td>
          <button class="action-link" onclick="abrirEditarProveedor(${p.id})">Editar</button>
        </td>
      </tr>
    `;
  }).join('');

  const empty = proveedores.length === 0
    ? `<tr><td colspan="5" style="text-align:center;padding:30px;color:var(--text-dim)">No hay proveedores registrados. Agrega el primero con el botón "+ Nuevo Proveedor".</td></tr>`
    : rows;

  container.querySelector('.content-inner').innerHTML = `
    <div class="section-header">
      <div>
        <div class="section-title">Proveedores</div>
        <div class="section-subtitle">Maestro de proveedores que pueden aparecer en solicitudes y contratos.</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="abrirNuevoProveedor()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Nuevo Proveedor
      </button>
    </div>
    <div class="card">
      <div class="card-header">
        <div class="card-title">Lista de Proveedores <span class="card-count">${proveedores.length}</span></div>
      </div>
      <div class="table-wrapper">
        <table>
          <thead><tr>
            <th>Nombre</th>
            <th>RNC</th>
            <th>Contacto</th>
            <th style="text-align:center">Solicitudes</th>
            <th></th>
          </tr></thead>
          <tbody>${empty}</tbody>
        </table>
      </div>
    </div>
  `;
}

function abrirNuevoProveedor() {
  editingProveedorId = null;
  document.getElementById('modalTitle').textContent = 'Nuevo Proveedor';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="form-group full">
        <label>Nombre *</label>
        <input type="text" id="fpNombre" required>
      </div>
      <div class="form-group">
        <label>RNC</label>
        <input type="text" id="fpRnc" placeholder="000-00000-0">
      </div>
      <div class="form-group">
        <label>Contacto</label>
        <input type="text" id="fpContacto" placeholder="809-000-0000">
      </div>
    </div>
  `;
  document.getElementById('modalFooter').innerHTML = `
    <div class="spacer"></div>
    <button class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="guardarProveedor()">Guardar</button>
  `;
  abrirModal();
}

let editingProveedorId = null;

function abrirEditarProveedor(id) {
  const p = proveedores.find(x => x.id === id);
  if (!p) return;
  editingProveedorId = id;
  document.getElementById('modalTitle').textContent = 'Editar Proveedor';
  document.getElementById('modalBody').innerHTML = `
    <div class="form-grid">
      <div class="form-group full">
        <label>Nombre *</label>
        <input type="text" id="fpNombre" value="${escapeHtml(p.nombre)}" required>
      </div>
      <div class="form-group">
        <label>RNC</label>
        <input type="text" id="fpRnc" value="${escapeHtml(p.rnc || '')}" placeholder="000-00000-0">
      </div>
      <div class="form-group">
        <label>Contacto</label>
        <input type="text" id="fpContacto" value="${escapeHtml(p.contacto || '')}" placeholder="809-000-0000">
      </div>
    </div>
  `;
  const enUso = solicitudes.filter(s => s.proveedor === p.nombre).length;
  document.getElementById('modalFooter').innerHTML = `
    ${enUso === 0 ? `<button class="btn btn-danger btn-sm" onclick="eliminarProveedor(${id})">Eliminar</button>` : `<span class="text-dim" style="font-size:11px">En uso en ${enUso} solicitud(es)</span>`}
    <div class="spacer"></div>
    <button class="btn btn-secondary" onclick="cerrarModal()">Cancelar</button>
    <button class="btn btn-primary" onclick="guardarProveedor()">Guardar</button>
  `;
  abrirModal();
}

function guardarProveedor() {
  const nombre = document.getElementById('fpNombre').value.trim();
  const rnc = document.getElementById('fpRnc').value.trim();
  const contacto = document.getElementById('fpContacto').value.trim();

  if (!nombre) {
    alert('El nombre es obligatorio.');
    return;
  }

  // Validar duplicado
  const existe = proveedores.find(p => p.nombre.toLowerCase() === nombre.toLowerCase() && p.id !== editingProveedorId);
  if (existe) {
    alert('Ya existe un proveedor con ese nombre.');
    return;
  }

  if (editingProveedorId) {
    const p = proveedores.find(x => x.id === editingProveedorId);
    if (p) {
      const oldNombre = p.nombre;
      p.nombre = nombre;
      p.rnc = rnc;
      p.contacto = contacto;
      // Actualizar referencias en solicitudes
      if (oldNombre !== nombre) {
        solicitudes.forEach(s => {
          if (s.proveedor === oldNombre) s.proveedor = nombre;
        });
      }
    }
  } else {
    const newId = proveedores.length > 0 ? Math.max(...proveedores.map(p => p.id)) + 1 : 1;
    proveedores.push({ id: newId, nombre, rnc, contacto });
  }

  cerrarModal();
  renderProveedores();
  renderAll();
}

function eliminarProveedor(id) {
  const p = proveedores.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`¿Eliminar el proveedor "${p.nombre}"?`)) return;
  proveedores = proveedores.filter(x => x.id !== id);
  cerrarModal();
  renderProveedores();
}
