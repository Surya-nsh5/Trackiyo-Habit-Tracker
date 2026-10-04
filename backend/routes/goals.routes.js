const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Goals feature has been removed from database & app.
// Endpoints return graceful empty / no-op responses to prevent client crashes.

router.get('/', (req, res) => {
  res.status(200).json([]);
});

router.post('/', (req, res) => {
  res.status(200).json({ message: 'Goals feature is deprecated and removed' });
});

router.put('/:id', (req, res) => {
  res.status(200).json({ message: 'Goals feature is deprecated and removed' });
});

router.delete('/:id', (req, res) => {
  res.status(200).json({ message: 'Goals feature is deprecated and removed' });
});

module.exports = router;
