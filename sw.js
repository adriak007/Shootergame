const CACHE_NAME = 'shooter-game-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/powerups.js',
  '/background.jpg',
  '/player.png',
  '/bullet.png',
  '/enemy1.png',
  '/enemy2.png',
  '/enemy3.png',
  '/meteor.png',
  '/powerup_triple.png',
  '/powerup_big.png',
  '/powerup_speed.png',
  '/shoot.mp3',
  '/hit.mp3',
  '/enemy_hit.mp3',
  '/player_hit.mp3',
  '/background_music.mp3',
  '/menu_music.mp3',
  '/game_over.mp3',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalar o service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS);
      })
  );
});

// Ativar o service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
      })
  );
}); 