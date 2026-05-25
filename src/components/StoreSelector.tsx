'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Store { id: string; name: string }
interface Me { role: string; storeName: string | null; storeId: string | null }

export default function StoreSelector() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([fetch('/api/me'), fetch('/api/stores')]).then(async ([mRes, sRes]) => {
      if (mRes.ok) setMe(await mRes.json());
      if (sRes.ok) setStores(await sRes.json());
    });
  }, []);

  // 外クリックで閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!me || me.role !== 'tenant_admin' || stores.length <= 1) return null;

  const switchStore = async (storeId: string) => {
    setSwitching(true); setOpen(false);
    const res = await fetch('/api/auth/switch-store', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId }),
    });
    if (res.ok) { router.refresh(); }
    setSwitching(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
      >
        <span className="text-sm">🏪</span>
        <span>{switching ? '切替中…' : (me.storeName ?? '店舗選択')}</span>
        <span className="text-amber-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-50 min-w-[140px] overflow-hidden">
          {stores.map((s) => (
            <button
              key={s.id}
              onClick={() => switchStore(s.id)}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 transition-colors ${s.id === me.storeId ? 'font-bold text-amber-600 bg-amber-50' : 'text-gray-700'}`}
            >
              {s.id === me.storeId && <span className="mr-1">✓</span>}
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
