/* ==========================================================
   SUPABASE-CONFIG — Credenciales de tu proyecto
   ==========================================================
   PASOS PARA OBTENER ESTOS VALORES:
   1. Entra a https://supabase.com y abre tu proyecto
   2. Ve a Settings (⚙ engranaje, abajo a la izquierda)
   3. Click en "Data API"
   4. Copia:
      - "Project URL"     → pégalo en URL
      - "anon" "public"   → pégalo en ANON_KEY
   ========================================================== */

const SUPABASE_CONFIG = {
  URL: 'https://yfylciaoxggfgvvrckxc.supabase.co',           // Ej: 'https://xxxxxxxxxxxx.supabase.co'
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlmeWxjaWFveGdnZmd2dnJja3hjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMDUzMDcsImV4cCI6MjA5NDY4MTMwN30.-rnhK44Mx_bclWusPiPKkNKLd4if5tTBuWBdf4zZ2qo', // Ej: 'eyJhbGciOiJI...' (un texto muy largo)
};

// ---------- No edites debajo de esta línea ----------

let supabaseClient = null;

function initSupabase() {
  if (!SUPABASE_CONFIG.URL || SUPABASE_CONFIG.URL === 'PEGA_AQUI_TU_URL') {
    console.warn('⚠ Supabase no configurado todavía.');
    return null;
  }
  if (typeof supabase === 'undefined') {
    console.error('❌ SDK de Supabase no cargó. Revisa la conexión a internet.');
    return null;
  }
  try {
    supabaseClient = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
    console.log('✅ Supabase conectado a', SUPABASE_CONFIG.URL);
    return supabaseClient;
  } catch (err) {
    console.error('❌ Error iniciando Supabase:', err);
    return null;
  }
}

function isSupabaseConfigured() {
  return supabaseClient !== null;
}
