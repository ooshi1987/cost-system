'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

/**
 * 複数店舗を持つ tenant_admin にだけ「全店舗を見る」リンクを表示
 */
export default function MultiStoreLink() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    Promise.all([fetch('/api/me'), fetch('/api/stores')]).then(async ([mRes, sRes]) => {
      if (!mRes.ok || !sRes.ok) return;
      const me = await mRes.json();
      const stores = await sRes.json();
      if (me.role === 'tenant_admin' && stores.length >= 2) setShow(true);
    });
  }, []);

  if (!show) return null;

  return (
    <Link
      href="/stores"
      className="flex items-center gap-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
    >
      <span className="text-sm">📊</span>
      <span>全店舗を見る</span>
    </Link>
  );
}
