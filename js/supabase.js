
// Supabase Client Initialization
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://updvbabhveotaamwilef.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZHZiYWJodmVvdGFhbXdpbGVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMTgxMTcsImV4cCI6MjA4MTY5NDExN30.4Q0QLUjIuL2Meg4Q9JQYtaQIWnGsrIPAKnFwVabmIKE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper function to check if user is admin
export async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        window.location.href = '/login.html';
    }
    return session;
}

// Global error handler
export function handleError(error, context = '') {
    console.error(`Error in ${context}:`, error);
    alert(`Erro: ${error.message || 'Ocorreu um erro inesperado.'}`);
}
