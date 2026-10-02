import { Tenant, PaymentRecord, AppNotification } from '../types';
import { calculateTenantRentStatus, formatDisplayDate, getTodayDate } from './dateUtils';
import { formatCurrency } from './currencyUtils';
import { getNotifications, saveNotification } from '../db/storage';

export interface ReminderPreferences {
  notify7DaysBefore: boolean;
  notify3DaysBefore: boolean;
  notifyTomorrow: boolean;
  notifyOnDueDate: boolean;
  notifyOverdue: boolean;
  notify3DaysAfter?: boolean;
  notifyStayEnding: boolean;
  enableBrowserPush: boolean;
}

export function getReminderPreferences(): ReminderPreferences {
  const saved = localStorage.getItem('rent_app_reminder_prefs');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return {
        notify7DaysBefore: parsed.notify7DaysBefore ?? true,
        notify3DaysBefore: parsed.notify3DaysBefore ?? true,
        notifyTomorrow: parsed.notifyTomorrow ?? true,
        notifyOnDueDate: parsed.notifyOnDueDate ?? true,
        notifyOverdue: parsed.notifyOverdue ?? true,
        notifyStayEnding: parsed.notifyStayEnding ?? true,
        enableBrowserPush: parsed.enableBrowserPush ?? true
      };
    } catch (e) {
      console.error(e);
    }
  }
  return {
    notify7DaysBefore: true,
    notify3DaysBefore: true,
    notifyTomorrow: true,
    notifyOnDueDate: true,
    notifyOverdue: true,
    notifyStayEnding: true,
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
  const today = getTodayDate();
  const todayMs = today.getTime();
  const msPerDay = 1000 * 60 * 60 * 24;

  for (const tenant of tenants) {
    if (!tenant.isActive || tenant.isArchived) continue;

    const rentStatus = calculateTenantRentStatus(tenant, payments);
    const amountFormatted = formatCurrency(rentStatus.dueAmount);
    const dueDateFormatted = formatDisplayDate(rentStatus.currentDueCycleDate, lang);

    // Only process rent reminders if not already paid
    if (rentStatus.status !== 'paid') {
      // 1. Rent Due in 7 Days
      if (rentStatus.daysDiff === 7 && prefs.notify7DaysBefore) {
        const notifKey = `due_7_${tenant.id}_${rentStatus.billingMonth}`;
        if (!existingNotifications.some((n) => n.id === notifKey)) {
          const notif: AppNotification = {
            id: notifKey,
            tenantId: tenant.id,
            tenantName: tenant.name,
            roomNumber: tenant.roomNumber,
            tenantMobile: tenant.mobile,
            type: 'due_7_days',
            title: lang === 'gu' ? '📢 7 દિવસમાં ભાડું બાકી' : '📢 Rent Due in 7 Days',
            message: `${tenant.name} (${tenant.tenantCode}) – Room #${tenant.roomNumber}: Rent of ${amountFormatted} is due in 7 days on ${dueDateFormatted}.`,
            date: new Date().toISOString(),
            isRead: false,
            amount: rentStatus.dueAmount
          };
          await saveNotification(notif);
          sendNativeBrowserNotification(notif.title, notif.message);
        }
      }

      // 2. Rent Due in 3 Days
      if (rentStatus.daysDiff === 3 && prefs.notify3DaysBefore) {
        const notifKey = `due_3_${tenant.id}_${rentStatus.billingMonth}`;
        if (!existingNotifications.some((n) => n.id === notifKey)) {
          const notif: AppNotification = {
            id: notifKey,
            tenantId: tenant.id,
            tenantName: tenant.name,
            roomNumber: tenant.roomNumber,
            tenantMobile: tenant.mobile,
            type: 'due_3_days',
            title: lang === 'gu' ? '📢 3 દિવસમાં ભાડું બાકી' : '📢 Rent Due in 3 Days',
            message: `${tenant.name}'s rent of ${amountFormatted} is due in 3 days.`,
            date: new Date().toISOString(),
            isRead: false,
            amount: rentStatus.dueAmount
          };
          await saveNotification(notif);
          sendNativeBrowserNotification(notif.title, notif.message);
        }
      }

      // 3. Rent Due Tomorrow
      if (rentStatus.daysDiff === 1 && prefs.notifyTomorrow) {
        const notifKey = `due_tomorrow_${tenant.id}_${rentStatus.billingMonth}`;
        if (!existingNotifications.some((n) => n.id === notifKey)) {
          const notif: AppNotification = {
            id: notifKey,
            tenantId: tenant.id,
            tenantName: tenant.name,
            roomNumber: tenant.roomNumber,
            tenantMobile: tenant.mobile,
            type: 'due_tomorrow',
            title: lang === 'gu' ? '🔔 આવતીકાલે ભાડું ભરવાનું છે' : '🔔 Rent Due Tomorrow',
            message: `${tenant.name}'s rent of ${amountFormatted} is due tomorrow (${dueDateFormatted}).`,
            date: new Date().toISOString(),
            isRead: false,
            amount: rentStatus.dueAmount
          };
          await saveNotification(notif);
          sendNativeBrowserNotification(notif.title, notif.message);
        }
      }

      // 4. Rent Due Today
      if (rentStatus.isDueToday && prefs.notifyOnDueDate) {
        const notifKey = `due_today_${tenant.id}_${rentStatus.billingMonth}`;
        if (!existingNotifications.some((n) => n.id === notifKey)) {
          const notif: AppNotification = {
            id: notifKey,
            tenantId: tenant.id,
            tenantName: tenant.name,
            roomNumber: tenant.roomNumber,
            tenantMobile: tenant.mobile,
            type: 'due_today',
            title: lang === 'gu' ? '🔔 આજે ભાડું ભરવાનું છે' : '🔔 Rent Due Today',
            message: `${tenant.name} – Room #${tenant.roomNumber}: Monthly rent of ${amountFormatted} is due today.`,
            date: new Date().toISOString(),
            isRead: false,
            amount: rentStatus.dueAmount
          };
          await saveNotification(notif);
          sendNativeBrowserNotification(notif.title, notif.message);
        }
      }

      // 5. Rent Overdue
      if (rentStatus.isOverdue && prefs.notifyOverdue) {
        const notifKey = `overdue_${tenant.id}_${rentStatus.billingMonth}`;
        if (!existingNotifications.some((n) => n.id === notifKey)) {
          const daysPast = Math.abs(rentStatus.daysDiff);
          const notif: AppNotification = {
            id: notifKey,
            tenantId: tenant.id,
            tenantName: tenant.name,
            roomNumber: tenant.roomNumber,
            tenantMobile: tenant.mobile,
            type: 'overdue',
            title: lang === 'gu' ? '⚠️ ભાડું બાકી (ઓવરડ્યુ)' : '⚠️ Rent Overdue',
            message: `${tenant.name}'s rent of ${amountFormatted} is overdue (${daysPast} days past due date).`,
            date: new Date().toISOString(),
            isRead: false,
            amount: rentStatus.dueAmount
          };
          await saveNotification(notif);
          sendNativeBrowserNotification(notif.title, notif.message);
        }
      }
    }

    // 6. Stay Expiry Notifications (Section 11)
    if (tenant.expectedMoveOutDate && prefs.notifyStayEnding) {
      const expDateParts = tenant.expectedMoveOutDate.split('-');
      if (expDateParts.length === 3) {
        const expDate = new Date(parseInt(expDateParts[0], 10), parseInt(expDateParts[1], 10) - 1, parseInt(expDateParts[2], 10));
        const stayDaysDiff = Math.round((expDate.getTime() - todayMs) / msPerDay);

        // Stay ending in 3 days
        if (stayDaysDiff <= 3 && stayDaysDiff >= 0) {
          const notifKey = `stay_ending_${tenant.id}_${tenant.expectedMoveOutDate}`;
          if (!existingNotifications.some((n) => n.id === notifKey)) {
            const notif: AppNotification = {
              id: notifKey,
              tenantId: tenant.id,
              tenantName: tenant.name,
              roomNumber: tenant.roomNumber,
              tenantMobile: tenant.mobile,
              type: 'stay_ending_soon',
              title: lang === 'gu' ? '🚪 મુકામ પૂર્ણ થઈ રહ્યો છે' : '🚪 Stay Ending Soon',
              message: `${tenant.name}'s stay is ending in ${stayDaysDiff === 0 ? 'today' : `${stayDaysDiff} days`} (${formatDisplayDate(tenant.expectedMoveOutDate, lang)}).`,
              date: new Date().toISOString(),
              isRead: false,
              amount: 0
            };
            await saveNotification(notif);
            sendNativeBrowserNotification(notif.title, notif.message);
          }
        }
        // Stay has ended
        else if (stayDaysDiff < 0) {
          const notifKey = `stay_ended_${tenant.id}_${tenant.expectedMoveOutDate}`;
          if (!existingNotifications.some((n) => n.id === notifKey)) {
            const notif: AppNotification = {
              id: notifKey,
              tenantId: tenant.id,
              tenantName: tenant.name,
              roomNumber: tenant.roomNumber,
              tenantMobile: tenant.mobile,
              type: 'stay_ended',
              title: lang === 'gu' ? '🚪 મુકામ પૂર્ણ થયેલ છે' : '🚪 Stay Ended',
              message: `${tenant.name}'s expected stay has ended on ${formatDisplayDate(tenant.expectedMoveOutDate, lang)}.`,
              date: new Date().toISOString(),
              isRead: false,
              amount: 0
            };
            await saveNotification(notif);
            sendNativeBrowserNotification(notif.title, notif.message);
          }
        }
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
