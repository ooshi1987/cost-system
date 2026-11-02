'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type Menu = 'capture' | 'history';

const MENU_LINKS: Record<Menu, { href: string; label: string; detail: string }[]> = {
  capture: [
    { href: '/sales', label: 'Airレジ 売上締め', detail: '売上の締め画面を撮影' },
    { href: '/delivery', label: '仕入伝票・レシート', detail: '納品書やレシートを撮影' },
    { href: '/expense', label: '経費を手入力', detail: '経費を手入力で記録' },
  ],
  history: [
    { href: '/sales/history', label: '売上締め履歴', detail: '保存した売上締めを確認・修正' },
    { href: '/daily-ledger', label: '日次集計表', detail: '日ごとの売上・支出を確認' },
    { href: '/delivery-history', label: '納品履歴', detail: '保存した納品書を確認' },
    { href: '/petty-cash', label: '小口現金', detail: '残高を記入・照合' },
    { href: '/ingredients', label: '食材管理', detail: '登録済みの食材を確認' },
    { href: '/menu', label: 'メニュー・レシピ', detail: '登録済みのメニューを確認' },
    { href: '/reports', label: '従来のレポート', detail: 'これまでの集計を確認' },
  ],
};

export default function BottomNav() {
  const pathname = usePathname();
  const [menu, setMenu] = useState<Menu | null>(null);

  useEffect(() => {
    if (!menu) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menu]);

  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname.startsWith('/super-admin') ||
    pathname.startsWith('/design')
  ) return null;

  const captureActive = ['/sales', '/delivery', '/expense'].includes(pathname);
  const historyActive = ['/sales/history', '/delivery-history', '/petty-cash', '/ingredients', '/menu', '/reports'].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  return (
    <div className="mobile-navigation print:hidden">
      {menu && (
        <div className="mobile-nav-overlay" onClick={() => setMenu(null)}>
          <section className="mobile-nav-sheet" aria-label={menu === 'capture' ? '撮影・記録' : '履歴・その他'} onClick={(event) => event.stopPropagation()}>
            <div className="mobile-nav-sheet-header">
              <div>
                <h2>{menu === 'capture' ? '撮影・記録' : '履歴・その他'}</h2>
                <p>{menu === 'capture' ? '記録するものを選んでください' : '確認する画面を選んでください'}</p>
              </div>
              <button type="button" className="mobile-nav-close" aria-label="閉じる" onClick={() => setMenu(null)}>×</button>
            </div>
            <div className="mobile-nav-choices">
              {MENU_LINKS[menu].map(({ href, label, detail }) => (
                <Link href={href} key={href} onClick={() => setMenu(null)} className="mobile-nav-choice">
                  <span><strong>{label}</strong><small>{detail}</small></span><span aria-hidden="true">›</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
      <nav data-bottom-nav aria-label="現場用ナビゲーション" className="mobile-nav-bar">
        <Link href="/dashboard" onClick={() => setMenu(null)} className={`mobile-nav-item ${pathname === '/dashboard' && !menu ? 'is-active' : ''}`} aria-current={pathname === '/dashboard' && !menu ? 'page' : undefined}>
          <span aria-hidden="true">○</span>今日
        </Link>
        <button type="button" className={`mobile-nav-item ${menu === 'capture' || (!menu && captureActive) ? 'is-active' : ''}`} aria-expanded={menu === 'capture'} onClick={() => setMenu(menu === 'capture' ? null : 'capture')}>
          <span aria-hidden="true">＋</span>撮影
        </button>
        <Link href="/review" onClick={() => setMenu(null)} className={`mobile-nav-item ${pathname === '/review' && !menu ? 'is-active' : ''}`} aria-current={pathname === '/review' && !menu ? 'page' : undefined}>
          <span aria-hidden="true">!</span>要確認
        </Link>
        <button type="button" className={`mobile-nav-item ${menu === 'history' || (!menu && historyActive) ? 'is-active' : ''}`} aria-expanded={menu === 'history'} onClick={() => setMenu(menu === 'history' ? null : 'history')}>
          <span aria-hidden="true">≡</span>履歴
        </button>
        <Link href="/daily-ledger" onClick={() => setMenu(null)} className={`mobile-nav-item ${pathname === '/daily-ledger' && !menu ? 'is-active' : ''}`} aria-current={pathname === '/daily-ledger' && !menu ? 'page' : undefined}>
          <span aria-hidden="true">▥</span>月次
        </Link>
      </nav>
    </div>
  );
}
