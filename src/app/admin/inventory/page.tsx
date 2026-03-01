'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
// Tambahkan MapPin ke import
import { Package, Edit2, Save, Search, User, Clock, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';

export default function AdminInventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'available' | 'reserved'>('available');

  // State untuk edit stok manual
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');

  // ─── 1. FETCH DATA REALTIME ───
  useEffect(() => {
    setItems([]);

    const q = query(collection(db, 'logistic_offers'), where('status', '==', activeTab));

    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsub();
  }, [activeTab]);

  // ─── 2. ACTION: UPDATE STOK ───
  const handleUpdateStock = async (id: string) => {
    try {
      await updateDoc(doc(db, 'logistic_offers', id), { qty: editQty });
      toast.success('Stok diupdate');
      setEditingId(null);
    } catch (e) {
      toast.error('Gagal update');
    }
  };

  // ─── 3. ACTION: FORCE RELEASE ───
  const handleForceRelease = async (item: any) => {
    if (!confirm(`⚠️ Paksa ambil alih "${item.item}" dari booking online?\n\nBarang akan ditandai sudah diambil oleh warga di lokasi (Walk-in).`)) return;

    try {
      await updateDoc(doc(db, 'logistic_offers', item.id), {
        status: 'distributed',
        reservedBy: null,
        deadlineAt: null,
        distributedBy: 'Admin (Force Release)',
        distributedAt: serverTimestamp(),
        claimedBy: {
          uid: 'manual_override',
          name: 'Warga di Lokasi (Walk-in)',
          note: `Diambil alih dari booking ${item.reservedBy?.name}`,
        },
      });
      toast.success('Override Berhasil! Barang diserahkan ke warga lokasi.');
    } catch (e) {
      console.error(e);
      toast.error('Gagal melakukan override');
    }
  };

  const filtered = items.filter((i) => i.item.toLowerCase().includes(search.toLowerCase()) || (i.reservedBy?.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📦 Manajemen Gudang</h1>
          <p className="text-sm text-slate-500">Pantau stok fisik & booking online.</p>
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Cari barang / pemesan..." className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* ─── TABS ─── */}
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'available' ? 'bg-green-50 text-green-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <CheckCircle size={16} /> Stok Tersedia
        </button>
        <button
          onClick={() => setActiveTab('reserved')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'reserved' ? 'bg-yellow-50 text-yellow-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Clock size={16} /> Sedang Di-Booking
        </button>
      </div>

      {/* ─── TAB CONTENT: AVAILABLE ─── */}
      {activeTab === 'available' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 border-b">
              <tr>
                <th className="p-4">Nama Barang</th>
                <th className="p-4">Kategori</th>
                <th className="p-4">Stok Fisik</th>
                {/* KOLOM BARU: ALAMAT POSKO */}
                <th className="p-4">Alamat Posko</th>
                <th className="p-4 text-right">Edit Stok</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    Gudang kosong.
                  </td>
                </tr>
              )}
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-4 font-medium text-slate-800 flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                      <Package size={16} />
                    </div>
                    {item.item}
                  </td>
                  <td className="p-4 text-slate-500">{item.category || 'Umum'}</td>

                  {/* Kolom Stok Fisik */}
                  <td className="p-4">
                    {editingId === item.id ? (
                      <input autoFocus className="border rounded px-2 py-1 w-24 outline-none ring-2 ring-blue-500" value={editQty} onChange={(e) => setEditQty(e.target.value)} />
                    ) : (
                      <span className="font-bold text-slate-700">{item.qty}</span>
                    )}
                  </td>

                  {/* KOLOM BARU: DISPLAY ALAMAT */}
                  <td className="p-4 text-slate-600 text-xs">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-red-500 flex-shrink-0" />
                      <span className="line-clamp-1 max-w-[200px]">
                        {/* Handle jika location berupa object atau string */}
                        {typeof item.location === 'object' ? item.location.name : item.location || '-'}
                      </span>
                    </div>
                  </td>

                  <td className="p-4 text-right">
                    {editingId === item.id ? (
                      <button onClick={() => handleUpdateStock(item.id)} className="text-green-600 hover:bg-green-50 p-2 rounded-lg">
                        <Save size={18} />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(item.id);
                          setEditQty(item.qty);
                        }}
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg"
                      >
                        <Edit2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TAB CONTENT: RESERVED (BOOKED) ─── */}
      {activeTab === 'reserved' && (
        <div className="grid grid-cols-1 gap-4">
          {filtered.length === 0 && <div className="p-10 text-center bg-white border border-dashed border-slate-300 rounded-xl text-slate-400">Tidak ada booking aktif saat ini.</div>}

          {filtered.map((item) => (
            <div key={item.id} className="bg-white rounded-xl p-4 border border-yellow-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-yellow-400" />

              <div className="flex gap-4 items-center flex-1">
                <div className="w-12 h-12 bg-yellow-50 rounded-full flex items-center justify-center text-yellow-600 flex-shrink-0">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{item.item}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                    <p className="flex items-center gap-1">
                      <Package size={12} /> Jumlah: <span className="font-bold text-slate-700">{item.qty}</span>
                    </p>
                    <p className="flex items-center gap-1">
                      <User size={12} /> Pemesan: <span className="font-bold text-slate-700">{item.reservedBy?.name || 'Anonim'}</span>
                    </p>

                    {/* Tampilkan Lokasi juga di card booking agar admin tau posisi */}
                    <p className="flex items-center gap-1 text-slate-600">
                      <MapPin size={12} className="text-red-500" />
                      {typeof item.location === 'object' ? item.location.name : item.location || '-'}
                    </p>

                    <p className="text-red-500 font-medium ml-auto md:ml-0">Batas Waktu: {item.deadlineAt ? new Date(item.deadlineAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</p>
                  </div>
                </div>
              </div>

              <div className="w-full md:w-auto">
                <button
                  onClick={() => handleForceRelease(item)}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-700 shadow-md shadow-red-100 transition-all active:scale-95"
                >
                  <AlertTriangle size={14} />
                  Ambil Alih (Force Release)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
