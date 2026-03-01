import { useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAppStore } from '@/store/useAppStore';
import { LogisticOffer } from '@/types';

export function useRealtimeOffers() {
  const setOffers = useAppStore((state) => state.setOffers);

  useEffect(() => {
    // Query: Ambil semua penawaran, urutkan dari yang terbaru
    const q = query(
      collection(db, 'logistic_offers'),
      where('status', 'in', ['available', 'pending_delivery']),
      orderBy('createdAt', 'desc'),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const offersData: LogisticOffer[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          item: data.item,
          qty: data.qty,
          category: data.category,
          description: data.description,
          imageUrl: data.imageUrl,
          targetReportId: data.targetReportId,
          donor: data.donor?.name || 'Hamba Allah',
          donorAvatar: data.donor?.avatar,
          location: data.location?.name || 'Lokasi tidak tersedia',
          status: data.status || 'available',
          createdAt: data.createdAt?.toDate(),
        };
      });

      setOffers(offersData);
    });

    return () => unsubscribe();
  }, [setOffers]);
}
