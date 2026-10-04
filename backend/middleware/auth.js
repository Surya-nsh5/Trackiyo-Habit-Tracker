const { createAuthClient, supabaseAdmin } = require('../config/supabase');

const requireAuth = async (req, res, next) => {
  if (!supabaseAdmin) {
    return res.status(503).json({
      success: false,
      message: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env'
    });
  }

  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.split(' ')[1]
    : req.cookies?.sb_access_token;
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required. Missing Bearer token or session cookie.' 
    });
  }

  try {
    // Fresh client per request: never verify on the shared admin singleton,
    // or its persisted session would leak into later admin queries.
    const authClient = createAuthClient();
    const { data: { user }, error } = await authClient.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid or expired token', 
        error: error?.message 
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error during authentication' 
    });
  }
};

module.exports = { requireAuth };
