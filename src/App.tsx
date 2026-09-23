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
import { Tenant, PaymentRecord } from './types';

export const App: React.FC = () => {
  const { language } = useLanguage();
  const {
    tenants,
    createTenant,
    editTenant,
    selectedReceiptPayment,
    setSelectedReceiptPayment
  } = useApp();

  // Navigation state
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [tenantListFilter, setTenantListFilter] = useState<string>('all');

  // Display mode: Mobile phone frame simulator or full width
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(true);

  // Modals state
  const [isTenantFormOpen, setIsTenantFormOpen] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);
  const [selectedTenantDetail, setSelectedTenantDetail] = useState<Tenant | null>(null);

  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [paymentTargetTenant, setPaymentTargetTenant] = useState<Tenant | null>(null);

  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);

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
          {currentTab === 'dashboard' && (
            <DashboardView
              onOpenAddTenant={handleOpenAddTenant}
              onOpenRecordPayment={handleOpenRecordPayment}
              onSelectTenant={(t) => setSelectedTenantDetail(t)}
              onNavigateToTenants={handleNavigateToTenants}
              onNavigateToPayments={() => setCurrentTab('payments')}
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

          {currentTab === 'settings' && <SettingsView />}
        </main>

        {/* Bottom Navigation */}
        <Navigation
          currentTab={currentTab}
          onChangeTab={(tab) => {
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
