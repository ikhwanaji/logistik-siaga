'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icons } from '@/components/ui/custom-icons';

export default function BottomNav() {
  const pathname = usePathname();

  // Mapping path ke ID tab
  const getActiveTab = (path: string) => {
    if (path.includes('/home')) return 'home';
    if (path.includes('/report')) return 'report';
    if (path.includes('/needs')) return 'needs';
    if (path.includes('/profile')) return 'profile';
    return 'home';
  };

  const activePage = getActiveTab(pathname);

  const tabs = [
    { id: 'home', label: 'Beranda', Icon: Icons.Home, href: '/home' },
    { id: 'report', label: 'Laporan', Icon: Icons.AlertTriangle, href: '/report' },
    { id: 'needs', label: 'Logistik', Icon: Icons.Package, href: '/needs' },
    { id: 'profile', label: 'Profil', Icon: Icons.User, href: '/profile' },
  ];

  return (
    <nav style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)' }} className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md border-t border-slate-100 z-50 px-2 pb-safe">
      <div className="flex items-center justify-around">
        {tabs.map(({ id, label, Icon: TabIcon, href }) => {
          const active = activePage === id;
          const isReport = id === 'report';
          return (
            <Link key={id} href={href} className={`relative flex flex-col items-center gap-1 py-2 px-3 min-h-[56px] justify-center transition-all duration-200`}>
              {isReport ? (
                <span className={`w-14 h-14 -mt-7 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${active ? 'bg-red-600 scale-110' : 'bg-red-500'}`}>
                  <span className="text-white">
                    <TabIcon />
                  </span>
                </span>
              ) : (
                <>
                  <span className={`transition-colors duration-200 ${active ? 'text-red-500' : 'text-slate-400'}`}>
                    <TabIcon />
                  </span>
                  <span className={`text-[10px] font-semibold transition-colors duration-200 ${active ? 'text-red-500' : 'text-slate-400'}`}>{label}</span>
                  {active && <span className="absolute bottom-1.5 w-1 h-1 bg-red-500 rounded-full" />}
                </>
              )}
              {isReport && <span className={`mt-1 text-[10px] font-semibold transition-colors duration-200 ${active ? 'text-red-500' : 'text-slate-400'}`}>{label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
