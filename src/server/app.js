import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import configRouter from './routes/config.js';
import statusRouter from './routes/status.js';
import eventsRouter from './routes/events.js';
import photosRouter from './routes/photos.js';
import signinRouter from './routes/signin.js';
import callbackRouter from './routes/callback.js';
import signoutRouter from './routes/signout.js';
import authRotateRouter from './routes/authRotate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(path.resolve('src/public')));

app.use('/api/config', configRouter);
app.use('/api/status', statusRouter);
app.use('/api/events', eventsRouter);
app.use('/api/photos', photosRouter);
app.use('/signin', signinRouter);
app.use('/callback', callbackRouter);
app.use('/signout', signoutRouter);
app.use('/api/auth/rotate', authRotateRouter);

export default app;
