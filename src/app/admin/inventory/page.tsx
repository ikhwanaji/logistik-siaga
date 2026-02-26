'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Package, Edit2, Save, Search } from 'lucide-react';

export default function AdminInventoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');

  // Realtime Inventory (Hanya yang status 'available')
  useEffect(() => {
    const q = query(collection(db, 'logistic_offers'), where('status', '==', 'available'));
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleUpdateStock = async (id: string) => {
    try {
      await updateDoc(doc(db, 'logistic_offers', id), { qty: editQty }); // Simplifikasi, aslinya parse string unit
      toast.success('Stok diupdate');
      setEditingId(null);
    } catch (e) {
      toast.error('Gagal update');
    }
  };

  const filtered = items.filter(i => i.item.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">📦 Stok Gudang Posko</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" placeholder="Cari barang..." 
            className="pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 border-b">
            <tr>
              <th className="p-4">Nama Barang</th>
              <th className="p-4">Kategori</th>
              <th className="p-4">Jumlah Fisik</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-800 flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                    <Package size={16} />
                  </div>
                  {item.item}
                </td>
                <td className="p-4 text-slate-500">{item.category || 'Umum'}</td>
                <td className="p-4">
                  {editingId === item.id ? (
                    <input 
                      autoFocus
                      className="border rounded px-2 py-1 w-24"
                      value={editQty}
                      onChange={e => setEditQty(e.target.value)}
                    />
                  ) : (
                    <span className="font-bold text-slate-700">{item.qty}</span>
                  )}
                </td>
                <td className="p-4 text-right">
                  {editingId === item.id ? (
                    <button onClick={() => handleUpdateStock(item.id)} className="text-green-600 hover:bg-green-50 p-2 rounded-lg">
                      <Save size={18} />
                    </button>
                  ) : (
                    <button onClick={() => { setEditingId(item.id); setEditQty(item.qty); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg">
                      <Edit2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}