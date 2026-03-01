'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { signOut } from '@/lib/authService';
import { LayoutDashboard, FileText, Package, Users, LogOut, ShieldCheck, Map } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, isLoadingAuth } = useAppStore();
  const router = useRouter();
  const pathname = usePathname();

  // 1. Proteksi Route: Hanya Admin
  useEffect(() => {
    if (!isLoadingAuth) {
      if (!currentUser || currentUser.role !== 'admin') {
        router.replace('/home'); // Tendang user biasa
      }
    }
  }, [currentUser, isLoadingAuth, router]);

  if (isLoadingAuth) return <div className="h-screen flex items-center justify-center">Loading Admin...</div>;

  const menuItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/reports', label: 'Verifikasi Laporan', icon: FileText },
    { href: '/admin/incoming', label: 'Barang Masuk', icon: Package },
    { href: '/admin/outgoing', label: 'Barang Keluar', icon: Package },
    { href: '/admin/inventory', label: 'Gudang & Stok', icon: Package }, // 👈 Menu Baru
    { href: '/admin/users', label: 'Relawan & KYC', icon: Users },
  ];

  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white fixed h-full hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="font-black text-xl tracking-tight">
            Siaga<span className="text-red-500">Admin</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Control Tower v1.0</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <item.icon size={18} />
                <span className="text-sm font-bold">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => {
              signOut();
              router.push('/login');
            }}
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 w-full transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-bold">Keluar</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-8">{children}</main>
    </div>
  );
}
