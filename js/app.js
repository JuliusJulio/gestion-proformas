/* ==========================================================
   APP — Navegación, modal global, inicialización
   ========================================================== */

// ---------- NAVEGACIÓN ----------
function showSection(section, evt) {
  currentSection = section;

  // Actualizar nav items
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (evt && evt.currentTarget) {
    evt.currentTarget.classList.add('active');
  } else {
    const btn = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (btn) btn.classList.add('active');
  }

  // Mostrar sección
  document.querySelectorAll('[id^="section-"]').forEach(s => s.classList.add('section-hidden'));
  document.getElementById('section-' + section).classList.remove('section-hidden');

  // Título topbar
  const titles = {
    dashboard: 'Dashboard Ejecutivo',
    solicitudes: 'Solicitudes',
    contratos: 'Contratos',
    proveedores: 'Proveedores',
    catalogos: 'Catálogos del Sistema',
  };
  document.getElementById('topbarTitle').textContent = titles[section] || '';

  // Cerrar sidebar móvil
  document.getElementById('sidebar').classList.remove('open');

  renderAll();
}

// ---------- RENDER PRINCIPAL ----------
function renderAll() {
  if (currentSection === 'dashboard') renderDashboard();
  else if (currentSection === 'solicitudes') renderSeccionSolicitudes();
  else if (currentSection === 'contratos') renderContratos();
  else if (currentSection === 'proveedores') renderProveedores();
  else if (currentSection === 'catalogos') renderCatalogos();
}

// ---------- MODAL ----------
function abrirModal(size = '') {
  const overlay = document.getElementById('modalOverlay');
  const modal = overlay.querySelector('.modal');
  modal.classList.remove('modal-lg');
  if (size === 'lg') modal.classList.add('modal-lg');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function cerrarModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.style.overflow = '';
  editingSolicitudId = null;
  editingContratoId = null;
  editingProveedorId = null;
  tempBitacora = [];
}

// ---------- TOGGLE SIDEBAR (móvil) ----------
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ---------- DETECCIÓN DE OVERFLOW EN TABLAS ----------
function checkTableOverflow() {
  document.querySelectorAll('.table-wrapper').forEach(w => {
    if (w.scrollWidth > w.clientWidth) {
      w.classList.add('has-overflow');
    } else {
      w.classList.remove('has-overflow');
    }
  });
}

// ---------- INICIALIZACIÓN ----------
function init() {
  // Listeners modal
  document.getElementById('modalOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) cerrarModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModal();
  });

  // Recalcular overflow al cambiar tamaño
  window.addEventListener('resize', () => {
    setTimeout(checkTableOverflow, 100);
  });

  // Render inicial
  renderAll();
  setTimeout(checkTableOverflow, 100);
}

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
