import React, { useState } from 'react';
import { Tenant, PaymentRecord } from '../../types';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { calculateTenantRentStatus, formatOrdinalDay } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/currencyUtils';
import { generateDueReminderMessage, getWhatsAppShareUrl } from '../../utils/receiptUtils';
import { downloadTenantStatementPDF } from '../../utils/pdfUtils';
import { StatusBadge } from '../common/StatusBadge';
import {
  Phone,
  MessageCircle,
  CreditCard,
  ChevronRight,
  MapPin,
  FileText,
  MoreVertical,
  Archive,
  RotateCcw,
  UserCheck
} from 'lucide-react';

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
  const { archiveTenant, restoreTenant } = useApp();
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const rentStatus = calculateTenantRentStatus(tenant, payments);

  const waText = generateDueReminderMessage(
    tenant,
    rentStatus.dueAmount,
    rentStatus.currentDueCycleDate,
    rentStatus.isDueToday ? 'due_today' : (rentStatus.isOverdue ? 'overdue' : 'upcoming'),
    language
  );
  const waUrl = getWhatsAppShareUrl(tenant.mobile, waText);

  // Border and accent styling
  const cardBorderClass = tenant.isArchived
    ? 'border-slate-300 opacity-70 bg-slate-100/60'
    : rentStatus.status === 'paid'
    ? 'border-emerald-200 hover:border-emerald-400 bg-white'
    : rentStatus.status === 'partial'
    ? 'border-amber-300 hover:border-amber-500 bg-amber-50/20'
    : rentStatus.status === 'overdue'
    ? 'border-rose-300 hover:border-rose-500 bg-rose-50/20'
    : 'border-slate-200 hover:border-blue-400 bg-white';

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 shadow-card p-4 flex flex-col justify-between relative ${cardBorderClass} ${
        !tenant.isActive && !tenant.isArchived ? 'opacity-75 bg-slate-50' : ''
      }`}
    >
      <div>
        {/* Top Header: Photo, Name, Tenant ID, Room, Status */}
        <div className="flex items-start gap-3">
          {/* Tenant Avatar / Photo */}
          <div onClick={() => onSelect(tenant)} className="relative cursor-pointer shrink-0">
            {tenant.photoUrl ? (
              <img
                src={tenant.photoUrl}
                alt={tenant.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-white shadow-xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-xs">
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
              <div className="flex items-center gap-1.5 min-w-0">
                <h4
                  onClick={() => onSelect(tenant)}
                  className="font-bold text-base text-slate-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                >
                  {tenant.name}
                </h4>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                  {tenant.tenantCode}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {tenant.isArchived ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                    {language === 'gu' ? 'આર્કાઇવ્ડ' : 'Archived'}
                  </span>
                ) : !tenant.isActive ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {language === 'gu' ? 'ખાલી કર્યું' : 'Moved Out'}
                  </span>
                ) : (
                  <StatusBadge
                    status={rentStatus.status}
                    isDueToday={rentStatus.isDueToday}
                    size="sm"
                  />
                )}
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <span>{tenant.mobile}</span>
              {tenant.occupation && <span>• {tenant.occupation}</span>}
            </div>

            {tenant.address && (
              <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5 truncate">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{tenant.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Dropdown Menu */}
        {showMoreMenu && (
          <div className="absolute right-4 top-12 z-20 bg-white rounded-xl shadow-xl border border-slate-200 py-1 text-xs w-44 animate-fade-in">
            <button
              onClick={() => {
                setShowMoreMenu(false);
                onSelect(tenant);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>{t.tenantDetails}</span>
            </button>
            <button
              onClick={() => {
                setShowMoreMenu(false);
                downloadTenantStatementPDF(tenant, payments, language);
              }}
              className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Statement PDF</span>
            </button>
            {!tenant.isActive && (
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  onSelect(tenant);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-emerald-600 font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.startNewStay}</span>
              </button>
            )}
            {tenant.isArchived ? (
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  restoreTenant(tenant.id);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-emerald-600 font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.restoreTenant}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowMoreMenu(false);
                  archiveTenant(tenant.id);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-rose-600 font-semibold"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>{t.archiveTenant}</span>
              </button>
            )}
          </div>
        )}

        {/* Financial & Due Date Strip */}
        <div className="mt-3.5 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 bg-slate-50/80 p-2.5 rounded-xl">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
              {t.monthlyRentAmount}
            </span>
            <span className="font-extrabold text-base text-slate-900">
              {formatCurrency(tenant.monthlyRent)}
            </span>
            {rentStatus.dueAmount > 0 && (
              <span className="text-[11px] font-bold text-rose-600 block">
                Pending: {formatCurrency(rentStatus.dueAmount)}
              </span>
            )}
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
            ) : rentStatus.status === 'partial' ? (
              <span className="text-[10px] text-amber-700 font-bold block">
                {formatCurrency(rentStatus.paidAmountThisCycle)} Paid • Partial ⏱
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

      {/* Action Buttons Footer (Mobile One-Handed Friendly) */}
      <div className="mt-3.5 flex items-center justify-between gap-2 pt-1">
        {/* Quick Contact & Details */}
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
            onClick={() => downloadTenantStatementPDF(tenant, payments, language)}
            className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors"
            title="Download Statement"
          >
            <FileText className="w-4 h-4" />
          </button>
          <button
            onClick={() => onSelect(tenant)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title={t.tenantDetails}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Record Rent Payment or Start New Stay Button */}
        {!tenant.isActive ? (
          <button
            onClick={() => onSelect(tenant)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.startNewStay}</span>
          </button>
        ) : (
          <button
            onClick={() => onRecordPayment(tenant)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 ${
              rentStatus.status === 'paid'
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>
              {rentStatus.status === 'paid'
                ? language === 'gu'
                  ? 'ફરી જમા કરો'
                  : 'Record More'
                : t.recordPaymentBtn}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
