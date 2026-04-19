
import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = (import.meta.env && import.meta.env.VITE_SUPABASE_URL) || '';
const supabaseKey = (import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || '';

export const createClient = () => {
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase keys are missing. Integration is disabled.');
    return null;
  }
  return createBrowserClient(supabaseUrl, supabaseKey);
};
