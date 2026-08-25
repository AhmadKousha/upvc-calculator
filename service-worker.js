const CACHE_NAME = 'upvc-calc-v1.0.1';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// ===== نصب سرویس‌ورکر =====
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 فایل‌ها در کش ذخیره شدند');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('❌ خطا در کش کردن فایل‌ها:', error);
      })
  );
  // فعال‌سازی فوری
  self.skipWaiting();
});

// ===== فعال‌سازی و پاک‌سازی کش قدیمی =====
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ کش قدیمی حذف شد:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // کنترل تمام صفحه‌ها
      return self.clients.claim();
    })
  );
});

// ===== مدیریت درخواست‌ها =====
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // اگر فایل در کش وجود داشت، از کش برگردان
        if (response) {
          return response;
        }

        // در غیر این صورت از شبکه دریافت کن
        return fetch(event.request)
          .then(response => {
            // اگر پاسخ معتبر نبود، برگردان
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // فقط فایل‌های GET را کش کن
            if (event.request.method !== 'GET') {
              return response;
            }

            // پاسخ را در کش ذخیره کن
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                try {
                  cache.put(event.request, responseToCache);
                } catch (e) {
                  console.warn('⚠️ خطا در ذخیره کش:', e);
                }
              });

            return response;
          })
          .catch(error => {
            console.warn('⚠️ خطا در دریافت از شبکه:', error);
            
            // برای صفحه اصلی، پاسخ آفلاین برگردان
            if (event.request.url.includes('index.html') || event.request.url === './') {
              return caches.match('./index.html');
            }
            
            // پاسخ آفلاین عمومی
            return new Response(
              '<html><body style="text-align:center;padding:50px;font-family:Arial;">' +
              '<h1>📱 شما آفلاین هستید</h1>' +
              '<p>لطفاً اتصال اینترنت خود را بررسی کنید.</p>' +
              '<p style="color:#888;font-size:14px;">' + CACHE_NAME + '</p>' +
              '</body></html>',
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/html'
                })
              }
            );
          });
      })
  );
});

// ===== دریافت نسخه جدید =====
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ===== مدیریت خطاهای شبکه =====
self.addEventListener('error', event => {
  console.error('❌ خطا در سرویس‌ورکر:', event);
});