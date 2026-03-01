'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { signOut } from '@/lib/authService';
import { useFirebaseUpload } from '@/hooks/useFirebaseUpload';
import { doc, updateDoc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Loader2, ChevronRight, ArrowLeft, Calendar, User, MapPin, Package, Clock, CheckCircle, AlertTriangle, Camera, Bell, Shield, HelpCircle, Mail, Phone, Lock, Save } from 'lucide-react';

// ─── Tipe View untuk Navigasi Internal ───
type ProfileView = 'main' | 'personal_info' | 'history_reports' | 'history_donations' | 'settings_notif' | 'verification' | 'support';

export default function ProfilePage() {
  const router = useRouter();
  const { currentUser, isLoadingAuth, donatedItems, reports, setCurrentUser } = useAppStore();
  const [currentView, setCurrentView] = useState<ProfileView>('main');

  const [formData, setFormData] = useState({
    phoneNumber: '',
    address: '',
    city: '',
    bloodType: '',
    emergencyContact: '',
  });
  
  const [totalDonationsCount, setTotalDonationsCount] = useState(0); 
  const [myDonationsList, setMyDonationsList] = useState<any[]>([]); 
  const [isSaving, setIsSaving] = useState(false);
  const { upload, isUploading } = useFirebaseUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoadingAuth && !currentUser) {
      router.push('/login');
    } else if (currentUser) {
      const loadUserData = async () => {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            setFormData({
              phoneNumber: data.phoneNumber || '',
              address: data.address || '',
              city: data.city || '',
              bloodType: data.bloodType || '',
              emergencyContact: data.emergencyContact || '',
            });
          }
        } catch (error) {
          console.error('Gagal load biodata:', error);
        }
      };
      loadUserData();

      const qDonations = query(collection(db, 'logistic_offers'), where('donor.uid', '==', currentUser.uid));

      const unsubscribe = onSnapshot(qDonations, (snapshot) => {
        setTotalDonationsCount(snapshot.size); 
        const list = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMyDonationsList(list);
      });

      return () => unsubscribe();
    }
  }, [currentUser, isLoadingAuth, router]);

  // ─── 2. LOGIC GANTI FOTO PROFIL ───
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    const toastId = toast.loading('Mengupload foto profil...');

    try {
      const downloadUrl = await upload(file);

      if (!downloadUrl) throw new Error('Gagal upload gambar');
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: downloadUrl });
      }

      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, { photoURL: downloadUrl });

      setCurrentUser({ ...currentUser, photoURL: downloadUrl });

      toast.success('Foto profil diperbarui!', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengganti foto', { id: toastId });
    }
  };

  // 3. Simpan Biodata
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), formData);
      toast.success('Informasi pribadi berhasil disimpan!');
      setCurrentView('main');
    } catch (error) {
      toast.error('Gagal menyimpan data');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── 3. DATA FILTERING ───
  const myReports = useMemo(() => {
    if (!currentUser) return [];
    return reports.filter((r) => r.reportedBy === currentUser.displayName || r.reportedBy === 'Saya');
  }, [reports, currentUser]);

  const myDonations = useMemo(() => {
    const donationsList: any[] = [];
    reports.forEach((report) => {
      report.needs.forEach((item, index) => {
        const itemId = `${report.id}_${index}`;
        if (donatedItems[itemId]) {
          donationsList.push({
            id: itemId,
            item: item,
            reportLocation: report.location.name,
            timestamp: new Date(),
            status: 'committed',
          });
        }
      });
    });
    return donationsList;
  }, [reports, donatedItems]);

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  if (isLoadingAuth || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-red-500" size={32} />
      </div>
    );
  }

  // ─── SUB-COMPONENTS RENDERERS ───

  const renderHeader = () => (
    <div className="bg-gradient-to-br from-red-500 to-red-700 px-5 pt-12 pb-16 relative transition-all duration-300">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-12 translate-x-12" />
      </div>

      {currentView !== 'main' && (
        <button onClick={() => setCurrentView('main')} className="absolute top-12 left-4 text-white p-2 rounded-full hover:bg-white/20 transition-colors z-20">
          <ArrowLeft size={20} />
        </button>
      )}

      <div className={`relative flex items-center gap-4 transition-all ${currentView !== 'main' ? 'pl-8' : ''}`}>
        <div className="relative group">
          <div className="w-16 h-16 rounded-2xl bg-white/20 p-1 border-2 border-white/30 overflow-hidden shrink-0 relative">
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${currentUser.displayName}`} alt="Profile" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white text-xl font-bold bg-slate-400 rounded-xl">{currentUser.displayName?.charAt(0)}</div>
            )}

            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                <Loader2 className="animate-spin text-white" size={20} />
              </div>
            )}
          </div>

          {currentView === 'main' && (
            <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-2 -right-2 bg-white text-slate-700 p-1.5 rounded-full shadow-md border border-slate-200 active:scale-95 transition-transform">
              <Camera size={14} />
            </button>
          )}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
        </div>

        <div className="text-white min-w-0">
          <h2 className="text-lg font-black truncate">{currentUser.displayName}</h2>
          <p className="text-xs opacity-80 flex items-center gap-1">{currentUser.role === 'admin' ? '🛡️ Verifikator' : '🦸 Relawan Siaga'}</p>
          {currentView === 'main' && (
            <div className="flex items-center gap-1 mt-1 bg-white/20 px-2 py-0.5 rounded-full w-fit">
              <span className="text-yellow-300 text-xs">⭐</span>
              <span className="text-xs font-bold">{currentUser.points} Poin</span>
            </div>
          )}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 320" className="w-full h-auto text-slate-50 fill-current block -mb-1 opacity-20">
          <path d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,112C672,96,768,96,864,112C960,128,1056,160,1152,160C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
    </div>
  );

  // ─── MAIN DASHBOARD ───
  // ─── MENU 1: INFORMASI PRIBADI ───
  const renderPersonalInfo = () => (
    <div className="px-4 -mt-8 relative z-20 pb-8">
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
        <div className="border-b border-slate-100 pb-4 mb-4">
          <h3 className="font-bold text-slate-800 text-lg">📝 Biodata Diri</h3>
          <p className="text-xs text-slate-400">Data ini digunakan untuk verifikasi pengiriman bantuan.</p>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase">Nama Lengkap</label>
            <input disabled value={currentUser.displayName} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed" />
            <p className="text-[10px] text-slate-400 italic">*Nama sesuai akun Google tidak dapat diubah.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">No. Handphone</label>
              <input
                required
                type="tel"
                placeholder="0812..."
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600 uppercase">Gol. Darah</label>
              <select
                value={formData.bloodType}
                onChange={(e) => setFormData({ ...formData, bloodType: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 appearance-none"
              >
                <option value="">- Pilih -</option>
                <option>A</option>
                <option>B</option>
                <option>AB</option>
                <option>O</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase">Kota Domisili</label>
            <input
              type="text"
              placeholder="Contoh: Jakarta Selatan"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase">Alamat Lengkap</label>
            <textarea
              rows={3}
              placeholder="Jalan, No. Rumah, RT/RW..."
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600 uppercase flex items-center gap-1">
              <AlertTriangle size={12} className="text-red-500" /> Kontak Darurat
            </label>
            <input
              type="text"
              placeholder="Nama & No. HP Kerabat"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              className="w-full bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <button type="submit" disabled={isSaving} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 mt-4">
            {isSaving ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Save size={18} /> Simpan Perubahan
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  const renderMainMenu = () => (
    <>
      <div className="px-4 -mt-8 relative z-10 mb-4">
        <div className="bg-white rounded-2xl shadow-md p-4 grid grid-cols-3 divide-x divide-slate-100">
          <StatBox icon="📋" val={myReports.length} label="Laporan" />
          <StatBox icon="❤️" val={totalDonationsCount} label="Donasi" />
          <StatBox icon="⭐" val={currentUser.points} label="Poin" />
        </div>
      </div>

      <div className="px-4 space-y-4">
        {currentUser.badges && currentUser.badges.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">🏆 Lencana Saya</h3>
            <div className="flex gap-2 flex-wrap">
              {currentUser.badges.map((badge, i) => (
                <span key={i} className="bg-yellow-50 text-yellow-700 border border-yellow-200 px-3 py-1.5 rounded-lg text-[10px] font-bold">
                  🏅 {badge}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <MenuButton
            icon={<User size={20} className="text-slate-600" />}
            label="Informasi Pribadi"
            onClick={() => setCurrentView('personal_info')}
          />
          <MenuButton icon={<div className="text-xl">📋</div>} label="Riwayat Laporan" badge={myReports.length > 0 ? myReports.length.toString() : null} onClick={() => setCurrentView('history_reports')} />
          <MenuButton icon={<div className="text-xl">❤️</div>} label="Riwayat Donasi" badge={totalDonationsCount > 0 ? totalDonationsCount.toString() : null} onClick={() => setCurrentView('history_donations')} />
          <MenuButton icon={<Bell size={20} className="text-slate-600" />} label="Pengaturan Notifikasi" onClick={() => setCurrentView('settings_notif')} />
          <MenuButton icon={<Shield size={20} className="text-slate-600" />} label="Verifikasi Identitas" badge={currentUser.role === 'admin' ? 'VERIFIED' : '⚠️'} onClick={() => setCurrentView('verification')} />
          <MenuButton icon={<HelpCircle size={20} className="text-slate-600" />} label="Bantuan & Dukungan" onClick={() => setCurrentView('support')} />
        </div>

        <button onClick={handleLogout} className="w-full bg-slate-100 text-slate-500 font-bold py-4 rounded-2xl text-sm min-h-[56px] hover:bg-red-50 hover:text-red-500 transition-colors mb-8">
          Keluar dari Akun
        </button>
      </div>
    </>
  );

  // ─── MENU 2: PENGATURAN NOTIFIKASI ───
  const renderNotifications = () => (
    <div className="px-4 -mt-6 relative z-10 space-y-4 pb-8">
      <div className="bg-white rounded-t-2xl p-4 border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <h3 className="font-bold text-slate-800">🔔 Pengaturan Notifikasi</h3>
        <p className="text-xs text-slate-400">Atur bagaimana Anda ingin dihubungi</p>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm space-y-6">
        <ToggleRow title="Notifikasi Bencana Sekitar" desc="Peringatan real-time radius 5km" defaultChecked />
        <ToggleRow title="Status Laporan Saya" desc="Update verifikasi dan bantuan" defaultChecked />
        <ToggleRow title="Kebutuhan Logistik Mendesak" desc="Info kekurangan stok di posko" defaultChecked={false} />
        <ToggleRow title="Newsletter Mingguan" desc="Ringkasan aktivitas relawan" defaultChecked={false} />
      </div>

      <p className="text-center text-[10px] text-slate-400 px-4">Notifikasi dikirim melalui Push Notification browser dan Email yang terdaftar.</p>
    </div>
  );

  // ─── MENU 3: VERIFIKASI IDENTITAS ───
  const renderVerification = () => {
    const isVerified = currentUser.role === 'admin'; 

    return (
      <div className="px-4 -mt-6 relative z-10 space-y-4 pb-8">
        <div className="bg-white rounded-t-2xl p-4 border-b border-slate-100 sticky top-0 z-20 shadow-sm">
          <h3 className="font-bold text-slate-800">🛡️ Verifikasi Identitas</h3>
          <p className="text-xs text-slate-400">Tingkatkan kepercayaan komunitas</p>
        </div>

        {isVerified ? (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h4 className="font-bold text-green-800">Akun Terverifikasi</h4>
            <p className="text-xs text-green-600 mt-1">Anda adalah relawan resmi LogistikSiaga.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex gap-3 bg-blue-50 p-3 rounded-xl">
              <Shield size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Upload foto KTP untuk mendapatkan lencana <b>Verified</b>. Akun terverifikasi dapat membuat laporan prioritas dan mengelola posko.
              </p>
            </div>

            <div
              className="border-2 border-dashed border-slate-200 rounded-2xl h-40 flex flex-col items-center justify-center text-slate-400 gap-2 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => toast.info('Fitur Upload KTP (Demo)', { description: 'Simulasi upload KTP berhasil.' })}
            >
              <Camera size={24} />
              <span className="text-xs font-bold">Upload Foto KTP</span>
            </div>

            <button className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl text-xs" onClick={() => toast.success('Permintaan Terkirim', { description: 'Tim kami akan memverifikasi data Anda 1x24 jam.' })}>
              Ajukan Verifikasi
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── MENU 4: DUKUNGAN (SUPPORT) ───
  const renderSupport = () => (
    <div className="px-4 -mt-6 relative z-10 space-y-4 pb-8">
      <div className="bg-white rounded-t-2xl p-4 border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <h3 className="font-bold text-slate-800">❓ Bantuan & Dukungan</h3>
        <p className="text-xs text-slate-400">Pusat bantuan relawan</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-50">
        <AccordionItem q="Bagaimana cara lapor bencana?" a="Klik tombol 'Minta Bantuan' di beranda, ambil foto kejadian, dan AI akan otomatis mengisi data untuk Anda." />
        <AccordionItem q="Apakah donasi saya sampai?" a="Ya, setiap donasi logistik akan diverifikasi oleh posko penerima dan statusnya diupdate realtime." />
        <AccordionItem q="Bagaimana cara jadi Verifikator?" a="Anda perlu melakukan verifikasi identitas (KTP) dan memiliki reputasi poin minimal 1000." />
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <button className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col items-center gap-2 hover:border-red-200 hover:bg-red-50 transition-colors">
          <Mail size={24} className="text-red-500" />
          <span className="text-xs font-bold text-slate-600">Email Kami</span>
        </button>
        <button className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col items-center gap-2 hover:border-green-200 hover:bg-green-50 transition-colors">
          <Phone size={24} className="text-green-500" />
          <span className="text-xs font-bold text-slate-600">WhatsApp Admin</span>
        </button>
      </div>

      <p className="text-center text-[10px] text-slate-400 mt-4">Versi Aplikasi: 1.0.0 (Beta)</p>
    </div>
  );

  // ─── MENU HISTORY (Reports & Donations) ───
  const renderReportsHistory = () => (
    <div className="px-4 -mt-6 relative z-10 space-y-3 pb-8">
      <div className="bg-white rounded-t-2xl p-4 border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <h3 className="font-bold text-slate-800">Riwayat Laporan</h3>
        <p className="text-xs text-slate-400">Total {myReports.length} laporan</p>
      </div>
      {myReports.length === 0 ? (
        <EmptyState icon={<AlertTriangle size={32} />} title="Belum Ada Laporan" desc="Mulai lapor kejadian sekitar." />
      ) : (
        myReports.map((r) => (
          <div key={r.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <h4 className="font-bold text-sm capitalize">
              {r.type} - {r.severity}
            </h4>
            <p className="text-xs text-slate-500 mt-1 truncate">{r.location.name}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-full mt-2 inline-block ${r.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{r.status}</span>
          </div>
        ))
      )}
    </div>
  );

  const renderDonationsHistory = () => (
    <div className="px-4 -mt-6 relative z-10 space-y-3 pb-8">
      <div className="bg-white rounded-t-2xl p-4 border-b border-slate-100 sticky top-0 z-20 shadow-sm">
        <h3 className="font-bold text-slate-800">Riwayat Donasi</h3>
        <p className="text-xs text-slate-400">Total {totalDonationsCount} komitmen</p>
      </div>
      {myDonationsList.length === 0 ? (
        <EmptyState icon={<Package size={32} />} title="Belum Ada Donasi" desc="Bantu sesama sekarang." />
      ) : (
        myDonationsList.map((d) => (
          <div key={d.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${d.status === 'available' ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-500'}`}>
              {d.status === 'available' ? <CheckCircle size={18} /> : <Package size={18} />}
            </div>
            <div>
              <h4 className="font-bold text-sm">
                {d.item} <span className="font-normal text-xs text-slate-400">({d.qty})</span>
              </h4>
              <p className="text-xs text-slate-500">{d.location?.name || 'Lokasi tidak tersedia'}</p>
              <span className={`text-[9px] px-2 py-0.5 rounded-full mt-1 inline-block ${d.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {d.status === 'available' ? 'Diterima Admin' : 'Sedang Dikirim'}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );

  // ─── RENDER UTAMA ───
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {renderHeader()}
      <div className="flex-1 transition-all duration-300">
        {currentView === 'main' && renderMainMenu()}
        {currentView === 'personal_info' && renderPersonalInfo()}
        {currentView === 'history_reports' && renderReportsHistory()}
        {currentView === 'history_donations' && renderDonationsHistory()}
        {currentView === 'settings_notif' && renderNotifications()}
        {currentView === 'verification' && renderVerification()}
        {currentView === 'support' && renderSupport()}
      </div>
    </div>
  );
}

// ─── HELPER COMPONENTS ───

function StatBox({ icon, val, label }: any) {
  return (
    <div className="text-center px-2">
      <div className="text-xl">{icon}</div>
      <div className="text-lg font-black text-slate-800">{val}</div>
      <div className="text-[10px] text-slate-400 font-medium">{label}</div>
    </div>
  );
}

function MenuButton({ icon, label, badge, onClick }: { icon: any; label: string; badge?: string | null; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center px-4 py-4 min-h-[56px] hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
      <span className="text-lg w-8 flex justify-center">{icon}</span>
      <span className="flex-1 text-left text-sm font-medium text-slate-700 ml-3">{label}</span>
      {badge && <span className={`text-xs font-bold px-2 py-0.5 rounded-full mr-2 ${badge === 'VERIFIED' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'}`}>{badge}</span>}
      <span className="text-slate-300">
        <ChevronRight size={18} />
      </span>
    </button>
  );
}

function ToggleRow({ title, desc, defaultChecked }: { title: string; desc: string; defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between">
      <div>
        <h4 className="text-sm font-bold text-slate-700">{title}</h4>
        <p className="text-[10px] text-slate-400">{desc}</p>
      </div>
      <button
        onClick={() => {
          setChecked(!checked);
          toast.success('Pengaturan disimpan');
        }}
        className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-green-500' : 'bg-slate-200'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${checked ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
  );
}

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="p-4">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center text-left">
        <span className="text-xs font-bold text-slate-700">{q}</span>
        <ChevronRight size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
      </button>
      {isOpen && <p className="text-xs text-slate-500 mt-2 leading-relaxed">{a}</p>}
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center bg-white rounded-2xl border border-dashed border-slate-200">
      <div className="text-slate-300 mb-3">{icon}</div>
      <h4 className="font-bold text-slate-700 text-sm">{title}</h4>
      <p className="text-xs text-slate-400 mt-1 max-w-[200px]">{desc}</p>
    </div>
  );
}
