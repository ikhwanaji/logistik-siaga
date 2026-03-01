'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { updateReportLogistics } from '@/lib/reportsService';
import { toast } from 'sonner';

interface EditNeedsModalProps {
  report: any; // Data laporan yang sedang diedit
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditNeedsModal({ report, onClose, onSuccess }: EditNeedsModalProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<{ name: string; target: number }[]>([]);
  const [newItemName, setNewItemName] = useState('');

  // 1. Inisialisasi Data saat Modal Dibuka
  useEffect(() => {
    if (report) {
      // Gabungkan data 'needs' (array string) dengan 'needsTargets' (object angka)
      const defaultTarget = report.severity === 'kritis' ? 100 : report.severity === 'waspada' ? 50 : 30;

      const mappedItems = (report.needs || []).map((name: string) => ({
        name,
        target: report.needsTargets?.[name] || defaultTarget,
      }));

      setItems(mappedItems);
    }
  }, [report]);

  // 2. Handler: Tambah Item Baru
  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    if (items.some((i) => i.name.toLowerCase() === newItemName.toLowerCase())) {
      toast.error('Barang sudah ada di list');
      return;
    }

    setItems([...items, { name: newItemName, target: 50 }]);
    setNewItemName('');
  };

  // 3. Handler: Hapus Item
  const handleDeleteItem = (index: number) => {
    if (confirm('Hapus kebutuhan ini?')) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  // 4. Handler: Ubah Target Angka
  const handleTargetChange = (index: number, val: string) => {
    const newItems = [...items];
    newItems[index].target = parseInt(val) || 0;
    setItems(newItems);
  };

  // 5. Handler: Ubah Nama Barang (FITUR BARU) ✅
  const handleNameChange = (index: number, val: string) => {
    const newItems = [...items];
    newItems[index].name = val;
    setItems(newItems);
  };

  // 6. Submit ke Database
  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Filter nama kosong agar tidak error
      const validItems = items.filter((i) => i.name.trim() !== '');

      const needsArray = validItems.map((i) => i.name);
      const needsTargetsObj = validItems.reduce(
        (acc, curr) => {
          acc[curr.name] = curr.target;
          return acc;
        },
        {} as Record<string, number>,
      );

      await updateReportLogistics(report.id, {
        needs: needsArray,
        needsTargets: needsTargetsObj,
      });

      toast.success('Kebutuhan Logistik Diperbarui! 🎯');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error('Gagal menyimpan perubahan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="font-bold text-slate-800">Revisi Kebutuhan</h3>
            <p className="text-xs text-slate-500">Sesuaikan target dengan kondisi lapangan.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* List Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.map((item, idx) => (
            <div key={idx} className="flex gap-3 items-center">
              {/* Nama Barang (Sekarang Editable) ✅ */}
              <div className="flex-1">
                <p className="text-xs font-bold text-slate-500 mb-1 uppercase">Nama Barang</p>
                <input
                  value={item.name}
                  onChange={(e) => handleNameChange(idx, e.target.value)}
                  className="w-full bg-white border-2 border-slate-200 focus:border-blue-500 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none transition-colors"
                />
              </div>

              {/* Target (Editable) */}
              <div className="w-24">
                <p className="text-xs font-bold text-slate-500 mb-1 uppercase text-center">Target</p>
                <input
                  type="number"
                  min="1"
                  value={item.target}
                  onChange={(e) => handleTargetChange(idx, e.target.value)}
                  className="w-full bg-white border-2 border-slate-200 focus:border-blue-500 rounded-lg px-2 py-2 text-sm font-bold text-center text-slate-800 outline-none transition-colors"
                />
              </div>

              {/* Delete Button */}
              <div className="pt-5">
                <button onClick={() => handleDeleteItem(idx)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {items.length === 0 && <div className="text-center py-8 text-slate-400 text-sm border-2 border-dashed border-slate-100 rounded-xl">Belum ada item kebutuhan. Tambahkan di bawah.</div>}
        </div>

        {/* Footer: Add Item & Save */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 space-y-4">
          {/* Form Tambah Baru */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Contoh: Susu Bayi, Tenda..."
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
              className="flex-1 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={handleAddItem} disabled={!newItemName} className="bg-slate-800 text-white px-4 rounded-xl hover:bg-slate-900 disabled:opacity-50 transition-colors">
              <Plus size={20} />
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Save size={18} /> Simpan Perubahan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
