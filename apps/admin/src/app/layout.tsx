import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Admin Dashboard | EcoKuku',
  description: 'Farm management and sales dashboard for EcoKuku poultry farm.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-gray-100">
        {children}
      </body>
    </html>
  );
}
