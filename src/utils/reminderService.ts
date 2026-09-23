import { Tenant, PaymentRecord, AppNotification } from '../types';
import { calculateTenantRentStatus, formatDisplayDate } from './dateUtils';
import { formatCurrency } from './currencyUtils';
import { getNotifications, saveNotification } from '../db/storage';

export interface ReminderPreferences {
  notify3DaysBefore: boolean;
  notifyOnDueDate: boolean;
  notify3DaysAfter: boolean;
  enableBrowserPush: boolean;
}

export function getReminderPreferences(): ReminderPreferences {
  const saved = localStorage.getItem('rent_app_reminder_prefs');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
  }
  return {
    notify3DaysBefore: true,
    notifyOnDueDate: true,
    notify3DaysAfter: true,
    enableBrowserPush: true
  };
}

export function saveReminderPreferences(prefs: ReminderPreferences) {
  localStorage.setItem('rent_app_reminder_prefs', JSON.stringify(prefs));
}

/**
 * Checks all active tenants and automatically triggers necessary reminders
 */
export async function runAutomaticRemindersCheck(
  tenants: Tenant[],
  payments: PaymentRecord[],
  lang: 'en' | 'gu' = 'en'
): Promise<AppNotification[]> {
  const prefs = getReminderPreferences();
  const existingNotifications = await getNotifications();
  const todayStr = new Date().toISOString().slice(0, 10);
  const newNotifications: AppNotification[] = [];

  for (const tenant of tenants) {
    if (!tenant.isActive) continue;

    const rentStatus = calculateTenantRentStatus(tenant, payments);

    // If already paid for this cycle, no reminders needed
    if (rentStatus.status === 'paid') continue;

    const amountFormatted = formatCurrency(rentStatus.dueAmount);
    const dueDateFormatted = formatDisplayDate(rentStatus.currentDueCycleDate, lang);

    // 1. Due Today reminder
    if (rentStatus.isDueToday && prefs.notifyOnDueDate) {
      const notifKey = `due_today_${tenant.id}_${rentStatus.billingMonth}`;
      const alreadyNotified = existingNotifications.some((n) => n.id === notifKey);

      if (!alreadyNotified) {
        const notif: AppNotification = {
          id: notifKey,
          tenantId: tenant.id,
          tenantName: tenant.name,
          roomNumber: tenant.roomNumber,
          tenantMobile: tenant.mobile,
          type: 'due_today',
          title: lang === 'gu' ? '🔔 ભાડા રિમાઇન્ડર' : '🔔 Rent Reminder',
          message: lang === 'gu'
            ? `${tenant.name} – રૂમ ${tenant.roomNumber}: ${amountFormatted} નું માસિક ભાડું આજે ભરવાનું થાય છે.`
            : `${tenant.name} – Room ${tenant.roomNumber}: Monthly rent of ${amountFormatted} is due today.`,
          date: new Date().toISOString(),
          isRead: false,
          amount: rentStatus.dueAmount
        };
        await saveNotification(notif);
        newNotifications.push(notif);
        sendNativeBrowserNotification(notif.title, notif.message);
      }
    }

    // 2. Upcoming reminder (3 days before due date)
    else if (rentStatus.daysDiff > 0 && rentStatus.daysDiff <= 3 && prefs.notify3DaysBefore) {
      const notifKey = `upcoming_${tenant.id}_${rentStatus.billingMonth}`;
      const alreadyNotified = existingNotifications.some((n) => n.id === notifKey);

      if (!alreadyNotified) {
        const notif: AppNotification = {
          id: notifKey,
          tenantId: tenant.id,
          tenantName: tenant.name,
          roomNumber: tenant.roomNumber,
          tenantMobile: tenant.mobile,
          type: 'upcoming',
          title: lang === 'gu' ? '📢 આગામી ભાડું' : '📢 Upcoming Rent',
          message: lang === 'gu'
            ? `${tenant.name} – રૂમ ${tenant.roomNumber}: ${amountFormatted} નું ભાડું ${dueDateFormatted} (${rentStatus.daysDiff} દિવસમાં) ભરવાનું છે.`
            : `${tenant.name} – Room ${tenant.roomNumber}: Monthly rent of ${amountFormatted} is due on ${dueDateFormatted} (in ${rentStatus.daysDiff} days).`,
          date: new Date().toISOString(),
          isRead: false,
          amount: rentStatus.dueAmount
        };
        await saveNotification(notif);
        newNotifications.push(notif);
        sendNativeBrowserNotification(notif.title, notif.message);
      }
    }

    // 3. Overdue reminder (after due date, e.g. 3 days after or whenever overdue)
    else if (rentStatus.daysDiff < 0 && prefs.notify3DaysAfter) {
      const notifKey = `overdue_${tenant.id}_${rentStatus.billingMonth}`;
      const alreadyNotified = existingNotifications.some((n) => n.id === notifKey);

      if (!alreadyNotified) {
        const daysPast = Math.abs(rentStatus.daysDiff);
        const notif: AppNotification = {
          id: notifKey,
          tenantId: tenant.id,
          tenantName: tenant.name,
          roomNumber: tenant.roomNumber,
          tenantMobile: tenant.mobile,
          type: 'overdue',
          title: lang === 'gu' ? '⚠️ ભાડું બાકી (ઓવરડ્યુ)' : '⚠️ Rent Pending',
          message: lang === 'gu'
            ? `${tenant.name} નું ${amountFormatted} નું ભાડું હજુ પણ બાકી છે (${daysPast} દિવસથી મુદત વીતી ગઈ છે).`
            : `${tenant.name}'s rent of ${amountFormatted} is still pending (${daysPast} days overdue).`,
          date: new Date().toISOString(),
          isRead: false,
          amount: rentStatus.dueAmount
        };
        await saveNotification(notif);
        newNotifications.push(notif);
        sendNativeBrowserNotification(notif.title, notif.message);
      }
    }
  }

  return await getNotifications();
}

/**
 * Triggers native browser push notification if supported and granted
 */
export function sendNativeBrowserNotification(title: string, body: string) {
  const prefs = getReminderPreferences();
  if (!prefs.enableBrowserPush) return;

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.svg'
      });
    } catch (e) {
      console.error('Notification error:', e);
    }
  }
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return await Notification.requestPermission();
}
