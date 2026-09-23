import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Tenant, PaymentRecord, DashboardMetrics } from '../types';
import { formatDisplayDate, formatOrdinalDay, calculateTenantRentStatus } from './dateUtils';

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

  // 4 summary metric boxes (186mm total width, 44mm each + 3.3mm spacing)
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
    const statusLabel =
      status.status === 'paid' ? 'PAID' : status.status === 'overdue' ? 'OVERDUE' : 'PENDING';

    return [
      t.roomNumber,
      t.name,
      t.mobile,
      formatNumberForPDF(t.monthlyRent),
      `${formatOrdinalDay(t.rentDueDay, 'en')}`,
      formatNumberForPDF(t.securityDeposit),
      statusLabel,
      t.isActive ? 'Active' : 'Vacated'
    ];
  });

  autoTable(doc, {
    startY: 65,
    margin: { left: 12, right: 12 },
    head: [['Room', 'Tenant Name', 'Mobile', 'Rent (Rs.)', 'Due Day', 'Deposit (Rs.)', 'Status', 'State']],
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
      0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 36, fontStyle: 'bold' },
      2: { cellWidth: 26, halign: 'center' },
      3: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 24, halign: 'right' },
      6: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      7: { cellWidth: 20, halign: 'center' }
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 6) {
        if (data.cell.raw === 'PAID') {
          data.cell.styles.textColor = [22, 163, 74]; // green
        } else if (data.cell.raw === 'OVERDUE') {
          data.cell.styles.textColor = [220, 38, 38]; // red
        } else {
          data.cell.styles.textColor = [234, 88, 12]; // orange
        }
      }
    }
  });

  // 4. Payment Transactions Table
  const finalY = (doc as any).lastAutoTable.finalY || 140;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Payment Transactions History', 12, finalY + 10);

  const paymentRows = payments.slice(0, 30).map((p) => [
    p.id.slice(-6).toUpperCase(),
    p.tenantName,
    p.roomNumber,
    p.billingMonthLabel,
    p.paymentDate,
    formatNumberForPDF(p.amountPaid),
    p.paymentMethod,
    p.referenceNotes || '-'
  ]);

  autoTable(doc, {
    startY: finalY + 13,
    margin: { left: 12, right: 12 },
    head: [['Ref #', 'Tenant Name', 'Room', 'Month', 'Date', 'Amount (Rs.)', 'Method', 'Notes']],
    body: paymentRows,
    theme: 'grid',
    headStyles: {
      fillColor: [51, 65, 85], // Slate-700
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

  // Add Page Numbers in Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `RentManager Property Statement • Page ${i} of ${pageCount}`,
      105,
      290,
      { align: 'center' }
    );
  }

  // Save the PDF directly onto the phone/browser
  const filename = `rental_statement_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

/**
 * Downloads a single official Rent Payment Receipt as a PDF
 */
export function downloadSingleReceiptPDF(
  tenant: Tenant | undefined,
  payment: PaymentRecord,
  lang: 'en' | 'gu' = 'en'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [148, 210] // A5 Format
  });

  const pageWidth = 148;

  // Outer Border Box
  doc.setDrawColor(203, 213, 225); // Slate-300
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
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(187, 247, 208); // emerald-200
  doc.roundedRect(16, 38, pageWidth - 32, 26, 3, 3, 'FD');

  doc.setTextColor(22, 101, 52); // emerald-800
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('AMOUNT RECEIVED', pageWidth / 2, 45, { align: 'center' });

  doc.setFontSize(20);
  doc.setTextColor(22, 163, 74); // emerald-600
  doc.text(formatAmountWithRs(payment.amountPaid), pageWidth / 2, 57, { align: 'center' });

  // Receipt Details Table
  autoTable(doc, {
    startY: 70,
    margin: { left: 16, right: 16 },
    body: [
      ['Tenant Name:', payment.tenantName],
      ['Room / House Number:', `Room #${payment.roomNumber}`],
      ['Billing Month:', payment.billingMonthLabel],
      ['Payment Date:', formatDisplayDate(payment.paymentDate, lang)],
      ['Payment Method:', payment.paymentMethod],
      ['Reference / Notes:', payment.referenceNotes || 'None / Direct Payment'],
      ['Payment Status:', 'PAID (Verified)']
    ],
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: 3.2
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [100, 116, 139], cellWidth: 44 },
      1: { fontStyle: 'bold', textColor: [15, 23, 42] }
    },
    didParseCell: function (data) {
      if (data.row.index === 6 && data.column.index === 1) {
        data.cell.styles.textColor = [22, 163, 74];
      }
    }
  });

  // Footer & Signature section
  const signY = 160;
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(16, signY, 65, signY);
  doc.line(pageWidth - 65, signY, pageWidth - 16, signY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Tenant Signature', 40, signY + 5, { align: 'center' });
  doc.text('Owner / Landlord Signature', pageWidth - 40, signY + 5, { align: 'center' });

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('This is a computer-generated digital rent receipt.', pageWidth / 2, 186, {
    align: 'center'
  });
  doc.text('Thank you for your prompt payment! 🙏', pageWidth / 2, 192, { align: 'center' });

  // Download PDF
  const filename = `receipt_${payment.tenantName.replace(/\s+/g, '_')}_${payment.billingMonth}.pdf`;
  doc.save(filename);
}

/**
 * Downloads a statement PDF for a specific tenant
 */
export function downloadTenantStatementPDF(
  tenant: Tenant,
  tenantPayments: PaymentRecord[],
  lang: 'en' | 'gu' = 'en'
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const status = calculateTenantRentStatus(tenant, tenantPayments);
  const totalPaid = tenantPayments.reduce((acc, curr) => acc + curr.amountPaid, 0);

  // Header Banner
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`Tenant Statement: ${tenant.name} (#${tenant.roomNumber})`, 12, 14);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Mobile: ${tenant.mobile} • Joining Date: ${formatDisplayDate(tenant.joiningDate, lang)}`,
    12,
    21
  );

  // Tenant Summary Box
  autoTable(doc, {
    startY: 32,
    margin: { left: 12, right: 12 },
    head: [
      [
        'Monthly Rent (Rs.)',
        'Security Deposit (Rs.)',
        'Rent Due Day',
        'Current Cycle Status',
        'Total Paid to Date (Rs.)'
      ]
    ],
    body: [
      [
        formatNumberForPDF(tenant.monthlyRent),
        formatNumberForPDF(tenant.securityDeposit),
        `${formatOrdinalDay(tenant.rentDueDay, 'en')}`,
        status.status.toUpperCase(),
        formatNumberForPDF(totalPaid)
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], fontSize: 8.5, fontStyle: 'bold' },
    styles: { fontSize: 9, halign: 'center', cellPadding: 3 }
  });

  const finalY = (doc as any).lastAutoTable.finalY || 50;

  // Payments Ledger Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('Payment History & Transactions', 12, finalY + 8);

  const rows = tenantPayments.map((p) => [
    p.id.slice(-6).toUpperCase(),
    p.billingMonthLabel,
    formatDisplayDate(p.paymentDate, lang),
    formatNumberForPDF(p.amountPaid),
    p.paymentMethod,
    p.referenceNotes || '-'
  ]);

  autoTable(doc, {
    startY: finalY + 11,
    margin: { left: 12, right: 12 },
    head: [['Receipt #', 'Billing Month', 'Payment Date', 'Amount (Rs.)', 'Method', 'Notes']],
    body: rows,
    theme: 'striped',
    headStyles: { fillColor: [37, 99, 235], fontSize: 8.5, fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      3: { fontStyle: 'bold', textColor: [22, 163, 74], halign: 'right' }
    }
  });

  const filename = `statement_${tenant.name.replace(/\s+/g, '_')}_room${tenant.roomNumber}.pdf`;
  doc.save(filename);
}
