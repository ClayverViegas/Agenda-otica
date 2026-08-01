/* Service worker da Agenda de Atendimento
   Estratégia: cache-first para os arquivos do app, com atualização em segundo plano.
   Ao publicar uma nova versão do agenda.html, troque o número do CACHE abaixo. */

const CACHE = 'agenda-v3';
const ARQUIVOS = [
  './',
  './index.html',
  './manifest.json',
  './icone-192.png',
  './icone-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ARQUIVOS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(req).then(cache => {
      const rede = fetch(req).then(resp => {
        if (resp && resp.status === 200) {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return resp;
      }).catch(() => cache || caches.match('./index.html'));

      return cache || rede;
    })
  );
});

/* Lembretes agendados pelo app (funcionam com o app fechado em navegadores
   que mantêm o service worker ativo — no iOS só com o app aberto). */
self.addEventListener('message', e => {
  const d = e.data || {};
  if (d.tipo === 'lembrete') {
    self.registration.showNotification('Lembrete de atendimento', {
      body: d.texto,
      tag: d.id,
      icon: './icone-192.png',
      badge: './icone-192.png',
      vibrate: [180, 80, 180],
      requireInteraction: true,
      data: { url: './index.html' }
    });
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      for (const c of lista) if ('focus' in c) return c.focus();
      return clients.openWindow('./index.html');
    })
  );
});
