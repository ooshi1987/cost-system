'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Store { id: string; name: string; _count: { storeUsers: number } }
interface User { id: string; email: string; name: string | null; role: string; storeUsers: { store: { id: string; name: string } }[] }

export default function AdminPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // 店舗追加
  const [newStoreName, setNewStoreName] = useState('');
  const [addingStore, setAddingStore] = useState(false);

  // ユーザー追加
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

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-400">読み込み中…</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push('/')} className="text-amber-600 text-sm">← 戻る</button>
          <h1 className="text-xl font-bold">管理設定</h1>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm mb-4">{error}</div>}
        {createdPassword && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm mb-4">
            ✅ ユーザーを作成しました。パスワードをスタッフに共有してください：<br />
            <span className="font-mono font-bold text-base">{createdPassword}</span>
            <br /><span className="text-xs text-green-500">このパスワードは再表示できません</span>
          </div>
        )}

        {/* ──── 店舗管理 ──── */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h2 className="font-bold text-base mb-3">🏪 店舗一覧 <span className="text-gray-400 font-normal text-sm">({stores.length}店舗)</span></h2>
          <div className="space-y-2 mb-4">
            {stores.map((store) => (
              <div key={store.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <span className="font-semibold text-sm">{store.name}</span>
                  <span className="text-xs text-gray-400 ml-2">スタッフ {store._count.storeUsers}人</span>
                </div>
                {stores.length > 1 && (
                  <button onClick={() => deleteStore(store.id)} className="text-red-400 hover:text-red-600 text-xs">削除</button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newStoreName} onChange={(e) => setNewStoreName(e.target.value)}
              placeholder="新しい店舗名"
              className="flex-1 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400"
              onKeyDown={(e) => e.key === 'Enter' && addStore()}
            />
            <button onClick={addStore} disabled={addingStore || !newStoreName.trim()}
              className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold disabled:bg-gray-200">
              追加
            </button>
          </div>
        </div>

        {/* ──── ユーザー管理 ──── */}
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-4">
          <h2 className="font-bold text-base mb-3">👤 スタッフ一覧 <span className="text-gray-400 font-normal text-sm">({users.length}人)</span></h2>
          <div className="space-y-2 mb-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <span className="font-semibold text-sm">{user.name || user.email}</span>
                  {user.name && <span className="text-xs text-gray-400 ml-1">({user.email})</span>}
                  <div className="flex gap-1 mt-0.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${user.role === 'tenant_admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-600'}`}>
                      {user.role === 'tenant_admin' ? '管理者' : 'スタッフ'}
                    </span>
                    {user.storeUsers[0] && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{user.storeUsers[0].store.name}</span>}
                  </div>
                </div>
                <button onClick={() => deleteUser(user.id)} className="text-red-400 hover:text-red-600 text-xs">削除</button>
              </div>
            ))}
          </div>

          {/* 新規ユーザー追加フォーム */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-600 mb-2">スタッフを追加</p>
            <div className="space-y-2">
              <input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="名前（任意）" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
              <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="メールアドレス" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
              <input type="text" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="初期パスワード（8文字以上）" className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400" />
              <div className="flex gap-2">
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="flex-1 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                  <option value="store_staff">スタッフ</option>
                  <option value="tenant_admin">管理者</option>
                </select>
                {newUser.role === 'store_staff' && (
                  <select value={newUser.storeId} onChange={(e) => setNewUser({ ...newUser, storeId: e.target.value })}
                    className="flex-1 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-amber-400 bg-white">
                    <option value="">担当店舗を選択</option>
                    {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </div>
              <button onClick={addUser} disabled={addingUser || !newUser.email || !newUser.password}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl text-sm font-bold disabled:bg-gray-200 transition-colors">
                {addingUser ? '追加中…' : 'スタッフを追加'}
              </button>
            </div>
          </div>
        </div>

        {/* ──── プラン・請求 ──── */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-bold text-base mb-3">💳 プラン・請求</h2>
          <button onClick={() => router.push('/billing')}
            className="w-full border border-amber-300 text-amber-600 hover:bg-amber-50 py-3 rounded-xl text-sm font-semibold transition-colors">
            プランを確認・変更する
          </button>
        </div>
      </div>
    </div>
  );
}
