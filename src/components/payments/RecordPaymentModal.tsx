import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { Tenant, PaymentMethod, PaymentRecord } from '../../types';
import { calculateTenantRentStatus, formatDateToISO, MONTH_NAMES_EN, MONTH_NAMES_GU } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/currencyUtils';
import { X, Check, CreditCard, Calendar, FileText, User } from 'lucide-react';

interface RecordPaymentModalProps {
  isOpen: boolean;
  preselectedTenant?: Tenant | null;
  onClose: () => void;
  onSuccess: (payment: PaymentRecord) => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  preselectedTenant,
  onClose,
  onSuccess
}) => {
  const { t, language } = useLanguage();
  const { tenants, payments, recordRentPayment } = useApp();

  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(formatDateToISO(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [referenceNotes, setReferenceNotes] = useState<string>('');
  const [billingMonth, setBillingMonth] = useState<string>('');
  const [billingMonthLabel, setBillingMonthLabel] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Month options generation (past 3 months, current, next 2 months)
  const monthOptions = React.useMemo(() => {
    const list: { key: string; label: string }[] = [];
    const today = new Date();
    for (let i = -2; i <= 2; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthName = language === 'gu' ? MONTH_NAMES_GU[d.getMonth()] : MONTH_NAMES_EN[d.getMonth()];
      list.push({
        key,
        label: `${monthName} ${d.getFullYear()}`
      });
    }
    return list;
  }, [language]);

  // Set default month to current month
  useEffect(() => {
    const today = new Date();
    const curKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const curName = language === 'gu' ? MONTH_NAMES_GU[today.getMonth()] : MONTH_NAMES_EN[today.getMonth()];
    setBillingMonth(curKey);
    setBillingMonthLabel(`${curName} ${today.getFullYear()}`);
  }, [language, isOpen]);

  // Initialize selected tenant and rent amount
  useEffect(() => {
    if (!isOpen) return;

    const tenant = preselectedTenant || (tenants.length > 0 ? tenants[0] : null);
    if (tenant) {
      setSelectedTenantId(tenant.id);
      const status = calculateTenantRentStatus(tenant, payments);
      const defaultAmount = status.dueAmount > 0 ? status.dueAmount : tenant.monthlyRent;
      setAmountPaid(String(defaultAmount));
    }
    setPaymentDate(formatDateToISO(new Date()));
    setPaymentMethod('UPI');
    setReferenceNotes('');
    setErrors({});
  }, [isOpen, preselectedTenant, tenants]);

  // When selected tenant changes, update default amount
  const handleTenantChange = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      const status = calculateTenantRentStatus(tenant, payments);
      const defaultAmount = status.dueAmount > 0 ? status.dueAmount : tenant.monthlyRent;
      setAmountPaid(String(defaultAmount));
    }
  };

  const handleMonthChange = (key: string) => {
    setBillingMonth(key);
    const opt = monthOptions.find((m) => m.key === key);
    if (opt) {
      setBillingMonthLabel(opt.label);
    }
  };

  if (!isOpen) return null;

  const currentTenant = tenants.find((t) => t.id === selectedTenantId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) {
      setErrors({ tenant: 'Please select a tenant' });
      return;
    }

    if (!amountPaid || isNaN(Number(amountPaid)) || Number(amountPaid) <= 0) {
      setErrors({ amount: language === 'gu' ? 'કૃપા કરીને માન્ય રકમ દાખલ કરો' : 'Please enter a valid amount' });
      return;
    }

    try {
      setIsSubmitting(true);
      const newPayment = await recordRentPayment({
        tenantId: currentTenant.id,
        tenantName: currentTenant.name,
        roomNumber: currentTenant.roomNumber,
        amountPaid: Number(amountPaid),
        billingMonth,
        billingMonthLabel,
        paymentDate,
        paymentMethod,
        referenceNotes: referenceNotes.trim()
      });

      onSuccess(newPayment);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-modal overflow-hidden my-6 border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-emerald-50/40">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-600 text-white">
              <CreditCard className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-base text-slate-900">
              {t.recordPaymentModalTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tenant Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.selectTenant} *
            </label>
            <select
              value={selectedTenantId}
              onChange={(e) => handleTenantChange(e.target.value)}
              disabled={Boolean(preselectedTenant)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Room #{t.roomNumber}) - Rent: {formatCurrency(t.monthlyRent)}
                </option>
              ))}
            </select>
          </div>

          {/* Billing Month Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.billingMonth}
            </label>
            <select
              value={billingMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              {monthOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Amount Paid */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.rentAmountPaid} *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-base">
                ₹
              </span>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                placeholder="7000"
                className={`w-full pl-9 pr-3 py-3 rounded-xl border text-base font-extrabold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 ${
                  errors.amount ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-emerald-500'
                }`}
              />
            </div>
            {errors.amount && <p className="text-[11px] text-rose-500 mt-1">{errors.amount}</p>}
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.paymentDate} *
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {t.paymentMethod} *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['UPI', 'Cash', 'Bank Transfer', 'Other'] as PaymentMethod[]).map((method) => {
                const isSelected = paymentMethod === method;
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span>
                      {method === 'Cash'
                        ? t.methodCash
                        : method === 'UPI'
                        ? t.methodUPI
                        : method === 'Bank Transfer'
                        ? t.methodBank
                        : t.methodOther}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reference Notes / Transaction ID */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.paymentRefNotes}
            </label>
            <input
              type="text"
              value={referenceNotes}
              onChange={(e) => setReferenceNotes(e.target.value)}
              placeholder={t.paymentRefPlaceholder}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? t.loading : (language === 'gu' ? 'જમા કરો અને પહોંચ મેળવો' : 'Save & View Receipt')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
