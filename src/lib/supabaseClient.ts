
import { createClient as createSupabaseClient } from '../utils/supabase/client';

const client = createSupabaseClient();

export const supabase = client;

export const isSupabaseEnabled = () => !!(import.meta.env && import.meta.env.VITE_SUPABASE_URL) && !!client;
