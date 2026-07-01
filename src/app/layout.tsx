import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/providers/AppShell';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: 'Life OS',
  description: 'Your personal life operating system — gamified productivity.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-[family-name:var(--font-sans)] antialiased">
        <AppShell>{children}</AppShell>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#18181b',
              border: '1px solid #27272a',
              color: '#fafafa',
            },
            className: 'font-sans',
          }}
          richColors
        />
      </body>
    </html>
  );
}
