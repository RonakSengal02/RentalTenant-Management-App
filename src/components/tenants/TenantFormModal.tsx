import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { Tenant } from '../../types';
import { formatDateToISO, formatOrdinalDay } from '../../utils/dateUtils';
import { X, Camera, Upload, User, Phone, Home, MapPin, Calendar, IndianRupee, ShieldCheck } from 'lucide-react';

interface TenantFormModalProps {
  isOpen: boolean;
  tenantToEdit?: Tenant | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}

// Preset avatars for rapid testing or owners without camera access
const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
];

export const TenantFormModal: React.FC<TenantFormModalProps> = ({
  isOpen,
  tenantToEdit,
  onClose,
  onSave
}) => {
  const { t, language } = useLanguage();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [address, setAddress] = useState('');
  const [joiningDate, setJoiningDate] = useState(formatDateToISO(new Date()));
  const [monthlyRent, setMonthlyRent] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [rentDueDay, setRentDueDay] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tenantToEdit) {
      setName(tenantToEdit.name);
      setMobile(tenantToEdit.mobile);
      setPhotoUrl(tenantToEdit.photoUrl || '');
      setRoomNumber(tenantToEdit.roomNumber);
      setAddress(tenantToEdit.address || '');
      setJoiningDate(tenantToEdit.joiningDate || formatDateToISO(new Date()));
      setMonthlyRent(String(tenantToEdit.monthlyRent));
      setSecurityDeposit(String(tenantToEdit.securityDeposit || ''));
      setRentDueDay(tenantToEdit.rentDueDay || 1);
      setIsActive(tenantToEdit.isActive !== false);
      setNotes(tenantToEdit.notes || '');
    } else {
      // Default new tenant values
      setName('');
      setMobile('');
      setPhotoUrl(AVATAR_PRESETS[0]);
      setRoomNumber('');
      setAddress('');
      setJoiningDate(formatDateToISO(new Date()));
      setMonthlyRent('');
      setSecurityDeposit('');
      setRentDueDay(10); // default to 10th of every month
      setIsActive(true);
      setNotes('');
    }
    setErrors({});
  }, [tenantToEdit, isOpen]);

  if (!isOpen) return null;

  // Handle local image file upload (camera or gallery)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = language === 'gu' ? 'કૃપા કરીને પૂરું નામ દાખલ કરો' : 'Tenant name is required';
    }
    if (!mobile.trim() || mobile.replace(/\D/g, '').length < 10) {
      newErrors.mobile = language === 'gu' ? 'માન્ય 10 અંકનો મોબાઈલ નંબર દાખલ કરો' : 'Valid 10-digit mobile number required';
    }
    if (!roomNumber.trim()) {
      newErrors.roomNumber = language === 'gu' ? 'રૂમ / મકાન નંબર જરૂરી છે' : 'Room number is required';
    }
    if (!monthlyRent || isNaN(Number(monthlyRent)) || Number(monthlyRent) <= 0) {
      newErrors.monthlyRent = language === 'gu' ? 'માન્ય ભાડાની રકમ દાખલ કરો' : 'Valid monthly rent is required';
    }
    if (rentDueDay < 1 || rentDueDay > 31) {
      newErrors.rentDueDay = language === 'gu' ? 'તારીખ 1 થી 31 ની વચ્ચે હોવી જોઈએ' : 'Day must be between 1 and 31';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const data = {
        ...(tenantToEdit ? { id: tenantToEdit.id, createdAt: tenantToEdit.createdAt } : {}),
        name: name.trim(),
        mobile: mobile.trim(),
        photoUrl: photoUrl.trim() || undefined,
        roomNumber: roomNumber.trim(),
        address: address.trim(),
        joiningDate,
        monthlyRent: Number(monthlyRent),
        securityDeposit: Number(securityDeposit) || 0,
        rentDueDay: Number(rentDueDay),
        isActive,
        notes: notes.trim()
      };

      await onSave(data);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-modal overflow-hidden my-6 border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-extrabold text-base text-slate-900">
            {tenantToEdit ? t.editTenantModalTitle : t.addTenantModalTitle}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Photo & Avatar Picker */}
          <div className="flex flex-col items-center gap-2 pb-2">
            <div className="relative group">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt="Tenant"
                  className="w-20 h-20 rounded-3xl object-cover border-4 border-blue-50 shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-3xl bg-blue-50 border-4 border-white shadow-md flex items-center justify-center text-blue-600">
                  <User className="w-9 h-9" />
                </div>
              )}
              <label className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-blue-600 text-white shadow-md hover:bg-blue-700 cursor-pointer transition-transform active:scale-95">
                <Camera className="w-4 h-4" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Quick Preset Avatars */}
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">
                {language === 'gu' ? 'અથવા પસંદ કરો:' : 'Or preset:'}
              </span>
              {AVATAR_PRESETS.map((preset, idx) => (
                <img
                  key={idx}
                  src={preset}
                  alt={`Preset ${idx + 1}`}
                  onClick={() => setPhotoUrl(preset)}
                  className={`w-7 h-7 rounded-full object-cover cursor-pointer border-2 transition-transform hover:scale-110 ${
                    photoUrl === preset ? 'border-blue-600 ring-2 ring-blue-500/30' : 'border-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Tenant Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.tenantName} *
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.tenantNamePlaceholder}
                className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 ${
                  errors.name ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-blue-500'
                }`}
              />
            </div>
            {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
          </div>

          {/* Mobile & Room Number Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.mobileNumber} *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder={t.mobilePlaceholder}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 ${
                    errors.mobile ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
              </div>
              {errors.mobile && <p className="text-[11px] text-rose-500 mt-1">{errors.mobile}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.roomNumber} *
              </label>
              <div className="relative">
                <Home className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder={t.roomPlaceholder}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 ${
                    errors.roomNumber ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
              </div>
              {errors.roomNumber && <p className="text-[11px] text-rose-500 mt-1">{errors.roomNumber}</p>}
            </div>
          </div>

          {/* Monthly Rent & Security Deposit Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.monthlyRentAmount} *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  value={monthlyRent}
                  onChange={(e) => setMonthlyRent(e.target.value)}
                  placeholder={t.monthlyRentPlaceholder}
                  className={`w-full pl-8 pr-3 py-2.5 rounded-xl border text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 ${
                    errors.monthlyRent ? 'border-rose-400 bg-rose-50/20' : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
              </div>
              {errors.monthlyRent && <p className="text-[11px] text-rose-500 mt-1">{errors.monthlyRent}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.securityDeposit}
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm">
                  ₹
                </span>
                <input
                  type="number"
                  value={securityDeposit}
                  onChange={(e) => setSecurityDeposit(e.target.value)}
                  placeholder={t.securityDepositPlaceholder}
                  className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Rent Due Day (Day of Month) Picker */}
          <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-100">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-blue-950">
                {t.rentDueDay} *
              </label>
              <span className="font-extrabold text-sm text-blue-700 bg-white px-2 py-0.5 rounded-lg border border-blue-200">
                {formatOrdinalDay(rentDueDay, language)}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="31"
              value={rentDueDay}
              onChange={(e) => setRentDueDay(Number(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-blue-200 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-blue-600/80 mt-1 font-medium">
              {language === 'gu'
                ? `દર મહિનાની ${formatOrdinalDay(rentDueDay, language)} તારીખે આપોઆપ ભાડું બાકી ગણાશે.`
                : `Rent will be calculated as due on the ${formatOrdinalDay(rentDueDay, 'en')} of every month.`}
            </p>
          </div>

          {/* Move-in / Joining Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.joiningDate}
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.address}
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t.addressPlaceholder}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Active / Vacated Switch (if editing) */}
          {tenantToEdit && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="font-bold text-xs text-slate-800 block">
                  {isActive ? t.active : t.inactive}
                </span>
                <span className="text-[11px] text-slate-400">
                  {isActive ? t.markAsInactive : t.markAsActive}
                </span>
              </div>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
              />
            </div>
          )}

          {/* Form Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? t.loading : t.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
