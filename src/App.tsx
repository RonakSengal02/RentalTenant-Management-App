import React, { useState } from 'react';
import { useLanguage } from './i18n';
import { useApp } from './context/AppContext';
import { Header } from './components/layout/Header';
import { Navigation, NavTab } from './components/layout/Navigation';
import { DashboardView } from './components/dashboard/DashboardView';
import { TenantListView } from './components/tenants/TenantListView';
import { PaymentHistoryView } from './components/payments/PaymentHistoryView';
import { SettingsView } from './components/settings/SettingsView';
import { TenantFormModal } from './components/tenants/TenantFormModal';
import { TenantDetailModal } from './components/tenants/TenantDetailModal';
import { RecordPaymentModal } from './components/payments/RecordPaymentModal';
import { ReceiptModal } from './components/payments/ReceiptModal';
import { NotificationCenterModal } from './components/notifications/NotificationCenterModal';
import { MonthlyReportView } from './components/reports/MonthlyReportView';
import { YearlyReportView } from './components/reports/YearlyReportView';
import { RoomManagementModal } from './components/rooms/RoomManagementModal';
import { CalendarView } from './components/calendar/CalendarView';
import { PinLockModal } from './components/auth/PinLockModal';
import { ActivityLogModal } from './components/activity/ActivityLogModal';
import { Tenant, PaymentRecord } from './types';
import { ArrowLeft } from 'lucide-react';

export const App: React.FC = () => {
  const { language } = useLanguage();
  const {
    tenants,
    createTenant,
    editTenant,
    selectedReceiptPayment,
    setSelectedReceiptPayment,
    isPinLocked
  } = useApp();

  // Navigation state
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [tenantListFilter, setTenantListFilter] = useState<string>('all');
  const [activeReportView, setActiveReportView] = useState<'none' | 'monthly' | 'yearly' | 'calendar'>('none');

  // Display mode: Mobile phone frame simulator or full width
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(true);

  // Modals state
  const [isTenantFormOpen, setIsTenantFormOpen] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);
  const [selectedTenantDetail, setSelectedTenantDetail] = useState<Tenant | null>(null);

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentTargetTenant, setPaymentTargetTenant] = useState<Tenant | null>(null);

  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isPinSetupModalOpen, setIsPinSetupModalOpen] = useState(false);

  // Handlers
  const handleOpenAddTenant = () => {
    setTenantToEdit(null);
    setIsTenantFormOpen(true);
  };

  const handleOpenEditTenant = (tenant: Tenant) => {
    setTenantToEdit(tenant);
    setIsTenantFormOpen(true);
  };

  const handleSaveTenant = async (tenantData: any) => {
    if (tenantToEdit) {
      await editTenant(tenantData as Tenant);
    } else {
      await createTenant(tenantData);
    }
  };

  const handleOpenRecordPayment = (tenant?: Tenant) => {
    setPaymentTargetTenant(tenant || null);
    setIsRecordPaymentOpen(true);
  };

  const handlePaymentSuccess = (payment: PaymentRecord) => {
    setIsRecordPaymentOpen(false);
    setSelectedReceiptPayment(payment);
  };

  const handleRecordPaymentForTenantId = (tenantId: string) => {
    const target = tenants.find((t) => t.id === tenantId);
    if (target) {
      handleOpenRecordPayment(target);
    }
  };

  const handleNavigateToTenants = (filter = 'all') => {
    setTenantListFilter(filter);
    setCurrentTab('tenants');
  };

  return (
    <div className={`min-h-screen bg-slate-900 flex justify-center items-center font-sans ${isMobileFrame ? 'sm:p-4' : 'p-0'}`}>
      {/* Device Frame Wrapper (Smartphone mock on Desktop, edge-to-edge on Mobile) */}
      <div
        className={`w-full bg-slate-50 min-h-screen flex flex-col relative transition-all duration-300 shadow-2xl ${
          isMobileFrame
            ? 'max-w-md sm:rounded-[38px] sm:overflow-hidden sm:min-h-[860px] sm:max-h-[92vh] sm:border-8 sm:border-slate-800'
            : 'max-w-4xl'
        }`}
      >
        {/* Top Status Bar indicator on mobile simulator */}
        {isMobileFrame && (
          <div className="hidden sm:flex items-center justify-between px-6 pt-2 pb-1 bg-white text-slate-800 text-[11px] font-bold">
            <span>9:41</span>
            <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto"></div>
            <div className="flex items-center gap-1.5">
              <span>5G</span>
              <div className="w-5 h-2.5 border border-slate-800 rounded-xs p-0.5">
                <div className="h-full bg-slate-800 w-full rounded-2xs"></div>
              </div>
            </div>
          </div>
        )}

        {/* App Sticky Header */}
        <Header
          onOpenNotifications={() => setIsNotificationCenterOpen(true)}
          isMobileFrame={isMobileFrame}
          onToggleMobileFrame={() => setIsMobileFrame(!isMobileFrame)}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 py-2 bg-slate-100/70">
          {activeReportView !== 'none' ? (
            <div className="space-y-3">
              <button
                onClick={() => setActiveReportView('none')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{language === 'gu' ? 'ડેશબોર્ડ પર પાછા જાઓ' : 'Back to Dashboard'}</span>
              </button>

              {activeReportView === 'calendar' && (
                <CalendarView
                  onSelectTenant={(t) => setSelectedTenantDetail(t)}
                  onOpenRecordPayment={() => handleOpenRecordPayment()}
                />
              )}

              {activeReportView === 'monthly' && (
                <MonthlyReportView onClose={() => setActiveReportView('none')} />
              )}

              {activeReportView === 'yearly' && (
                <YearlyReportView onSelectMonth={() => setActiveReportView('monthly')} />
              )}
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  onOpenAddTenant={handleOpenAddTenant}
                  onOpenRecordPayment={handleOpenRecordPayment}
                  onSelectTenant={(t) => setSelectedTenantDetail(t)}
                  onNavigateToTenants={handleNavigateToTenants}
                  onNavigateToPayments={() => setCurrentTab('payments')}
                  onOpenRooms={() => setIsRoomModalOpen(true)}
                  onOpenCalendar={() => setActiveReportView('calendar')}
                  onOpenMonthlyReport={() => setActiveReportView('monthly')}
                  onOpenYearlyReport={() => setActiveReportView('yearly')}
                />
              )}

              {currentTab === 'tenants' && (
                <TenantListView
                  initialFilter={tenantListFilter}
                  onOpenAddTenant={handleOpenAddTenant}
                  onSelectTenant={(t) => setSelectedTenantDetail(t)}
                  onRecordPayment={handleOpenRecordPayment}
                />
              )}

              {currentTab === 'payments' && (
                <PaymentHistoryView
                  onOpenRecordPayment={() => handleOpenRecordPayment()}
                />
              )}

              {currentTab === 'notifications' && (
                <div className="pt-2">
                  <NotificationCenterModal
                    isOpen={true}
                    onClose={() => setCurrentTab('dashboard')}
                    onRecordPaymentForTenant={handleRecordPaymentForTenantId}
                  />
                </div>
              )}

              {currentTab === 'settings' && (
                <SettingsView
                  onOpenRooms={() => setIsRoomModalOpen(true)}
                  onOpenActivityLog={() => setIsActivityModalOpen(true)}
                  onOpenPinSetup={() => setIsPinSetupModalOpen(true)}
                  onOpenMonthlyReport={() => setActiveReportView('monthly')}
                  onOpenYearlyReport={() => setActiveReportView('yearly')}
                />
              )}
            </>
          )}
        </main>

        {/* Bottom Navigation */}
        <Navigation
          currentTab={currentTab}
          onChangeTab={(tab) => {
            setActiveReportView('none');
            if (tab === 'notifications') {
              setIsNotificationCenterOpen(true);
            } else {
              setCurrentTab(tab);
            }
          }}
        />

        {/* Modals */}
        <TenantFormModal
          isOpen={isTenantFormOpen}
          tenantToEdit={tenantToEdit}
          onClose={() => setIsTenantFormOpen(false)}
          onSave={handleSaveTenant}
          onSelectExistingTenant={(t) => {
            setIsTenantFormOpen(false);
            setSelectedTenantDetail(t);
          }}
        />

        <TenantDetailModal
          tenant={selectedTenantDetail}
          onClose={() => setSelectedTenantDetail(null)}
          onEdit={handleOpenEditTenant}
          onRecordPayment={(t) => {
            setSelectedTenantDetail(null);
            handleOpenRecordPayment(t);
          }}
        />

        <RecordPaymentModal
          isOpen={isRecordPaymentOpen}
          preselectedTenant={paymentTargetTenant}
          onClose={() => setIsRecordPaymentOpen(false)}
          onSuccess={handlePaymentSuccess}
        />

        <ReceiptModal
          payment={selectedReceiptPayment}
          onClose={() => setSelectedReceiptPayment(null)}
        />

        {/* Room Management Modal */}
        <RoomManagementModal
          isOpen={isRoomModalOpen}
          onClose={() => setIsRoomModalOpen(false)}
          onAssignTenant={() => handleOpenAddTenant()}
          onViewTenant={(t) => {
            setIsRoomModalOpen(false);
            setSelectedTenantDetail(t);
          }}
        />

        {/* Activity Audit Log Modal */}
        <ActivityLogModal
          isOpen={isActivityModalOpen}
          onClose={() => setIsActivityModalOpen(false)}
        />

        {/* PIN Setup Modal */}
        {isPinSetupModalOpen && (
          <PinLockModal
            mode="setup"
            isOpen={true}
            onClose={() => setIsPinSetupModalOpen(false)}
          />
        )}

        {/* App Lock Overlay (Active when PIN locked) */}
        {isPinLocked && (
          <PinLockModal
            mode="unlock"
            isOpen={true}
          />
        )}

        {/* Top-level notification drawer (when opened from bell) */}
        {isNotificationCenterOpen && currentTab !== 'notifications' && (
          <NotificationCenterModal
            isOpen={isNotificationCenterOpen}
            onClose={() => setIsNotificationCenterOpen(false)}
            onRecordPaymentForTenant={handleRecordPaymentForTenantId}
          />
        )}
      </div>
    </div>
  );
};
