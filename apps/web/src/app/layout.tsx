import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EcoKuku | Farm Fresh Poultry',
  description: 'Farm fresh organic chicken and eggs delivered to your door in Nairobi. Our free-range chickens ensure the highest quality poultry products.',
  keywords: 'chicken, eggs, farm fresh, organic, Nairobi, poultry',
  openGraph: {
    title: 'EcoKuku | Farm Fresh Poultry',
    description: 'Farm to table fresh chicken & eggs from our Nairobi farm',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#27500A" />
      </head>
      <body className="bg-gray-50">
        <div className="flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
