export default function MenuLoading() {
  const Skel = ({ w, h, r = 6 }: { w: string | number; h: number; r?: number }) => (
    <div style={{ width: w, height: h, borderRadius: r, background: '#f0ebe0', flexShrink: 0 }} />
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <Skel w={120} h={16} r={4} />
          <Skel w={60} h={28} r={8} />
        </div>
        <Skel w={180} h={32} r={6} />
        <div className="mt-8 bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
          <Skel w={200} h={20} r={4} />
          <div className="mt-3"><Skel w="100%" h={80} r={12} /></div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 sm:p-5 mb-4">
          <Skel w={100} h={14} r={4} />
          <div className="mt-3 flex gap-2">
            <Skel w="100%" h={36} r={8} />
            <Skel w={120} h={36} r={8} />
            <Skel w={80} h={36} r={8} />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <Skel w={120} h={20} r={4} />
            <Skel w={48} h={28} r={8} />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-100">
              <Skel w="40%" h={14} r={4} />
              <div style={{ flex: 1 }} />
              <Skel w={60} h={14} r={4} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
