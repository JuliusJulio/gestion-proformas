/* ==========================================================
   APP — Navegación, modal global, inicialización con Supabase
   ========================================================== */

// ---------- NAVEGACIÓN ----------
function showSection(section, evt) {
  currentSection = section;

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (evt && evt.currentTarget) {
    evt.currentTarget.classList.add('active');
  } else {
    const btn = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (btn) btn.classList.add('active');
  }

  document.querySelectorAll('[id^="section-"]').forEach(s => s.classList.add('section-hidden'));
  document.getElementById('section-' + section).classList.remove('section-hidden');

  const titles = {
    dashboard: 'Dashboard Ejecutivo',
    solicitudes: 'Solicitudes',
    contratos: 'Contratos',
    proveedores: 'Proveedores',
    catalogos: 'Catálogos del Sistema',
  };
  document.getElementById('topbarTitle').textContent = titles[section] || '';

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

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function checkTableOverflow() {
  document.querySelectorAll('.table-wrapper').forEach(w => {
    if (w.scrollWidth > w.clientWidth) {
      w.classList.add('has-overflow');
    } else {
      w.classList.remove('has-overflow');
    }
  });
}

// ---------- CARGA DE DATOS DESDE SUPABASE ----------
async function cargarDatosDesdeSupabase() {
  showLoading('Cargando datos...');
  try {
    const [provs, conts, sols, cats] = await Promise.all([
      api.proveedores.list(),
      api.contratos.list(),
      api.solicitudes.list(),
      api.catalogos.list(),
    ]);

    proveedores = provs;
    contratos = conts;
    solicitudes = sols;

    // Procesar catálogos
    DEPARTAMENTOS = cats.filter(c => c.tipo === 'DEPARTAMENTO').map(c => c.valor);
    TIPOS_CONTRATO = cats.filter(c => c.tipo === 'TIPO_CONTRATO').map(c => c.valor);
    ESTADOS = cats.filter(c => c.tipo === 'ESTADO').map(c => c.valor);
    ESTADOS_VIGENCIA = cats.filter(c => c.tipo === 'ESTADO' && c.dispara_vigencia).map(c => c.valor);
    VIAS = cats.filter(c => c.tipo === 'VIA').map(c => c.valor);

    console.log('✅ Datos cargados:', {
      proveedores: proveedores.length,
      contratos: contratos.length,
      solicitudes: solicitudes.length,
      catalogos: cats.length,
    });
  } finally {
    hideLoading();
  }
}

// ---------- INICIALIZACIÓN ----------
async function init() {
  // 1. Verificar configuración Supabase
  const client = initSupabase();
  if (!client) {
    renderConfigError();
    return;
  }

  // 2. Verificar sesión activa
  const session = await checkSession();
  if (!session) {
    renderLogin();
    return;
  }

  // 3. Cargar datos desde Supabase
  try {
    await cargarDatosDesdeSupabase();
  } catch (err) {
    console.error('Error cargando datos:', err);
    alert('Error cargando datos: ' + err.message + '\n\nPosibles causas:\n• Tablas no creadas (ejecuta el SQL)\n• Permisos RLS\n• Sesión expirada\n\nTe llevaremos al login.');
    await supabaseClient.auth.signOut();
    renderLogin('Sesión cerrada. Inicia sesión nuevamente.');
    return;
  }

  // 4. Listeners y render inicial
  setupListeners();
  renderAll();
  setTimeout(checkTableOverflow, 100);
}

function setupListeners() {
  // Listeners modal
  const overlay = document.getElementById('modalOverlay');
  if (overlay) {
    overlay.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) cerrarModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModal();
  });

  window.addEventListener('resize', () => {
    setTimeout(checkTableOverflow, 100);
  });
}

// Esperar a que el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
