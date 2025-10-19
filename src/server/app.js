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
import fs from 'fs';


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

// Serve Luxon as a standalone ES module without exposing entire node_modules
app.get('/vendor/luxon.js', (req, res) => {
	try {
		const luxonPath = path.resolve('node_modules/luxon/build/es6/luxon.mjs');
		if (!fs.existsSync(luxonPath)) {
			return res.status(404).type('text/plain').send('luxon not found');
		}
		res.setHeader('Cache-Control', 'public, max-age=86400');
		res.type('application/javascript');
		fs.createReadStream(luxonPath).pipe(res);
	} catch (e) {
		res.status(500).type('text/plain').send('luxon load error');
	}
});

export default app;
