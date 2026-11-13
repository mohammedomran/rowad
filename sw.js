/*
 * رواد — عامل الخدمة (Service Worker)
 * ------------------------------------------------------------------
 * يجعل الموقع تطبيقًا قابلًا للتثبيت ويعمل دون اتصال:
 *   • الصفحات و CSS/JS والـ manifest: الشبكة أولًا (مع مهلة)، ثم النسخة المحفوظة.
 *   • الصور: المحفوظ أولًا ثم الشبكة (وتُحفَظ أي صورة جديدة تلقائيًّا).
 *   • الخطوط ومكتبات CDN: المحفوظ فورًا مع تحديثه في الخلفية.
 *   • الفيديو وطلبات Range: لا تُخزَّن هنا (تمر إلى الشبكة مباشرة).
 *
 * عند كل إصدار جديد: غيّر رقم VERSION حتى تُحذَف النسخ القديمة.
 */
'use strict';

var VERSION = 'v1';
var SHELL = 'rowad-shell-' + VERSION;
var MEDIA = 'rowad-media-' + VERSION;
var CDN = 'rowad-cdn-' + VERSION;
var KEEP = [SHELL, MEDIA, CDN];

var NET_TIMEOUT = 3500;

/* الهيكل: يجب أن يُحفظ كاملًا وإلا يفشل التثبيت */
var SHELL_FILES = [
  './',
  'index.html',
  'home.html',
  'stories.html',
  'story.html',
  'favourites.html',
  'downloads.html',
  'profile.html',
  'dashboard.html',
  'login.html',
  'signup.html',
  'forgot-password.html',
  'manifest.webmanifest',
  'assets/css/rowad.css',
  'assets/js/guard.js',
  'assets/js/icons.js',
  'assets/js/data.js',
  'assets/js/app.js',
  'assets/js/pages.js',
  'assets/js/pwa.js',
  'assets/img/brand/favicon-64.png',
  'assets/img/brand/apple-touch-icon.png',
  'assets/img/brand/icon-192.png',
  'assets/img/brand/logo-280.webp'
];

/* الصور: تُحفظ مسبقًا قدر الإمكان، وفشل أي منها لا يوقف التثبيت */
var MEDIA_FILES = [
  'assets/img/avatars/bunduq.webp',
  'assets/img/avatars/cat.webp',
  'assets/img/avatars/layla.webp',
  'assets/img/avatars/lion.webp',
  'assets/img/avatars/robo.webp',
  'assets/img/avatars/salma.webp',
  'assets/img/avatars/sami.webp',
  'assets/img/avatars/youssef.webp',
  'assets/img/brand/logo.webp',
  'assets/img/covers/bee.webp',
  'assets/img/covers/castle.webp',
  'assets/img/covers/cloud.webp',
  'assets/img/covers/jungle.webp',
  'assets/img/covers/lantern.webp',
  'assets/img/covers/lion.webp',
  'assets/img/covers/moon.webp',
  'assets/img/covers/rabbit.webp',
  'assets/img/covers/robo-pyramids.webp',
  'assets/img/covers/robo-stars.webp',
  'assets/img/covers/robo.webp',
  'assets/img/covers/space.webp',
  'assets/img/covers/whale.webp',
  'assets/img/hero/castle-wide.webp',
  'assets/img/hero/robo-wide.webp',
  'assets/img/hero/whale-wide.webp',
  'assets/img/icons/adventure.webp',
  'assets/img/icons/animals.webp',
  'assets/img/icons/bedtime.webp',
  'assets/img/icons/daily-book.webp',
  'assets/img/icons/empty-cloud.webp',
  'assets/img/icons/empty-heart.webp',
  'assets/img/icons/robo-wave.webp',
  'assets/img/icons/values.webp'
];

var CDN_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

/* ───────────── التثبيت والتفعيل ───────────── */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(SHELL)
      .then(function (cache) { return cache.addAll(SHELL_FILES); })
      .then(function () {
        return caches.open(MEDIA).then(function (cache) {
          return Promise.all(MEDIA_FILES.map(function (url) {
            return cache.add(url).catch(function () { /* تُحفظ لاحقًا عند أول طلب */ });
          }));
        });
      })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          if (k.indexOf('rowad-') === 0 && KEEP.indexOf(k) === -1) return caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* ───────────── الاستراتيجيات ───────────── */
function withTimeout(promise, ms) {
  return new Promise(function (resolve, reject) {
    var t = setTimeout(function () { reject(new Error('timeout')); }, ms);
    promise.then(function (r) { clearTimeout(t); resolve(r); }, function (e) { clearTimeout(t); reject(e); });
  });
}

function putSafe(cacheName, request, response) {
  if (!response || (response.status !== 200 && response.type !== 'opaque')) return;
  var copy = response.clone();
  caches.open(cacheName).then(function (cache) { cache.put(request, copy); });
}

/* الشبكة أولًا، ثم المحفوظ (مع تجاهل ?id=… حتى تفتح story.html دون اتصال) */
function networkFirst(event, fallbackUrl) {
  var req = event.request;
  var net = fetch(req).then(function (res) { putSafe(SHELL, req, res); return res; });
  event.waitUntil(net.catch(function () {}));
  return withTimeout(net, NET_TIMEOUT).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return net.catch(function () {
        return fallbackUrl ? caches.match(fallbackUrl) : Response.error();
      }).then(function (r) { return r || Response.error(); });
    });
  });
}

function cacheFirst(event, cacheName) {
  var req = event.request;
  return caches.match(req).then(function (hit) {
    return hit || fetch(req).then(function (res) { putSafe(cacheName, req, res); return res; });
  });
}

function staleWhileRevalidate(event, cacheName) {
  var req = event.request;
  return caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (res) { putSafe(cacheName, req, res); return res; });
    event.waitUntil(net.catch(function () {}));
    return hit || net;
  });
}

/* ───────────── التوجيه ───────────── */
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;
  if (req.destination === 'video' || req.destination === 'audio') return;

  var url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      event.respondWith(networkFirst(event, 'index.html'));
    } else if (req.destination === 'image') {
      event.respondWith(cacheFirst(event, MEDIA));
    } else {
      event.respondWith(networkFirst(event, null));
    }
    return;
  }

  if (CDN_HOSTS.indexOf(url.hostname) > -1) {
    event.respondWith(staleWhileRevalidate(event, CDN));
  }
});
