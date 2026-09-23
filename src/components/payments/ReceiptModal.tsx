import React from 'react';
import { PaymentRecord, Tenant } from '../../types';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatDisplayDate } from '../../utils/dateUtils';
import { generateRentReceiptText, getWhatsAppShareUrl } from '../../utils/receiptUtils';
import { downloadSingleReceiptPDF } from '../../utils/pdfUtils';
import { X, MessageCircle, Printer, CheckCircle2, Building, Download, FileDown } from 'lucide-react';

interface ReceiptModalProps {
  payment: PaymentRecord | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ payment, onClose }) => {
  const { t, language } = useLanguage();
  const { tenants } = useApp();

  if (!payment) return null;

  const tenant = tenants.find((t) => t.id === payment.tenantId);
  const mobile = tenant ? tenant.mobile : '';

  const waText = tenant ? generateRentReceiptText(tenant, payment, language) : '';
  const waUrl = getWhatsAppShareUrl(mobile, waText);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-modal overflow-hidden my-6 border border-slate-200">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{language === 'gu' ? 'સત્તાવાર ભાડા પહોંચ' : 'Official Rent Receipt'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Card */}
        <div id="printable-receipt" className="p-6 space-y-4">
          {/* Header */}
          <div className="text-center pb-4 border-b border-dashed border-slate-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
              <Building className="w-6 h-6" />
            </div>
            <h2 className="font-extrabold text-xl text-slate-900 tracking-tight">
              {language === 'gu' ? 'ભાડા પહોંચ' : 'RENT RECEIPT'}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Receipt No: #{payment.id.slice(-6).toUpperCase()}
            </p>
          </div>

          {/* Amount Box */}
          <div className="bg-emerald-50/80 rounded-2xl p-4 text-center border border-emerald-200/60">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              {language === 'gu' ? 'ચૂકવેલ રકમ' : 'Amount Received'}
            </span>
            <div className="text-3xl font-black text-emerald-700 mt-1">
              {formatCurrency(payment.amountPaid)}
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 bg-white px-2.5 py-0.5 rounded-full mt-2 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              <span>{language === 'gu' ? 'સફળતાપૂર્વક જમા થયેલ' : 'Payment Verified (PAID)'}</span>
            </span>
          </div>

          {/* Details Table */}
          <div className="space-y-2 text-xs divide-y divide-slate-100">
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400 font-medium">{t.tenantName}</span>
              <span className="font-bold text-slate-900">{payment.tenantName}</span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-400 font-medium">{t.roomNumber}</span>
              <span className="font-bold text-slate-900">Room #{payment.roomNumber}</span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-400 font-medium">{t.billingMonth}</span>
              <span className="font-bold text-slate-900">{payment.billingMonthLabel}</span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-400 font-medium">{t.paymentDate}</span>
              <span className="font-bold text-slate-900">
                {formatDisplayDate(payment.paymentDate, language)}
              </span>
            </div>

            <div className="flex justify-between py-1.5">
              <span className="text-slate-400 font-medium">{t.paymentMethod}</span>
              <span className="font-bold text-slate-900">{payment.paymentMethod}</span>
            </div>

            {payment.referenceNotes && (
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400 font-medium">{t.paymentRefNotes}</span>
                <span className="font-medium text-slate-800 text-right max-w-[200px] truncate">
                  {payment.referenceNotes}
                </span>
              </div>
            )}
          </div>

          {/* Footer Thank You */}
          <div className="pt-2 text-center text-xs text-slate-400 italic border-t border-dashed border-slate-200">
            {language === 'gu' ? 'સમયસર ભાડું ચૂકવવા બદલ આભાર! 🙏' : 'Thank you for your timely payment! 🙏'}
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
          {mobile && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition-all active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{t.shareOnWhatsApp}</span>
            </a>
          )}

          <button
            onClick={() => downloadSingleReceiptPDF(tenant, payment, language)}
            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold text-xs transition-colors"
            title="Download PDF Receipt"
          >
            <FileDown className="w-4 h-4 text-blue-600" />
            <span>PDF</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-1.5 py-3 px-3 rounded-xl border border-slate-200 hover:bg-slate-200/60 font-bold text-xs text-slate-700 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'gu' ? 'પ્રિન્ટ' : 'Print'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
