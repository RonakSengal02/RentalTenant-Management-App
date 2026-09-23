import React, { useMemo } from 'react';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { calculateTenantRentStatus, formatDisplayDate, formatOrdinalDay } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/currencyUtils';
import { generateDueReminderMessage, getWhatsAppShareUrl } from '../../utils/receiptUtils';
import { StatusBadge } from '../common/StatusBadge';
import { Tenant, PaymentRecord } from '../../types';
import {
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  PlusCircle,
  CreditCard,
  MessageCircle,
  ArrowRight,
  PhoneCall,
  Receipt
} from 'lucide-react';

interface DashboardViewProps {
  onOpenAddTenant: () => void;
  onOpenRecordPayment: (tenant?: Tenant) => void;
  onSelectTenant: (tenant: Tenant) => void;
  onNavigateToTenants: (filter?: string) => void;
  onNavigateToPayments: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onOpenAddTenant,
  onOpenRecordPayment,
  onSelectTenant,
  onNavigateToTenants,
  onNavigateToPayments
}) => {
  const { t, language } = useLanguage();
  const { tenants, payments, metrics, setSelectedReceiptPayment } = useApp();

  // Compute status for all active tenants
  const activeTenantsWithStatus = useMemo(() => {
    return tenants
      .filter((t) => t.isActive)
      .map((tenant) => ({
        tenant,
        status: calculateTenantRentStatus(tenant, payments)
      }));
  }, [tenants, payments]);

  // Urgent attention: Overdue or Due Today
  const urgentTenants = useMemo(() => {
    return activeTenantsWithStatus.filter(
      (item) => item.status.isDueToday || item.status.isOverdue
    );
  }, [activeTenantsWithStatus]);

  // Upcoming rent in next 7 days
  const upcomingTenants = useMemo(() => {
    return activeTenantsWithStatus
      .filter((item) => item.status.status === 'pending' && !item.status.isDueToday && item.status.daysDiff <= 7 && item.status.daysDiff > 0)
      .sort((a, b) => a.status.daysDiff - b.status.daysDiff);
  }, [activeTenantsWithStatus]);

  // Recent 5 payments
  const recentPayments = useMemo(() => {
    return payments.slice(0, 5);
  }, [payments]);

  // Collection percentage
  const collectionPercentage = metrics.totalMonthlyRentExpected > 0
    ? Math.min(100, Math.round((metrics.rentCollectedThisMonth / metrics.totalMonthlyRentExpected) * 100))
    : 0;

  return (
    <div className="space-y-4 pb-20 pt-2 animate-fade-in">
      {/* Quick Action Top Bar */}
      <div className="flex gap-2">
        <button
          onClick={onOpenAddTenant}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl font-bold shadow-md shadow-blue-500/20 text-sm transition-all active:scale-[0.98]"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t.addTenantBtn}</span>
        </button>
        <button
          onClick={() => onOpenRecordPayment()}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl font-bold shadow-md shadow-emerald-500/20 text-sm transition-all active:scale-[0.98]"
        >
          <CreditCard className="w-4 h-4" />
          <span>{t.recordPaymentBtn}</span>
        </button>
      </div>

      {/* Urgent Attention Alert Banner (Overdue / Due Today) */}
      {urgentTenants.length > 0 && (
        <div className="bg-gradient-to-r from-rose-50 to-amber-50 border border-rose-200 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-rose-500 text-white">
                <AlertCircle className="w-4 h-4" />
              </span>
              <h3 className="font-bold text-sm text-rose-950">
                {language === 'gu' ? 'ત્વરિત ધ્યાન આપો (આજે બાકી / ઓવરડ્યુ)' : 'Attention Needed (Due Today / Overdue)'}
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
              {urgentTenants.length}
            </span>
          </div>

          <div className="space-y-2.5">
            {urgentTenants.slice(0, 3).map(({ tenant, status }) => {
              const waText = generateDueReminderMessage(
                tenant,
                status.dueAmount,
                status.currentDueCycleDate,
                status.isDueToday ? 'due_today' : 'overdue',
                language
              );
              const waUrl = getWhatsAppShareUrl(tenant.mobile, waText);

              return (
                <div
                  key={tenant.id}
                  className="bg-white/90 backdrop-blur rounded-xl p-3 border border-rose-100 flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {tenant.name}
                      </span>
                      <span className="text-xs font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                        #{tenant.roomNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-extrabold text-sm text-rose-600">
                        {formatCurrency(status.dueAmount)}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {status.isDueToday
                          ? (language === 'gu' ? 'આજે ભરવાનું છે' : 'Due today')
                          : (language === 'gu' ? `${Math.abs(status.daysDiff)} દિવસથી ઓવરડ્યુ` : `${Math.abs(status.daysDiff)} days overdue`)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
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
                      onClick={() => onOpenRecordPayment(tenant)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-2xs"
                    >
                      {language === 'gu' ? 'જમા' : 'Pay'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Metrics Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Total Monthly Rent Expected */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-card">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">{t.totalMonthlyRent}</span>
            <span className="p-1.5 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="font-extrabold text-xl text-slate-900">
            {formatCurrency(metrics.totalMonthlyRentExpected)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            {metrics.activeTenants} {t.active} ({t.totalTenants}: {metrics.totalTenants})
          </p>
        </div>

        {/* Rent Collected This Month */}
        <div className="bg-white rounded-2xl p-4 border border-emerald-200/80 shadow-card bg-gradient-to-br from-white via-white to-emerald-50/30">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-xs font-bold">{t.rentCollectedThisMonth}</span>
            <span className="p-1.5 rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="font-extrabold text-xl text-emerald-600">
            {formatCurrency(metrics.rentCollectedThisMonth)}
          </div>
          {/* Progress Bar */}
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${collectionPercentage}%` }}
            ></div>
          </div>
          <p className="text-[10px] font-semibold text-emerald-700 mt-1">
            {collectionPercentage}% {language === 'gu' ? 'વસૂલાત પૂર્ણ' : 'Collected'}
          </p>
        </div>

        {/* Rent Pending This Month */}
        <div className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-card">
          <div className="flex items-center justify-between text-amber-700 mb-2">
            <span className="text-xs font-bold">{t.rentPendingThisMonth}</span>
            <span className="p-1.5 rounded-xl bg-amber-100 text-amber-700">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="font-extrabold text-xl text-amber-600">
            {formatCurrency(metrics.rentPendingThisMonth)}
          </div>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            {metrics.pendingCount + metrics.overdueCount} {language === 'gu' ? 'ભાડુઆત બાકી' : 'Tenants pending'}
          </p>
        </div>

        {/* Paid vs Pending Counts */}
        <div
          onClick={() => onNavigateToTenants()}
          className="bg-white rounded-2xl p-4 border border-slate-200 shadow-card cursor-pointer hover:border-blue-300 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold">{t.tenantsTitle}</span>
            <span className="p-1.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-xl text-slate-900">
              {metrics.activeTenants}
            </span>
            <span className="text-xs text-slate-400 font-medium">{t.active}</span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-[10px] font-bold">
            <span className="text-emerald-600">✓ {metrics.paidCount} {t.paid}</span>
            <span className="text-rose-600">! {metrics.overdueCount} {t.overdue}</span>
          </div>
        </div>
      </div>

      {/* Upcoming Rent Due (Next 7 days) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-50 text-blue-600">
              <Calendar className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-sm text-slate-900">
              {t.upcomingRentDue}
            </h3>
          </div>
          <button
            onClick={() => onNavigateToTenants('pending')}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>{t.all}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {upcomingTenants.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">
            {t.noUpcomingRent}
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingTenants.slice(0, 4).map(({ tenant, status }) => {
              const waText = generateDueReminderMessage(
                tenant,
                status.dueAmount,
                status.currentDueCycleDate,
                'upcoming',
                language
              );
              const waUrl = getWhatsAppShareUrl(tenant.mobile, waText);

              return (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <div
                    onClick={() => onSelectTenant(tenant)}
                    className="cursor-pointer min-w-0 flex-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {tenant.name}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        (#{tenant.roomNumber})
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {language === 'gu'
                        ? `${formatOrdinalDay(tenant.rentDueDay, language)} (${status.daysDiff} દિવસમાં)`
                        : `Due on ${formatOrdinalDay(tenant.rentDueDay, language)} (in ${status.daysDiff} days)`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-slate-900">
                      {formatCurrency(status.dueAmount)}
                    </span>
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                      title={t.whatsappReminder}
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Payments Section */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Receipt className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-sm text-slate-900">
              {t.recentPayments}
            </h3>
          </div>
          <button
            onClick={onNavigateToPayments}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>{t.all}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentPayments.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">
            {t.noRecentPayments}
          </p>
        ) : (
          <div className="space-y-2">
            {recentPayments.map((payment) => (
              <div
                key={payment.id}
                onClick={() => setSelectedReceiptPayment(payment)}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-900">
                      {payment.tenantName}
                    </span>
                    <span className="text-xs text-slate-500">
                      (#{payment.roomNumber})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{formatDisplayDate(payment.paymentDate, language)}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-600">{payment.paymentMethod}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-extrabold text-sm text-emerald-600">
                    +{formatCurrency(payment.amountPaid)}
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 hover:underline">
                    {t.viewReceipt}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
