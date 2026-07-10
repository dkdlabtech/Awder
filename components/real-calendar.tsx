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

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export const RealCalendar: React.FC<RealCalendarProps> = ({
  bookedRanges = [],
  value,
  onChange,
  disablePast = true,
}) => {
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(new Date()));
  const today = startOfDay(new Date());

  const days = useMemo(() => {
    const start = startOfMonth(viewMonth);
    const end = endOfMonth(viewMonth);
    // Lundi=0, Dim=6 (semaine européenne)
    const offset = (start.getDay() + 6) % 7;
    const total = end.getDate();
    const cells: Array<{ date: Date | null }> = [];
    for (let i = 0; i < offset; i++) cells.push({ date: null });
    for (let d = 1; d <= total; d++) {
      cells.push({ date: new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d) });
    }
    return cells;
  }, [viewMonth]);

  const isBooked = (date: Date): boolean =>
    bookedRanges.some((r) =>
      isWithinInterval(date, { start: startOfDay(r.start), end: startOfDay(r.end) })
    );

  const isPast = (date: Date): boolean => disablePast && isBefore(date, today);

  const isStart = (date: Date) => value.start && isSameDay(date, value.start);
  const isEnd = (date: Date) => value.end && isSameDay(date, value.end);
  const isInRange = (date: Date) =>
    value.start && value.end &&
    isBefore(value.start, date) && isBefore(date, value.end);

  const handlePick = (date: Date) => {
    if (isPast(date) || isBooked(date)) return;
    if (!value.start || (value.start && value.end)) {
      onChange({ start: date, end: null });
    } else if (isBefore(value.start, date)) {
      onChange({ start: value.start, end: date });
    } else {
      onChange({ start: date, end: null });
    }
  };

  const canGoPrev = !isBefore(startOfMonth(viewMonth), startOfMonth(today));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-2">
        <button
          type="button"
          onClick={() => canGoPrev && setViewMonth(addMonths(viewMonth, -1))}
          disabled={!canGoPrev}
          className="p-2 rounded-xl text-awder-brun disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="text-sm font-semibold text-awder-brun uppercase tracking-widest">
          {format(viewMonth, 'MMMM yyyy', { locale: fr })}
        </p>
        <button
          type="button"
          onClick={() => setViewMonth(addMonths(viewMonth, 1))}
          className="p-2 rounded-xl text-awder-brun"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center">
        {WEEKDAYS.map((d, i) => (
          <span key={`hdr-${i}`} className="text-[8px] font-semibold text-awder-grisbrun/60 uppercase">
            {d}
          </span>
        ))}
        {days.map((cell, i) => {
          if (!cell.date) return <div key={`empty-${i}`} />;
          const date = cell.date;
          const past = isPast(date);
          const booked = isBooked(date);
          const start = isStart(date);
          const end = isEnd(date);
          const inRange = isInRange(date);
          const disabled = past || booked;
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => handlePick(date)}
              className={`aspect-square flex items-center justify-center rounded-xl text-[10px] font-semibold transition-all ${
                disabled
                  ? 'bg-awder-sable/40 text-awder-sable cursor-not-allowed line-through'
                  : start || end
                    ? 'bg-awder-ocre text-white shadow-lg shadow-awder-ocre/20 scale-110'
                    : inRange
                      ? 'bg-awder-ocre/10 text-awder-ocre'
                      : 'bg-awder-sable/40 text-awder-grisbrun hover:bg-awder-sable'
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      {(value.start || value.end) && (
        <div className="flex justify-between items-center pt-4 border-t border-awder-sable/60 text-xs font-semibold text-awder-brun">
          <div>
            <p className="text-[8px] font-semibold text-awder-grisbrun/60 uppercase tracking-widest">Arrivée</p>
            <p>{value.start ? format(value.start, 'dd MMM yyyy', { locale: fr }) : '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] font-semibold text-awder-grisbrun/60 uppercase tracking-widest">Départ</p>
            <p>{value.end ? format(value.end, 'dd MMM yyyy', { locale: fr }) : '—'}</p>
          </div>
        </div>
      )}
    </div>
  );
};
