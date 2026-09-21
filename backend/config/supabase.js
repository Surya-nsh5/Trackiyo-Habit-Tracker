const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

const isConfigured = !!(supabaseUrl && supabaseServiceKey);

if (!isConfigured) {
  console.warn('⚠️  Missing SUPABASE_URL or SUPABASE_SERVICE_KEY — auth and DB calls will fail until these are set in backend/.env');
}

const createSupabaseClient = (req) => {
  if (!isConfigured) return null;
  const token = req.cookies.sb_access_token || req.headers.authorization?.split(' ')[1];
  
  if (token) {
    return createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
};

const supabaseAdmin = isConfigured ? createClient(supabaseUrl, supabaseServiceKey) : null;

module.exports = {
  createSupabaseClient,
  supabaseAdmin
};
