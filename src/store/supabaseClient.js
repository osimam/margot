// --- CONFIGURATION CLIENT SUPABASE ---

const SUPABASE_URL = "https://potadvjotgkrsgzjzoku.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdGFkdmpvdGdrcnNnemp6b2t1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0Njk2MjgsImV4cCI6MjA5NzA0NTYyOH0.QjoZ25otDa2RTu_adNAkG2NwNsaVaEOLQI4gbWbRhiE";

// On utilise directement la méthode disponible globalement injectée par le CDN
const createSupabaseClient = window.supabase?.createClient || (typeof supabase !== 'undefined' ? supabase.createClient : null);

if (!createSupabaseClient) {
    console.error("Le SDK Supabase n'est pas détecté au démarrage.");
}

// Initialisation de notre instance personnalisée
export const supabaseClient = createSupabaseClient ? createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// On écrase la variable globale pour être certain que main.js l'utilise sans soucis
window.supabase = supabaseClient;