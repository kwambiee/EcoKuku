import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kwamboka Poultry Farm | Healthy Chicks, Kibera Nairobi',
  description: 'Healthy chicks by age — Day-old (KSh 110), 1 week (KSh 150), 2 weeks (KSh 190), 3 weeks (KSh 230). Submit a booking and we call you back. By Kibera, for Kibera.',
  keywords: 'chicks, day-old chicks, Kienyeji, Nairobi, poultry farm, Kwamboka, Kibera, vaccination, feed, incubation',
  openGraph: {
    title: 'Kwamboka Poultry Farm — Healthy Chicks for a Brighter Tomorrow',
    description: 'Order healthy chicks by age from our farm in Kibera. Submit your details and we call you back to confirm.',
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
        <Providers>
          <div className="flex flex-col min-h-screen">
            {children}
          </div>
          {/* WhatsApp float — update phone number below */}
          <a
            href="https://wa.me/254182193380?text=Hello%20Kwamboka%20Poultry%20Farm!%20I%20would%20like%20to%20make%20an%20order."
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat with us on WhatsApp"
            className="fixed bottom-5 right-5 z-50 flex items-center gap-2 text-white pl-3 pr-4 py-3 rounded-full shadow-xl transition-colors"
            style={{ background: '#1B4D2E', boxShadow: '0 4px 20px rgba(27,77,46,0.4)' }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            <span className="text-sm font-semibold">Chat with us</span>
          </a>
        </Providers>
      </body>
    </html>
  );
}
