import { Tenant, PaymentRecord, CalendarEvent } from '../types';
import { getValidDateForMonth, formatDateToISO, calculateTenantRentStatus } from './dateUtils';

/**
 * Builds list of calendar events for a specific month and year
 */
export function getCalendarEventsForMonth(
  year: number,
  monthIndex: number, // 0-11
  tenants: Tenant[],
  payments: PaymentRecord[]
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

  tenants.forEach((tenant) => {
    if (tenant.isArchived) return;

    // 1. Move-in date in this month
    if (tenant.joiningDate?.startsWith(monthKey)) {
      events.push({
        id: `cal-movein-${tenant.id}`,
        date: tenant.joiningDate,
        title: `${tenant.name} moved in`,
        type: 'move_in',
        tenantId: tenant.id,
        tenantName: tenant.name
      });
    }

    // 2. Expected move out / stay expiry in this month
    if (tenant.expectedMoveOutDate?.startsWith(monthKey)) {
      events.push({
        id: `cal-expiry-${tenant.id}`,
        date: tenant.expectedMoveOutDate,
        title: `${tenant.name}'s stay ends`,
        type: 'stay_expiry',
        tenantId: tenant.id,
        tenantName: tenant.name
      });
    }

    // 3. Actual move out in this month
    if (tenant.actualMoveOutDate?.startsWith(monthKey)) {
      events.push({
        id: `cal-moveout-${tenant.id}`,
        date: tenant.actualMoveOutDate,
        title: `${tenant.name} moved out`,
        type: 'move_out',
        tenantId: tenant.id,
        tenantName: tenant.name
      });
    }

    // 4. Rent due day for active tenant
    if (tenant.isActive) {
      const activeStay = tenant.stays?.find((s) => s.isActive) || tenant.stays?.[tenant.stays.length - 1];
      const dueDay = activeStay?.rentDueDay || tenant.rentDueDay || 1;
      const rentAmt = activeStay?.monthlyRent || tenant.monthlyRent;
      const dueDate = formatDateToISO(getValidDateForMonth(year, monthIndex, dueDay));

      const status = calculateTenantRentStatus(tenant, payments);
      const isOverdue = status.isOverdue && status.billingMonth === monthKey;

      events.push({
        id: `cal-due-${tenant.id}-${monthKey}`,
        date: dueDate,
        title: isOverdue ? `${tenant.name} rent overdue` : `${tenant.name} rent due`,
        type: isOverdue ? 'overdue' : 'rent_due',
        tenantId: tenant.id,
        tenantName: tenant.name,
        amount: rentAmt
      });
    }
  });

  // 5. Payments received in this month
  payments.forEach((payment) => {
    if (payment.paymentDate?.startsWith(monthKey)) {
      events.push({
        id: `cal-pay-${payment.id}`,
        date: payment.paymentDate,
        title: `Payment: ${payment.tenantName}`,
        type: 'payment_received',
        tenantId: payment.tenantId,
        tenantName: payment.tenantName,
        amount: payment.amountPaid
      });
    }
  });

  return events;
}
