import React, { useState } from 'react';
import { Tenant, PaymentRecord } from '../../types';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import {
  calculateTenantRentStatus,
  calculateTenantLedger,
  generateTenantTimeline,
  formatDisplayDate,
  formatOrdinalDay,
  formatDateToISO
} from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/currencyUtils';
import { generateDueReminderMessage, getWhatsAppShareUrl, generateTenantStatementShareText } from '../../utils/receiptUtils';
import { downloadTenantStatementPDF, exportSingleTenantHistoryCSV } from '../../utils/pdfUtils';
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
  ShieldCheck,
  MapPin,
  Receipt,
  FileDown,
  UserCheck,
  Clock,
  Briefcase,
  Users,
  Eye,
  Upload,
  RefreshCw,
  Archive,
  RotateCcw,
  Share2,
  AlertTriangle,
  History,
  Plus
} from 'lucide-react';

interface TenantDetailModalProps {
  tenant: Tenant | null;
  onClose: () => void;
  onEdit: (tenant: Tenant) => void;
  onRecordPayment: (tenant: Tenant) => void;
}

type ActiveTab = 'overview' | 'stays' | 'ledger' | 'timeline' | 'export';

export const TenantDetailModal: React.FC<TenantDetailModalProps> = ({
  tenant: initialTenant,
  onClose,
  onEdit,
  onRecordPayment
}) => {
  const { t, language } = useLanguage();
  const {
    payments,
    tenants,
    archiveTenant,
    restoreTenant,
    permanentlyDeleteTenant,
    startNewStay,
    endCurrentStay,
    updateTenantDocument,
    deleteTenantDocument,
    setSelectedReceiptPayment
  } = useApp();

  const tenant = tenants.find((item) => item.id === initialTenant?.id) || initialTenant;

  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Modal sub-states
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showConfirmDocDelete, setShowConfirmDocDelete] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  // New Stay Modal state
  const [showNewStayModal, setShowNewStayModal] = useState(false);
  const [newStayStartDate, setNewStayStartDate] = useState(formatDateToISO(new Date()));
  const [newStayRoom, setNewStayRoom] = useState('');
  const [newStayRent, setNewStayRent] = useState('');

  // End Stay Modal state
  const [showEndStayModal, setShowEndStayModal] = useState(false);
  const [endStayDate, setEndStayDate] = useState(formatDateToISO(new Date()));

  // Export options
  const [includeIdDocInExport, setIncludeIdDocInExport] = useState(false);

  if (!tenant) return null;

  const rentStatus = calculateTenantRentStatus(tenant, payments);
  const tenantPayments = payments.filter((p) => p.tenantId === tenant.id);
  const totalPaidAllTime = tenantPayments.reduce((acc, curr) => acc + curr.amountPaid, 0);

  const ledger = calculateTenantLedger(tenant, tenantPayments);
  const timeline = generateTenantTimeline(tenant, tenantPayments);

  // Referral info
  const referredTenants = tenants.filter((t) => t.referredByTenantId === tenant.id);

  const waText = generateDueReminderMessage(
    tenant,
    rentStatus.dueAmount,
    rentStatus.currentDueCycleDate,
    rentStatus.isDueToday ? 'due_today' : (rentStatus.isOverdue ? 'overdue' : 'upcoming'),
    language
  );
  const waUrl = getWhatsAppShareUrl(tenant.mobile, waText);

  // Handle Document upload
  const handleDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        await updateTenantDocument(tenant.id, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit New Stay
  const handleStartNewStaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStayRoom.trim() || !newStayRent || isNaN(Number(newStayRent))) return;
    await startNewStay(tenant.id, {
      startDate: newStayStartDate,
      roomNumber: newStayRoom.trim(),
      monthlyRent: Number(newStayRent)
    });
    setShowNewStayModal(false);
  };

  // Submit End Stay
  const handleEndStaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endStayDate) return;
    await endCurrentStay(tenant.id, endStayDate);
    setShowEndStayModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-modal overflow-hidden my-6 border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t.tenantDetails}
            </span>
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {tenant.tenantCode}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector Strip */}
        <div className="flex border-b border-slate-200 bg-white px-3 shrink-0 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('stays')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'stays'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{t.staysTitle}</span>
            <span className="px-1.5 py-0.2 bg-slate-100 rounded-full text-[10px]">
              {tenant.stays?.length || 1}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('ledger')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'ledger'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>{t.rentLedger}</span>
            <span className="px-1.5 py-0.2 bg-slate-100 rounded-full text-[10px]">
              {ledger.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.timelineTitle}
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'export'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Statement & Export
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 animate-fade-in">
              {/* Profile Card Header */}
              <div className="flex items-center gap-4">
                <div
                  onClick={() => tenant.photoUrl && setPreviewImageUrl(tenant.photoUrl)}
                  className="cursor-pointer group relative shrink-0"
                >
                  {tenant.photoUrl ? (
                    <img
                      src={tenant.photoUrl}
                      alt={tenant.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-slate-200 shadow-sm group-hover:opacity-90"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center shadow-sm">
                      {tenant.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  {tenant.photoUrl && (
                    <span className="absolute inset-0 bg-black/20 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                      <Eye className="w-4 h-4" />
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-lg text-slate-900 truncate">
                      {tenant.name}
                    </h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-700">
                      #{tenant.roomNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {tenant.mobile} {tenant.alternateMobile && `• Alt: ${tenant.alternateMobile}`}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <StatusBadge
                      status={rentStatus.status}
                      isDueToday={rentStatus.isDueToday}
                      size="sm"
                    />
                    {tenant.isArchived && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        {language === 'gu' ? 'આર્કાઇવ્ડ' : 'Archived'}
                      </span>
                    )}
                    {!tenant.isActive && !tenant.isArchived && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        {language === 'gu' ? 'ખાલી કર્યું / નિષ્ક્રિય' : 'Moved Out / Inactive'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stay / Move-Out Quick Status Banner */}
              {!tenant.isActive ? (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs">
                  <div>
                    <span className="text-xs font-bold text-amber-900 block">
                      {language === 'gu' ? 'ભાડુઆત ખાલી કરી ગયા છે (નિષ્ક્રિય)' : 'Tenant Moved Out (Inactive)'}
                    </span>
                    <span className="text-[11px] text-amber-700 block mt-0.5">
                      {language === 'gu'
                        ? 'પાછલા તમામ રોકાણ અને પેમેન્ટ હિસ્ટ્રી સુરક્ષિત સેવ છે'
                        : 'Previous stays and payment records are preserved'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setNewStayRoom(tenant.roomNumber);
                      setNewStayRent(String(tenant.monthlyRent));
                      setShowNewStayModal(true);
                    }}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs transition-colors"
                  >
                    {t.startNewStay}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-2.5">
                  <div className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">
                      {language === 'gu' ? 'હાલનો મુકામ:' : 'Current Stay:'}
                    </span>{' '}
                    Room #{tenant.roomNumber}
                  </div>
                  <button
                    onClick={() => setShowEndStayModal(true)}
                    className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors"
                  >
                    {t.endCurrentStay}
                  </button>
                </div>
              )}

              {/* Quick Actions Strip */}
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
                  <span>WhatsApp</span>
                </a>
                <button
                  onClick={() => onRecordPayment(tenant)}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{language === 'gu' ? 'ભાડું જમા' : 'Pay Rent'}</span>
                </button>
              </div>

              {/* Identity Document Section (Section 2) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>{t.documentPhoto}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">100% Secure Local Storage</span>
                </div>

                {tenant.documentUrl ? (
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200">
                    <div
                      onClick={() => setPreviewImageUrl(tenant.documentUrl!)}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <img
                        src={tenant.documentUrl}
                        alt="Aadhaar Document"
                        className="w-14 h-10 object-cover rounded-lg border border-slate-200 group-hover:opacity-80"
                      />
                      <div>
                        <span className="font-bold text-xs text-slate-800 block group-hover:text-blue-600">
                          {t.viewDoc}
                        </span>
                        <span className="text-[10px] text-slate-400">Click to view full size</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer" title="Replace Document">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          onChange={handleDocUpload}
                          className="hidden"
                        />
                      </label>
                      <button
                        onClick={() => setShowConfirmDocDelete(true)}
                        className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                        title="Delete Document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white cursor-pointer transition-colors text-xs font-bold text-slate-600">
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>{t.uploadDoc}</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleDocUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Personal & Financial Details Card */}
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

                {tenant.expectedMoveOutDate && (
                  <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200/60">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {t.expectedMoveOutDate}
                      </span>
                      <span className="font-bold text-xs text-slate-800">
                        {formatDisplayDate(tenant.expectedMoveOutDate, language)}
                      </span>
                    </div>
                    {tenant.actualMoveOutDate && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">
                          {t.actualMoveOutDate}
                        </span>
                        <span className="font-bold text-xs text-slate-800">
                          {formatDisplayDate(tenant.actualMoveOutDate, language)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200/60">
                  {tenant.occupation && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {t.occupation}
                      </span>
                      <p className="text-xs text-slate-700 mt-0.5">{tenant.occupation}</p>
                    </div>
                  )}
                  {tenant.emergencyContact && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        {t.emergencyContact}
                      </span>
                      <p className="text-xs text-slate-700 mt-0.5">{tenant.emergencyContact}</p>
                    </div>
                  )}
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

              {/* Referral Relationship (Section 3) */}
              <div className="bg-indigo-50/60 rounded-2xl p-4 border border-indigo-100 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-950">
                  Referral Information
                </h4>
                <div className="text-xs text-slate-700 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-500">Referred By: </span>
                    <span className="font-bold text-indigo-900">
                      {tenant.referredByType === 'existing_tenant'
                        ? tenant.referredByName || 'Existing Tenant'
                        : tenant.referredByName || tenant.referredByType || 'Direct'}
                    </span>
                  </div>

                  {referredTenants.length > 0 && (
                    <div className="pt-2 border-t border-indigo-100">
                      <span className="font-semibold text-slate-500 block mb-1">
                        {t.referredTenants} ({referredTenants.length}):
                      </span>
                      <div className="space-y-1">
                        {referredTenants.map((r) => (
                          <div key={r.id} className="text-xs font-bold text-slate-800 bg-white p-2 rounded-lg border border-indigo-100 flex justify-between">
                            <span>{r.name} ({r.tenantCode})</span>
                            <span className="text-slate-500">Room #{r.roomNumber}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Edit Tenant Profile Button */}
              <button
                onClick={() => {
                  onClose();
                  onEdit(tenant);
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors"
              >
                <Edit2 className="w-4 h-4 text-blue-600" />
                <span>{t.editTenantModalTitle}</span>
              </button>
            </div>
          )}

          {/* TAB 2: STAY HISTORY (Section 4) */}
          {activeTab === 'stays' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">{t.staysTitle}</h4>
                  <p className="text-xs text-slate-500">Track multiple stays across rooms and dates</p>
                </div>
                {tenant.isActive ? (
                  <button
                    onClick={() => setShowEndStayModal(true)}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors"
                  >
                    {t.endCurrentStay}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setNewStayRoom(tenant.roomNumber);
                      setNewStayRent(String(tenant.monthlyRent));
                      setShowNewStayModal(true);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    {t.startNewStay}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {(tenant.stays || []).map((stay, idx) => (
                  <div
                    key={stay.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      stay.isActive
                        ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-500/10'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                          {stay.id}
                        </span>
                        <span className="font-bold text-sm text-slate-900">
                          Room #{stay.roomNumber}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          stay.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {stay.isActive ? 'Active Stay' : 'Completed'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/50 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Duration</span>
                        <span className="font-semibold text-slate-800">
                          {formatDisplayDate(stay.startDate, language)} → {stay.endDate ? formatDisplayDate(stay.endDate, language) : 'Active'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Monthly Rent</span>
                        <span className="font-extrabold text-slate-900">{formatCurrency(stay.monthlyRent)}</span>
                      </div>
                    </div>

                    {stay.notes && (
                      <p className="text-[11px] text-slate-500 mt-2 italic bg-white/70 p-2 rounded-lg">
                        {stay.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: RENT LEDGER (Section 6 & 9) */}
          {activeTab === 'ledger' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">{t.rentLedger}</h4>
                  <p className="text-xs text-slate-500">Every monthly period and partial payment breakdown</p>
                </div>
                <button
                  onClick={() => onRecordPayment(tenant)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
                >
                  + Record Payment
                </button>
              </div>

              {ledger.length === 0 ? (
                <p className="text-xs text-slate-400 p-6 bg-slate-50 rounded-2xl text-center">
                  No rent periods generated yet.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {ledger.map((period) => (
                    <div
                      key={period.periodKey}
                      className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-extrabold text-sm text-slate-900 block">
                            {period.label}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Due on {formatDisplayDate(period.dueDate, language)}
                          </span>
                        </div>
                        <StatusBadge status={period.status} size="sm" />
                      </div>

                      {/* Financial Strip */}
                      <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl text-xs text-center">
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Rent</span>
                          <span className="font-bold text-slate-800">{formatCurrency(period.totalRent)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Paid</span>
                          <span className="font-extrabold text-emerald-600">{formatCurrency(period.totalPaid)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase font-bold text-slate-400 block">Pending</span>
                          <span className={`font-extrabold ${period.pending > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatCurrency(period.pending)}
                          </span>
                        </div>
                      </div>

                      {/* Individual Payments breakdown (Section 6) */}
                      {period.payments.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Individual Payments ({period.payments.length})
                          </span>
                          {period.payments.map((p) => (
                            <div
                              key={p.id}
                              onClick={() => setSelectedReceiptPayment(p)}
                              className="flex items-center justify-between p-2 rounded-lg bg-slate-50/80 hover:bg-slate-100 text-xs cursor-pointer transition-colors"
                            >
                              <div>
                                <span className="font-semibold text-slate-800">
                                  {formatDisplayDate(p.paymentDate, language)} • {p.paymentMethod}
                                </span>
                                {p.receivedBy && (
                                  <span className="text-[10px] text-slate-400 block">By: {p.receivedBy}</span>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="font-extrabold text-emerald-600">+{formatCurrency(p.amountPaid)}</span>
                                <span className="text-[10px] font-bold text-blue-600 hover:underline block">Receipt</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: VISUAL TIMELINE (Section 5) */}
          {activeTab === 'timeline' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">{t.timelineTitle}</h4>
                <p className="text-xs text-slate-500">Automatically generated from stays and actual payment entries</p>
              </div>

              <div className="relative pl-6 border-l-2 border-blue-200 space-y-5 my-2">
                {timeline.map((event) => (
                  <div key={event.id} className="relative group">
                    {/* Timeline Node Icon */}
                    <div
                      className={`absolute -left-[31px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-xs ${
                        event.type === 'move_in'
                          ? 'bg-blue-600'
                          : event.type === 'return_stay'
                          ? 'bg-indigo-600'
                          : event.type === 'move_out'
                          ? 'bg-slate-600'
                          : 'bg-emerald-600'
                      }`}
                    >
                      {event.type === 'move_in' ? '🏠' : event.type === 'return_stay' ? '🔄' : event.type === 'move_out' ? '🚪' : '₹'}
                    </div>

                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900">{event.title}</span>
                        <span className="text-[10px] font-bold text-slate-400">{formatDisplayDate(event.date, language)}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{event.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: STATEMENTS & EXPORT (Section 14, 16, 17) */}
          {activeTab === 'export' && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">Statements & Exports</h4>
                <p className="text-xs text-slate-500">Generate clean professional reports suitable for sharing</p>
              </div>

              {/* Explicit Toggle for Aadhaar in Export (Section 2, 16) */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="font-bold text-xs text-slate-800 block">
                      {t.includeIdDocInExport}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Default is OFF to protect sensitive identity documents.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeIdDocInExport}
                    onChange={(e) => setIncludeIdDocInExport(e.target.checked)}
                    className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                  />
                </label>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => downloadTenantStatementPDF(tenant, tenantPayments, language, includeIdDocInExport)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95"
                >
                  <div className="flex items-center gap-2">
                    <FileDown className="w-4 h-4" />
                    <span>Download Official PDF Statement</span>
                  </div>
                  <span>.pdf</span>
                </button>

                <a
                  href={getWhatsAppShareUrl(tenant.mobile, generateTenantStatementShareText(tenant, tenantPayments, language))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-emerald-600" />
                    <span>Share Statement on WhatsApp</span>
                  </div>
                  <span>WhatsApp</span>
                </a>

                <button
                  onClick={() => exportSingleTenantHistoryCSV(tenant, tenantPayments)}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 font-bold text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-slate-600" />
                    <span>Export Complete History (Excel / CSV)</span>
                  </div>
                  <span>.csv</span>
                </button>
              </div>

              {/* Archive / Delete Section (Section 26) */}
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <h5 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Tenant Record Controls</h5>

                {tenant.isArchived ? (
                  <button
                    onClick={async () => {
                      await restoreTenant(tenant.id);
                      onClose();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs hover:bg-emerald-100 flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>{t.restoreTenant}</span>
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      await archiveTenant(tenant.id);
                      onClose();
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Archive className="w-4 h-4" />
                    <span>{t.archiveTenant}</span>
                  </button>
                )}

                {!showConfirmDelete ? (
                  <button
                    onClick={() => setShowConfirmDelete(true)}
                    className="w-full py-2 px-3 text-rose-500 hover:text-rose-700 font-bold text-xs text-center"
                  >
                    Permanently Delete Tenant Record...
                  </button>
                ) : (
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-2 text-xs">
                    <p className="font-bold text-rose-800">
                      ⚠️ Are you completely sure? This permanently erases this tenant and all their payment history!
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await permanentlyDeleteTenant(tenant.id);
                          onClose();
                        }}
                        className="flex-1 py-2 bg-rose-600 text-white font-bold rounded-lg"
                      >
                        Yes, Permanently Delete
                      </button>
                      <button
                        onClick={() => setShowConfirmDelete(false)}
                        className="flex-1 py-2 bg-white text-slate-700 font-bold rounded-lg border border-slate-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Start New Stay Modal (Section 4) */}
      {showNewStayModal && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-slate-900">{t.startNewStay}</h4>
              <button onClick={() => setShowNewStayModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStartNewStaySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={newStayStartDate}
                  onChange={(e) => setNewStayStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.roomNumber}</label>
                <input
                  type="text"
                  value={newStayRoom}
                  onChange={(e) => setNewStayRoom(e.target.value)}
                  placeholder="e.g. 102"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t.monthlyRentAmount}</label>
                <input
                  type="number"
                  value={newStayRent}
                  onChange={(e) => setNewStayRent(e.target.value)}
                  placeholder="7000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewStayModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  Start Stay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* End Current Stay Modal (Section 4) */}
      {showEndStayModal && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-extrabold text-sm text-slate-900">{t.endCurrentStay}</h4>
              <button onClick={() => setShowEndStayModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEndStaySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Move-out Date</label>
                <input
                  type="date"
                  value={endStayDate}
                  onChange={(e) => setEndStayDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEndStayModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                >
                  Confirm Move-out
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Full-Size Preview Modal */}
      {previewImageUrl && (
        <div
          onClick={() => setPreviewImageUrl(null)}
          className="fixed inset-0 z-70 bg-black/85 flex items-center justify-center p-4 cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewImageUrl}
              alt="Full Preview"
              className="max-h-[80vh] w-auto mx-auto rounded-2xl shadow-2xl object-contain border border-white/20"
            />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-3 -right-3 p-2 rounded-full bg-white text-slate-900 font-bold shadow-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Document Delete Confirmation Modal */}
      {showConfirmDocDelete && (
        <div className="fixed inset-0 z-65 bg-black/70 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-3">
            <h4 className="font-extrabold text-sm text-slate-900">Delete Identity Document?</h4>
            <p className="text-xs text-slate-500">
              Are you sure you want to delete this Aadhaar/identity document photo? This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmDocDelete(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await deleteTenantDocument(tenant.id);
                  setShowConfirmDocDelete(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
