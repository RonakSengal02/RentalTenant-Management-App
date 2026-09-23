import React from 'react';
import { Tenant, PaymentRecord } from '../../types';
import { useLanguage } from '../../i18n';
import { calculateTenantRentStatus, formatDisplayDate, formatOrdinalDay } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/currencyUtils';
import { generateDueReminderMessage, getWhatsAppShareUrl } from '../../utils/receiptUtils';
import { StatusBadge } from '../common/StatusBadge';
import { Phone, MessageCircle, CreditCard, ChevronRight, Home, MapPin } from 'lucide-react';

interface TenantCardProps {
  tenant: Tenant;
  payments: PaymentRecord[];
  onSelect: (tenant: Tenant) => void;
  onRecordPayment: (tenant: Tenant) => void;
}

export const TenantCard: React.FC<TenantCardProps> = ({
  tenant,
  payments,
  onSelect,
  onRecordPayment
}) => {
  const { t, language } = useLanguage();
  const rentStatus = calculateTenantRentStatus(tenant, payments);

  const waText = generateDueReminderMessage(
    tenant,
    rentStatus.dueAmount,
    rentStatus.currentDueCycleDate,
    rentStatus.isDueToday ? 'due_today' : (rentStatus.isOverdue ? 'overdue' : 'upcoming'),
    language
  );
  const waUrl = getWhatsAppShareUrl(tenant.mobile, waText);

  // Border color based on status
  const cardBorderClass = rentStatus.status === 'paid'
    ? 'border-emerald-200/80 hover:border-emerald-400'
    : rentStatus.status === 'overdue'
    ? 'border-rose-300 hover:border-rose-500 bg-rose-50/20'
    : 'border-amber-200/80 hover:border-amber-400';

  return (
    <div
      className={`bg-white rounded-2xl border transition-all duration-200 shadow-card p-4 flex flex-col justify-between ${cardBorderClass} ${
        !tenant.isActive ? 'opacity-60 bg-slate-50' : ''
      }`}
    >
      <div>
        {/* Top Header: Photo, Name, Room, Status */}
        <div className="flex items-start gap-3">
          {/* Tenant Avatar / Photo */}
          <div
            onClick={() => onSelect(tenant)}
            className="relative cursor-pointer shrink-0"
          >
            {tenant.photoUrl ? (
              <img
                src={tenant.photoUrl}
                alt={tenant.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-xs">
                {tenant.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 bg-slate-800 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
              #{tenant.roomNumber}
            </span>
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1">
              <h4
                onClick={() => onSelect(tenant)}
                className="font-bold text-base text-slate-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
              >
                {tenant.name}
              </h4>
              <StatusBadge
                status={rentStatus.status}
                isDueToday={rentStatus.isDueToday}
                size="sm"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
              <span>{tenant.mobile}</span>
            </div>

            {tenant.address && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{tenant.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Financial & Due Date Strip */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 bg-slate-50/70 p-2.5 rounded-xl">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              {t.monthlyRentAmount}
            </span>
            <span className="font-extrabold text-base text-slate-900">
              {formatCurrency(tenant.monthlyRent)}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              {t.rentDueDay}
            </span>
            <span className="font-bold text-xs text-slate-700 block mt-0.5">
              {formatOrdinalDay(tenant.rentDueDay, language)} {language === 'gu' ? 'દર મહિને' : 'every month'}
            </span>
            {rentStatus.status === 'paid' ? (
              <span className="text-[10px] text-emerald-600 font-bold block">
                {rentStatus.billingMonthLabel} {t.paid} ✓
              </span>
            ) : rentStatus.isDueToday ? (
              <span className="text-[10px] text-amber-700 font-bold block">
                {t.dueToday} 🔔
              </span>
            ) : rentStatus.isOverdue ? (
              <span className="text-[10px] text-rose-600 font-bold block">
                {Math.abs(rentStatus.daysDiff)} {language === 'gu' ? 'દિવસ ઓવરડ્યુ' : 'days overdue'} ⚠️
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 font-medium block">
                {rentStatus.daysDiff} {language === 'gu' ? 'દિવસ બાકી' : 'days left'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="mt-3.5 flex items-center justify-between gap-2 pt-1">
        {/* Quick Contact buttons */}
        <div className="flex items-center gap-1.5">
          <a
            href={`tel:${tenant.mobile}`}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title={t.callTenant}
          >
            <Phone className="w-4 h-4" />
          </a>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
            title={t.whatsappReminder}
          >
            <MessageCircle className="w-4 h-4" />
          </a>
          <button
            onClick={() => onSelect(tenant)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title={t.tenantDetails}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Record Rent Payment Button */}
        <button
          onClick={() => onRecordPayment(tenant)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 ${
            rentStatus.status === 'paid'
              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>{rentStatus.status === 'paid' ? (language === 'gu' ? 'ફરી જમા કરો' : 'Record More') : t.recordPaymentBtn}</span>
        </button>
      </div>
    </div>
  );
};
