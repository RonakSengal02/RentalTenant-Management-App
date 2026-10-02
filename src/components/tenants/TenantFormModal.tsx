import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { Tenant } from '../../types';
import { formatDateToISO, formatOrdinalDay } from '../../utils/dateUtils';
import {
  X,
  Camera,
  Upload,
  User,
  Phone,
  Home,
  MapPin,
  Calendar,
  ShieldCheck,
  Briefcase,
  AlertTriangle,
  FileText,
  UserPlus,
  Users
} from 'lucide-react';

interface TenantFormModalProps {
  isOpen: boolean;
  tenantToEdit?: Tenant | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  onSelectExistingTenant?: (tenant: Tenant) => void;
}

const AVATAR_PRESETS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80'
];

const sanitize10DigitPhone = (value: string): string => {
  let digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
};

export const TenantFormModal: React.FC<TenantFormModalProps> = ({
  isOpen,
  tenantToEdit,
  onClose,
  onSave,
  onSelectExistingTenant
}) => {
  const { t, language } = useLanguage();
  const { tenants, rooms, findDuplicateTenant } = useApp();

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [alternateMobile, setAlternateMobile] = useState('');

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = sanitize10DigitPhone(e.target.value);
    setMobile(clean);
    if (errors.mobile && clean.length === 10) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.mobile;
        return copy;
      });
    }
  };

  const handleAlternateMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = sanitize10DigitPhone(e.target.value);
    setAlternateMobile(clean);
    if (errors.alternateMobile && (clean.length === 0 || clean.length === 10)) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.alternateMobile;
        return copy;
      });
    }
  };
  const [photoUrl, setPhotoUrl] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [address, setAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [occupantsCount, setOccupantsCount] = useState('1');
  const [joiningDate, setJoiningDate] = useState(formatDateToISO(new Date()));
  const [expectedMoveOutDate, setExpectedMoveOutDate] = useState('');
  const [monthlyRent, setMonthlyRent] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [rentDueDay, setRentDueDay] = useState(10);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');

  // Referral states
  const [referredByType, setReferredByType] = useState<'direct' | 'existing_tenant' | 'other'>('direct');
  const [referredByTenantId, setReferredByTenantId] = useState('');
  const [referredByName, setReferredByName] = useState('');

  // Duplicate Warning Modal state
  const [duplicateMatch, setDuplicateMatch] = useState<Tenant | null>(null);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tenantToEdit) {
      setName(tenantToEdit.name);
      setMobile(tenantToEdit.mobile);
      setAlternateMobile(tenantToEdit.alternateMobile || '');
      setPhotoUrl(tenantToEdit.photoUrl || '');
      setDocumentUrl(tenantToEdit.documentUrl || '');
      setRoomNumber(tenantToEdit.roomNumber);
      setAddress(tenantToEdit.address || '');
      setOccupation(tenantToEdit.occupation || '');
      setEmergencyContact(tenantToEdit.emergencyContact || '');
      setOccupantsCount(String(tenantToEdit.occupantsCount || 1));
      setJoiningDate(tenantToEdit.joiningDate || formatDateToISO(new Date()));
      setExpectedMoveOutDate(tenantToEdit.expectedMoveOutDate || '');
      setMonthlyRent(String(tenantToEdit.monthlyRent));
      setSecurityDeposit(String(tenantToEdit.securityDeposit || ''));
      setRentDueDay(tenantToEdit.rentDueDay || 10);
      setIsActive(tenantToEdit.isActive !== false);
      setNotes(tenantToEdit.notes || '');
      setReferredByType(tenantToEdit.referredByType || 'direct');
      setReferredByTenantId(tenantToEdit.referredByTenantId || '');
      setReferredByName(tenantToEdit.referredByName || '');
    } else {
      setName('');
      setMobile('');
      setAlternateMobile('');
      setPhotoUrl(AVATAR_PRESETS[0]);
      setDocumentUrl('');
      setRoomNumber('');
      setAddress('');
      setOccupation('');
      setEmergencyContact('');
      setOccupantsCount('1');
      setJoiningDate(formatDateToISO(new Date()));
      setExpectedMoveOutDate('');
      setMonthlyRent('');
      setSecurityDeposit('');
      setRentDueDay(10);
      setIsActive(true);
      setNotes('');
      setReferredByType('direct');
      setReferredByTenantId('');
      setReferredByName('');
    }
    setErrors({});
    setShowDuplicateModal(false);
    setDuplicateMatch(null);
  }, [tenantToEdit, isOpen]);

  if (!isOpen) return null;

  // Handle Tenant Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Aadhaar / Document Upload
  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocumentUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = language === 'gu' ? 'કૃપા કરીને પૂરું નામ દાખલ કરો' : 'Tenant name is required';
    }
    const cleanMobile = mobile.replace(/\D/g, '');
    if (!cleanMobile || cleanMobile.length < 10) {
      newErrors.mobile = language === 'gu'
        ? 'કૃપા કરીને સાચો નંબર દાખલ કરો'
        : 'Please give correct number';
    }

    const cleanAlt = alternateMobile.replace(/\D/g, '');
    if (cleanAlt.length > 0 && cleanAlt.length < 10) {
      newErrors.alternateMobile = language === 'gu'
        ? 'કૃપા કરીને સાચો નંબર દાખલ કરો'
        : 'Please give correct number';
    }
    if (!roomNumber.trim()) {
      newErrors.roomNumber = language === 'gu' ? 'રૂમ / મકાન નંબર જરૂરી છે' : 'Room number is required';
    }
    if (!monthlyRent || isNaN(Number(monthlyRent)) || Number(monthlyRent) < 0) {
      newErrors.monthlyRent = language === 'gu' ? 'માન્ય ભાડાની રકમ દાખલ કરો' : 'Valid monthly rent is required';
    }
    if (rentDueDay < 1 || rentDueDay > 31) {
      newErrors.rentDueDay = language === 'gu' ? 'તારીખ 1 થી 31 ની વચ્ચે હોવી જોઈએ' : 'Day must be between 1 and 31';
    }
    if (expectedMoveOutDate && joiningDate && expectedMoveOutDate < joiningDate) {
      newErrors.expectedMoveOutDate = language === 'gu' ? 'ખાલી કરવાની તારીખ આવ્યા તારીખ પછીની હોવી જોઈએ' : 'Move-out date cannot be before move-in date';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const executeSave = async () => {
    try {
      setIsSubmitting(true);

      let refName = referredByName.trim();
      if (referredByType === 'existing_tenant' && referredByTenantId) {
        const found = tenants.find((t) => t.id === referredByTenantId);
        if (found) refName = found.name;
      }

      const data = {
        ...(tenantToEdit ? { id: tenantToEdit.id, tenantCode: tenantToEdit.tenantCode, stays: tenantToEdit.stays, createdAt: tenantToEdit.createdAt } : {}),
        name: name.trim(),
        mobile: mobile.trim(),
        alternateMobile: alternateMobile.trim() || undefined,
        photoUrl: photoUrl.trim() || undefined,
        documentUrl: documentUrl.trim() || undefined,
        roomNumber: roomNumber.trim(),
        address: address.trim(),
        occupation: occupation.trim() || undefined,
        emergencyContact: emergencyContact.trim() || undefined,
        occupantsCount: parseInt(occupantsCount, 10) || 1,
        joiningDate,
        expectedMoveOutDate: expectedMoveOutDate || undefined,
        monthlyRent: Number(monthlyRent),
        securityDeposit: Number(securityDeposit) || 0,
        rentDueDay: Number(rentDueDay),
        isActive,
        notes: notes.trim(),
        referredByType,
        referredByTenantId: referredByType === 'existing_tenant' ? referredByTenantId : undefined,
        referredByName: refName || undefined
      };

      await onSave(data);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    // Check for duplicate tenant if creating a new tenant
    if (!tenantToEdit) {
      const match = findDuplicateTenant(mobile, name);
      if (match) {
        setDuplicateMatch(match);
        setShowDuplicateModal(true);
        return;
      }
    }

    await executeSave();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-modal overflow-hidden my-6 border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div>
            <h3 className="font-extrabold text-base text-slate-900">
              {tenantToEdit ? t.editTenantModalTitle : t.addTenantModalTitle}
            </h3>
            {tenantToEdit && (
              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                {tenantToEdit.tenantCode}
              </span>
            )}
          </div>
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
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] text-slate-400 font-semibold uppercase mr-1">
                {language === 'gu' ? 'સેમ્પલ:' : 'Presets:'}
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

          {/* Mobile & Alternate Mobile */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  {t.mobileNumber} *
                </label>
                <span
                  className={`text-[10px] font-bold ${
                    mobile.length === 10
                      ? 'text-emerald-600'
                      : mobile.length > 0
                      ? 'text-amber-600'
                      : 'text-slate-400'
                  }`}
                >
                  {mobile.length}/10
                </span>
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={handleMobileChange}
                  placeholder={t.mobilePlaceholder}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 ${
                    errors.mobile ? 'border-rose-400 bg-rose-50/20 text-rose-900' : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
              </div>
              {errors.mobile && <p className="text-[11px] font-semibold text-rose-500 mt-1">{errors.mobile}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  {t.alternateMobile}
                </label>
                {alternateMobile.length > 0 && (
                  <span
                    className={`text-[10px] font-bold ${
                      alternateMobile.length === 10
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {alternateMobile.length}/10
                  </span>
                )}
              </div>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={alternateMobile}
                  onChange={handleAlternateMobileChange}
                  placeholder={t.alternateMobilePlaceholder}
                  className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 ${
                    errors.alternateMobile
                      ? 'border-rose-400 bg-rose-50/20 text-rose-900'
                      : 'border-slate-200 focus:border-blue-500'
                  }`}
                />
              </div>
              {errors.alternateMobile && (
                <p className="text-[11px] font-semibold text-rose-500 mt-1">{errors.alternateMobile}</p>
              )}
            </div>
          </div>

          {/* Room Number & Monthly Rent */}
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          {/* Security Deposit & Occupants */}
          <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.occupantsCount}
              </label>
              <div className="relative">
                <Users className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  value={occupantsCount}
                  onChange={(e) => setOccupantsCount(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Occupation & Emergency Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.occupation}
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={occupation}
                  onChange={(e) => setOccupation(e.target.value)}
                  placeholder={t.occupationPlaceholder}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.emergencyContact}
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder={t.emergencyPlaceholder}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Rent Due Day Picker */}
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

          {/* Move-in Date & Expected Move-out Date */}
          <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t.expectedMoveOutDate}
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={expectedMoveOutDate}
                  onChange={(e) => setExpectedMoveOutDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
              {errors.expectedMoveOutDate && (
                <p className="text-[11px] text-rose-500 mt-1">{errors.expectedMoveOutDate}</p>
              )}
            </div>
          </div>

          {/* Aadhaar / Identity Document Upload */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>{t.documentPhoto}</span>
              </label>
              <span className="text-[10px] text-slate-400 font-semibold">100% Local Storage</span>
            </div>

            {documentUrl ? (
              <div className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200">
                <div className="flex items-center gap-2">
                  <img
                    src={documentUrl}
                    alt="Document Preview"
                    className="w-12 h-10 object-cover rounded-lg border border-slate-200"
                  />
                  <span className="text-xs font-bold text-slate-700">Document Uploaded ✓</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-blue-600 hover:underline cursor-pointer">
                    Replace
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/jpg"
                      onChange={handleDocumentUpload}
                      className="hidden"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setDocumentUrl('')}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 bg-white cursor-pointer transition-colors text-xs font-bold text-slate-600">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>{t.uploadDoc} (JPG, PNG, WEBP)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleDocumentUpload}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Referral / "Came Through" Section (Section 3) */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2.5">
            <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-indigo-600" />
              <span>{t.referredBy}</span>
            </label>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setReferredByType('direct')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                  referredByType === 'direct'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-indigo-200 text-slate-700 hover:bg-white/80'
                }`}
              >
                {t.referredByDirect}
              </button>
              <button
                type="button"
                onClick={() => setReferredByType('existing_tenant')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                  referredByType === 'existing_tenant'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-indigo-200 text-slate-700 hover:bg-white/80'
                }`}
              >
                {t.referredByExisting}
              </button>
              <button
                type="button"
                onClick={() => setReferredByType('other')}
                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all text-center ${
                  referredByType === 'other'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white border border-indigo-200 text-slate-700 hover:bg-white/80'
                }`}
              >
                {t.referredByOther}
              </button>
            </div>

            {referredByType === 'existing_tenant' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {t.selectReferringTenant}
                </label>
                <select
                  value={referredByTenantId}
                  onChange={(e) => setReferredByTenantId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-indigo-200 text-xs font-semibold text-slate-800"
                >
                  <option value="">-- Select Referring Tenant --</option>
                  {tenants
                    .filter((t) => !tenantToEdit || t.id !== tenantToEdit.id)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.tenantCode} - Room #{t.roomNumber})
                      </option>
                    ))}
                </select>
              </div>
            )}

            {referredByType === 'other' && (
              <div>
                <input
                  type="text"
                  value={referredByName}
                  onChange={(e) => setReferredByName(e.target.value)}
                  placeholder={t.referringPersonName}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-indigo-200 text-xs font-semibold text-slate-800"
                />
              </div>
            )}
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

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t.notes}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional landlord notes..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

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

      {/* Duplicate Warning Modal (Section 25) */}
      {showDuplicateModal && duplicateMatch && (
        <div className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-700 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </span>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900">
                  {t.duplicateWarning}
                </h4>
                <p className="text-xs text-slate-500">{t.duplicateDesc}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Name:</span>
                <span className="font-bold text-slate-900">{duplicateMatch.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tenant ID:</span>
                <span className="font-extrabold text-blue-700">{duplicateMatch.tenantCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Mobile:</span>
                <span className="font-semibold text-slate-800">{duplicateMatch.mobile}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Room:</span>
                <span className="font-semibold text-slate-800">#{duplicateMatch.roomNumber}</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  onClose();
                  if (onSelectExistingTenant) {
                    onSelectExistingTenant(duplicateMatch);
                  }
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
              >
                {t.openExisting}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowDuplicateModal(false);
                  executeSave();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                {t.createNewAnyway}
              </button>

              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 text-slate-500 font-bold text-xs hover:bg-slate-50"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
