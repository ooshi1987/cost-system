'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Store { id: string; name: string; _count: { storeUsers: number } }
interface User { id: string; email: string; name: string | null; role: string; storeUsers: { store: { id: string; name: string } }[] }

const card: React.CSSProperties = {
  background: 'var(--paper)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-xl)',
  padding: '24px',
  marginBottom: '12px',
};

const input: React.CSSProperties = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r)',
  padding: '10px 13px',
  fontSize: '14px',
  color: 'var(--ink)',
  background: 'var(--bg)',
  outline: 'none',
  fontFamily: 'var(--sans)',
  boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  background: 'var(--accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--r)',
  padding: '10px 18px',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'var(--sans)',
};

const btnOutline: React.CSSProperties = {
  background: 'none',
  color: 'var(--accent)',
  border: '1px solid var(--accent)',
  borderRadius: 'var(--r)',
  padding: '10px 18px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'var(--sans)',
  width: '100%',
};

export default function AdminPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [newStoreName, setNewStoreName] = useState('');
  const [addingStore, setAddingStore] = useState(false);

  const [newUser, setNewUser] = useState({ email: '', name: '', password: '', role: 'store_staff', storeId: '' });
  const [addingUser, setAddingUser] = useState(false);
  const [createdPassword, setCreatedPassword] = useState('');

  const [error, setError] = useState('');

  const load = async () => {
    const [sRes, uRes] = await Promise.all([fetch('/api/stores'), fetch('/api/users')]);
    if (sRes.ok) setStores(await sRes.json());
    if (uRes.ok) setUsers(await uRes.json());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const addStore = async () => {
    if (!newStoreName.trim()) return;
    setAddingStore(true); setError('');
    const res = await fetch('/api/stores', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newStoreName }) });
    if (res.ok) { setNewStoreName(''); await load(); }
    else { const d = await res.json(); setError(d.error); }
    setAddingStore(false);
  };

  const deleteStore = async (id: string) => {
    if (!confirm('この店舗を削除しますか？（食材・メニューも全て削除されます）')) return;
    const res = await fetch(`/api/stores/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
    else { const d = await res.json(); setError(d.error); }
  };

  const addUser = async () => {
    if (!newUser.email || !newUser.password) return;
    setAddingUser(true); setError(''); setCreatedPassword('');
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newUser) });
    if (res.ok) {
      setCreatedPassword(newUser.password);
      setNewUser({ email: '', name: '', password: '', role: 'store_staff', storeId: '' });
      await load();
    } else { const d = await res.json(); setError(d.error); }
    setAddingUser(false);
  };

  const deleteUser = async (id: string) => {
    if (!confirm('このユーザーを削除しますか？')) return;
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
    else { const d = await res.json(); setError(d.error); }
  };

  if (loading) return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--muted)', fontSize: '14px' }}>読み込み中…</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '20px 16px 80px' }}>

        {/* ── ヘッダー ── */}
        <header style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--sans)', padding: 0 }}
          >
            ← ダッシュボード
          </button>
          <div style={{ height: '14px', width: '1px', background: 'var(--line)' }} />
          <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--ink)' }}>管理設定</h1>
        </header>

        {/* エラー */}
        {error && (
          <div style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-2)', borderRadius: 'var(--r)', padding: '12px 16px', color: 'var(--accent)', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        {/* パスワード作成完了 */}
        {createdPassword && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 'var(--r)', padding: '12px 16px', color: '#166534', fontSize: '13px', marginBottom: '16px' }}>
            ✅ ユーザーを作成しました。パスワードをスタッフに共有してください：<br />
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '16px', display: 'block', marginTop: '4px' }}>{createdPassword}</span>
            <span style={{ fontSize: '11px', color: '#4ade80' }}>このパスワードは再表示できません</span>
          </div>
        )}

        {/* ──── 店舗管理 ──── */}
        <section style={card}>
          <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            🏪 店舗一覧
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 400 }}>（{stores.length}店舗）</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {stores.map((store) => (
              <div key={store.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', border: '1px solid var(--line-2)', borderRadius: 'var(--r)', padding: '11px 14px' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{store.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '8px' }}>スタッフ {store._count.storeUsers}人</span>
                </div>
                {stores.length > 1 && (
                  <button onClick={() => deleteStore(store.id)} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                    削除
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              placeholder="新しい店舗名"
              style={{ ...input, flex: 1 }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
              onKeyDown={(e) => e.key === 'Enter' && addStore()}
            />
            <button
              onClick={addStore}
              disabled={addingStore || !newStoreName.trim()}
              style={{ ...btnPrimary, opacity: (addingStore || !newStoreName.trim()) ? 0.5 : 1 }}
            >
              追加
            </button>
          </div>
        </section>

        {/* ──── ユーザー管理 ──── */}
        <section style={card}>
          <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            👤 スタッフ一覧
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 400 }}>（{users.length}人）</span>
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {users.map((user) => (
              <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg)', border: '1px solid var(--line-2)', borderRadius: 'var(--r)', padding: '11px 14px' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>{user.name || user.email}</span>
                  {user.name && <span style={{ fontSize: '11px', color: 'var(--muted)', marginLeft: '4px' }}>({user.email})</span>}
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <span style={{
                      fontSize: '10px', padding: '2px 7px', borderRadius: '999px', fontWeight: 600,
                      background: user.role === 'tenant_admin' ? 'var(--accent-soft)' : '#eff6ff',
                      color: user.role === 'tenant_admin' ? 'var(--accent)' : '#2563eb',
                    }}>
                      {user.role === 'tenant_admin' ? '管理者' : 'スタッフ'}
                    </span>
                    {user.storeUsers[0] && (
                      <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '999px', background: 'var(--bg-2)', color: 'var(--muted)' }}>
                        {user.storeUsers[0].store.name}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteUser(user.id)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--sans)' }}>
                  削除
                </button>
              </div>
            ))}
          </div>

          {/* 新規スタッフ追加 */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '20px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink-2)', marginBottom: '12px', marginTop: 0 }}>スタッフを追加</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="名前（任意）"
                style={input}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
              />
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="メールアドレス"
                style={input}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
              />
              <input
                type="text"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="初期パスワード（8文字以上）"
                style={input}
                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderColor = 'var(--line)'}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  style={{ ...input, flex: 1 }}
                >
                  <option value="store_staff">スタッフ</option>
                  <option value="tenant_admin">管理者</option>
                </select>
                {newUser.role === 'store_staff' && (
                  <select
                    value={newUser.storeId}
                    onChange={(e) => setNewUser({ ...newUser, storeId: e.target.value })}
                    style={{ ...input, flex: 1 }}
                  >
                    <option value="">担当店舗を選択</option>
                    {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </div>
              <button
                onClick={addUser}
                disabled={addingUser || !newUser.email || !newUser.password}
                style={{ ...btnPrimary, padding: '12px', fontSize: '14px', width: '100%', opacity: (addingUser || !newUser.email || !newUser.password) ? 0.5 : 1 }}
              >
                {addingUser ? '追加中…' : 'スタッフを追加'}
              </button>
            </div>
          </div>
        </section>

        {/* ──── プラン・請求 ──── */}
        <section style={card}>
          <h2 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: 700, color: 'var(--ink)' }}>
            💳 プラン・請求
          </h2>
          <button onClick={() => router.push('/billing')} style={btnOutline}>
            プランを確認・変更する
          </button>
        </section>

      </div>
    </div>
  );
}
