'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseUpload } from '@/hooks/useFirebaseUpload';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useAppStore } from '@/store/useAppStore';
import { addDoc, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore'; // Import query
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { analyzeDonationImage } from '@/app/actions/analyzeItem';
import { ArrowLeft, Camera, MapPin, Loader2, Package, Navigation, Sparkles, CheckCircle, AlertTriangle, Info, Truck, User, Tent } from 'lucide-react';

export default function CreateOfferPage() {
  const router = useRouter();
  const { currentUser } = useAppStore();

  // Hooks
  const { upload, isUploading, downloadUrl } = useFirebaseUpload();
  const { location, isLoading: isLocating, getCurrentLocation } = useGeolocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State Data Bencana Aktif
  const [activeReports, setActiveReports] = useState<any[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string>('');

  // Form State
  const [formData, setFormData] = useState({
    itemName: '',
    category: 'Pangan',
    quantity: '',
    unit: 'Pcs',
    description: '',
  });

  const [deliveryMethod, setDeliveryMethod] = useState<'dropoff' | 'pickup'>('dropoff');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImg, setPreviewImg] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<{ isValid: boolean; reason: string; category?: string } | null>(null);

  // 1. Fetch Bencana Aktif saat Load Page
  useEffect(() => {
    const fetchActiveReports = async () => {
      try {
        const q = query(collection(db, 'reports'), where('status', '==', 'verified'));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setActiveReports(data);
      } catch (error) {
        console.error('Gagal load bencana', error);
      }
    };

    fetchActiveReports();
  }, []);

  // Proteksi Halaman
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!currentUser) router.push('/login');
    }, 1000);
    return () => clearTimeout(timer);
  }, [currentUser, router]);

  // Handler Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Set Preview
    setPreviewImg(URL.createObjectURL(file));
    setAiResult(null); 
    setIsAnalyzing(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        const analysis = await analyzeDonationImage(base64data);

        setAiResult(analysis);
        setIsAnalyzing(false);

        if (analysis.isValid) {
          toast.success('Foto terverifikasi AI ✅');
          await upload(file);

          if (analysis.category && ['Pangan', 'Sandang', 'Obat', 'Bayi', 'Lainnya'].includes(analysis.category)) {
            setFormData((prev) => ({ ...prev, category: analysis.category! }));
          }
        } else {
          toast.error('Foto ditolak AI: ' + analysis.reason);
        }
      };
    } catch (err) {
      toast.error('Gagal memproses gambar');
      setIsAnalyzing(false);
    }
  };

  const selectedReportData = activeReports.find((r) => r.id === selectedReportId);

  // Handler Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!downloadUrl) return toast.error('Mohon sertakan foto barang');

    if (deliveryMethod === 'dropoff' && !selectedReportId) {
      return toast.error('Mohon pilih tujuan bencana untuk mendapatkan alamat posko.');
    }

    if (deliveryMethod === 'pickup' && !location) {
      return toast.error('Untuk penjemputan, mohon aktifkan lokasi GPS Anda.');
    }

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'logistic_offers'), {
        item: formData.itemName,
        category: formData.category,
        qty: `${formData.quantity} ${formData.unit}`,
        description: formData.description,
        imageUrl: downloadUrl,
        deliveryMethod: deliveryMethod,
        targetReportId: selectedReportId || null,
        location: deliveryMethod === 'pickup' ? location : null,

        donor: {
          uid: currentUser?.uid,
          name: currentUser?.displayName,
          avatar: currentUser?.photoURL,
        },
        status: 'available',
        aiVerified: true,
        aiCategory: aiResult?.category || 'Manual',
        createdAt: serverTimestamp(),
      });

      toast.success('Penawaran Berhasil!', {
        description: deliveryMethod === 'pickup' ? 'Relawan akan menghubungi untuk penjemputan.' : 'Silakan kirim barang ke alamat Posko terpilih.',
      });

      router.push('/needs');
    } catch (error) {
      console.error(error);
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24">
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-slate-50">
            <ArrowLeft size={20} className="text-slate-700" />
          </button>
          <h1 className="text-lg font-bold text-slate-800">Buat Penawaran Donasi</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-6">
        {/* 0. PILIH TARGET BENCANA (BARU) */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Tujuan Donasi</label>
          <div className="relative">
            <Tent className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">-- Pilih Bencana --</option>
              {activeReports.map((report) => (
                <option key={report.id} value={report.id}>
                  {report.type?.toUpperCase()} - {report.location?.name}
                </option>
              ))}
              <option value="general">Gudang Logistik Pusat (Cadangan)</option>
            </select>
          </div>
          {activeReports.length === 0 && <p className="text-[10px] text-orange-500">Tidak ada bencana aktif. Donasi akan masuk ke stok pusat.</p>}
        </div>

        {/* 1. Upload Foto */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Foto Barang</label>
            {isAnalyzing && (
              <span className="text-[10px] text-blue-600 animate-pulse flex items-center gap-1">
                <Sparkles size={12} /> AI Menganalisis...
              </span>
            )}
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative aspect-video rounded-2xl bg-slate-100 border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all
                ${aiResult?.isValid === false ? 'border-red-400 bg-red-50' : 'border-slate-300 hover:bg-slate-200'}
            `}
          >
            {previewImg ? (
              <>
                <img src={previewImg} alt="Preview" className={`w-full h-full object-cover ${aiResult?.isValid === false ? 'opacity-50 grayscale' : ''}`} />
                {/* Overlay Loading AI */}
                {isAnalyzing && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                    <Loader2 className="animate-spin mb-2" size={32} />
                    <p className="text-xs font-bold">Mengecek Barang...</p>
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

          {/* 🤖 UI FEEDBACK AI */}
          {aiResult && (
            <div className={`p-3 rounded-xl flex items-start gap-3 text-xs border ${aiResult.isValid ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
              {aiResult.isValid ? <CheckCircle size={16} className="mt-0.5 shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 shrink-0" />}
              <div>
                <p className="font-bold">{aiResult.isValid ? 'Barang Valid Terverifikasi' : 'Barang Tidak Valid'}</p>
                <p className="opacity-80">{aiResult.reason}</p>
              </div>
            </div>
          )}
        </div>

        {/* 2. Detail Barang */}
        <div className="space-y-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Nama Barang</label>
            <input
              required
              type="text"
              placeholder="Contoh: Beras Premium"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"
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
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
            <div className="w-1/3">
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Satuan</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm" value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })}>
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

        {/* 3. METODE PENYERAHAN */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Metode Penyerahan</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setDeliveryMethod('dropoff')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${deliveryMethod === 'dropoff' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white text-slate-500'}`}
            >
              <User size={24} className="mb-2" />
              <p className="font-bold text-sm">Antar Sendiri</p>
              <p className="text-[10px] opacity-70 mt-1">Saya kirim ke Posko</p>
            </button>

            <button
              type="button"
              onClick={() => setDeliveryMethod('pickup')}
              className={`p-4 rounded-xl border-2 text-left transition-all ${deliveryMethod === 'pickup' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-100 bg-white text-slate-500'}`}
            >
              <Truck size={24} className="mb-2" />
              <p className="font-bold text-sm">Minta Jemput</p>
              <p className="text-[10px] opacity-70 mt-1">Relawan ke tempat saya</p>
            </button>
          </div>
        </div>

        {/* 4. DETAIL LOKASI (DINAMIS SESUAI BENCANA) */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3 animate-in fade-in">
          {/* OPSI A: DROP OFF (Alamat Posko Bencana) */}
          {deliveryMethod === 'dropoff' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-500 shadow-sm flex-shrink-0">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Alamat Posko (Tujuan)</p>
                  {selectedReportId && selectedReportId !== 'general' && selectedReportData ? (
                    <>
                      <p className="text-sm font-bold text-slate-800 line-clamp-1">Posko Utama {selectedReportData.type}</p>
                      <p className="text-xs text-slate-600">
                        Lokasi: {selectedReportData.location?.name}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        (Koordinat: {selectedReportData.location?.lat?.toFixed(4)}, {selectedReportData.location?.lng?.toFixed(4)})
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-bold text-slate-800">Gudang Logistik Pusat</p>
                      <p className="text-xs text-slate-500">Jl. Gatot Subroto No. 123, Jakarta Selatan</p>
                      <p className="text-[10px] text-orange-500 mt-1 italic">Silakan pilih bencana di atas untuk alamat spesifik.</p>
                    </>
                  )}
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl text-blue-700 text-xs flex gap-2">
                <Info size={16} className="flex-shrink-0" />
                <p>Kirim ke alamat posko yang tertera di atas. Barang akan diterima oleh Admin Posko.</p>
              </div>
            </div>
          )}

          {/* OPSI B: PICKUP */}
          {deliveryMethod === 'pickup' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">Lokasi Penjemputan (Titik Anda)</label>
                {isLocating && <Loader2 size={14} className="animate-spin text-blue-500" />}
              </div>
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-red-500 shadow-sm flex-shrink-0">
                  <Navigation size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{location?.name || 'Belum ada lokasi'}</p>
                  <p className="text-[10px] text-slate-400 truncate">{location ? `${location.lat}, ${location.lng}` : 'Wajib set lokasi untuk penjemputan'}</p>
                </div>
                <button type="button" onClick={getCurrentLocation} disabled={isLocating} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors">
                  <Navigation size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          // 🔒 BLOKIR TOMBOL JIKA AI BILANG TIDAK VALID
          disabled={
            isSubmitting ||
            isUploading ||
            isAnalyzing || // Sedang mikir
            !downloadUrl ||
            (aiResult && !aiResult.isValid) || // Hasil AI jelek
            (deliveryMethod === 'pickup' && !location)
          }
          className={`w-full font-bold py-4 rounded-2xl text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:shadow-none
            ${aiResult && !aiResult.isValid ? 'bg-slate-400 text-slate-200 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-200'}
          `}
        >
          {isSubmitting ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Menyimpan...
            </>
          ) : aiResult && !aiResult.isValid ? (
            <>
              <AlertTriangle size={18} /> Foto Tidak Valid
            </>
          ) : (
            <>
              <Package size={18} /> {deliveryMethod === 'pickup' ? 'Request Penjemputan' : 'Konfirmasi Donasi'}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
