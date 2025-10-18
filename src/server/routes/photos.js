import { Router } from 'express';
import { setCache, getCache } from '../../services/cache.js';

// Placeholder stub photo list
function generateSamplePhotos() {
  return [
    { id: 'P1', url: '/static/sample1.jpg', orientation: 'landscape', title: 'Sample 1' },
    { id: 'P2', url: '/static/sample2.jpg', orientation: 'portrait', title: 'Sample 2' },
    { id: 'P3', url: '/static/sample3.jpg', orientation: 'landscape', title: 'Sample 3' }
  ];
}

const router = Router();

router.get('/', (req, res) => {
  const cached = getCache('photos');
  if (cached?.data) return res.json(cached.data);
  const list = generateSamplePhotos();
  setCache('photos', list);
  res.json(list);
});

export default router;