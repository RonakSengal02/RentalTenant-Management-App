import { Tenant, PaymentRecord, TenantRentStatus, RentPeriodSummary, TimelineEvent, Stay } from '../types';

export const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_NAMES_GU = [
  'જાન્યુઆરી', 'ફેબ્રુઆરી', 'માર્ચ', 'એપ્રિલ', 'મે', 'જૂન',
  'જુલાઈ', 'ઑગસ્ટ', 'સપ્ટેમ્બર', 'ઓક્ટોબર', 'નવેમ્બર', 'ડિસેમ્બર'
];

/**
 * Returns today's Date with time set to 00:00:00.
 */
export function getTodayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Formats a Date object to YYYY-MM-DD
 */
export function formatDateToISO(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Clamps the given day to the max valid days in a specific year and month (0-indexed month)
 * Handles February (28/29) and shorter 30-day months accurately.
 */
export function getValidDateForMonth(year: number, monthIndex: number, day: number): Date {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const validDay = Math.min(day, daysInMonth);
  return new Date(year, monthIndex, validDay);
}

/**
 * Calculates complete Rent Ledger for a tenant across all stays
 */
export function calculateTenantLedger(tenant: Tenant, payments: PaymentRecord[]): RentPeriodSummary[] {
  const today = getTodayDate();
  const periods: RentPeriodSummary[] = [];

  const stays = tenant.stays && tenant.stays.length > 0
    ? tenant.stays
    : [
        {
          id: 'STAY-0001',
          tenantId: tenant.id,
          startDate: tenant.joiningDate,
          endDate: tenant.actualMoveOutDate,
          roomNumber: tenant.roomNumber,
          monthlyRent: tenant.monthlyRent,
          securityDeposit: tenant.securityDeposit,
          rentDueDay: tenant.rentDueDay || 1,
          isActive: tenant.isActive
        }
      ];

  // Helper to extract year & month
  const parseYearMonth = (dateStr: string) => {
    const parts = dateStr.split('-');
    return {
      year: parseInt(parts[0], 10),
      monthIndex: parseInt(parts[1], 10) - 1
    };
  };

  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth();

  // Iterate over each stay
  stays.forEach((stay) => {
    if (!stay.startDate) return;
    const start = parseYearMonth(stay.startDate);
    const end = stay.endDate
      ? parseYearMonth(stay.endDate)
      : { year: currentYear, monthIndex: currentMonthIndex };

    let curY = start.year;
    let curM = start.monthIndex;

    const stopY = end.year;
    const stopM = end.monthIndex;

    while (curY < stopY || (curY === stopY && curM <= stopM)) {
      const periodKey = `${curY}-${String(curM + 1).padStart(2, '0')}`;
      const label = `${MONTH_NAMES_EN[curM]} ${curY}`;

      // Calculate exact due date using anniversary day clamping
      const dueDateObj = getValidDateForMonth(curY, curM, stay.rentDueDay || tenant.rentDueDay || 1);
      const dueDate = formatDateToISO(dueDateObj);

      // Find all payments for this tenant matching this billing period
      const matchingPayments = payments.filter(
        (p) => p.tenantId === tenant.id && (p.billingMonth === periodKey || (!p.billingMonth && p.paymentDate?.startsWith(periodKey)))
      );

      const totalPaid = matchingPayments.reduce((acc, p) => acc + p.amountPaid, 0);
      const totalRent = stay.monthlyRent || tenant.monthlyRent;
      const pending = Math.max(0, totalRent - totalPaid);

      let status: 'paid' | 'partial' | 'pending' | 'overdue' = 'pending';
      const isPastDue = dueDateObj.getTime() < today.getTime();

      if (totalPaid >= totalRent && totalRent > 0) {
        status = 'paid';
      } else if (totalPaid > 0) {
        status = 'partial';
      } else if (isPastDue) {
        status = 'overdue';
      } else {
        status = 'pending';
      }

      // If already recorded for this periodKey (e.g. overlapping stays), merge
      const existingIdx = periods.findIndex((p) => p.periodKey === periodKey);
      if (existingIdx >= 0) {
        periods[existingIdx].totalPaid += totalPaid;
        periods[existingIdx].pending = Math.max(0, periods[existingIdx].totalRent - periods[existingIdx].totalPaid);
        if (periods[existingIdx].totalPaid >= periods[existingIdx].totalRent) {
          periods[existingIdx].status = 'paid';
        } else if (periods[existingIdx].totalPaid > 0) {
          periods[existingIdx].status = 'partial';
        }
        periods[existingIdx].payments = [...periods[existingIdx].payments, ...matchingPayments];
      } else {
        periods.push({
          periodKey,
          label,
          dueDate,
          totalRent,
          totalPaid,
          pending,
          status,
          payments: matchingPayments
        });
      }

      // Next month
      curM++;
      if (curM > 11) {
        curM = 0;
        curY++;
      }
    }
  });

  // Sort periods reverse chronologically (most recent first)
  return periods.sort((a, b) => b.periodKey.localeCompare(a.periodKey));
}

/**
 * Calculates current active rent status for a tenant
 */
export function calculateTenantRentStatus(tenant: Tenant, payments: PaymentRecord[]): TenantRentStatus {
  const today = getTodayDate();
  const currentYear = today.getFullYear();
  const currentMonthIndex = today.getMonth();

  const billingMonthKey = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
  const billingMonthLabel = `${MONTH_NAMES_EN[currentMonthIndex]} ${currentYear}`;

  // Find active stay or fallback to tenant profile
  const activeStay = tenant.stays?.find((s) => s.isActive) || tenant.stays?.[tenant.stays.length - 1];
  const dueDay = activeStay?.rentDueDay || tenant.rentDueDay || 1;
  const monthlyRent = activeStay?.monthlyRent || tenant.monthlyRent;

  // Due date for the current month
  const currentCycleDueDate = getValidDateForMonth(currentYear, currentMonthIndex, dueDay);

  // Next cycle due date (next month)
  const nextMonthDate = new Date(currentYear, currentMonthIndex + 1, 1);
  const nextCycleDueDate = getValidDateForMonth(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), dueDay);

  // Payments made for current billing month
  const cyclePayments = payments.filter(
    (p) => p.tenantId === tenant.id && (p.billingMonth === billingMonthKey)
  );

  const totalPaidThisCycle = cyclePayments.reduce((sum, p) => sum + p.amountPaid, 0);
  const dueAmount = Math.max(0, monthlyRent - totalPaidThisCycle);

  const msPerDay = 1000 * 60 * 60 * 24;
  const daysDiff = Math.round((currentCycleDueDate.getTime() - today.getTime()) / msPerDay);

  const isDueToday = daysDiff === 0;
  const isOverdue = daysDiff < 0 && dueAmount > 0;

  let status: 'paid' | 'partial' | 'pending' | 'overdue' = 'pending';

  if (dueAmount === 0 && monthlyRent > 0) {
    status = 'paid';
  } else if (totalPaidThisCycle > 0 && dueAmount > 0) {
    status = 'partial';
  } else if (isOverdue) {
    status = 'overdue';
  } else {
    status = 'pending';
  }

  return {
    status,
    currentDueCycleDate: formatDateToISO(currentCycleDueDate),
    nextDueCycleDate: formatDateToISO(nextCycleDueDate),
    dueAmount,
    paidAmountThisCycle: totalPaidThisCycle,
    daysDiff,
    isDueToday,
    isOverdue,
    billingMonth: billingMonthKey,
    billingMonthLabel
  };
}

/**
 * Automatically generates a visual timeline of all activities for a tenant
 */
export function generateTenantTimeline(tenant: Tenant, payments: PaymentRecord[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. Add Stays
  if (tenant.stays && tenant.stays.length > 0) {
    tenant.stays.forEach((stay, idx) => {
      // Move in / Started Stay
      events.push({
        id: `event-movein-${stay.id}`,
        date: stay.startDate,
        title: idx === 0 ? 'Moved In' : 'Returned / New Stay',
        type: idx === 0 ? 'move_in' : 'return_stay',
        description: `Stay started in Room #${stay.roomNumber} (Rent: ₹${stay.monthlyRent.toLocaleString('en-IN')})`
      });

      // Move out (if completed)
      if (stay.endDate) {
        events.push({
          id: `event-moveout-${stay.id}`,
          date: stay.endDate,
          title: 'Moved Out',
          type: 'move_out',
          description: `Stay completed in Room #${stay.roomNumber}`
        });
      }
    });
  } else if (tenant.joiningDate) {
    events.push({
      id: `event-movein-${tenant.id}`,
      date: tenant.joiningDate,
      title: 'Moved In',
      type: 'move_in',
      description: `Moved into Room #${tenant.roomNumber}`
    });
    if (tenant.actualMoveOutDate) {
      events.push({
        id: `event-moveout-${tenant.id}`,
        date: tenant.actualMoveOutDate,
        title: 'Moved Out',
        type: 'move_out',
        description: `Moved out from Room #${tenant.roomNumber}`
      });
    }
  }

  // 2. Add Payments
  const tenantPayments = payments.filter((p) => p.tenantId === tenant.id);
  tenantPayments.forEach((p) => {
    events.push({
      id: `event-pay-${p.id}`,
      date: p.paymentDate,
      title: `₹${p.amountPaid.toLocaleString('en-IN')} Paid`,
      type: 'payment',
      amount: p.amountPaid,
      paymentMethod: p.paymentMethod,
      description: `Payment for ${p.billingMonthLabel} via ${p.paymentMethod}${p.receivedBy ? ` (Received by: ${p.receivedBy})` : ''}`
    });
  });

  // Sort events chronologically (oldest to newest)
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Format date nicely e.g. "10 Sep 2026"
 */
export function formatDisplayDate(dateStr: string, lang: 'en' | 'gu' = 'en'): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const monthName = lang === 'gu' ? MONTH_NAMES_GU[monthIndex] : MONTH_NAMES_EN[monthIndex];
    return `${day} ${monthName} ${year}`;
  }
  return dateStr;
}

/**
 * Get ordinal day string e.g. 10th / ૧૦મી
 */
export function formatOrdinalDay(day: number, lang: 'en' | 'gu' = 'en'): string {
  if (lang === 'gu') {
    return `${day} તારીખ`;
  }
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;
  return `${day}th`;
}
