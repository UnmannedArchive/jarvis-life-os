import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/providers/AppShell';

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
      </body>
    </html>
  );
}
