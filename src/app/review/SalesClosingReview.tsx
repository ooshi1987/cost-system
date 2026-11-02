'use client';

import { useEffect, useState } from 'react';
import { isSalesAmount, salesDifference, type SalesClosingItem, type SalesMethod } from '@/lib/salesClosing';

interface Row {
  id: string | null;
  version: string | null;
  label: string;
  method: SalesMethod;
  amount: string;
  needsReview: boolean;
}
interface Closing {
  businessDate: string;
  statedTotal: number;
  customerCount: number | null;
  items: (Omit<Row, 'amount'> & { amount: number })[];
}

export default function SalesClosingReview({ id, onBack, backLabel = '要確認に戻る' }: { id: string; onBack: () => void; backLabel?: string }) {
  const [closing, setClosing] = useState<Closing | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/sales/close/${encodeURIComponent(id)}`)
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || '読み込めませんでした');
        if (active) {
          setClosing(result);
          setRows(result.items.map((item: Closing['items'][number]) => ({ ...item, amount: String(item.amount) })));
          setTotal(String(result.statedTotal));
        }
      })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : '読み込めませんでした'); });
    return () => { active = false; };
  }, [id]);

  const items: SalesClosingItem[] = rows.map((row) => ({ method: row.method, label: row.label, amount: row.amount.trim() ? Number(row.amount) : NaN, needsReview: row.needsReview }));
  const valid = total.trim() !== '' && isSalesAmount(Number(total)) && items.length > 0 && items.every((item) => item.label.trim() && isSalesAmount(item.amount));
  const difference = valid ? salesDifference(Number(total), items) : null;
  const updateRow = (index: number, patch: Partial<Row>) => {
    setRows((prev) => prev.map((row, i) => i === index ? { ...row, ...patch } : row));
    setConfirmed(false);
    setMessage(null);
  };
  const save = async () => {
    if (!closing || !valid || !confirmed || saving) return;
    setSaving(true); setError(null); setMessage(null);
    try {
      const res = await fetch(`/api/sales/close/${encodeURIComponent(id)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessDate: closing.businessDate, statedTotal: Number(total), customerCount: closing.customerCount, confirmed: true,
          items: items.map((item, index) => ({ ...item, id: rows[index].id, version: rows[index].version })) }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '更新できませんでした');
      if (result.needsReview) {
        setMessage('差額または要確認の内訳が残っています。もう一度、原本を確認してください。');
        const refreshed = await fetch(`/api/sales/close/${encodeURIComponent(id)}`);
        if (!refreshed.ok) throw new Error('保存しましたが、最新の内容を読み込めませんでした。戻って開き直してください。');
        const latest: Closing = await refreshed.json();
        setClosing(latest); setRows(latest.items.map((item) => ({ ...item, amount: String(item.amount) })));
        setTotal(String(latest.statedTotal)); setConfirmed(false);
      } else {
        onBack();
      }
    } catch (err) { setError(err instanceof Error ? err.message : '更新できませんでした'); }
    finally { setSaving(false); }
  };

  const inputStyle = { width: '100%', minWidth: 0, padding: 9, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--paper)' } as const;
  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)' }}>
      <div style={{ maxWidth: 440, margin: '0 auto', padding: '16px 16px 32px' }}>
        <button type="button" onClick={onBack} disabled={saving} style={{ border: 0, background: 'none', color: 'var(--accent)', padding: '4px 0', fontSize: 12 }}>← {backLabel}</button>
        <h1 style={{ margin: '12px 0 4px', fontSize: 20, fontWeight: 700 }}>売上締めの確認</h1>
        <p style={{ margin: '0 0 14px', color: 'var(--muted)', fontSize: 11 }}>原本を見ながら、合計とすべての内訳を確認してください。</p>
        {error && <p role="alert" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', padding: 12, borderRadius: 10, fontSize: 12 }}>{error}</p>}
        {message && <p role="status" style={{ background: 'var(--warn-soft)', color: 'var(--warn)', padding: 12, borderRadius: 10, fontSize: 12 }}>{message}</p>}
        {!closing && !error && <p>読み込み中…</p>}
        {closing && <>
          <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, marginBottom: 10 }}>
            <p style={{ margin: '0 0 10px', fontSize: 12 }}>営業日 <strong>{closing.businessDate}</strong></p>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>原本の売上合計
              <input type="number" min="0" step="0.01" inputMode="decimal" value={total} disabled={saving} onChange={(e) => { setTotal(e.target.value); setConfirmed(false); setMessage(null); }} style={{ ...inputStyle, marginTop: 5, textAlign: 'right' }} />
            </label>
          </div>
          {rows.map((row, index) => <div key={row.id ?? `new-${index}`} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, marginBottom: 10 }}>
            {row.id === null && <button type="button" disabled={saving} onClick={() => { setRows((prev) => prev.filter((_, i) => i !== index)); setConfirmed(false); }} style={{ float: 'right', border: 0, background: 'none', color: 'var(--accent)', fontSize: 11 }}>追加した行を取り消す</button>}
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>決済名
              <input value={row.label} disabled={saving} onChange={(e) => updateRow(index, { label: e.target.value })} style={{ ...inputStyle, marginTop: 4 }} />
            </label>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>決済方法
              <select value={row.method} disabled={saving} onChange={(e) => updateRow(index, { method: e.target.value as SalesMethod })} style={{ ...inputStyle, marginTop: 4 }}>
                <option value="cash">現金</option><option value="cashless">カード・電子決済</option><option value="transfer">オンライン・振込</option><option value="other">その他</option>
              </select>
            </label>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700 }}>金額
              <input type="number" min="0" step="0.01" inputMode="decimal" value={row.amount} disabled={saving} onChange={(e) => updateRow(index, { amount: e.target.value })} style={{ ...inputStyle, marginTop: 4, textAlign: 'right' }} />
            </label>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 10, fontSize: 11, lineHeight: 1.5 }}>
              <input type="checkbox" checked={!row.needsReview} disabled={saving} onChange={(e) => updateRow(index, { needsReview: !e.target.checked })} />この内訳を原本と照合しました
            </label>
          </div>)}
          <button type="button" disabled={saving || rows.length >= 100} onClick={() => { setRows((prev) => [...prev, { id: null, version: null, label: '', method: 'other', amount: '', needsReview: true }]); setConfirmed(false); setMessage(null); }} style={{ width: '100%', padding: 10, marginBottom: 8, border: '1px solid var(--line)', borderRadius: 10, background: 'var(--paper)', color: 'var(--accent)', fontWeight: 700, fontSize: 12 }}>＋ 決済内訳を追加</button>
          <p style={{ color: 'var(--muted)', fontSize: 10, lineHeight: 1.5, margin: '0 0 12px' }}>保存済みの行は削除できません。不要な行は金額を0円にして記録を残してください。</p>
          <div style={{ background: difference === 0 ? 'var(--success-soft)' : 'var(--warn-soft)', color: difference === 0 ? 'var(--success)' : 'var(--warn)', padding: 12, borderRadius: 10, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
            {difference === null ? '合計・内訳を確認してください' : difference === 0 ? '合計は一致しています' : `差額 ${difference > 0 ? '+' : ''}¥${difference.toLocaleString()}・要確認`}
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, fontSize: 12, lineHeight: 1.5 }}>
            <input type="checkbox" checked={confirmed} disabled={saving} onChange={(e) => setConfirmed(e.target.checked)} />売上合計とすべての内訳を原本と照合しました
          </label>
          <button type="button" onClick={save} disabled={!valid || !confirmed || saving} style={{ width: '100%', padding: 13, border: 0, borderRadius: 12, color: '#fff', background: !valid || !confirmed || saving ? 'var(--line)' : 'var(--accent)', fontWeight: 700 }}>{saving ? '保存中…' : '確認して保存'}</button>
        </>}
      </div>
    </div>
  );
}
