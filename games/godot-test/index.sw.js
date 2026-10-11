/* Chunk-loader for the Godot engine wasm.
 * GitHub's web uploader caps files at 25 MB, so index.wasm (43 MB) is stored
 * as two chunks. This worker intercepts the engine's fetch of index.wasm,
 * reassembles the chunks, and serves the result as application/wasm.
 * (Test page only — the wasm is a stock Godot 4.4 export template.) */
var CHUNKS = ['index.wasm.aa', 'index.wasm.ab'];

self.addEventListener('install', function () {
	self.skipWaiting();
});

self.addEventListener('activate', function (event) {
	event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (event) {
	var url = new URL(event.request.url);
	if (!url.pathname.endsWith('/index.wasm')) {
		return;
	}
	event.respondWith((async function () {
		var bufs = await Promise.all(CHUNKS.map(function (c) {
			return fetch(c).then(function (r) {
				if (!r.ok) {
					throw new Error('missing chunk: ' + c);
				}
				return r.arrayBuffer();
			});
		}));
		var total = bufs.reduce(function (n, b) { return n + b.byteLength; }, 0);
		var out = new Uint8Array(total);
		var off = 0;
		bufs.forEach(function (b) {
			out.set(new Uint8Array(b), off);
			off += b.byteLength;
		});
		return new Response(out, { headers: { 'Content-Type': 'application/wasm' } });
	})());
});
