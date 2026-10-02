import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { ActivityLog } from '../../types';
import { formatDisplayDate } from '../../utils/dateUtils';
import {
  X,
  History,
  Search,
  Filter,
  User,
  CreditCard,
  Home,
  Repeat,
  Settings,
  Clock
} from 'lucide-react';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const { activityLogs } = useApp();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      const cat = log.category || log.entityType;
      if (categoryFilter !== 'all' && cat !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const detailText = (log.details || log.description || '').toLowerCase();
        return (
          log.action.toLowerCase().includes(q) ||
          detailText.includes(q)
        );
      }
      return true;
    });
  }, [activityLogs, categoryFilter, searchQuery]);

  if (!isOpen) return null;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'tenant':
        return <User className="w-3.5 h-3.5 text-blue-600" />;
      case 'payment':
        return <CreditCard className="w-3.5 h-3.5 text-emerald-600" />;
      case 'stay':
        return <Repeat className="w-3.5 h-3.5 text-purple-600" />;
      case 'room':
        return <Home className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return <Settings className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const formatLogTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return iso;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-modal overflow-hidden my-6 border border-slate-200 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-600 text-white">
              <History className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                {language === 'gu' ? 'પ્રવૃત્તિ ઇતિહાસ / ઓડિટ લોગ' : 'Activity Audit Log'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {activityLogs.length} {language === 'gu' ? 'કુલ રેકોર્ડ્સ' : 'total recorded operations'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters & Search */}
        <div className="p-3 bg-slate-50/50 border-b border-slate-100 space-y-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'gu' ? 'પ્રવૃત્તિ શોધો...' : 'Search logs...'}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[11px]">
            {[
              { key: 'all', label: language === 'gu' ? 'બધા' : 'All' },
              { key: 'tenant', label: language === 'gu' ? 'ભાડુઆત' : 'Tenant' },
              { key: 'payment', label: language === 'gu' ? 'ચુકવણી' : 'Payment' },
              { key: 'stay', label: language === 'gu' ? 'રોકાણ (Stay)' : 'Stay' },
              { key: 'room', label: language === 'gu' ? 'રૂમ' : 'Room' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setCategoryFilter(tab.key)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  categoryFilter === tab.key
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Logs List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <History className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              {language === 'gu' ? 'કોઈ પ્રવૃત્તિ લોગ મળ્યા નથી' : 'No activity logs found'}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/70 transition-colors flex items-start gap-3 text-xs"
              >
                <div className="p-1.5 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                  {getCategoryIcon(log.category || log.entityType)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-extrabold text-slate-900">{log.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatLogTime(log.timestamp)}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5 break-words">{log.details || log.description}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
