const CACHE_NAME = 'upvc-calculator-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// نصب و کش کردن فایل‌ها
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] کش کردن فایل‌ها...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[Service Worker] نصب کامل شد!');
                // فعال‌سازی فوری پس از نصب
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[Service Worker] خطا در کش کردن:', error);
            })
    );
});

// فعال‌سازی و پاکسازی کش‌های قدیمی
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name !== CACHE_NAME)
                        .map(name => {
                            console.log('[Service Worker] حذف کش قدیمی:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[Service Worker] فعال‌سازی کامل شد!');
                // کنترل تمام صفحات باز
                return self.clients.claim();
            })
    );
});

// اینترسپت درخواست‌ها و پاسخ از کش
self.addEventListener('fetch', event => {
    // فقط درخواست‌های GET را مدیریت کن
    if (event.request.method !== 'GET') {
        return;
    }

    // برای درخواست‌های خارجی (مثل html2canvas و فونت Vazirmatn)
    // از استراتژی "ابتدا شبکه، سپس کش" استفاده می‌کنیم
    const url = new URL(event.request.url);
    
    // اگر درخواست به دامنه خارجی است، از شبکه بگیر
    if (url.origin !== self.location.origin) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    // پاسخ را در کش ذخیره نکن (برای منابع خارجی)
                    return response;
                })
                .catch(() => {
                    // اگر اینترنت قطع بود، خطا برگردان
                    return new Response('منبع در دسترس نیست', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                })
        );
        return;
    }

    // برای منابع داخلی: استراتژی "ابتدا کش، سپس شبکه"
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    // اگر در کش موجود است، همان را برگردان
                    return cachedResponse;
                }

                // اگر در کش نبود، از شبکه بگیر
                return fetch(event.request)
                    .then(response => {
                        // پاسخ معتبر را کش کن (فقط برای فایل‌های موفق)
                        if (response && response.status === 200 && response.type === 'basic') {
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseClone);
                                });
                        }
                        return response;
                    })
                    .catch(() => {
                        // اگر اینترنت قطع بود و فایل در کش نبود
                        // برای درخواست صفحه اصلی، یک صفحه آفلاین برگردان
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                        return new Response('صفحه در دسترس نیست', {
                            status: 404,
                            statusText: 'Not Found'
                        });
                    });
            })
    );
});

// دریافت پیام از صفحات
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});