'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseUpload } from '@/hooks/useFirebaseUpload';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAppStore } from '@/store/useAppStore';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { ArrowLeft, Camera, MapPin, Loader2, Package, CheckCircle, Navigation, Info } from 'lucide-react';

export default function CreateOfferPage() {
  const router = useRouter();
  const { currentUser } = useAppStore();

  // Hooks
  const { upload, isUploading, downloadUrl } = useFirebaseUpload();
  const { location, isLoading: isLocating, getCurrentLocation } = useGeolocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    itemName: '',
    category: 'Pangan', // Default
    quantity: '',
    unit: 'Pcs',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // Proteksi Halaman: Redirect jika belum login
  useEffect(() => {
    // Kita beri sedikit delay agar state currentUser sempat terisi dari local storage/firebase
    const timer = setTimeout(() => {
      if (!currentUser) router.push('/login');
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentUser, router]);

  // Handler Upload Gambar
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview Lokal Instant
    setPreviewImg(URL.createObjectURL(file));

    // Upload ke Cloud
    try {
      await upload(file);
    } catch (err) {
      toast.error('Gagal upload gambar');
      setPreviewImg(null);
    }
  };

  // Handler Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadUrl) return toast.error('Mohon sertakan foto barang');
    if (!location) return toast.error('Mohon sertakan lokasi penjemputan');

    setIsSubmitting(true);

    try {
      // Simpan ke Firestore: collection 'logistic_offers'
      await addDoc(collection(db, 'logistic_offers'), {
        item: formData.itemName,
        category: formData.category,
        qty: `${formData.quantity} ${formData.unit}`,
        description: formData.description,
        imageUrl: downloadUrl,
        location: location, // { lat, lng, name }
        donor: {
          uid: currentUser?.uid,
          name: currentUser?.displayName,
          avatar: currentUser?.photoURL,
        },
        status: 'available', // available | claimed | distributed
        createdAt: serverTimestamp(),
      });

      toast.success('Penawaran Berhasil Dibuat!', {
        description: 'Relawan akan segera melihat tawaran Anda.',
      });

      router.push('/needs'); // Kembali ke marketplace
    } catch (error) {
      console.error(error);
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-slate-50">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="text-lg font-bold text-slate-800">Buat Penawaran Donasi</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-6">
        {/* 1. Upload Foto Barang */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Foto Barang</label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="relative aspect-video rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer overflow-hidden hover:bg-slate-200 transition-colors"
          >
            {previewImg ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewImg} alt="Preview" className="w-full h-full object-cover" />
                {isUploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="animate-spin text-white" />
                  </div>
                )}
                {!isUploading && (
                  <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle size={10} /> Terupload
                  </div>
                )}
              </>
            ) : (
              <div className="text-slate-400 flex flex-col items-center gap-2">
                <Camera size={32} />
                <span className="text-xs font-medium">Tap untuk upload foto</span>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>

        {/* 2. Detail Barang */}
        <div className="space-y-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Nama Barang</label>
            <input
              required
              type="text"
              placeholder="Contoh: Beras Premium, Selimut Wool"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={formData.itemName}
              onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Jumlah</label>
              <input
                required
                type="number"
                placeholder="10"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
            <div className="w-1/3">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Satuan</label>
              <select
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              >
                <option>Pcs</option>
                <option>Dus</option>
                <option>Kg</option>
                <option>Liter</option>
                <option>Paket</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Kategori</label>
            <div className="flex gap-2 flex-wrap">
              {['Pangan', 'Sandang', 'Obat', 'Bayi', 'Lainnya'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFormData({ ...formData, category: cat })}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${formData.category === cat ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Deskripsi Singkat</label>
            <textarea
              rows={2}
              placeholder="Kondisi barang, kadaluarsa (jika makanan), dll..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>

        {/* 3. Lokasi Penjemputan */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">Lokasi Penjemputan</label>
            {isLocating && <Loader2 size={14} className="animate-spin text-blue-500" />}
          </div>

          <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-500 shadow-sm flex-shrink-0">
              <MapPin size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{location?.name || 'Belum ada lokasi'}</p>
              <p className="text-[10px] text-slate-400 truncate">{location ? `${location.lat}, ${location.lng}` : 'Tap tombol di kanan untuk set lokasi'}</p>
            </div>
            <button type="button" onClick={getCurrentLocation} disabled={isLocating} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50">
              <Navigation size={18} />
            </button>
          </div>
          <div className="flex gap-2 text-[10px] text-slate-400 items-start bg-yellow-50 p-2 rounded-lg text-yellow-700">
            <Info size={14} className="flex-shrink-0 mt-0.5" />
            <p>Pastikan lokasi akurat agar relawan mudah menjemput barang.</p>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || isUploading || !downloadUrl || !location}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl text-sm shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Menyimpan...
            </>
          ) : (
            <>
              <Package size={18} /> Terbitkan Penawaran
            </>
          )}
        </button>
      </form>
    </div>
  );
}
