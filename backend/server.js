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
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Clean up the FRONTEND_URL in case it has a trailing slash
    const configuredOrigin = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : 'http://localhost:5173';
    
    const allowedOrigins = [
      configuredOrigin,
      'http://localhost:5173',
      // Capacitor Android WebView origins (native shell)
      'http://localhost',
      'https://localhost',
      'capacitor://localhost'
    ];
    
    // Allow if exact match OR if it's a Vercel preview URL (very helpful for testing)
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(morgan('dev'));
app.use(compression());
app.use(express.json());
app.use(cookieParser());

// Routes
const authRoutes = require('./routes/auth.routes.js');
const tasksRoutes = require('./routes/tasks.routes.js');
const habitsRoutes = require('./routes/habits.routes.js');
const wellnessRoutes = require('./routes/wellness.routes.js');

app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/habits', habitsRoutes);
app.use('/api/wellness', wellnessRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'API is running' });
});

// Error handling middleware
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

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the API' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;
