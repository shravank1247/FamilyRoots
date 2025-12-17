// src/services/auth.js

import { supabase } from '../config/supabaseClient'; 

// --- Database Helpers (Placed here to avoid circular dependency) ---

export async function fetchProfileId(authUserId) {
    if (!authUserId) return null;
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authUserId)
        .single(); 
    return (error && error.code !== 'PGRST116') ? null : (profile ? profile.id : null);
}

// --- Auth Functions ---

export async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + '/dashboard', 
        }
    });
}

export async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
}

export async function signOut() {
    await supabase.auth.signOut();
    window.location.href = '/login'; 
}