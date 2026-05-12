import { createClient } from '@supabase/supabase-js';
import { uploadFileToR2 } from './r2';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase Configuration Error:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.error('   VITE_SUPABASE_ANON_KEY:', supabaseKey ? '✓ Set' : '✗ Missing');
  console.error('   Please check your .env file');
}

// Create Supabase client
export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

/**
 * Sign up a new user with email and password
 */
export async function signUpUser(email: string, password: string, metadata?: any) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Sign in user with email and password
 */
export async function signInUser(email: string, password: string) {
  try {

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Supabase] Sign in error:', error.message);
      throw new Error(error.message);
    }


    return data;
  } catch (err: any) {
    console.error('[Supabase] Sign in exception:', err.message);
    throw err;
  }
}



/**
 * Sign out user
 */
export async function signOutUser() {
  try {

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[Supabase] Sign out error:', error.message);
      throw new Error(error.message);
    }

  } catch (err: any) {
    console.error('[Supabase] Sign out exception:', err.message);
    throw err;
  }
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  return data.user;
}

/**
 * Get current session
 */
export async function getCurrentSession() {
  try {
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) {

    } else {

    }
    return data.session;
  } catch (err: any) {
    console.error('[Supabase] Session retrieval error:', err.message);
    return null;
  }
}

/**
 * Reset password
 */
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Update password
 */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Upload a file to Cloudflare R2 and return the public URL
 * Replaces previous Supabase Storage implementation
 */
export async function uploadFileToStorage(file: File, folderName: string = 'documents'): Promise<string> {
  try {
    console.log(`[R2] Uploading file: ${file.name} to folder: ${folderName}`);
    const publicUrl = await uploadFileToR2(file, folderName);
    console.log(`[R2] Upload successful: ${publicUrl}`);
    return publicUrl;
  } catch (error: any) {
    console.error('[R2] Upload failed:', error.message);
    throw new Error(`Failed to upload file: ${error.message}`);
  }
}

export default supabase;
