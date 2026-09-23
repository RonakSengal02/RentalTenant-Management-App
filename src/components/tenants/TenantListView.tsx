import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { TenantCard } from './TenantCard';
import { calculateTenantRentStatus } from '../../utils/dateUtils';
import { Tenant } from '../../types';
import { Search, Plus, UserCheck, Filter, Users, X } from 'lucide-react';

interface TenantListViewProps {
  initialFilter?: string;
  onOpenAddTenant: () => void;
  onSelectTenant: (tenant: Tenant) => void;
  onRecordPayment: (tenant: Tenant) => void;
}

export const TenantListView: React.FC<TenantListViewProps> = ({
  initialFilter = 'all',
  onOpenAddTenant,
  onSelectTenant,
  onRecordPayment
}) => {
  const { t, language } = useLanguage();
  const { tenants, payments } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'paid' | 'pending' | 'overdue' | 'inactive'>('all');

  // Filter and search logic
  const filteredTenants = useMemo(() => {
    return tenants.filter((tenant) => {
      // Search matching (Name, Mobile, Room Number)
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tenant.name.toLowerCase().includes(q) ||
        tenant.mobile.includes(q) ||
        tenant.roomNumber.toLowerCase().includes(q) ||
        (tenant.address && tenant.address.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Status filter
      if (activeFilter === 'inactive') {
        return !tenant.isActive;
      }

      if (!tenant.isActive) {
        return false; // hide inactive in standard active lists unless inactive tab selected
      }

      if (activeFilter === 'all') return true;

      const rentStatus = calculateTenantRentStatus(tenant, payments);
      if (activeFilter === 'paid') return rentStatus.status === 'paid';
      if (activeFilter === 'pending') return rentStatus.status === 'pending';
      if (activeFilter === 'overdue') return rentStatus.status === 'overdue';

      return true;
    });
  }, [tenants, payments, searchQuery, activeFilter]);

  // Counts for tabs
  const tabCounts = useMemo(() => {
    let paid = 0, pending = 0, overdue = 0, inactive = 0;
    tenants.forEach((t) => {
      if (!t.isActive) {
        inactive++;
        return;
      }
      const st = calculateTenantRentStatus(t, payments);
      if (st.status === 'paid') paid++;
      else if (st.status === 'overdue') overdue++;
      else pending++;
    });
    return {
      all: tenants.filter((t) => t.isActive).length,
      paid,
      pending,
      overdue,
      inactive
    };
  }, [tenants, payments]);

  return (
    <div className="space-y-3 pb-20 pt-2 animate-fade-in">
      {/* Top Search & Add Row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={onOpenAddTenant}
          className="p-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-2xl shadow-md shadow-blue-500/20 transition-all active:scale-95 shrink-0"
          title={t.addTenantBtn}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeFilter === 'all'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          {t.all} ({tabCounts.all})
        </button>

        <button
          onClick={() => setActiveFilter('paid')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
            activeFilter === 'paid'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
          }`}
        >
          <span>✓</span>
          <span>{t.paid} ({tabCounts.paid})</span>
        </button>

        <button
          onClick={() => setActiveFilter('pending')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
            activeFilter === 'pending'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white text-amber-700 hover:bg-amber-50 border border-amber-200'
          }`}
        >
          <span>⏱</span>
          <span>{t.pending} ({tabCounts.pending})</span>
        </button>

        <button
          onClick={() => setActiveFilter('overdue')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
            activeFilter === 'overdue'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
          }`}
        >
          <span>!</span>
          <span>{t.overdue} ({tabCounts.overdue})</span>
        </button>

        {tabCounts.inactive > 0 && (
          <button
            onClick={() => setActiveFilter('inactive')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'inactive'
                ? 'bg-slate-600 text-white shadow-xs'
                : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {t.inactive} ({tabCounts.inactive})
          </button>
        )}
      </div>

      {/* Tenants List */}
      {filteredTenants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-card my-4">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="font-bold text-base text-slate-800">
            {language === 'gu' ? 'કોઈ ભાડુઆત મળ્યા નથી' : 'No Tenants Found'}
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {searchQuery
              ? (language === 'gu' ? 'તમારી શોધ માટે કોઈ પરિણામ મળ્યું નથી.' : 'No tenant matches your search criteria.')
              : t.emptyTenants}
          </p>
          {!searchQuery && (
            <button
              onClick={onOpenAddTenant}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{t.addTenantBtn}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTenants.map((tenant) => (
            <TenantCard
              key={tenant.id}
              tenant={tenant}
              payments={payments}
              onSelect={onSelectTenant}
              onRecordPayment={onRecordPayment}
            />
          ))}
        </div>
      )}
    </div>
  );
};
