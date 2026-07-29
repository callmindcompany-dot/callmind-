import express from 'express';

const router = express.Router();

// Placeholder for call logs / call processing endpoints
router.get('/health', (req, res) => {
  res.json({ status: 'ok', component: 'calls' });
});

export default router;
