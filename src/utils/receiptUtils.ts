import { PaymentRecord, Tenant } from '../types';
import { formatCurrency } from './currencyUtils';
import { formatDisplayDate, calculateTenantLedger } from './dateUtils';

/**
 * Creates a WhatsApp share URL with prefilled text
 */
export function getWhatsAppShareUrl(mobile: string, text: string): string {
  let cleanNumber = mobile.replace(/[^0-9]/g, '');
  if (cleanNumber.length === 10) {
    cleanNumber = '91' + cleanNumber;
  }
  return `https://wa.me/${cleanNumber}?text=${encodeURIComponent(text)}`;
}

/**
 * Generates official rent payment receipt text (WhatsApp friendly)
 */
export function generateRentReceiptText(
  tenant: Tenant,
  payment: PaymentRecord,
  lang: 'en' | 'gu' = 'en',
  remainingPending: number = 0
): string {
  const amountStr = formatCurrency(payment.amountPaid);
  const dateStr = formatDisplayDate(payment.paymentDate, lang);
  const pendingStr = remainingPending > 0 ? formatCurrency(remainingPending) : '₹0 (Fully Paid)';

  if (lang === 'gu') {
    return `*🧾 ભાડા પહોંચ (RENT RECEIPT)*\n` +
      `--------------------------------\n` +
      `👤 *ભાડુઆત:* ${payment.tenantName} (${tenant.tenantCode})\n` +
      `🏠 *રૂમ / મકાન નં:* ${payment.roomNumber}\n` +
      `📅 *મહિનો:* ${payment.billingMonthLabel}\n` +
      `💰 *ચૂકવેલ રકમ:* ${amountStr}\n` +
      `🗓️ *તારીખ:* ${dateStr}\n` +
      `💳 *ચૂકવણી પદ્ધતિ:* ${payment.paymentMethod}\n` +
      (payment.receivedBy ? `✍️ *સ્વીકારનાર:* ${payment.receivedBy}\n` : '') +
      (payment.referenceNotes ? `📝 *સંદર્ભ:* ${payment.referenceNotes}\n` : '') +
      `⏳ *બાકી રકમ:* ${pendingStr}\n` +
      `--------------------------------\n` +
      `✅ ₹${payment.amountPaid.toLocaleString('en-IN')} નું ભાડું સફળતાપૂર્વક મળેલ છે. આભાર! 🙏`;
  }

  return `*🧾 RENT RECEIPT*\n` +
    `--------------------------------\n` +
    `👤 *Tenant:* ${payment.tenantName} (${tenant.tenantCode})\n` +
    `🏠 *Room / House No:* ${payment.roomNumber}\n` +
    `📅 *Billing Month:* ${payment.billingMonthLabel}\n` +
    `💰 *Amount Paid:* ${amountStr}\n` +
    `🗓️ *Payment Date:* ${dateStr}\n` +
    `💳 *Payment Method:* ${payment.paymentMethod}\n` +
    (payment.receivedBy ? `✍️ *Received By:* ${payment.receivedBy}\n` : '') +
    (payment.referenceNotes ? `📝 *Reference:* ${payment.referenceNotes}\n` : '') +
    `⏳ *Remaining Pending:* ${pendingStr}\n` +
    `--------------------------------\n` +
    `✅ ₹${payment.amountPaid.toLocaleString('en-IN')} rent received with thanks! 🙏`;
}

/**
 * Generates WhatsApp share text for complete tenant rent statement
 */
export function generateTenantStatementShareText(
  tenant: Tenant,
  payments: PaymentRecord[],
  lang: 'en' | 'gu' = 'en'
): string {
  const ledger = calculateTenantLedger(tenant, payments);
  const totalRent = ledger.reduce((acc, curr) => acc + curr.totalRent, 0);
  const totalPaid = payments.reduce((acc, curr) => acc + curr.amountPaid, 0);
  const totalPending = Math.max(0, totalRent - totalPaid);

  let text = `*📋 TENANT RENT STATEMENT*\n`;
  text += `--------------------------------\n`;
  text += `👤 *Tenant:* ${tenant.name} (${tenant.tenantCode})\n`;
  text += `🏠 *Room:* #${tenant.roomNumber}\n`;
  text += `📞 *Mobile:* ${tenant.mobile}\n`;
  text += `💵 *Monthly Rent:* ${formatCurrency(tenant.monthlyRent)}\n\n`;

  text += `*Summary:*\n`;
  text += `• Total Rent Due: ${formatCurrency(totalRent)}\n`;
  text += `• Total Paid: ${formatCurrency(totalPaid)}\n`;
  text += `• Total Pending: ${formatCurrency(totalPending)}\n\n`;

  text += `*Recent Payments:*\n`;
  payments.slice(0, 5).forEach((p) => {
    text += `✓ ${formatDisplayDate(p.paymentDate, lang)}: ${formatCurrency(p.amountPaid)} (${p.paymentMethod})\n`;
  });

  text += `--------------------------------\n`;
  text += `Generated via RentManager.`;
  return text;
}

/**
 * Generates Due Reminder message for WhatsApp
 */
export function generateDueReminderMessage(
  tenant: Tenant,
  dueAmount: number,
  dueDateStr: string,
  type: 'due_today' | 'upcoming' | 'overdue',
  lang: 'en' | 'gu' = 'en'
): string {
  const amountFormatted = formatCurrency(dueAmount);
  const formattedDate = formatDisplayDate(dueDateStr, lang);

  if (lang === 'gu') {
    if (type === 'due_today') {
      return `🔔 *ભાડા રિમાઇન્ડર*\n` +
        `નમસ્તે ${tenant.name} જી (રૂમ ${tenant.roomNumber}),\n` +
        `તમારું આ મહિનાનું ભાડું ${amountFormatted} આજે ભરવાનું બાકી છે. કૃપા કરીને સમયસર જમા કરાવવા વિનંતી. આભાર!`;
    } else if (type === 'overdue') {
      return `⚠️ *ભાડું બાકી / ઓવરડ્યુ રિમાઇન્ડર*\n` +
        `નમસ્તે ${tenant.name} જી (રૂમ ${tenant.roomNumber}),\n` +
        `તમારું ${amountFormatted} નું ભાડું ${formattedDate} થી બાકી છે. કૃપા કરીને વહેલી તકે જમા કરાવશો.`;
    } else {
      return `📢 *આગામી ભાડા રિમાઇન્ડર*\n` +
        `નમસ્તે ${tenant.name} જી (રૂમ ${tenant.roomNumber}),\n` +
        `તમારું આ મહિનાનું ભાડું ${amountFormatted} તારીખ ${formattedDate} ના રોજ ભરવાનું થાય છે.`;
    }
  }

  // English
  if (type === 'due_today') {
    return `🔔 *Rent Reminder*\n` +
      `Hello ${tenant.name} – Room ${tenant.roomNumber},\n` +
      `Monthly rent of ${amountFormatted} is due today. Kindly arrange for the payment. Thank you!`;
  } else if (type === 'overdue') {
    return `⚠️ *Rent Pending*\n` +
      `Hello ${tenant.name} – Room ${tenant.roomNumber},\n` +
      `Monthly rent of ${amountFormatted} is still pending (Due on ${formattedDate}). Please clear the pending rent soon.`;
  } else {
    return `📢 *Upcoming Rent Reminder*\n` +
      `Hello ${tenant.name} – Room ${tenant.roomNumber},\n` +
      `Friendly reminder that monthly rent of ${amountFormatted} is due on ${formattedDate}.`;
  }
}
