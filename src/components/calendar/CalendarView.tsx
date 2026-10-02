import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { CalendarEvent, Tenant } from '../../types';
import { getCalendarEventsForMonth } from '../../utils/calendarUtils';
import { formatCurrency } from '../../utils/currencyUtils';
import { MONTH_NAMES_EN, MONTH_NAMES_GU, formatDisplayDate } from '../../utils/dateUtils';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  AlertCircle,
  LogIn,
  LogOut,
  Clock,
  User,
  Filter
} from 'lucide-react';

interface CalendarViewProps {
  onSelectTenant?: (tenant: Tenant) => void;
  onOpenRecordPayment?: () => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onSelectTenant,
  onOpenRecordPayment
}) => {
  const { t, language } = useLanguage();
  const { tenants, payments } = useApp();

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(today.getMonth());
  const [selectedDateISO, setSelectedDateISO] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );
  const [filterType, setFilterType] = useState<string>('all');

  const monthLabel = `${language === 'gu' ? MONTH_NAMES_GU[selectedMonthIndex] : MONTH_NAMES_EN[selectedMonthIndex]} ${selectedYear}`;

  const handlePrevMonth = () => {
    if (selectedMonthIndex === 0) {
      setSelectedMonthIndex(11);
      setSelectedYear((prev) => prev - 1);
    } else {
      setSelectedMonthIndex((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonthIndex === 11) {
      setSelectedMonthIndex(0);
      setSelectedYear((prev) => prev + 1);
    } else {
      setSelectedMonthIndex((prev) => prev + 1);
    }
  };

  const handleGoToday = () => {
    setSelectedYear(today.getFullYear());
    setSelectedMonthIndex(today.getMonth());
    setSelectedDateISO(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    );
  };

  // Get all events for the current month
  const rawEvents = useMemo(() => {
    return getCalendarEventsForMonth(selectedYear, selectedMonthIndex, tenants, payments);
  }, [selectedYear, selectedMonthIndex, tenants, payments]);

  // Filter events
  const filteredEvents = useMemo(() => {
    if (filterType === 'all') return rawEvents;
    if (filterType === 'rent') return rawEvents.filter((e) => e.type === 'rent_due' || e.type === 'overdue');
    if (filterType === 'payments') return rawEvents.filter((e) => e.type === 'payment_received');
    if (filterType === 'moves') return rawEvents.filter((e) => e.type === 'move_in' || e.type === 'move_out' || e.type === 'stay_expiry');
    return rawEvents;
  }, [rawEvents, filterType]);

  // Group events by ISO date
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach((event) => {
      const list = map.get(event.date) || [];
      list.push(event);
      map.set(event.date, list);
    });
    return map;
  }, [filteredEvents]);

  // Compute days matrix for the month
  const daysInMonth = new Date(selectedYear, selectedMonthIndex + 1, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonthIndex, 1).getDay(); // 0 is Sunday

  // Days array (padding + actual days)
  const calendarCells = useMemo(() => {
    const cells: { day: number | null; iso: string | null }[] = [];
    // Padding before 1st of month
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({ day: null, iso: null });
    }
    // Days 1..daysInMonth
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, iso });
    }
    return cells;
  }, [selectedYear, selectedMonthIndex, daysInMonth, firstDayOfWeek]);

  // Selected date's events
  const selectedDayEvents = useMemo(() => {
    return eventsByDate.get(selectedDateISO) || [];
  }, [eventsByDate, selectedDateISO]);

  const weekdays = language === 'gu'
    ? ['રવિ', 'સોમ', 'મંગળ', 'બુધ', 'ગુરુ', 'શુક્ર', 'શનિ']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4 pb-20 pt-2 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-indigo-600" />
            <span>{language === 'gu' ? 'ભાડા કેલેન્ડર' : 'Rental Events Calendar'}</span>
          </h2>
          <p className="text-xs text-slate-500">
            {language === 'gu' ? 'ચુકવણી, ભાડું તારીખ અને ખાલી થવાની તારીખો' : 'Rent dues, payments received, and move-in/out schedules'}
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto self-start sm:self-auto">
          {[
            { key: 'all', label: language === 'gu' ? 'બધા' : 'All' },
            { key: 'rent', label: language === 'gu' ? 'બાકી તારીખ' : 'Due Dates' },
            { key: 'payments', label: language === 'gu' ? 'ચુકવણીઓ' : 'Payments' },
            { key: 'moves', label: language === 'gu' ? 'આવ્યા / ગયા' : 'Moves' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterType === tab.key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Month Navigator */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-card flex items-center justify-between">
        <button
          onClick={handlePrevMonth}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="text-center">
            <h3 className="font-extrabold text-base text-slate-900">{monthLabel}</h3>
            <span className="text-[10px] text-slate-400 font-medium">
              {filteredEvents.length} {language === 'gu' ? 'ઇવેન્ટ્સ' : 'events scheduled'}
            </span>
          </div>

          <button
            onClick={handleGoToday}
            className="text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-200 transition-colors"
          >
            {language === 'gu' ? 'આજે' : 'Today'}
          </button>
        </div>

        <button
          onClick={handleNextMonth}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-3 sm:p-4">
        {/* Day Header Row */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {weekdays.map((wd, i) => (
            <div
              key={wd}
              className={`text-[11px] font-extrabold uppercase py-1 ${
                i === 0 || i === 6 ? 'text-rose-500' : 'text-slate-500'
              }`}
            >
              {wd}
            </div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 gap-1">
          {calendarCells.map((cell, idx) => {
            if (!cell.day || !cell.iso) {
              return <div key={`empty-${idx}`} className="h-14 sm:h-16 rounded-xl bg-slate-50/50" />;
            }

            const dayEvents = eventsByDate.get(cell.iso) || [];
            const isToday =
              today.getFullYear() === selectedYear &&
              today.getMonth() === selectedMonthIndex &&
              today.getDate() === cell.day;
            const isSelected = selectedDateISO === cell.iso;

            const hasRentDue = dayEvents.some((e) => e.type === 'rent_due');
            const hasOverdue = dayEvents.some((e) => e.type === 'overdue');
            const hasPayment = dayEvents.some((e) => e.type === 'payment_received');
            const hasMove = dayEvents.some((e) => e.type === 'move_in' || e.type === 'move_out' || e.type === 'stay_expiry');

            return (
              <button
                key={cell.iso}
                onClick={() => setSelectedDateISO(cell.iso!)}
                className={`h-14 sm:h-16 p-1 rounded-xl text-left flex flex-col justify-between transition-all border ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-xs ring-2 ring-indigo-500/20'
                    : isToday
                    ? 'border-blue-400 bg-blue-50/30'
                    : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-black inline-flex items-center justify-center w-5 h-5 rounded-full ${
                      isToday
                        ? 'bg-blue-600 text-white'
                        : isSelected
                        ? 'text-indigo-900'
                        : 'text-slate-800'
                    }`}
                  >
                    {cell.day}
                  </span>

                  {dayEvents.length > 0 && (
                    <span className="text-[9px] font-bold text-slate-400">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Event Indicator Dots */}
                <div className="flex items-center gap-1 flex-wrap mt-auto">
                  {hasOverdue && <span className="w-2 h-2 rounded-full bg-rose-500" title="Overdue" />}
                  {hasRentDue && !hasOverdue && <span className="w-2 h-2 rounded-full bg-amber-500" title="Rent Due" />}
                  {hasPayment && <span className="w-2 h-2 rounded-full bg-emerald-500" title="Payment Received" />}
                  {hasMove && <span className="w-2 h-2 rounded-full bg-blue-500" title="Move In/Out" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Agenda */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-card p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-600" />
            <h4 className="font-extrabold text-sm text-slate-900">
              {formatDisplayDate(selectedDateISO, language)}
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            {selectedDayEvents.length} {language === 'gu' ? 'ઇવેન્ટ્સ' : 'events on this day'}
          </span>
        </div>

        {selectedDayEvents.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs">
            {language === 'gu' ? 'આ દિવસે કોઈ નિર્ધારિત પ્રવૃત્તિ નથી' : 'No scheduled activities on this date.'}
          </div>
        ) : (
          <div className="space-y-2">
            {selectedDayEvents.map((event) => {
              const tenant = tenants.find((t) => t.id === event.tenantId);

              return (
                <div
                  key={event.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3 hover:bg-slate-100/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`p-2 rounded-xl text-white shrink-0 ${
                        event.type === 'payment_received'
                          ? 'bg-emerald-600'
                          : event.type === 'overdue'
                          ? 'bg-rose-600'
                          : event.type === 'rent_due'
                          ? 'bg-amber-500'
                          : event.type === 'move_in'
                          ? 'bg-blue-600'
                          : 'bg-purple-600'
                      }`}
                    >
                      {event.type === 'payment_received' ? (
                        <CreditCard className="w-4 h-4" />
                      ) : event.type === 'overdue' || event.type === 'rent_due' ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : event.type === 'move_in' ? (
                        <LogIn className="w-4 h-4" />
                      ) : (
                        <LogOut className="w-4 h-4" />
                      )}
                    </span>

                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                        <span>{event.title}</span>
                        {tenant?.tenantCode && (
                          <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1 py-0.2 rounded">
                            {tenant.tenantCode}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {tenant ? `Room #${tenant.roomNumber} • ${tenant.mobile}` : ''}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {event.amount && (
                      <span
                        className={`font-black text-xs ${
                          event.type === 'payment_received' ? 'text-emerald-600' : 'text-slate-800'
                        }`}
                      >
                        {event.type === 'payment_received' ? '+' : ''}
                        {formatCurrency(event.amount)}
                      </span>
                    )}

                    {tenant && onSelectTenant && (
                      <button
                        onClick={() => onSelectTenant(tenant)}
                        className="text-[11px] font-bold text-indigo-600 hover:underline ml-1"
                      >
                        {language === 'gu' ? 'જુઓ' : 'View'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
