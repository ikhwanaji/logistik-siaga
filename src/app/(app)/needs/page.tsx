'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { Icons } from '@/components/ui/custom-icons';
import { toast } from 'sonner';
import { useRealtimeReports } from '@/hooks/useRealtimeReports';
import { useRealtimeOffers } from '@/hooks/useRealtimeOffers';
import { recordMonetaryDonation } from '@/lib/authService';
import { addDoc, doc, updateDoc, runTransaction, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, X, CheckCircle, Package, MapPin, Wallet, CreditCard, QrCode, Truck, User, Calendar, ChevronRight, Copy, Minus, Plus, AlertTriangle } from 'lucide-react';

// ─── Tipe Data Derived ───
interface DerivedNeed {
  id: string;
  item: string;
  location: string;
  reportId: string;
  needIndex: number;
  collected: number;
  total: number;
  urgent: boolean;
  category: string;
  status: 'active' | 'fulfilled';
}

export default function LogisticsPage() {
  // 1. Load Data Realtime
  useRealtimeReports();
  useRealtimeOffers();

  const router = useRouter();
  const { reports, offers, currentUser, setCurrentUser } = useAppStore();

  const [tab, setTab] = useState<'needs' | 'offers'>('needs');
  const [search, setSearch] = useState('');
  const [isClaiming, setIsClaiming] = useState<string | null>(null); // Menyimpan ID item yang sedang diproses
  const [claimedItem, setClaimedItem] = useState<any | null>(null); // Menyimpan data item sukses klaim untuk modal

  // ─── STATE MODAL ───
  const [showMoneyModal, setShowMoneyModal] = useState(false);
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'qris' | 'gopay' | 'bank'>('qris');
  const [isProcessingMoney, setIsProcessingMoney] = useState(false);

  // ─── STATE WIZARD PLEDGE ───
  const [selectedNeed, setSelectedNeed] = useState<DerivedNeed | null>(null);
  const [pledgeQty, setPledgeQty] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<'self' | 'courier'>('self');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [isSubmittingPledge, setIsSubmittingPledge] = useState(false);
  const [pledgeStep, setPledgeStep] = useState<1 | 2 | 3>(1);
  const [transactionId, setTransactionId] = useState('');
  const [showClaimInputModal, setShowClaimInputModal] = useState(false);
  const [targetClaimOffer, setTargetClaimOffer] = useState<any>(null); // Barang yang mau diklaim
  const [claimQuantity, setClaimQuantity] = useState<number>(1);

  // ─── DATA TRANSFORMATION (REALTIME CALCULATION) ───
  const activeNeeds: DerivedNeed[] = useMemo(() => {
    return reports.flatMap((report) =>
      report.needs.map((needItem: string, index: number) => {
        const manualTarget = report.needsTargets?.[needItem];

        let defaultTotal = 30;
        if (report.severity === 'kritis') defaultTotal = 100;
        else if (report.severity === 'waspada') defaultTotal = 50;

        const finalTotal = manualTarget !== undefined ? manualTarget : defaultTotal;

        const needId = `${report.id}_${needItem}`;

        const relatedOffers = offers.filter((o) => o.targetReportId === report.id && o.item === needItem && ['available', 'pending_delivery'].includes(o.status));

        // Parse "10 Unit" menjadi angka 10
        const currentCollected = relatedOffers.reduce((sum, offer) => {
          const qtyNum = parseInt(offer.qty) || 0;
          return sum + qtyNum;
        }, 0);

        return {
          id: needId,
          reportId: report.id,
          needIndex: index,
          item: needItem,
          location: report.location.name,
          collected: currentCollected,
          total: finalTotal,
          urgent: report.severity === 'kritis',
          category: 'Logistik Darurat',
          status: currentCollected >= finalTotal ? 'fulfilled' : 'active',
        };
      }),
    );
  }, [reports, offers]);

  const filteredNeeds = activeNeeds.filter((n) => n.item.toLowerCase().includes(search.toLowerCase()) || n.location.toLowerCase().includes(search.toLowerCase()));
  const filteredOffers = offers.filter((o) => o.status === 'available' && (o.item.toLowerCase().includes(search.toLowerCase()) || o.location.toLowerCase().includes(search.toLowerCase())));

  // ─── HANDLER: INPUT QTY VALIDATION ───
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!/^\d*$/.test(val)) return;
    setPledgeQty(val);
  };

  const handleIncrement = () => {
    const current = parseInt(pledgeQty || '0');
    if (selectedNeed && current < selectedNeed.total - selectedNeed.collected) {
      setPledgeQty((current + 1).toString());
    }
  };

  const handleDecrement = () => {
    const current = parseInt(pledgeQty || '0');
    if (current > 1) {
      setPledgeQty((current - 1).toString());
    }
  };

  // ─── HANDLER: DONASI UANG ───
  const handleMoneySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount < 10000) return toast.error('Minimal donasi Rp 10.000');
    if (!currentUser) return router.push('/login');

    setIsProcessingMoney(true);
    try {
      await new Promise((r) => setTimeout(r, 2000)); // Simulasi gateway
      const pointsEarned = await recordMonetaryDonation({
        amount: Number(amount),
        method: paymentMethod,
        userId: currentUser.uid,
        userName: currentUser.displayName,
      });

      setCurrentUser({ ...currentUser, points: (currentUser.points || 0) + pointsEarned });
      toast.success('Pembayaran Berhasil! 🎉');
      setShowMoneyModal(false);
      setAmount('');
    } catch (error) {
      toast.error('Pembayaran Gagal');
    } finally {
      setIsProcessingMoney(false);
    }
  };

  // ─── HANDLER: PLEDGE NEXT ───
  const handlePledgeNext = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(pledgeQty);
    if (!selectedNeed) return;

    if (isNaN(qty) || qty <= 0) return toast.error('Masukkan jumlah valid (minimal 1)');

    const remaining = selectedNeed.total - selectedNeed.collected;
    if (qty > remaining) {
      toast.error(`Maksimal donasi saat ini: ${remaining} unit`, {
        description: 'Agar bantuan merata, mohon sesuaikan jumlah atau donasi ke posko lain.',
      });
      return;
    }

    setPledgeStep(2);
  };

  // ─── HANDLER: PLEDGE SUBMIT ───
  const handlePledgeFinalSubmit = async () => {
    if (!selectedNeed || !currentUser) return;
    if (!deliveryDate) return toast.error('Mohon isi estimasi tanggal pengiriman');

    setIsSubmittingPledge(true);

    try {
      const docRef = await addDoc(collection(db, 'logistic_offers'), {
        type: 'pledge',
        status: 'pending_delivery',
        item: selectedNeed.item,
        qty: `${pledgeQty} Unit`,
        category: selectedNeed.category,
        description: `Komitmen donasi untuk laporan ${selectedNeed.reportId}`,
        donor: {
          uid: currentUser.uid,
          name: currentUser.displayName,
          avatar: currentUser.photoURL,
        },
        location: { name: selectedNeed.location },
        deliveryMethod: deliveryMethod,
        deliveryDate: deliveryDate,
        targetReportId: selectedNeed.reportId,
        createdAt: serverTimestamp(),
      });

      toast.success('Komitmen Dicatat! 📦', {
        description: 'Progress kebutuhan otomatis diperbarui.',
        duration: 5000,
      });

      setTransactionId(docRef.id);
      setPledgeStep(3);
    } catch (error) {
      console.error(error);
      toast.error('Gagal menyimpan data');
    } finally {
      setIsSubmittingPledge(false);
    }
  };

  const closePledgeModal = () => {
    setSelectedNeed(null);
    setPledgeQty('');
    setDeliveryDate('');
    setDeliveryMethod('self');
    setPledgeStep(1);
    setTransactionId('');
  };

  const openClaimModal = (offer: any) => {
    if (!currentUser) {
      toast.error('Silakan login untuk mengklaim barang.');
      router.push('/login');
      return;
    }

    setTargetClaimOffer(offer);
    setClaimQuantity(1);
    setShowClaimInputModal(true);
  };
  const submitClaim = async () => {
    if (!targetClaimOffer || !currentUser) return;

    const maxQty = parseInt(targetClaimOffer.qty.replace(/\D/g, '')) || 0;

    // Validasi
    if (claimQuantity <= 0 || claimQuantity > maxQty) {
      toast.error(`Jumlah tidak valid. Maksimal ${maxQty} unit.`);
      return;
    }

    setIsClaiming(targetClaimOffer.id);

    try {
      await runTransaction(db, async (transaction) => {
        const offerRef = doc(db, 'logistic_offers', targetClaimOffer.id);
        const offerDoc = await transaction.get(offerRef);

        if (!offerDoc.exists()) throw 'Barang tidak ditemukan';

        const currentQty = parseInt(offerDoc.data().qty.replace(/\D/g, '')) || 0;

        if (currentQty < claimQuantity) {
          throw 'Stok tidak cukup (mungkin sudah diambil orang lain barusan)';
        }

        const newQty = currentQty - claimQuantity;

        if (newQty > 0) {
          transaction.update(offerRef, { qty: `${newQty} Unit` });
        } else {
          transaction.update(offerRef, { qty: `0 Unit`, status: 'claimed' });
        }

        const newRef = doc(collection(db, 'logistic_offers'));
        transaction.set(newRef, {
          ...offerDoc.data(),
          qty: `${claimQuantity} Unit`,
          status: 'reserved',
          originalOfferId: targetClaimOffer.id,
          reservedBy: {
            uid: currentUser.uid,
            name: currentUser.displayName,
            contact: currentUser.email,
          },
          reservedAt: serverTimestamp(),
          deadlineAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 Jam
        });
      });

      // Sukses
      setShowClaimInputModal(false);
      setClaimedItem({ ...targetClaimOffer, qty: `${claimQuantity} Unit` });
      toast.success(`Berhasil booking ${claimQuantity} unit!`);
    } catch (error: any) {
      console.error(error);
      toast.error(typeof error === 'string' ? error : 'Gagal mengklaim barang.');
    } finally {
      setIsClaiming(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24">
      {/* ─── HEADER ─── */}
      <div className="bg-white px-5 pt-12 pb-4 shadow-sm sticky top-0 z-10">
        <h1 className="text-xl font-bold text-slate-800">📦 Marketplace Logistik</h1>
        <div
          onClick={() => setShowMoneyModal(true)}
          className="mt-4 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-4 text-white shadow-lg shadow-blue-200 cursor-pointer active:scale-95 transition-transform relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-8 translate-x-8" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Wallet size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Donasi Dana Operasional</h3>
              <p className="text-[10px] text-blue-100 mt-0.5">Bantu biaya BBM & sewa alat berat</p>
            </div>
            <div className="ml-auto bg-white text-blue-600 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm">Donasi &gt;</div>
          </div>
        </div>

        <div className="mt-4 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <Icons.Search />
          </span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari barang kebutuhan..." className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl text-sm outline-none" />
        </div>

        <div className="flex mt-3 gap-0 bg-slate-100 rounded-xl p-1">
          {[
            ['needs', 'Logistik'],
            ['offers', 'Tersedia'],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as any)} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${tab === id ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}>
              {id === 'needs' ? '🆘 ' : '✅ '} {label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── LIST CONTENT ─── */}
      <div className="px-4 py-4 space-y-3">
        {tab === 'needs' ? (
          <>
            {filteredNeeds.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">Belum ada kebutuhan mendesak saat ini.</div>}

            {filteredNeeds.map((item) => {
              const remaining = Math.max(0, item.total - item.collected);
              const pct = Math.min(100, Math.round((item.collected / item.total) * 100));
              const isFull = item.status === 'fulfilled';

              return (
                <div key={item.id} className={`bg-white rounded-2xl p-4 shadow-sm border ${item.urgent ? 'border-red-100' : 'border-slate-100'} ${isFull ? 'opacity-80 grayscale-[0.5]' : ''}`}>
                  {item.urgent && !isFull && (
                    <div className="flex items-center gap-1 mb-2">
                      <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-[10px] text-red-600 font-bold uppercase tracking-wide">Mendesak</span>
                    </div>
                  )}
                  {isFull && (
                    <div className="flex items-center gap-1 mb-2">
                      <CheckCircle size={12} className="text-green-600" />
                      <span className="text-[10px] text-green-600 font-bold uppercase tracking-wide">Kebutuhan Terpenuhi</span>
                    </div>
                  )}

                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{item.item}</h4>
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">📍 {item.location}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs font-bold ${isFull ? 'text-green-600' : 'text-slate-700'}`}>
                        {item.collected}
                        <span className="text-slate-400">/{item.total}</span>
                      </p>
                      <p className="text-[10px] text-slate-400">Unit</p>
                    </div>
                  </div>

                  <div className="mt-3 mb-4">
                    <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ${isFull ? 'bg-green-500' : pct >= 80 ? 'bg-green-400' : pct >= 50 ? 'bg-orange-400' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 text-right">{isFull ? 'Stok Aman' : `Kurang ${remaining} lagi`}</p>
                  </div>

                  <button
                    onClick={() => {
                      if (!isFull) {
                        setSelectedNeed(item);
                        setPledgeStep(1);
                      }
                    }}
                    disabled={isFull}
                    className={`w-full py-3 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-2
                        ${isFull ? 'bg-green-50 text-green-700 border border-green-200 cursor-not-allowed' : 'bg-red-500 text-white hover:bg-red-600 shadow-md shadow-red-200'}`}
                  >
                    {isFull ? (
                      <>
                        <CheckCircle size={14} /> Terpenuhi
                      </>
                    ) : (
                      '📦 Kirim Barang'
                    )}
                  </button>
                </div>
              );
            })}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 font-medium">{filteredOffers.length} penawaran tersedia</p>
            </div>

            {filteredOffers.length === 0 && <div className="text-center py-10 text-slate-400 text-sm">Belum ada penawaran donasi.</div>}
            {filteredOffers.map((item) => (
              <div key={item.id} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex gap-3">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.item} className="w-16 h-16 rounded-xl object-cover bg-slate-100" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
                        <Package size={24} />
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{item.item}</h4>
                      <p className="text-xs text-blue-600 font-bold mt-0.5">{item.qty}</p>
                      <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded mt-1 inline-block">{item.category || 'Umum'}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase ${item.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                    {item.status === 'available' ? 'Tersedia' : 'Diambil'}
                  </span>
                </div>
                <div className="h-px bg-slate-50 w-full" />
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      👤 <span className="text-slate-600 font-medium">{item.donor}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <MapPin size={10} />{' '}
                      {item.location && typeof item.location === 'object'
                        ? (item.location as any).name 
                        : item.location || 'Lokasi tidak tersedia'}
                    </p>
                  </div>
                  {item.status === 'available' && (
                    <button
                      onClick={() => openClaimModal(item)}
                      disabled={isClaiming === item.id}
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform shadow-md shadow-blue-100 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isClaiming === item.id ? <Loader2 size={14} className="animate-spin" /> : 'Klaim'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={() => router.push('/needs/create')}
              className="w-full border-2 border-dashed border-blue-300 text-blue-500 font-bold py-4 rounded-2xl text-sm flex items-center justify-center gap-2 hover:bg-blue-50 transition-colors mt-2"
            >
              <Icons.Plus /> Tambah Penawaran
            </button>
          </>
        )}
      </div>

      {/* ─── MODAL 1: DONASI UANG ─── */}
      {showMoneyModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg text-slate-800">Donasi Uang</h3>
              <button onClick={() => setShowMoneyModal(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleMoneySubmit}>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[20000, 50000, 100000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${amount === val ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-600'}`}
                  >
                    Rp {val / 1000}rb
                  </button>
                ))}
              </div>
              <div className="mb-6">
                <label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase">Nominal Lainnya</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-lg font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button type="submit" disabled={isProcessingMoney || !amount} className="w-full bg-blue-600 text-white font-bold py-4 rounded-2xl text-sm shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50">
                {isProcessingMoney ? <Loader2 className="animate-spin mx-auto" /> : `Bayar Rp ${amount ? amount.toLocaleString() : '0'}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: PLEDGE BARANG (WIZARD 3 LANGKAH) ─── */}
      {selectedNeed && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
            {/* Header Modal */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-800">{pledgeStep === 1 ? 'Komitmen Donasi' : pledgeStep === 2 ? 'Detail Pengiriman' : 'Tiket Donasi'}</h3>
                {pledgeStep !== 3 && <p className="text-xs text-slate-500">Langkah {pledgeStep} dari 2</p>}
              </div>
              <button onClick={closePledgeModal} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            {/* Product Summary */}
            {pledgeStep !== 3 && (
              <div className="bg-slate-50 p-3 rounded-xl mb-6 flex gap-3 items-center border border-slate-100">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-slate-700">
                  <Package size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-sm">{selectedNeed.item}</p>
                  <p className="text-xs text-slate-500">Tujuan: {selectedNeed.location}</p>
                </div>
              </div>
            )}

            {/* ─── STEP 1: INPUT JUMLAH  ─── */}
            {pledgeStep === 1 && (
              <form onSubmit={handlePledgeNext}>
                <div className="mb-6">
                  <label className="text-xs font-bold text-slate-600 mb-1.5 block uppercase">Jumlah Donasi</label>

                  {/* Stepper Control */}
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={handleDecrement} className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all">
                      <Minus size={20} />
                    </button>
                    <div className="relative flex-1">
                      <input
                        autoFocus
                        type="number"
                        min="1"
                        inputMode="numeric"
                        onKeyDown={(e) => {
                          if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault();
                        }}
                        className="w-full text-center text-3xl font-black text-slate-800 bg-white border-2 border-slate-200 rounded-2xl py-3 focus:outline-none focus:border-red-500 focus:ring-0 transition-colors"
                        placeholder="0"
                        value={pledgeQty}
                        onChange={handleQtyChange}
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded">Unit</span>
                    </div>
                    <button type="button" onClick={handleIncrement} className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all">
                      <Plus size={20} />
                    </button>
                  </div>

                  <div className="flex justify-between items-center mt-2 px-1">
                    <p className="text-[10px] text-slate-400">Minimal 1 unit</p>
                    <p className="text-[10px] text-slate-400">
                      Sisa kebutuhan: <span className="font-bold text-slate-600">{selectedNeed.total - selectedNeed.collected} unit</span>
                    </p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={!pledgeQty || parseInt(pledgeQty) < 1}
                  className="w-full bg-red-600 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
                >
                  Lanjut ke Pengiriman <ChevronRight size={16} />
                </button>
              </form>
            )}

            {/* ─── STEP 2: METODE KIRIM ─── */}
            {pledgeStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-2 block uppercase">Metode Kirim</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setDeliveryMethod('self')} className={`p-3 rounded-xl border-2 text-left transition-all ${deliveryMethod === 'self' ? 'border-red-500 bg-red-50' : 'border-slate-100 bg-slate-50'}`}>
                      <User size={20} className={`mb-2 ${deliveryMethod === 'self' ? 'text-red-600' : 'text-slate-400'}`} />
                      <p className={`text-xs font-bold ${deliveryMethod === 'self' ? 'text-red-700' : 'text-slate-600'}`}>Antar Sendiri</p>
                    </button>
                    <button onClick={() => setDeliveryMethod('courier')} className={`p-3 rounded-xl border-2 text-left transition-all ${deliveryMethod === 'courier' ? 'border-red-500 bg-red-50' : 'border-slate-100 bg-slate-50'}`}>
                      <Truck size={20} className={`mb-2 ${deliveryMethod === 'courier' ? 'text-red-600' : 'text-slate-400'}`} />
                      <p className={`text-xs font-bold ${deliveryMethod === 'courier' ? 'text-red-700' : 'text-slate-600'}`}>Kirim Kurir</p>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 mb-2 block uppercase">{deliveryMethod === 'self' ? 'Rencana Tiba' : 'Jadwal Pick Up'}</label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl text-[10px] text-blue-700 flex gap-2 items-start border border-blue-100">
                  <CheckCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <p>{deliveryMethod === 'self' ? 'Anda akan mendapatkan alamat lengkap Posko setelah konfirmasi.' : 'Sistem akan mencarikan kurir terdekat setelah Anda konfirmasi.'}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <button onClick={() => setPledgeStep(1)} className="px-4 py-3.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm">
                    Kembali
                  </button>
                  <button
                    onClick={handlePledgeFinalSubmit}
                    disabled={isSubmittingPledge || !deliveryDate}
                    className="flex-1 bg-red-600 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-red-200 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSubmittingPledge ? <Loader2 className="animate-spin mx-auto" /> : 'Konfirmasi Komitmen'}
                  </button>
                </div>
              </div>
            )}

            {/* ─── STEP 3: TIKET & QR CODE (HASIL AKHIR) ─── */}
            {pledgeStep === 3 && (
              <div className="text-center animate-in zoom-in-95 duration-300">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h2 className="text-xl font-black text-slate-800 mb-1">Terima Kasih!</h2>
                <p className="text-xs text-slate-500 mb-6">Komitmen Anda telah tercatat.</p>

                {/* TIKET DIGITAL */}
                <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-4 mb-4 relative overflow-hidden">
                  <div className="absolute top-1/2 -left-3 w-6 h-6 bg-white rounded-full border-r-2 border-slate-300" />
                  <div className="absolute top-1/2 -right-3 w-6 h-6 bg-white rounded-full border-l-2 border-slate-300" />

                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-white p-2 rounded-xl shadow-sm">
                      <QrCode size={128} className="text-slate-800" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Kode Transaksi</p>
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-lg font-mono font-black text-slate-700 bg-slate-200 px-3 py-1 rounded-lg">#{transactionId.slice(0, 6).toUpperCase()}</span>
                        <button onClick={() => toast.success('Kode disalin!')} className="p-1.5 bg-white rounded-lg shadow-sm text-slate-500 hover:text-blue-600">
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* INSTRUKSI KHUSUS */}
                <div className="bg-blue-50 p-4 rounded-xl text-left mb-4">
                  <h4 className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                    <Truck size={14} /> Instruksi Selanjutnya:
                  </h4>
                  <p className="text-[11px] text-blue-700 leading-relaxed">
                    {deliveryMethod === 'self'
                      ? 'Tunjukkan QR Code di atas kepada petugas Admin di Posko saat Anda menyerahkan barang.'
                      : `Tuliskan kode #${transactionId.slice(0, 6).toUpperCase()} ini pada kemasan paket Anda agar admin dapat memverifikasi kiriman kurir.`}
                  </p>
                </div>

                <button onClick={closePledgeModal} className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg active:scale-95 transition-all">
                  Tutup & Kembali
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ─── MODAL 3: INPUT QUANTITY KLAIM (CUSTOM DIALOG) ─── */}
      {showClaimInputModal && targetClaimOffer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Ambil Barang</h3>
                <p className="text-xs text-slate-500">Tentukan jumlah yang akan Anda jemput.</p>
              </div>
              <button onClick={() => setShowClaimInputModal(false)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200">
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            {/* Info Barang */}
            <div className="bg-blue-50 p-3 rounded-xl flex gap-3 items-center border border-blue-100 mb-6">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-500 shadow-sm">
                <Package size={20} />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">{targetClaimOffer.item}</p>
                <p className="text-xs text-slate-500">
                  Stok Tersedia: <span className="font-bold text-blue-600">{targetClaimOffer.qty}</span>
                </p>
              </div>
            </div>

            {/* Input Stepper */}
            <div className="mb-6">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 block">Jumlah Pengambilan</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setClaimQuantity(Math.max(1, claimQuantity - 1))} className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all">
                  <Minus size={20} />
                </button>

                <div className="flex-1 relative">
                  <input
                    type="number"
                    value={claimQuantity}
                    onChange={(e) => {
                      const max = parseInt(targetClaimOffer.qty.replace(/\D/g, '')) || 1;
                      const val = Math.min(max, Math.max(1, parseInt(e.target.value) || 0));
                      setClaimQuantity(val);
                    }}
                    className="w-full text-center text-2xl font-black text-slate-800 bg-white border-2 border-slate-200 rounded-2xl py-2 focus:outline-none focus:border-blue-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Unit</span>
                </div>

                <button
                  onClick={() => {
                    const max = parseInt(targetClaimOffer.qty.replace(/\D/g, '')) || 1;
                    if (claimQuantity < max) setClaimQuantity(claimQuantity + 1);
                  }}
                  className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 active:scale-95 transition-all"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button onClick={() => setShowClaimInputModal(false)} className="flex-1 py-3.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Batal
              </button>
              <button
                onClick={submitClaim}
                disabled={isProcessingMoney || isClaiming === targetClaimOffer.id}
                className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-70 flex justify-center items-center gap-2"
              >
                {isClaiming === targetClaimOffer.id ? <Loader2 className="animate-spin" size={18} /> : 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
