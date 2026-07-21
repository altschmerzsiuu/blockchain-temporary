import { createClient } from '@supabase/supabase-js';

/**
 * IMPORTANT ARCHITECTURE NOTE:
 * Supabase is used EXCLUSIVELY for off-chain metadata (images, rich text descriptions, 
 * organization names/verification status). 
 * 
 * It MUST NEVER be used to store or track money, balances, donation amounts, 
 * or withdrawal statuses. All financial data and truth remains strictly on-chain 
 * in the smart contract to ensure full transparency and immutability.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");
