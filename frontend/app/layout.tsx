import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from 'sonner';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'XrayMOD',
  description: 'XRayMOD — secure VPN infrastructure control plane on Cloudflare Workers',
  robots: 'noindex, nofollow',
};

export const viewport: Viewport = {
  themeColor: '#060b12',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&family=Syne:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="dark min-h-screen antialiased">
        <Providers>
          {children}
          <Toaster
            theme="dark"
            position="top-center"
            toastOptions={{
              style: {
                background: '#101b2a',
                border: '1px solid rgba(140,175,210,0.16)',
                color: '#e8eef6',
                fontFamily: 'Manrope, sans-serif',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
