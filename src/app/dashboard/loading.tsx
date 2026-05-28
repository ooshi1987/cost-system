export default function DashboardLoading() {
  const Skel = ({ w, h, r = 6 }: { w: string | number; h: number; r?: number }) => (
    <div style={{ width: w, height: h, borderRadius: r, background: 'var(--line-2)', flexShrink: 0 }} />
  );

  return (
    <div style={{ minHeight: '100svh', background: 'var(--bg)', paddingBottom: 80 }}>
      <div className="dashboard-inner">
        {/* ヘッダー */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Skel w={80} h={20} />
          <Skel w={160} h={20} />
        </header>
        {/* 店舗切替 */}
        <div style={{ marginBottom: 20 }}><Skel w="100%" h={36} r={10} /></div>
        {/* グリーティング */}
        <div style={{ marginBottom: 20 }}>
          <Skel w={120} h={14} r={4} />
          <div style={{ marginTop: 6 }}><Skel w={200} h={24} r={6} /></div>
        </div>
        {/* KPI 上段 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px 12px' }}>
              <Skel w={48} h={10} r={3} />
              <div style={{ marginTop: 10 }}><Skel w={40} h={26} r={4} /></div>
            </div>
          ))}
        </div>
        {/* KPI 下段 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '16px' }}>
              <Skel w={64} h={11} r={3} />
              <div style={{ marginTop: 10 }}><Skel w={40} h={26} r={4} /></div>
            </div>
          ))}
        </div>
        {/* TOP5 */}
        <div style={{ background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: '18px 16px' }}>
          <Skel w={160} h={13} r={4} />
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Skel w={80} h={12} r={3} />
                <div style={{ flex: 1, height: 6, background: 'var(--line-2)', borderRadius: 3 }} />
                <Skel w={36} h={12} r={3} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
