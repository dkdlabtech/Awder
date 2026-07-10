'use client';

import React, { useMemo, useState } from 'react';
import {
  addMonths,
  endOfMonth,
  format,
  isBefore,
  isSameDay,
  isWithinInterval,
  startOfDay,
  startOfMonth,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface RealCalendarProps {
  /** Plages déjà réservées (ne peuvent pas être sélectionnées). */
  bookedRanges?: { start: Date; end: Date }[];
  /** Plage sélectionnée par l'utilisateur. */
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Désactiver les jours passés (par défaut true). */
  disablePast?: boolean;
}

const WEEKDAYS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const RealCalendar: React.FC<RealCalendarProps> = ({
  bookedRanges = [],
  value,
  onChange,
  disablePast = true,
}) => {
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));
  const today = startOfDay(new Date());

  // 42 cellules (6 semaines), avec les jours des mois adjacents grisés
  const cells = useMemo(() => {
    const first = startOfMonth(viewMonth);
    const offset = (first.getDay() + 6) % 7; // Lundi = 0
    const arr: { date: Date; other: boolean }[] = [];
    for (let i = offset; i > 0; i--) {
      arr.push({ date: new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1 - i), other: true });
    }
    const total = endOfMonth(viewMonth).getDate();
    for (let d = 1; d <= total; d++) {
      arr.push({ date: new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d), other: false });
    }
    while (arr.length < 42) {
      const last = arr[arr.length - 1].date;
      arr.push({ date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1), other: true });
    }
    return arr;
  }, [viewMonth]);

  const isBooked = (date: Date) =>
    bookedRanges.some((r) => isWithinInterval(date, { start: startOfDay(r.start), end: startOfDay(r.end) }));
  const isPast = (date: Date) => disablePast && isBefore(date, today);
  const isStart = (date: Date) => !!value.start && isSameDay(date, value.start);
  const isEnd = (date: Date) => !!value.end && isSameDay(date, value.end);
  const isInRange = (date: Date) =>
    !!value.start && !!value.end && isBefore(value.start, date) && isBefore(date, value.end);

  const handlePick = (date: Date) => {
    if (isPast(date) || isBooked(date)) return;
    if (!value.start || (value.start && value.end)) onChange({ start: date, end: null });
    else if (isBefore(value.start, date)) onChange({ start: value.start, end: date });
    else onChange({ start: date, end: null });
  };

  const canGoPrev = !isBefore(startOfMonth(viewMonth), startOfMonth(today));

  return (
    <div className="space-y-4">
      {/* En-tête : navigation + mois */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => canGoPrev && setViewMonth(addMonths(viewMonth, -1))}
          disabled={!canGoPrev}
          aria-label="Mois précédent"
          className="w-9 h-9 grid place-items-center rounded-full border border-awder-ocre/40 text-awder-ocre disabled:opacity-30 active:scale-90 transition-all"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <p className="font-display text-lg font-semibold text-awder-brun">
          {cap(format(viewMonth, 'MMMM yyyy', { locale: fr }))}
        </p>
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          aria-label="Mois suivant"
          className="w-9 h-9 grid place-items-center rounded-full border border-awder-ocre/40 text-awder-ocre active:scale-90 transition-all"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grille bordée */}
      <div className="rounded-2xl border border-awder-sable overflow-hidden">
        {/* Jours de la semaine */}
        <div className="grid grid-cols-7 border-b border-awder-sable">
          {WEEKDAYS.map((d, i) => (
            <span
              key={`hdr-${i}`}
              className="py-2.5 text-center text-[10px] font-semibold tracking-wider text-awder-ocre/70"
            >
              {d}
            </span>
          ))}
        </div>

        {/* Jours */}
        <div className="grid grid-cols-7">
          {cells.map((cell, i) => {
            const { date, other } = cell;
            const past = isPast(date);
            const booked = !other && isBooked(date);
            const start = !other && isStart(date);
            const end = !other && isEnd(date);
            const inRange = !other && isInRange(date);
            const selectedEndpoint = start || end;
            const disabled = other || past || booked;

            // Bordures : masquées sous la plage sélectionnée pour un ruban continu
            const noBorderBand = inRange || selectedEndpoint;
            const borderCls = noBorderBand
              ? ''
              : 'border-b border-r border-awder-sable/70 [&:nth-child(7n)]:border-r-0';

            let stateCls = '';
            let round = '';
            if (other) stateCls = 'text-awder-grisbrun/30';
            else if (booked) stateCls = 'bg-awder-ocre text-white cursor-not-allowed';
            else if (past) stateCls = 'text-awder-grisbrun/30 line-through cursor-not-allowed';
            else if (selectedEndpoint) {
              stateCls = 'bg-awder-gold text-awder-brun-deep';
              round = start && end ? 'rounded-2xl' : start ? 'rounded-l-2xl' : 'rounded-r-2xl';
            } else if (inRange) {
              stateCls = 'bg-awder-gold/25 text-awder-brun';
            } else {
              stateCls = 'text-awder-brun hover:bg-awder-sable/50';
            }

            return (
              <button
                key={i}
                type="button"
                disabled={disabled}
                onClick={() => handlePick(date)}
                className={`relative min-h-[52px] flex flex-col items-center justify-center transition-colors ${borderCls} ${stateCls} ${round}`}
              >
                <span className={`text-sm ${selectedEndpoint ? 'font-semibold' : 'font-medium'}`}>{date.getDate()}</span>
                {start && <span className="text-[8px] leading-none mt-0.5 opacity-90">Début</span>}
                {end && <span className="text-[8px] leading-none mt-0.5 opacity-90">Fin</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Légende */}
      <div className="flex items-center justify-center gap-5 pt-1">
        {[
          { c: 'bg-awder-sable', l: 'Disponible' },
          { c: 'bg-awder-ocre', l: 'Réservé' },
          { c: 'bg-awder-gold', l: 'Sélectionné' },
        ].map((item) => (
          <div key={item.l} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${item.c}`} />
            <span className="text-[11px] text-awder-grisbrun">{item.l}</span>
          </div>
        ))}
      </div>

      {/* Récap des dates choisies */}
      {(value.start || value.end) && (
        <div className="flex justify-between items-center pt-3 border-t border-awder-sable text-sm">
          <div>
            <p className="awder-label text-awder-grisbrun">Début du séjour</p>
            <p className="font-semibold text-awder-brun">{value.start ? cap(format(value.start, 'dd MMM yyyy', { locale: fr })) : '—'}</p>
          </div>
          <div className="text-right">
            <p className="awder-label text-awder-grisbrun">Fin du séjour</p>
            <p className="font-semibold text-awder-brun">{value.end ? cap(format(value.end, 'dd MMM yyyy', { locale: fr })) : '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
};
