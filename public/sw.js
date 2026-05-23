// 最小限のサービスワーカー
// オフライン対応は不要だが、Android PWA インストールに必要
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(clients.claim()));
// fetch はすべてネットワーク通過（キャッシュなし）
