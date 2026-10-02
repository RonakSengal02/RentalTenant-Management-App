import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Tenant, PaymentRecord, DashboardMetrics } from '../types';
import { formatDisplayDate, formatOrdinalDay, calculateTenantRentStatus, calculateTenantLedger } from './dateUtils';

/**
 * Formats a clean number string without any leading spaces or corrupt characters.
 * e.g. 32500 -> "32,500"
 */
export function formatNumberForPDF(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0';
  }
  return Math.round(amount).toLocaleString('en-IN').trim();
}

/**
 * Formats an amount with "Rs." prefix without any accidental leading spaces.
 * e.g. 32500 -> "Rs. 32,500"
 */
export function formatAmountWithRs(amount: number): string {
  return `Rs. ${formatNumberForPDF(amount)}`;
}

/**
 * Downloads a complete, professional Rental & Tenant Report as PDF
 */
export function downloadFullRentalReportPDF(
  tenants: Tenant[],
  payments: PaymentRecord[],
  metrics: DashboardMetrics,
  lang: 'en' | 'gu' = 'en'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const primaryColor = [37, 99, 235] as [number, number, number]; // Blue #2563eb
  const secondaryColor = [30, 41, 59] as [number, number, number]; // Slate-800

  // 1. Report Header Banner
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('RentManager - Rental & Tenant Report', 12, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const now = new Date();
  doc.text(
    `Generated: ${now.toLocaleDateString('en-GB')} at ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    12,
    20
  );
  doc.text('Official Landlord Statement', 198, 20, { align: 'right' });

  // 2. Financial Summary KPI Box
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Monthly Financial Overview', 12, 34);

  // 4 summary metric boxes
  const boxY = 37;
  const boxHeight = 17;
  const boxWidth = 44;

  const boxes = [
    { title: 'Total Tenants', value: `${metrics.activeTenants} Active (${metrics.totalTenants} Total)` },
    { title: 'Expected Rent', value: formatAmountWithRs(metrics.totalMonthlyRentExpected) },
    { title: 'Collected (This Month)', value: formatAmountWithRs(metrics.rentCollectedThisMonth) },
    { title: 'Pending Rent', value: formatAmountWithRs(metrics.rentPendingThisMonth) }
  ];

  boxes.forEach((b, i) => {
    const x = 12 + i * (boxWidth + 3.3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, boxY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(b.title, x + 3.5, boxY + 5.5);

    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(b.value, x + 3.5, boxY + 12.5);
  });

  // 3. Tenants Master Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Tenants Master List & Current Status', 12, 62);

  const tenantRows = tenants.map((t) => {
    const status = calculateTenantRentStatus(t, payments);
    const statusLabel = status.status.toUpperCase();

    return [
      t.tenantCode || '-',
      t.roomNumber,
      t.name,
      t.mobile,
      formatNumberForPDF(t.monthlyRent),
      `${formatOrdinalDay(t.rentDueDay, 'en')}`,
      formatNumberForPDF(t.securityDeposit),
      statusLabel,
      t.isArchived ? 'Archived' : t.isActive ? 'Active' : 'Inactive'
    ];
  });

  autoTable(doc, {
    startY: 65,
    margin: { left: 12, right: 12 },
    head: [['ID', 'Room', 'Tenant Name', 'Mobile', 'Rent (Rs.)', 'Due Day', 'Deposit', 'Status', 'State']],
    body: tenantRows,
    theme: 'striped',
    headStyles: {
      fillColor: primaryColor,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    styles: {
      fontSize: 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 }
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 14, halign: 'center' },
      2: { cellWidth: 32, fontStyle: 'bold' },
      3: { cellWidth: 26, halign: 'center' },
      4: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 18, halign: 'center' },
      6: { cellWidth: 20, halign: 'right' },
      7: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      8: { cellWidth: 18, halign: 'center' }
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 7) {
        if (data.cell.raw === 'PAID') {
          data.cell.styles.textColor = [22, 163, 74];
        } else if (data.cell.raw === 'PARTIAL') {
          data.cell.styles.textColor = [202, 138, 4]; // amber
        } else if (data.cell.raw === 'OVERDUE') {
          data.cell.styles.textColor = [220, 38, 38];
        } else {
          data.cell.styles.textColor = [100, 116, 139];
        }
      }
    }
  });

  // 4. Payment Transactions Table
  const finalY = (doc as any).lastAutoTable.finalY || 140;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Recent Payment Transactions', 12, finalY + 10);

  const paymentRows = payments.slice(0, 30).map((p) => [
    p.id.slice(-6).toUpperCase(),
    p.tenantName,
    p.roomNumber,
    p.billingMonthLabel,
    p.paymentDate,
    formatNumberForPDF(p.amountPaid),
    p.paymentMethod,
    p.receivedBy || p.referenceNotes || '-'
  ]);

  autoTable(doc, {
    startY: finalY + 13,
    margin: { left: 12, right: 12 },
    head: [['Ref #', 'Tenant Name', 'Room', 'Month', 'Date', 'Amount (Rs.)', 'Method', 'Received By / Notes']],
    body: paymentRows,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    styles: {
      fontSize: 7.5,
      cellPadding: { top: 2, bottom: 2, left: 2, right: 2 }
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'center' },
      1: { cellWidth: 34, fontStyle: 'bold' },
      2: { cellWidth: 14, halign: 'center' },
      3: { cellWidth: 26 },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 26, halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] },
      6: { cellWidth: 22, halign: 'center' },
      7: { cellWidth: 26 }
    }
  });

  // Page Numbers in Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`RentManager Statement • Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
  }

  doc.save(`rental_statement_${now.toISOString().slice(0, 10)}.pdf`);
}

/**
 * Downloads a single official Rent Payment Receipt as a PDF
 */
export function downloadSingleReceiptPDF(
  tenant: Tenant | undefined,
  payment: PaymentRecord,
  lang: 'en' | 'gu' = 'en',
  previousPending: number = 0,
  remainingPending: number = 0
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [148, 210] // A5 Format
  });

  const pageWidth = 148;

  // Outer Border Box
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.roundedRect(8, 8, pageWidth - 16, 194, 4, 4, 'D');

  // Header Banner
  doc.setFillColor(37, 99, 235);
  doc.rect(8, 8, pageWidth - 16, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('RENT RECEIPT', pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Official Payment Acknowledgement • Receipt #${payment.id.slice(-6).toUpperCase()}`,
    pageWidth / 2,
    26,
    { align: 'center' }
  );

  // Amount Received Box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(16, 36, pageWidth - 32, 26, 3, 3, 'FD');

  doc.setTextColor(22, 101, 52);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('AMOUNT RECEIVED', pageWidth / 2, 43, { align: 'center' });

  doc.setFontSize(20);
  doc.setTextColor(22, 163, 74);
  doc.text(formatAmountWithRs(payment.amountPaid), pageWidth / 2, 55, { align: 'center' });

  // Receipt Details Table
  const receiptRows = [
    ['Tenant Name:', payment.tenantName],
    ['Tenant ID:', tenant?.tenantCode || '-'],
    ['Room Number:', `Room #${payment.roomNumber}`],
    ['Rent Period:', payment.billingMonthLabel],
    ['Payment Date:', formatDisplayDate(payment.paymentDate, lang)],
    ['Payment Mode:', payment.paymentMethod],
    ['Received By:', payment.receivedBy || 'Landlord / Chirag'],
    ['Reference / Transaction:', payment.referenceNumber || payment.referenceNotes || 'Direct Payment']
  ];

  if (remainingPending > 0) {
    receiptRows.push(['Remaining Pending:', formatAmountWithRs(remainingPending)]);
  } else {
    receiptRows.push(['Pending Balance:', 'Rs. 0 (Fully Paid)']);
  }

  autoTable(doc, {
    startY: 66,
    margin: { left: 16, right: 16 },
    body: receiptRows,
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.8
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 46 },
      1: { fontStyle: 'bold', textColor: [15, 23, 42] }
    }
  });

  // Footer & Signature section
  const signY = 162;
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(16, signY, 65, signY);
  doc.line(pageWidth - 65, signY, pageWidth - 16, signY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Tenant Signature', 40, signY + 5, { align: 'center' });
  doc.text('Owner Signature', pageWidth - 40, signY + 5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This is an official computer-generated digital rent receipt.', pageWidth / 2, 186, {
    align: 'center'
  });
  doc.text('Thank you for your prompt payment! 🙏', pageWidth / 2, 192, { align: 'center' });

  doc.save(`receipt_${payment.tenantName.replace(/\s+/g, '_')}_${payment.billingMonth}.pdf`);
}

/**
 * Downloads a complete statement PDF for a specific tenant
 * Sensitive Identity Document is EXCLUDED by default unless explicitly requested.
 */
export function downloadTenantStatementPDF(
  tenant: Tenant,
  tenantPayments: PaymentRecord[],
  lang: 'en' | 'gu' = 'en',
  includeIdDoc: boolean = false
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const ledger = calculateTenantLedger(tenant, tenantPayments);
  const totalRentAllTime = ledger.reduce((acc, curr) => acc + curr.totalRent, 0);
  const totalPaidAllTime = tenantPayments.reduce((acc, curr) => acc + curr.amountPaid, 0);
  const totalPendingAllTime = Math.max(0, totalRentAllTime - totalPaidAllTime);

  // 1. Header Banner
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`TENANT RENT STATEMENT`, 12, 13);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Tenant: ${tenant.name} (${tenant.tenantCode}) • Room #${tenant.roomNumber} • Mobile: ${tenant.mobile}`,
    12,
    21
  );

  // 2. Financial Summary KPI Boxes
  const boxY = 34;
  const boxWidth = 58;
  const boxHeight = 16;

  const boxes = [
    { title: 'Total Rent Due', value: formatAmountWithRs(totalRentAllTime), color: [15, 23, 42] },
    { title: 'Total Amount Paid', value: formatAmountWithRs(totalPaidAllTime), color: [22, 163, 74] },
    { title: 'Total Pending', value: formatAmountWithRs(totalPendingAllTime), color: totalPendingAllTime > 0 ? [220, 38, 38] : [22, 163, 74] }
  ];

  boxes.forEach((b, i) => {
    const x = 12 + i * (boxWidth + 6);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, boxY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(b.title, x + 3.5, boxY + 5.5);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(b.color[0], b.color[1], b.color[2]);
    doc.text(b.value, x + 3.5, boxY + 12);
  });

  let currentY = 56;

  // 3. Stay History Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Stay History', 12, currentY);

  const stayRows = (tenant.stays || []).map((s, idx) => [
    s.id,
    `${formatDisplayDate(s.startDate, lang)} -> ${s.endDate ? formatDisplayDate(s.endDate, lang) : 'Active'}`,
    `Room #${s.roomNumber}`,
    formatAmountWithRs(s.monthlyRent),
    s.isActive ? 'Active' : 'Ended'
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    margin: { left: 12, right: 12 },
    head: [['Stay ID', 'Stay Duration', 'Room', 'Monthly Rent', 'Status']],
    body: stayRows.length > 0 ? stayRows : [['STAY-0001', `${formatDisplayDate(tenant.joiningDate, lang)} -> Active`, `Room #${tenant.roomNumber}`, formatAmountWithRs(tenant.monthlyRent), 'Active']],
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 4. Rent Ledger Table (All monthly periods)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Monthly Rent Ledger', 12, currentY);

  const ledgerRows = ledger.map((l) => [
    l.label,
    formatAmountWithRs(l.totalRent),
    formatAmountWithRs(l.totalPaid),
    formatAmountWithRs(l.pending),
    l.status.toUpperCase()
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    margin: { left: 12, right: 12 },
    head: [['Billing Month', 'Rent (Rs.)', 'Paid (Rs.)', 'Pending (Rs.)', 'Status']],
    body: ledgerRows,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2 },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] },
      3: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] },
      4: { halign: 'center', fontStyle: 'bold' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 5. Payment Transactions Ledger
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Payment Transactions History', 12, currentY);

  const paymentRows = tenantPayments.map((p) => [
    p.id.slice(-6).toUpperCase(),
    p.billingMonthLabel,
    formatDisplayDate(p.paymentDate, lang),
    formatAmountWithRs(p.amountPaid),
    p.paymentMethod,
    p.receivedBy || 'Landlord',
    p.referenceNotes || p.referenceNumber || '-'
  ]);

  autoTable(doc, {
    startY: currentY + 3,
    margin: { left: 12, right: 12 },
    head: [['Ref #', 'Month', 'Date', 'Amount', 'Method', 'Received By', 'Reference/Notes']],
    body: paymentRows.length > 0 ? paymentRows : [['-', '-', '-', '-', '-', '-', 'No payments recorded']],
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], fontSize: 8, fontStyle: 'bold' },
    styles: { fontSize: 7.5, cellPadding: 2 }
  });

  // 6. Optional Sensitive Document Page (Only if explicitly toggled ON)
  if (includeIdDoc && tenant.documentUrl) {
    doc.addPage();
    doc.setFillColor(241, 245, 249);
    doc.rect(0, 0, 210, 297, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('CONFIDENTIAL IDENTITY DOCUMENT', 12, 20);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Tenant: ${tenant.name} (${tenant.tenantCode}) • Document attached for verification purposes.`,
      12,
      27
    );

    try {
      doc.addImage(tenant.documentUrl, 'JPEG', 12, 35, 186, 120, undefined, 'FAST');
    } catch (e) {
      console.warn('Could not render document image in PDF:', e);
      doc.text('Document image could not be loaded into PDF.', 12, 45);
    }
  }

  // Footer page numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Official Tenant Statement • Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
  }

  const filename = `statement_${tenant.tenantCode}_${tenant.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}

export { exportSingleTenantHistoryCSV } from '../db/storage';

