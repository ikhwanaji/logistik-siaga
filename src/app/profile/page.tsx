'use client';
import { USER } from '@/lib/data';
import { Icons } from '@/components/ui/custom-icons';
import { useAppStore } from '@/lib/store';

export default function ProfilePage() {
  const { user, donatedItems } = useAppStore();
  const stats = [
    { label: 'Laporan', value: '14', icon: '📋' },
    { label: 'Donasi', value: Object.keys(donatedItems).length.toString(), icon: '❤️' },
    { label: 'Poin', value: user.points.toLocaleString(), icon: '⭐' },
  ];
  const badges = [
    { icon: '🦸', label: 'Relawan Aktif' },
    { icon: '🌟', label: 'Top Donor' },
    { icon: '📡', label: 'Reporter' },
    { icon: '🏆', label: 'Siaga Hero' },
  ];
  const menus = [
    { icon: '📋', label: 'Riwayat Laporan', badge: '14' },
    { icon: '❤️', label: 'Riwayat Donasi', badge: '8' },
    { icon: '🔔', label: 'Pengaturan Notifikasi' },
    { icon: '📍', label: 'Area Pantauan Saya' },
    { icon: '🛡️', label: 'Verifikasi Identitas', badge: '⚠️' },
    { icon: '❓', label: 'Bantuan & Dukungan' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-red-500 to-red-700 px-5 pt-12 pb-16 relative">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-12 translate-x-12" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-white text-xl font-black border-2 border-white/30">{USER.avatar}</div>
          <div className="text-white">
            <h2 className="text-lg font-black">{USER.name}</h2>
            <p className="text-xs opacity-80">Relawan Terverifikasi ✅</p>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-yellow-300 text-xs">⭐</span>
              <span className="text-xs font-bold">{USER.points.toLocaleString()} poin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overlap Card */}
      <div className="px-4 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-md p-4 grid grid-cols-3 divide-x divide-slate-100">
          {stats.map(({ label, value, icon }) => (
            <div key={label} className="text-center px-2">
              <div className="text-xl">{icon}</div>
              <div className="text-lg font-black text-slate-800">{value}</div>
              <div className="text-[10px] text-slate-400 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Badges */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">🏆 Lencana Saya</h3>
          <div className="grid grid-cols-4 gap-2">
            {badges.map(({ icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1">
                <div className="w-12 h-12 bg-yellow-50 rounded-xl flex items-center justify-center text-2xl border border-yellow-100">{icon}</div>
                <span className="text-[9px] text-slate-500 text-center font-medium leading-tight">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Menu */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {menus.map(({ icon, label, badge }, i) => (
            <button key={label} className={`w-full flex items-center px-4 py-4 min-h-[56px] hover:bg-slate-50 transition-colors ${i < menus.length - 1 ? 'border-b border-slate-50' : ''}`}>
              <span className="text-lg w-8">{icon}</span>
              <span className="flex-1 text-left text-sm font-medium text-slate-700">{label}</span>
              {badge && <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${badge === '⚠️' ? 'text-orange-600 bg-orange-100' : 'bg-red-100 text-red-600'}`}>{badge}</span>}
              <span className="text-slate-300">
                <Icons.ChevronRight />
              </span>
            </button>
          ))}
        </div>

        <button className="w-full bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl text-sm min-h-[56px]">Keluar dari Akun</button>
      </div>
    </div>
  );
}
