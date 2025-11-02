import { after } from 'node:test';
import net from 'node:net';

if (!process.listeners('exit').some(fn => fn.name === 'logExitCode')) {
	process.on('exit', function logExitCode(code) {
		console.log('[diagnostic] process exit code observed:', code);
	});
}

after(() => {
	const handles = process._getActiveHandles ? process._getActiveHandles() : [];
	const requests = process._getActiveRequests ? process._getActiveRequests() : [];
	const summaries = handles.map((h, idx) => {
		const ctor = h && h.constructor ? h.constructor.name : typeof h;
		let details = ctor;
		if (ctor === 'Timeout') {
			details += ` ms=${h._idleTimeout}`;
		} else if (ctor === 'Immediate') {
			details += ' immediate';
		} else if (ctor === 'Server') {
			details += ' server';
		} else if (ctor === 'WriteStream') {
			details += ` path=${h.path}`;
		} else if (ctor === 'TCPSocket' || ctor === 'Socket') {
			const { localAddress, localPort, remoteAddress, remotePort } = h;
			details += ` local=${localAddress}:${localPort} remote=${remoteAddress}:${remotePort}`;
			const extra = {
				connecting: !!h.connecting,
				pending: !!h.pending,
				writable: !!h.writable,
				readable: !!h.readable,
				destroyed: !!h.destroyed,
				server: !!h.server,
				instanceofNetSocket: h instanceof net.Socket,
				isStdout: h === process.stdout,
				isStderr: h === process.stderr
			};
			try {
				const addr = typeof h.address === 'function' ? h.address() : null;
				if (addr) extra.address = addr;
			} catch (e) {
				extra.addressError = e.code || e.message;
			}
			details += ` meta=${JSON.stringify(extra)}`;
		}
		return `${idx}: ${details}`;
	});
	console.log('[diagnostic] exitCode before shutdown:', process.exitCode);
	console.log('[diagnostic] active handles after tests:', summaries);
	if (requests.length) {
		const requestSummaries = requests.map((r, idx) => {
			const ctor = r && r.constructor ? r.constructor.name : typeof r;
			return `${idx}: ${ctor}`;
		});
		console.log('[diagnostic] active requests after tests:', requestSummaries);
	}

	const isStdioHandle = h => {
		if (!h) return false;
		if (h === process.stdout || h === process.stderr || h === process.stdin) return true;
		return typeof h.fd === 'number' && [0, 1, 2].includes(h.fd);
	};
	const residualHandles = handles.filter(h => !isStdioHandle(h));
	if (residualHandles.length > 0) {
		const residualSummaries = residualHandles.map((h, idx) => {
			const ctor = h && h.constructor ? h.constructor.name : typeof h;
			return `${idx}: ${ctor}`;
		});
		console.log('[diagnostic] residual handles preventing shutdown:', residualSummaries);
	}
	if (!process.__forceShutdownScheduled && residualHandles.length === 0) {
		process.__forceShutdownScheduled = true;
		const exitCode = typeof process.exitCode === 'number' ? process.exitCode : 0;
		const delayMs = Number.parseInt(process.env.TEST_FORCE_EXIT_DELAY || '', 10);
		const shutdownDelay = Number.isFinite(delayMs) ? Math.max(delayMs, 0) : 2000;
		// Force the process to terminate shortly after diagnostics, giving peers time to finish.
		setTimeout(() => process.exit(exitCode), shutdownDelay);
	}
});
