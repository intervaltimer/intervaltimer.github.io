self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  clients.claim();
});

// Basic network-first handler to keep things simple for now
self.addEventListener('fetch', () => {
  // Let the browser handle all fetches; we just need an installable PWA shell.
});
