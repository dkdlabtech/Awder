'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/hooks/use-admin';

export default function BossIndexPage() {
  const router = useRouter();
  const { isAdmin, loading } = useAdmin(false);

  useEffect(() => {
    if (loading) return;
    if (isAdmin) {
      router.replace('/boss/dashboard');
    } else {
      router.replace('/boss/login');
    }
  }, [isAdmin, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        Redirection...
      </div>
    </div>
  );
}
