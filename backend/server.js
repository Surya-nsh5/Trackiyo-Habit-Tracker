const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(helmet());

// Clean up the FRONTEND_URL in case it has a trailing slash
const configuredOrigin = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : 'http://localhost:5173';

const allowedOrigins = [
  configuredOrigin,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  // Capacitor Android WebView origins (native shell)
  'http://localhost',
  'https://localhost',
  'capacitor://localhost'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile native apps, Postman or curl requests)
    if (!origin) return callback(null, true);

    const isExplicitlyAllowed = allowedOrigins.includes(origin);
    const isLocalhostDev = process.env.NODE_ENV !== 'production' && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    // Allow verified Trackiyo Vercel preview/production domains only, preventing arbitrary .vercel.app origins
    const isTrackiyoVercel = /^https:\/\/(trackiyo[a-z0-9-]*|[a-z0-9-]+-.*trackiyo.*)\.vercel\.app$/.test(origin);

    if (isExplicitlyAllowed || isLocalhostDev || isTrackiyoVercel) {
      callback(null, true);
    } else {
      callback(new Error('CORS request blocked by Trackiyo security policy'));
    }
  },
  credentials: true
}));

app.use(morgan('dev'));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Routes
const authRoutes = require('./routes/auth.routes.js');
const tasksRoutes = require('./routes/tasks.routes.js');
const habitsRoutes = require('./routes/habits.routes.js');
const wellnessRoutes = require('./routes/wellness.routes.js');
const goalsRoutes = require('./routes/goals.routes.js');
const focusRoutes = require('./routes/focus.routes.js');
const journalRoutes = require('./routes/journal.routes.js');
const analyticsRoutes = require('./routes/analytics.routes.js');
const gamificationRoutes = require('./routes/gamification.routes.js');
const aiRoutes = require('./routes/ai.routes.js');
const capturesRoutes = require('./routes/captures.routes.js');
const timeblocksRoutes = require('./routes/timeblocks.routes.js');
const habitstacksRoutes = require('./routes/habitstacks.routes.js');
const dailyplansRoutes = require('./routes/dailyplans.routes.js');
const distractionsRoutes = require('./routes/distractions.routes.js');
const templatesRoutes = require('./routes/templates.routes.js');
const profilesRoutes = require('./routes/profiles.routes.js');
const dataRoutes = require('./routes/data.routes.js');
const streaksRoutes = require('./routes/streaks.routes.js');
const shareRoutes = require('./routes/share.routes.js');
const friendsRoutes = require('./routes/friends.routes.js');
const challengesRoutes = require('./routes/challenges.routes.js');

app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/wellness', wellnessRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/focus', focusRoutes);
app.use('/api/journal', journalRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/captures', capturesRoutes);
app.use('/api/time-blocks', timeblocksRoutes);
app.use('/api/habit-stacks', habitstacksRoutes);
app.use('/api/daily-plans', dailyplansRoutes);
app.use('/api/distractions', distractionsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/streaks', streaksRoutes);
app.use('/api/share', shareRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/challenges', challengesRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the Trackiyo API' });
});

// 404 handler for unrecognized API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'NotFoundError',
    message: `API route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global error handling middleware (must remain last)
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  const statusCode = err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: err.name || 'ServerError',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    statusCode
  });
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

module.exports = app;
