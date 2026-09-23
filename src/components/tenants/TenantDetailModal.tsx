import React, { useState } from 'react';
import { Tenant, PaymentRecord } from '../../types';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { calculateTenantRentStatus, formatDisplayDate, formatOrdinalDay } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/currencyUtils';
import { generateDueReminderMessage, getWhatsAppShareUrl } from '../../utils/receiptUtils';
import { StatusBadge } from '../common/StatusBadge';
import {
  X,
  Phone,
  MessageCircle,
  CreditCard,
  Edit2,
  Trash2,
  Calendar,
  Home,
  Shield,
  MapPin,
  CheckCircle,
  Receipt,
  FileDown
} from 'lucide-react';
import { downloadTenantStatementPDF } from '../../utils/pdfUtils';

interface TenantDetailModalProps {
  tenant: Tenant | null;
  onClose: () => void;
  onEdit: (tenant: Tenant) => void;
  onRecordPayment: (tenant: Tenant) => void;
}

export const TenantDetailModal: React.FC<TenantDetailModalProps> = ({
  tenant,
  onClose,
  onEdit,
  onRecordPayment
}) => {
  const { t, language } = useLanguage();
  const { payments, deleteTenant, setSelectedReceiptPayment } = useApp();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!tenant) return null;

  const rentStatus = calculateTenantRentStatus(tenant, payments);

  // Payments for this tenant
  const tenantPayments = payments.filter((p) => p.tenantId === tenant.id);
  const totalPaidAllTime = tenantPayments.reduce((acc, curr) => acc + curr.amountPaid, 0);

  const waText = generateDueReminderMessage(
    tenant,
    rentStatus.dueAmount,
    rentStatus.currentDueCycleDate,
    rentStatus.isDueToday ? 'due_today' : (rentStatus.isOverdue ? 'overdue' : 'upcoming'),
    language
  );
  const waUrl = getWhatsAppShareUrl(tenant.mobile, waText);

  const handleDelete = async () => {
    await deleteTenant(tenant.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-modal overflow-hidden my-6 border border-slate-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {t.tenantDetails}
          </span>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Header */}
        <div className="p-5 max-h-[80vh] overflow-y-auto space-y-4">
          <div className="flex items-center gap-4">
            {tenant.photoUrl ? (
              <img
                src={tenant.photoUrl}
                alt={tenant.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 shadow-sm"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-sm">
                {tenant.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-slate-900 truncate">
                  {tenant.name}
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                  #{tenant.roomNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{tenant.mobile}</p>
              <div className="mt-1.5">
                <StatusBadge
                  status={rentStatus.status}
                  isDueToday={rentStatus.isDueToday}
                  size="sm"
                />
              </div>
            </div>
          </div>

          {/* Quick Contact & Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <a
              href={`tel:${tenant.mobile}`}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
            >
              <Phone className="w-4 h-4 text-blue-600" />
              <span>{t.callTenant}</span>
            </a>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              <span>{language === 'gu' ? 'વોટ્સએપ' : 'WhatsApp'}</span>
            </a>

            <button
              onClick={() => onRecordPayment(tenant)}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              <span>{language === 'gu' ? 'ભાડું જમા' : 'Pay Rent'}</span>
            </button>
          </div>

          {/* Key Information Grid */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200/60">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {t.monthlyRentAmount}
                </span>
                <span className="font-extrabold text-base text-slate-900">
                  {formatCurrency(tenant.monthlyRent)}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {t.rentDueDay}
                </span>
                <span className="font-bold text-sm text-slate-800">
                  {formatOrdinalDay(tenant.rentDueDay, language)} {language === 'gu' ? 'દર મહિને' : 'every month'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200/60">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {t.securityDeposit}
                </span>
                <span className="font-bold text-sm text-slate-800">
                  {formatCurrency(tenant.securityDeposit)}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {t.joiningDate}
                </span>
                <span className="font-bold text-xs text-slate-700">
                  {formatDisplayDate(tenant.joiningDate, language)}
                </span>
              </div>
            </div>

            {tenant.address && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {t.address}
                </span>
                <p className="text-xs text-slate-700 mt-0.5">{tenant.address}</p>
              </div>
            )}

            {tenant.notes && (
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  {language === 'gu' ? 'વિશેષ નોંધ' : 'Notes'}
                </span>
                <p className="text-xs text-slate-600 mt-0.5 italic">{tenant.notes}</p>
              </div>
            )}
          </div>

          {/* Payment History for this tenant */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                {language === 'gu' ? 'ચુકવણી ઇતિહાસ' : 'Payment History'} ({tenantPayments.length})
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadTenantStatementPDF(tenant, tenantPayments, language)}
                  className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                  title="Download Statement (PDF)"
                >
                  <FileDown className="w-3 h-3 text-blue-600" />
                  <span>PDF</span>
                </button>
                <span className="text-xs font-extrabold text-emerald-600">
                  {language === 'gu' ? 'કુલ:' : 'Total:'} {formatCurrency(totalPaidAllTime)}
                </span>
              </div>
            </div>

            {tenantPayments.length === 0 ? (
              <p className="text-xs text-slate-400 p-4 bg-slate-50 rounded-xl text-center">
                {t.emptyPayments}
              </p>
            ) : (
              <div className="space-y-2">
                {tenantPayments.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => setSelectedReceiptPayment(p)}
                    className="p-3 rounded-xl bg-white border border-slate-200 hover:border-blue-300 flex items-center justify-between cursor-pointer transition-all shadow-2xs"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-800">
                        {p.billingMonthLabel}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatDisplayDate(p.paymentDate, language)} • {p.paymentMethod}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-extrabold text-sm text-emerald-600">
                        +{formatCurrency(p.amountPaid)}
                      </div>
                      <span className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1 justify-end">
                        <Receipt className="w-3 h-3" />
                        <span>{t.viewReceipt}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Edit / Delete Row */}
          <div className="pt-2 flex items-center gap-2 border-t border-slate-100">
            <button
              onClick={() => {
                onClose();
                onEdit(tenant);
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{t.edit}</span>
            </button>

            {!showConfirmDelete ? (
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="py-2.5 px-3 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.delete}</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleDelete}
                  className="py-2.5 px-3 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors"
                >
                  {t.yesDelete}
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition-colors"
                >
                  {t.noKeep}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
