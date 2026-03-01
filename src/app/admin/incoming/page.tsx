'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Loader2, CheckCircle, Package, Truck, User, Search, Calendar, QrCode, Check } from 'lucide-react';

export default function AdminIncomingPage() {
  const [incomingItems, setIncomingItems] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // State untuk loading spesifik per item
  const [processingId, setProcessingId] = useState<string | null>(null);
  // State untuk menandai item yang SUDAH selesai diproses (agar tombol mati)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  // 1. LISTENER REALTIME
  useEffect(() => {
    const q = query(collection(db, 'logistic_offers'), where('status', '==', 'pending_delivery'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setIncomingItems(items);
    });

    return () => unsubscribe();
  }, []);

  // 2. ACTION: TERIMA BARANG
  const handleReceiveItem = async (item: any) => {
    // Prevent double click
    if (processingId === item.id || completedIds.has(item.id)) return;

    const confirmMsg = item.deliveryMethod === 'self' ? `Konfirmasi penerimaan barang dari ${item.donor.name}?` : `Konfirmasi paket kurir dengan ID #${item.id.slice(0, 6)} diterima?`;

    if (!confirm(confirmMsg)) return;

    setProcessingId(item.id);

    try {
      // A. Update status jadi 'available'
      const itemRef = doc(db, 'logistic_offers', item.id);
      await updateDoc(itemRef, {
        status: 'available',
        receivedAt: serverTimestamp(),
        receivedBy: 'Admin Jaga', // Di real app ambil dari auth session
      });

      // B. CAIRKAN POIN USER
      if (item.donor?.uid) {
        const userRef = doc(db, 'users', item.donor.uid);
        await updateDoc(userRef, {
          points: increment(50),
          donationsCount: increment(1),
        });
      }

      toast.success('Barang diterima! Poin user cair.');

      // C. Tandai selesai secara lokal agar tombol mati instan
      setCompletedIds((prev) => new Set(prev).add(item.id));
    } catch (error) {
      console.error(error);
      toast.error('Gagal update data');
    } finally {
      setProcessingId(null);
    }
  };

  // Filter Search
  const filteredItems = incomingItems.filter(
    (item) => item.item.toLowerCase().includes(searchTerm.toLowerCase()) || item.donor.name.toLowerCase().includes(searchTerm.toLowerCase()) || item.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleQualityCheck = async (item: any, isGood: boolean) => {
    if (!confirm(isGood ? 'Terima barang ini (Layak)?' : 'Tolak barang ini (Rusak/Tidak Sesuai)?')) return;

    setProcessingId(item.id);
    try {
      const itemRef = doc(db, 'logistic_offers', item.id);

      if (isGood) {
        // ✅ SKENARIO 1: BARANG BAGUS
        await updateDoc(itemRef, {
          status: 'available', // Masuk stok
          receivedAt: serverTimestamp(),
          qualityCheck: 'passed',
          receivedBy: 'Admin Jaga',
        });

        // Cairkan Poin HANYA jika barang bagus
        if (item.donor?.uid) {
          const userRef = doc(db, 'users', item.donor.uid);
          await updateDoc(userRef, {
            points: increment(50),
            donationsCount: increment(1),
          });
        }
        toast.success('Barang Diterima (Layak). Poin dicairkan.');
      } else {
        // ⚠️ SKENARIO 2: BARANG RUSAK/BASI
        await updateDoc(itemRef, {
          status: 'rejected', // Buang dari list / Masuk log sampah
          receivedAt: serverTimestamp(),
          qualityCheck: 'failed',
          rejectReason: 'Kualitas buruk/Rusak saat pengiriman', // Bisa dibuat inputan
          receivedBy: 'Admin Jaga',
        });

        // JANGAN tambah poin user. Kirim notifikasi teguran (opsional).
        toast.error('Barang Ditolak (Rusak). Poin ditahan.');
      }
    } catch (error) {
      toast.error('Gagal update data');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">📦 Barang Masuk (Incoming)</h1>
          <p className="text-sm text-slate-500">Verifikasi barang dari donatur untuk mencairkan poin.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm font-mono text-sm border border-slate-200">
          Pending: <span className="font-bold text-red-600">{incomingItems.length}</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm flex gap-3 border border-slate-100">
        <Search className="text-slate-400" />
        <input type="text" placeholder="Scan QR atau ketik ID Transaksi / Nama Donatur..." className="flex-1 outline-none text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} autoFocus />
      </div>

      {/* Table List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="p-4 font-semibold">Barang</th>
              <th className="p-4 font-semibold">Donatur</th>
              <th className="p-4 font-semibold">Metode & Jadwal</th>
              <th className="p-4 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.map((item) => {
              const isProcessing = processingId === item.id;
              const isCompleted = completedIds.has(item.id);

              return (
                <tr key={item.id} className={`transition-colors ${isCompleted ? 'bg-green-50/50' : 'hover:bg-slate-50'}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                        <Package size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{item.item}</p>
                        <p className="text-xs text-slate-500">{item.qty}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <QrCode size={12} className="text-slate-400" />
                          <p className="text-[10px] text-slate-400 font-mono font-bold bg-slate-100 px-1 rounded">#{item.id.slice(0, 6).toUpperCase()}</p>
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.donor.avatar || `https://ui-avatars.com/api/?name=${item.donor.name}`} className="w-6 h-6 rounded-full" alt="" />
                      <span className="font-medium text-slate-700">{item.donor.name}</span>
                    </div>
                  </td>

                  <td className="p-4">
                    <div className="space-y-1">
                      {item.deliveryMethod === 'courier' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-bold">
                          <Truck size={10} /> Kurir
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                          <User size={10} /> Antar Sendiri
                        </span>
                      )}
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar size={12} />
                        {item.deliveryDate ? new Date(item.deliveryDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' }) : '-'}
                      </div>
                    </div>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleQualityCheck(item, false)}
                        disabled={processingId === item.id}
                        className="bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                      >
                        ⚠️ Rusak/Basi
                      </button>
                      <button
                        onClick={() => handleQualityCheck(item, true)}
                        disabled={processingId === item.id}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-green-700 shadow-md shadow-green-200 transition-colors flex items-center gap-2"
                      >
                        <CheckCircle size={14} /> Terima & Layak
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={4} className="p-12 text-center text-slate-400">
                  <Package size={48} className="mx-auto mb-3 opacity-20" />
                  <p>Tidak ada barang masuk yang sesuai pencarian.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
