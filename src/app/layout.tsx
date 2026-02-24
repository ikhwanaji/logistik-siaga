import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import "leaflet/dist/leaflet.css";
import { Toaster } from "sonner";
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Logistik Siaga',
  description: 'Aplikasi Tanggap Darurat Bencana',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={jakarta.className}>
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
