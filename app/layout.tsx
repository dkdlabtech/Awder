import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '@/hooks/use-auth';

export const metadata: Metadata = {
  title: 'Awder | Luxe & Sécurité Sira-Djou',
  description: 'Plateforme de réservation premium pour le Mali et l\'Afrique de l\'Ouest.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="fr">
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
