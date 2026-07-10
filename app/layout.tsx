import type {Metadata, Viewport} from 'next';
import { Cormorant_Garamond, Pinyon_Script, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';
import { SplashScreen } from '@/components/ui/SplashScreen';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-cormorant',
  display: 'swap',
});

const pinyon = Pinyon_Script({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-pinyon',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-jakarta',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Awder | Votre chez-vous, partout chez nous',
  description: 'Plateforme de réservation premium pour le Mali et l\'Afrique de l\'Ouest.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Awder',
  },
  icons: {
    icon: '/logo.jpeg',
    apple: '/logo.jpeg',
  },
};

export const viewport: Viewport = {
  themeColor: '#A64B2A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="fr" className={`${cormorant.variable} ${pinyon.variable} ${jakarta.variable} ${jetbrains.variable}`}>
      <body suppressHydrationWarning>
        <AuthProvider>
          <SplashScreen />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
