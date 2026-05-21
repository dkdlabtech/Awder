'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MobileLayout } from '@/components/mobile-layout';
import { useAuth } from '@/hooks/use-auth';
import { useGuestBookings } from '@/hooks/use-bookings';
import LoginModal from '@/components/auth/LoginModal';
import { callBookingAction } from '@/lib/booking-actions';
import { Calendar, CheckCircle2, Clock, XCircle, Star, Loader2, LogIn } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_payment: { label: 'En attente de paiement', color: 'bg-amber-50 text-amber-700' },
  paid_escrow: { label: 'Confirmée — Escrow actif', color: 'bg-emerald-50 text-emerald-700' },
  completed: { label: 'Terminée', color: 'bg-slate-100 text-slate-600' },
  cancelled: { label: 'Annulée', color: 'bg-red-50 text-red-600' },
  disputed: { label: 'Litige en cours', color: 'bg-orange-50 text-orange-700' },
};

function formatXOF(n: number) {
  return `${Math.round(n).toLocaleString('fr-FR')} FCFA`;
}

export default function BookingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { bookings, loading } = useGuestBookings(user?.uid ?? null);
  const [showLogin, setShowLogin] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAction = async (bookingId: string, action: 'check_in' | 'check_out' | 'release_caution' | 'cancel') => {
    setActionLoading(bookingId + action);
    setError(null);
    try {
      await callBookingAction(bookingId, action);
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de l\'action.');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) {
    return (
      <MobileLayout activeTab="bookings">
        <div className="px-6 py-16 text-center space-y-6">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
            <Calendar className="w-8 h-8 text-slate-300" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-awder-brun">Mes Réserves</h2>
            <p className="text-sm text-slate-400 font-medium italic">AN BÈ KOUN KE !</p>
            <p className="text-sm text-slate-500 mt-4">Connectez-vous pour voir vos réservations.</p>
          </div>
          <button
            onClick={() => setShowLogin(true)}
            className="w-full py-4 bg-awder-ocre text-white rounded-[32px] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            Se connecter
          </button>
        </div>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} onSuccess={() => router.refresh()} />}
      </MobileLayout>
    );
  }

  return (
    <MobileLayout activeTab="bookings">
      <div className="px-6 py-10 space-y-6 pb-32">
        <div>
          <h2 className="text-4xl font-black text-awder-brun tracking-tighter">Mes Réserves</h2>
          <p className="text-sm text-awder-gold font-black uppercase tracking-[0.2em] italic mt-1">AN BÈ KOUN KE !</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-awder-ocre" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="py-20 text-center space-y-4">
            <div className="w-24 h-24 bg-awder-ocre/5 rounded-full flex items-center justify-center mx-auto">
              <Calendar className="w-10 h-10 text-awder-ocre/30" />
            </div>
            <p className="text-awder-brun font-black text-lg">Aucune réserve active</p>
            <p className="text-slate-400 text-sm font-medium">
              Découvrez nos lieux d'exception pour commencer l'aventure.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-awder-ocre text-white rounded-full font-black text-sm"
            >
              Explorer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const status = STATUS_CONFIG[booking.status] ?? { label: booking.status, color: 'bg-slate-100 text-slate-600' };
              return (
                <div key={booking.id} className="bg-white rounded-[32px] border border-slate-100 p-6 space-y-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-black text-awder-brun text-lg leading-tight">{booking.listingTitle}</p>
                      <p className="text-xs text-slate-400 font-bold mt-1">
                        {booking.startDate} → {booking.endDate} · {booking.nights} nuit{booking.nights > 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${status.color}`}>
                      {status.label}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                    <p className="text-awder-ocre font-black">{formatXOF(booking.totalPrice)}</p>
                    <div className="flex gap-2">
                      {booking.status === 'paid_escrow' && booking.checkInStatus === 'pending' && (
                        <ActionButton
                          label="Check-in"
                          icon={<CheckCircle2 className="w-4 h-4" />}
                          color="bg-emerald-600"
                          loading={actionLoading === booking.id + 'check_in'}
                          onClick={() => handleAction(booking.id, 'check_in')}
                        />
                      )}
                      {booking.status === 'paid_escrow' && booking.checkInStatus === 'checked_in' && (
                        <ActionButton
                          label="Check-out"
                          icon={<Clock className="w-4 h-4" />}
                          color="bg-awder-brun"
                          loading={actionLoading === booking.id + 'check_out'}
                          onClick={() => handleAction(booking.id, 'check_out')}
                        />
                      )}
                      {booking.status === 'paid_escrow' && booking.checkInStatus === 'checked_out' && booking.cautionStatus === 'blocked' && (
                        <ActionButton
                          label="Libérer caution"
                          icon={<Star className="w-4 h-4" />}
                          color="bg-awder-gold"
                          loading={actionLoading === booking.id + 'release_caution'}
                          onClick={() => handleAction(booking.id, 'release_caution')}
                        />
                      )}
                      {booking.status === 'pending_payment' && (
                        <ActionButton
                          label="Annuler"
                          icon={<XCircle className="w-4 h-4" />}
                          color="bg-red-500"
                          loading={actionLoading === booking.id + 'cancel'}
                          onClick={() => handleAction(booking.id, 'cancel')}
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileLayout>
  );
}

function ActionButton({ label, icon, color, loading, onClick }: {
  label: string; icon: React.ReactNode; color: string;
  loading: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`${color} text-white text-xs font-black px-3 py-2 rounded-xl flex items-center gap-1 disabled:opacity-60`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </button>
  );
}
