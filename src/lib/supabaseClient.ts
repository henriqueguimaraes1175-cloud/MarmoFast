
import { createClient as createSupabaseClient } from '../utils/supabase/client';

export const supabase = createSupabaseClient();

export const isSupabaseEnabled = () => !!import.meta.env.VITE_SUPABASE_URL;
