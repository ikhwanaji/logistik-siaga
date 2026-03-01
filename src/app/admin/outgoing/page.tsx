'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Loader2, Search, CheckCircle, Package, User, Clock, Calendar, QrCode } from 'lucide-react';

export default function AdminOutgoingPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 1. Fetch Data: Hanya ambil yang statusnya 'reserved' (Sedang di-booking user)
  const fetchBookedItems = async () => {
    setLoading(true);
    try {
      // Query barang yang "Sedang dibooking warga"
      const q = query(collection(db, 'logistic_offers'), where('status', '==', 'reserved'), orderBy('reservedAt', 'desc'));

      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(data);
    } catch (error) {
      console.error(error);
      toast.error('Gagal memuat daftar booking.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookedItems();
  }, []);

  // 2. Handler: Serah Terima Barang (Finalisasi)
  const handleHandover = async (item: any) => {
    if (!confirm(`Konfirmasi serah terima ${item.qty} ${item.item} kepada ${item.reservedBy?.name}?`)) return;

    setProcessingId(item.id);
    try {
      const itemRef = doc(db, 'logistic_offers', item.id);

      await updateDoc(itemRef, {
        status: 'distributed', // Status Final: Barang sudah keluar fisik
        distributedAt: serverTimestamp(),
        distributedBy: 'Admin Jaga', // Bisa diganti currentUser.displayName
        // Hapus deadline agar tidak kena auto-cancel
        deadlineAt: null,
      });

      toast.success('Barang berhasil diserahkan! Stok terupdate.');

      // Hapus dari list view
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (error) {
      console.error(error);
      toast.error('Gagal memproses serah terima.');
    } finally {
      setProcessingId(null);
    }
  };

  // Filter pencarian berdasarkan ID Transaksi atau Nama User
  const filteredItems = items.filter((item) => item.id.toLowerCase().includes(searchTerm.toLowerCase()) || item.reservedBy?.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Barang Keluar (Outgoing)</h1>
          <p className="text-sm text-slate-500">Validasi pengambilan barang & serah terima logistik.</p>
        </div>

        {/* Search Bar (Simulasi Scan QR) */}
        <div className="relative w-full md:w-80">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Cari Kode Transaksi / Nama..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <div className="text-blue-500 font-bold text-2xl">{items.length}</div>
          <div className="text-xs text-blue-700 font-medium">Antrian Pengambilan</div>
        </div>
        {/* Tambahkan stat lain jika perlu */}
      </div>

      {/* List Barang */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredItems.length === 0 && (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-slate-200">
              <Package size={40} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-500 text-sm">Tidak ada antrian pengambilan barang saat ini.</p>
            </div>
          )}

          {filteredItems.map((item) => (
            <div key={item.id} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              {/* Info Barang & User */}
              <div className="flex gap-4 items-start flex-1">
                <div className="w-14 h-14 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 text-slate-500">
                  <Package size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-slate-200">#{item.id.slice(0, 6).toUpperCase()}</span>
                    <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-200 flex items-center gap-1">
                      <Clock size={10} /> Menunggu Pick-up
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-800">
                    {item.item} ({item.qty})
                  </h3>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <User size={12} />
                      Pemesan: <span className="font-semibold text-slate-700">{item.reservedBy?.name || 'Warga'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      Deadline: {item.deadlineAt ? new Date(item.deadlineAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="w-full md:w-auto flex justify-end">
                <button
                  onClick={() => handleHandover(item)}
                  disabled={!!processingId}
                  className="bg-green-600 text-white px-5 py-3 rounded-xl text-sm font-bold shadow-lg shadow-green-100 hover:bg-green-700 active:scale-95 transition-all flex items-center gap-2 w-full md:w-auto justify-center"
                >
                  {processingId === item.id ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <QrCode size={18} />
                      Verifikasi & Serahkan
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
