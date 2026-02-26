'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Home, AlertTriangle, Package, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BottomNav() {
  const pathname = usePathname();

  // Helper: Cek active state
  // Menangani edge case jika root '/' diarahkan ke home
  const isActive = (path: string) => {
    if (path === '/home' && pathname === '/') return true;
    return pathname.startsWith(path);
  };

  const tabs = [
    {
      id: 'home',
      label: 'Beranda',
      href: '/home',
      icon: Home,
      variant: 'standard', // Menu biasa
    },
    {
      id: 'report',
      label: 'Laporan',
      href: '/report',
      icon: AlertTriangle,
      variant: 'special', // Menu Spesial (Floating)
    },
    {
      id: 'needs',
      label: 'Logistik',
      href: '/needs',
      icon: Package,
      variant: 'standard',
    },
    {
      id: 'profile',
      label: 'Profil',
      href: '/profile',
      icon: User,
      variant: 'standard',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 px-6 pb-safe pointer-events-none">
      {/* Background Bar */}
      <div className="absolute inset-x-0 bottom-0 h-[80px] bg-white/95 backdrop-blur-xl border-t border-slate-200 pointer-events-auto shadow-[0_-4px_20px_rgba(0,0,0,0.05)]" />

      <div className="relative flex items-center justify-between h-[80px] pointer-events-auto">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;

          // ─── LOGIKA 1: TOMBOL SPESIAL (LAPORAN) ───
          // Tombol ini SELALU floating (-top-6), tapi warnanya berubah sesuai state.
          if (tab.variant === 'special') {
            return (
              <div key={tab.id} className="relative -top-6 flex flex-col items-center justify-center w-16">
                <Link href={tab.href}>
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    className={cn(
                      'w-16 h-16 rounded-full flex items-center justify-center border-4 border-slate-50 transition-all duration-300 shadow-lg',
                      active
                        ? 'bg-red-600 shadow-red-200' // Aktif: Merah Solid
                        : 'bg-white shadow-slate-200', // Inaktif: Putih
                    )}
                  >
                    <Icon
                      size={28}
                      className={cn('transition-colors duration-300', active ? 'text-white' : 'text-red-600')}
                      // Isi icon solid saat aktif, outline saat inaktif
                      fill={active ? 'currentColor' : 'none'}
                    />
                  </motion.div>
                </Link>
                <span className={cn('text-[10px] font-bold mt-1 transition-colors duration-300', active ? 'text-red-600' : 'text-slate-400')}>{tab.label}</span>
              </div>
            );
          }

          // ─── LOGIKA 2: TOMBOL STANDAR (BERANDA, LOGISTIK, PROFIL) ───
          // Tombol ini tidak pernah floating. Hanya main warna & background halus.
          return (
            <Link key={tab.id} href={tab.href} className="relative flex flex-col items-center justify-center w-16 h-full gap-1 active:scale-95 transition-transform">
              {/* Icon Container */}
              <div className={cn('p-1.5 rounded-2xl transition-all duration-300 relative', active ? 'bg-red-50 text-red-600' : 'bg-transparent text-slate-400 hover:text-slate-600')}>
                {/* Indikator Titik Kecil (Opsional, style modern) */}
                {active && <motion.div layoutId="active-dot" className="absolute -top-1 right-0 w-2 h-2 bg-red-600 rounded-full border-2 border-white" />}

                <Icon
                  size={24}
                  strokeWidth={active ? 2.5 : 2} // Icon lebih tebal saat aktif
                  className="transition-all"
                />
              </div>

              {/* Label */}
              <span className={cn('text-[10px] font-medium transition-colors duration-300', active ? 'text-red-600 font-bold' : 'text-slate-400')}>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
