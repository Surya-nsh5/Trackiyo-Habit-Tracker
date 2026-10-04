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

// Fresh anon-key client for session-establishing auth calls (signUp /
// signIn / refresh / getUser). NEVER use the shared supabaseAdmin singleton
// for these: gotrue persists the session on the client instance, which would
// poison every later admin query to run as that user instead of service_role
// (cross-request auth leak — admin reads would silently return RLS-filtered
// rows). Per-request user queries should use createSupabaseClient(req).
const createAuthClient = () => {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
};

module.exports = {
  createSupabaseClient,
  createAuthClient,
  supabaseAdmin
};
