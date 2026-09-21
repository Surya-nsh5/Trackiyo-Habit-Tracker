const { supabaseAdmin } = require('../config/supabase');

const requireAuth = async (req, res, next) => {
  if (!supabaseAdmin) {
    return res.status(503).json({
      success: false,
      message: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY in backend/.env'
    });
  }

  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication required. Missing Bearer token.' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

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
