'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAdmin } from '@/hooks/use-admin';
import Link from 'next/link';
import {
  LayoutDashboard,
  Home as HomeIcon,
  Users,
  AlertTriangle,
  Receipt,
  Settings,
  LogOut,
  ShieldCheck,
  Shield,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { bossAuth as auth } from '@/lib/firebase';

const NAV = [
  { href: '/boss/dashboard', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { href: '/boss/listings', label: 'Annonces', icon: HomeIcon },
  { href: '/boss/users', label: 'Utilisateurs', icon: Users },
  { href: '/boss/disputes', label: 'Litiges', icon: AlertTriangle },
  { href: '/boss/transactions', label: 'Transactions', icon: Receipt },
  { href: '/boss/settings', label: 'Paramètres', icon: Settings },
];

export default function BossLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Ne pas appliquer le layout sur la page de login
  const isLoginPage = pathname === '/boss/login';

  const { isAdmin, loading } = useAdmin(false); // pas de redirect auto

  useEffect(() => {
    if (isLoginPage) return;
    if (!loading && !isAdmin) {
      router.replace('/boss/login');
    }
  }, [isLoginPage, loading, isAdmin, router]);

  // Page login : rendu nu (pas de sidebar)
  if (isLoginPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          Vérification des accès…
        </div>
      </div>
    );
  }
  if (!isAdmin) {
    return null;
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.replace('/boss/login');
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-zinc-900 text-zinc-200 flex flex-col flex-shrink-0">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Awder Boss</div>
            <div className="text-xs text-zinc-500">Backoffice</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${
                  active
                    ? 'bg-orange-500/20 text-orange-300 font-medium'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-zinc-800 p-3">
          <div className="px-3 py-2 mb-1">
            <div className="flex items-center gap-1.5 text-xs text-emerald-400">
              <ShieldCheck className="w-3 h-3" />
              Accès admin actif
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-6 py-6">{children}</div>
      </main>
    </div>
  );
}
