
import { supabase, handleError } from './supabase.js';

// Login function
export async function login(email, password) {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        window.location.href = '/dashboard.html';
    } catch (error) {
        handleError(error, 'Login');
    }
}

// Logout function
export async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.href = '/login.html';
    } catch (error) {
        handleError(error, 'Logout');
    }
}

// Check if user is already logged in on login page
export async function checkLoginRedirect() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        window.location.href = '/dashboard.html';
    }
}
