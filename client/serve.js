import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

const MIME = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.ico': 'image/x-icon',
	'.webp': 'image/webp',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.ttf': 'font/ttf',
	'.txt': 'text/plain',
};

createServer((req, res) => {
	const url = new URL(req.url, `http://localhost:${PORT}`);
	let filePath = join(DIST, url.pathname);

	// If path has no extension, try index.html (SPA fallback)
	if (!extname(filePath)) {
		const withIndex = join(filePath, 'index.html');
		if (existsSync(withIndex)) {
			filePath = withIndex;
		} else {
			filePath = join(DIST, 'index.html');
		}
	}

	// If file doesn't exist, serve index.html (SPA fallback)
	if (!existsSync(filePath)) {
		filePath = join(DIST, 'index.html');
	}

	const ext = extname(filePath);
	const contentType = MIME[ext] || 'application/octet-stream';

	try {
		const content = readFileSync(filePath);

		// Cache static assets aggressively, HTML never
		const cacheControl = ext === '.html'
			? 'no-cache, no-store, must-revalidate'
			: 'public, max-age=31536000, immutable';

		res.writeHead(200, {
			'Content-Type': contentType,
			'Cache-Control': cacheControl,
		});
		res.end(content);
	} catch {
		res.writeHead(500, { 'Content-Type': 'text/plain' });
		res.end('Internal Server Error');
	}
}).listen(PORT, () => {
	console.log(`Static server running on port ${PORT}`);
});
