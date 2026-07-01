/* ==========================================================
   AUTH — Login, logout y manejo de sesión
   ========================================================== */

async function checkSession() {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data } = await supabaseClient.auth.getSession();
    return data.session;
  } catch (err) {
    console.error('Error verificando sesión:', err);
    return null;
  }
}

async function loginUser(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

async function logoutUser() {
  if (!confirm('¿Cerrar sesión?')) return;
  try {
    await supabaseClient.auth.signOut();
  } catch (err) {
    console.error(err);
  }
  location.reload();
}

// Mostrar pantalla de login (reemplaza el body)
function renderLogin(errorMsg) {
  document.body.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card">
        <div class="login-logo">
          <div class="sidebar-logo-icon">CR</div>
          <div>
            <div style="font-weight:700;font-size:15px">Corporación Cabo Rojo</div>
            <div class="text-muted" style="font-size:12px;margin-top:2px">Exenciones Fiscales</div>
          </div>
        </div>
        <div class="login-title">Inicia sesión</div>
        <div class="login-sub">Acceso al sistema interno</div>
        <form class="login-form" onsubmit="handleLogin(event)">
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="loginEmail" required autocomplete="email" autofocus>
          </div>
          <div class="form-group">
            <label>Contraseña</label>
            <input type="password" id="loginPass" required autocomplete="current-password">
          </div>
          <div id="loginError" class="alert-warning ${errorMsg ? '' : 'hidden'}">${escapeHtml(errorMsg || '')}</div>
          <button class="btn btn-primary" id="loginBtn" type="submit" style="margin-top:8px;justify-content:center">Entrar</button>
        </form>
      </div>
    </div>
  `;
}

// Pantalla de error de configuración
function renderConfigError() {
  document.body.innerHTML = `
    <div class="login-wrapper">
      <div class="login-card" style="max-width:500px">
        <div class="login-logo">
          <div class="sidebar-logo-icon" style="background:linear-gradient(135deg,#c0392b,#e74c3c)">!</div>
          <div>
            <div style="font-weight:700;font-size:15px">Configuración requerida</div>
            <div class="text-muted" style="font-size:12px;margin-top:2px">Supabase no está configurado</div>
          </div>
        </div>
        <div style="margin-top:24px;font-size:13px;line-height:1.6;color:var(--text-muted)">
          Antes de usar la app necesitas pegar las credenciales de tu proyecto Supabase.
          <br><br>
          <strong style="color:var(--text)">Cómo arreglarlo:</strong>
          <ol style="margin-top:8px;padding-left:20px">
            <li>Abre el archivo <code style="background:var(--surface-2);padding:1px 5px;border-radius:3px">js/supabase-config.js</code></li>
            <li>Reemplaza <code style="background:var(--surface-2);padding:1px 5px;border-radius:3px">PEGA_AQUI_TU_URL</code> y <code style="background:var(--surface-2);padding:1px 5px;border-radius:3px">PEGA_AQUI_TU_ANON_KEY</code> con las credenciales reales</li>
            <li>Las encuentras en <a href="https://supabase.com" target="_blank">Supabase</a> → tu proyecto → <strong>Settings → Data API</strong></li>
            <li>Guarda el archivo y recarga esta página</li>
          </ol>
        </div>
      </div>
    </div>
  `;
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPass').value;
  const btn = document.getElementById('loginBtn');
  const errBox = document.getElementById('loginError');

  btn.textContent = 'Entrando...';
  btn.disabled = true;
  errBox.classList.add('hidden');

  try {
    await loginUser(email, pass);
    location.reload();
  } catch (err) {
    let msg = err.message || 'Error desconocido';
    if (msg.includes('Invalid login')) msg = 'Email o contraseña incorrectos.';
    errBox.textContent = msg;
    errBox.classList.remove('hidden');
    btn.textContent = 'Entrar';
    btn.disabled = false;
  }
}
// ========== CONTROL DE INACTIVIDAD ==========
const INACTIVITY_TIMEOUT_MIN = 20;   // minutos de inactividad permitidos
let inactivityTimer = null;
let lastActivity = Date.now();

function resetInactivityTimer() {
  lastActivity = Date.now();
}

function checkInactivity() {
  const minutosInactivo = (Date.now() - lastActivity) / 60000;
  if (minutosInactivo >= INACTIVITY_TIMEOUT_MIN) {
    clearInterval(inactivityTimer);
    alert('Sesión cerrada por inactividad.');
    supabaseClient.auth.signOut().then(() => location.reload());
  }
}

function startInactivityWatcher() {
  ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer, { passive: true });
  });
  inactivityTimer = setInterval(checkInactivity, 30000); // revisa cada 30 seg
}
