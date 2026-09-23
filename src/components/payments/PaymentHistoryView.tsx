import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatDisplayDate } from '../../utils/dateUtils';
import { PaymentRecord } from '../../types';
import {
  CreditCard,
  Search,
  Filter,
  Receipt,
  Trash2,
  Calendar,
  Building,
  TrendingUp,
  Download
} from 'lucide-react';
import { exportToCSV } from '../../db/storage';

interface PaymentHistoryViewProps {
  onOpenRecordPayment: () => void;
}

export const PaymentHistoryView: React.FC<PaymentHistoryViewProps> = ({ onOpenRecordPayment }) => {
  const { t, language } = useLanguage();
  const { payments, tenants, deletePayment, setSelectedReceiptPayment } = useApp();

  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('all');
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calculate summaries: This Month, This Year, All Time
  const summaries = useMemo(() => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonthKey = `${curYear}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    let thisMonth = 0;
    let thisYear = 0;
    let allTime = 0;

    payments.forEach((p) => {
      allTime += p.amountPaid;
      if (p.billingMonth === curMonthKey) {
        thisMonth += p.amountPaid;
      }
      if (p.paymentDate.startsWith(String(curYear))) {
        thisYear += p.amountPaid;
      }
    });

    return { thisMonth, thisYear, allTime };
  }, [payments]);

  // Filtered payments
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (selectedTenantFilter !== 'all' && p.tenantId !== selectedTenantFilter) {
        return false;
      }
      if (selectedMethodFilter !== 'all' && p.paymentMethod !== selectedMethodFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          p.tenantName.toLowerCase().includes(q) ||
          p.roomNumber.toLowerCase().includes(q) ||
          p.billingMonthLabel.toLowerCase().includes(q) ||
          (p.referenceNotes && p.referenceNotes.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [payments, selectedTenantFilter, selectedMethodFilter, searchQuery]);

  return (
    <div className="space-y-4 pb-20 pt-2 animate-fade-in">
      {/* Top Title & Record Payment */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-extrabold text-lg text-slate-900 tracking-tight">
            {t.paymentsTitle}
          </h2>
          <p className="text-xs text-slate-500">
            {language === 'gu' ? 'તમામ ચુકવણી વ્યવહારો અને પહોંચ' : 'All transaction ledgers & rent receipts'}
          </p>
        </div>

        <button
          onClick={onOpenRecordPayment}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95"
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>{t.recordPaymentBtn}</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            {t.thisMonth}
          </span>
          <div className="font-extrabold text-base text-emerald-600 mt-0.5 truncate">
            {formatCurrency(summaries.thisMonth)}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            {t.thisYear}
          </span>
          <div className="font-extrabold text-base text-blue-600 mt-0.5 truncate">
            {formatCurrency(summaries.thisYear)}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-card">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            {t.totalCollected}
          </span>
          <div className="font-extrabold text-base text-slate-900 mt-0.5 truncate">
            {formatCurrency(summaries.allTime)}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-card space-y-2.5">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 gap-2">
          {/* Tenant Filter */}
          <select
            value={selectedTenantFilter}
            onChange={(e) => setSelectedTenantFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
          >
            <option value="all">
              {language === 'gu' ? 'બધા ભાડુઆત' : 'All Tenants'}
            </option>
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} (#{t.roomNumber})
              </option>
            ))}
          </select>

          {/* Payment Method Filter */}
          <select
            value={selectedMethodFilter}
            onChange={(e) => setSelectedMethodFilter(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
          >
            <option value="all">
              {language === 'gu' ? 'બધી પદ્ધતિઓ' : 'All Methods'}
            </option>
            <option value="UPI">UPI (GPay/PhonePe)</option>
            <option value="Cash">Cash (રોકડ)</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {filteredPayments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-card">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <CreditCard className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-base text-slate-800">
            {language === 'gu' ? 'કોઈ વ્યવહાર મળ્યો નથી' : 'No Payment Transactions'}
          </h4>
          <p className="text-xs text-slate-400 mt-1">{t.emptyPayments}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>{language === 'gu' ? 'વ્યવહાર યાદી' : 'Transactions'} ({filteredPayments.length})</span>
            <button
              onClick={() => exportToCSV()}
              className="text-blue-600 hover:underline inline-flex items-center gap-1 font-bold text-[11px]"
            >
              <Download className="w-3 h-3" />
              <span>{language === 'gu' ? 'Excel એક્સપોર્ટ' : 'Export CSV'}</span>
            </button>
          </div>

          {filteredPayments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-card flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-sm text-slate-900 truncate">
                    {payment.tenantName}
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    #{payment.roomNumber}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                  <span className="font-medium text-slate-800">
                    {payment.billingMonthLabel}
                  </span>
                  <span>•</span>
                  <span>{formatDisplayDate(payment.paymentDate, language)}</span>
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {payment.paymentMethod}
                  </span>
                  {payment.referenceNotes && (
                    <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                      {payment.referenceNotes}
                    </span>
                  )}
                </div>
              </div>

              {/* Amount & Actions */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <span className="font-extrabold text-base text-emerald-600">
                  +{formatCurrency(payment.amountPaid)}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSelectedReceiptPayment(payment)}
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                    title={t.viewReceipt}
                  >
                    <Receipt className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(t.confirmDelete)) {
                        deletePayment(payment.id);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                    title={t.delete}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
