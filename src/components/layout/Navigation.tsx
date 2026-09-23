import React from 'react';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { LayoutDashboard, Users, CreditCard, Bell, Settings } from 'lucide-react';

export type NavTab = 'dashboard' | 'tenants' | 'payments' | 'notifications' | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onChangeTab: (tab: NavTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentTab, onChangeTab }) => {
  const { t } = useLanguage();
  const { unreadNotifCount } = useApp();

  const tabs: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'dashboard',
      label: t.navDashboard,
      icon: <LayoutDashboard className="w-5 h-5" />
    },
    {
      id: 'tenants',
      label: t.navTenants,
      icon: <Users className="w-5 h-5" />
    },
    {
      id: 'payments',
      label: t.navPayments,
      icon: <CreditCard className="w-5 h-5" />
    },
    {
      id: 'notifications',
      label: t.navNotifications,
      icon: <Bell className="w-5 h-5" />,
      badge: unreadNotifCount
    },
    {
      id: 'settings',
      label: t.navSettings,
      icon: <Settings className="w-5 h-5" />
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-3 shadow-lg">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-blue-600 font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {Boolean(tab.badge && tab.badge > 0) && (
                  <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
                    {tab.badge! > 9 ? '9+' : tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight leading-tight">{tab.label}</span>
              {isActive && (
                <span className="w-1 h-1 bg-blue-600 rounded-full mt-0.5"></span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
