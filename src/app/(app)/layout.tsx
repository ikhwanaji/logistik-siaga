import BottomNav from '@/components/layout/BottomNav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-200 flex items-start justify-center">
      {/* Device frame on desktop */}
      <div className="relative w-full max-w-md min-h-screen bg-slate-50 shadow-2xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto pb-24" style={{ scrollbarWidth: 'none' }}>
          {children}
        </div>
        <BottomNav />
      </div>
    </div>
  );
}
