import { apiGet } from '../public/js/apiClient.js';
import { readTokens } from '../auth/tokenStore.js';

export async function fetchPhotos() {
  const tokens = readTokens(); // stub for future header use
  return apiGet('/api/photos');
}