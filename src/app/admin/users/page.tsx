'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Shield, Ban, CheckCircle, UserX } from 'lucide-react';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    };
    fetchUsers();
  }, []);

  const toggleBan = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), { isBanned: !currentStatus });
      toast.success(currentStatus ? 'User diaktifkan kembali' : 'User dibanned');
      // Update local state simple
      setUsers(users.map((u) => (u.uid === uid ? { ...u, isBanned: !currentStatus } : u)));
    } catch (e) {
      toast.error('Error');
    }
  };

  const verifyUser = async (uid: string) => {
    if (!confirm('Verifikasi user ini sebagai Relawan Valid?')) return;
    try {
      await updateDoc(doc(db, 'users', uid), { role: 'verified_volunteer' });
      toast.success('User terverifikasi!');
      setUsers(users.map((u) => (u.uid === uid ? { ...u, role: 'verified_volunteer' } : u)));
    } catch (e) {
      toast.error('Error');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Manajemen Pengguna</h1>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Role</th>
              <th className="p-4">Poin</th>
              <th className="p-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.uid} className={user.isBanned ? 'bg-red-50' : 'hover:bg-slate-50'}>
                <td className="p-4">
                  <div className="font-bold text-slate-800">{user.displayName}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : user.role === 'verified_volunteer' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {user.role || 'User'}
                  </span>
                </td>
                <td className="p-4 font-mono">{user.points || 0}</td>
                <td className="p-4 text-right flex justify-end gap-2">
                  {user.role !== 'admin' && (
                    <>
                      <button onClick={() => verifyUser(user.uid)} title="Verifikasi KYC" className="p-2 text-green-600 hover:bg-green-100 rounded">
                        <Shield size={18} />
                      </button>
                      <button onClick={() => toggleBan(user.uid, user.isBanned)} title={user.isBanned ? 'Unban' : 'Ban'} className={`p-2 rounded ${user.isBanned ? 'text-slate-500 hover:bg-slate-200' : 'text-red-600 hover:bg-red-100'}`}>
                        {user.isBanned ? <CheckCircle size={18} /> : <Ban size={18} />}
                      </button>
                    </>
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
