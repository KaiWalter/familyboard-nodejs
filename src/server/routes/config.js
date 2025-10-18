import { Router } from 'express';
import { loadConfig, saveConfig } from '../../config/store.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(loadConfig());
});

router.put('/', (req, res) => {
  try {
    const saved = saveConfig(req.body);
    res.json(saved);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
