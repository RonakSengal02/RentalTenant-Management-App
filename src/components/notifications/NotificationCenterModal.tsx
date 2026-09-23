import React, { useState } from 'react';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { AppNotification } from '../../types';
import { formatDisplayDate } from '../../utils/dateUtils';
import { formatCurrency } from '../../utils/currencyUtils';
import { generateDueReminderMessage, getWhatsAppShareUrl } from '../../utils/receiptUtils';
import {
  getReminderPreferences,
  saveReminderPreferences,
  requestNotificationPermission,
  ReminderPreferences
} from '../../utils/reminderService';
import {
  X,
  Bell,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Trash2,
  CheckCheck,
  MessageCircle,
  CreditCard,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecordPaymentForTenant: (tenantId: string) => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onRecordPaymentForTenant
}) => {
  const { t, language } = useLanguage();
  const { notifications, markAsRead, markAllRead, clearNotifs, tenants } = useApp();

  const [showSettings, setShowSettings] = useState(false);
  const [prefs, setPrefs] = useState<ReminderPreferences>(getReminderPreferences());
  const [pushStatus, setPushStatus] = useState<string>(
    'Notification' in window ? Notification.permission : 'unsupported'
  );

  if (!isOpen) return null;

  const handleTogglePref = (key: keyof ReminderPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    saveReminderPreferences(updated);
  };

  const handleRequestPush = async () => {
    const permission = await requestNotificationPermission();
    setPushStatus(permission);
    if (permission === 'granted') {
      const updated = { ...prefs, enableBrowserPush: true };
      setPrefs(updated);
      saveReminderPreferences(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-modal overflow-hidden my-6 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-100 text-blue-600">
              <Bell className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-base text-slate-900">
              {t.notificationsTitle}
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/50 transition-colors"
              title={t.reminderSettings}
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Reminder Preferences Accordion */}
        {showSettings && (
          <div className="p-4 bg-blue-50/50 border-b border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                {t.reminderSettings}
              </h4>
              {pushStatus !== 'granted' && pushStatus !== 'unsupported' && (
                <button
                  onClick={handleRequestPush}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700 shadow-xs"
                >
                  {t.enablePushBtn}
                </button>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-blue-100 cursor-pointer">
                <span className="font-medium text-slate-700">{t.notify3DaysBefore}</span>
                <input
                  type="checkbox"
                  checked={prefs.notify3DaysBefore}
                  onChange={() => handleTogglePref('notify3DaysBefore')}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-blue-100 cursor-pointer">
                <span className="font-medium text-slate-700">{t.notifyOnDueDate}</span>
                <input
                  type="checkbox"
                  checked={prefs.notifyOnDueDate}
                  onChange={() => handleTogglePref('notifyOnDueDate')}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-blue-100 cursor-pointer">
                <span className="font-medium text-slate-700">{t.notify3DaysAfter}</span>
                <input
                  type="checkbox"
                  checked={prefs.notify3DaysAfter}
                  onChange={() => handleTogglePref('notify3DaysAfter')}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-xl bg-white border border-blue-100 cursor-pointer">
                <span className="font-medium text-slate-700">{t.enablePushNotifications}</span>
                <input
                  type="checkbox"
                  checked={prefs.enableBrowserPush}
                  onChange={() => handleTogglePref('enableBrowserPush')}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
              </label>
            </div>
          </div>
        )}

        {/* Action Controls for Notifications */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50 border-b border-slate-100 text-xs">
            <span className="font-bold text-slate-500">
              {notifications.length} {language === 'gu' ? 'સૂચનાઓ' : 'Alerts'}
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={markAllRead}
                className="font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{t.markAllAsRead}</span>
              </button>
              <button
                onClick={clearNotifs}
                className="font-bold text-rose-500 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t.clearAllNotifications}</span>
              </button>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-3">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-2">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-xs text-slate-400 font-medium">
                {t.noNotifications}
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const tenant = tenants.find((t) => t.id === notif.tenantId);
              const mobile = notif.tenantMobile || tenant?.mobile || '';

              // WhatsApp reminder URL
              const waText = tenant
                ? generateDueReminderMessage(
                    tenant,
                    notif.amount,
                    new Date().toISOString().slice(0, 10),
                    notif.type === 'due_today' ? 'due_today' : (notif.type === 'overdue' ? 'overdue' : 'upcoming'),
                    language
                  )
                : notif.message;
              const waUrl = getWhatsAppShareUrl(mobile, waText);

              // Styling per notification type
              const isOverdue = notif.type === 'overdue';
              const isDueToday = notif.type === 'due_today';
              const isPayment = notif.type === 'payment_received';

              const icon = isPayment ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : isOverdue ? (
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              ) : isDueToday ? (
                <Bell className="w-4 h-4 text-amber-600" />
              ) : (
                <Calendar className="w-4 h-4 text-blue-600" />
              );

              const bgClass = isPayment
                ? 'bg-emerald-50/50 border-emerald-200'
                : isOverdue
                ? 'bg-rose-50/50 border-rose-200'
                : isDueToday
                ? 'bg-amber-50/60 border-amber-200'
                : 'bg-blue-50/40 border-blue-200';

              return (
                <div
                  key={notif.id}
                  onClick={() => markAsRead(notif.id)}
                  className={`p-3.5 rounded-2xl border transition-all ${bgClass} ${
                    !notif.isRead ? 'shadow-xs ring-1 ring-black/5' : 'opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="p-1.5 rounded-xl bg-white shadow-2xs shrink-0 mt-0.5">
                        {icon}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-xs text-slate-900 truncate">
                            {notif.title}
                          </h4>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 font-medium mt-1 leading-snug">
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {formatDisplayDate(notif.date.slice(0, 10), language)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons on notification */}
                  {!isPayment && notif.tenantId && (
                    <div className="mt-3 pt-2 border-t border-slate-200/40 flex items-center justify-end gap-2">
                      {mobile && (
                        <a
                          href={waUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-2xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{language === 'gu' ? 'વોટ્સએપ મોકલો' : 'WhatsApp'}</span>
                        </a>
                      )}
                      <button
                        onClick={() => {
                          onClose();
                          onRecordPaymentForTenant(notif.tenantId!);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors shadow-2xs"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{language === 'gu' ? 'જમા કરો' : 'Pay'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
