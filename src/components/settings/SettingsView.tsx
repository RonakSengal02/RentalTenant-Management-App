import React, { useRef, useState } from 'react';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { exportDatabaseToJSON, restoreDatabaseFromJSON, exportToCSV } from '../../db/storage';
import {
  getReminderPreferences,
  saveReminderPreferences,
  requestNotificationPermission,
  ReminderPreferences
} from '../../utils/reminderService';
import { getStorageInfo } from '../../db/db';
import {
  ShieldCheck,
  Download,
  Upload,
  FileSpreadsheet,
  RotateCcw,
  Trash2,
  Globe,
  Bell,
  CheckCircle,
  AlertTriangle,
  Info,
  Smartphone,
  HardDrive,
  FileText
} from 'lucide-react';
import { downloadFullRentalReportPDF } from '../../utils/pdfUtils';

export const SettingsView: React.FC = () => {
  const { t, language, setLanguage } = useLanguage();
  const { tenants, payments, metrics, restoreSampleData, resetDatabase, reloadAllData } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<ReminderPreferences>(getReminderPreferences());
  const [pushStatus, setPushStatus] = useState<string>(
    'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [storageInfo, setStorageInfo] = useState<{ isPersisted: boolean; usedKb: number }>({
    isPersisted: true,
    usedKb: 0
  });

  React.useEffect(() => {
    getStorageInfo().then(setStorageInfo);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExportCSV = async () => {
    await exportToCSV();
    showToast(t.exportSuccess);
  };

  const handleDownloadPDF = () => {
    downloadFullRentalReportPDF(tenants, payments, metrics, language);
    showToast(language === 'gu' ? 'PDF રિપોર્ટ ડાઉનલોડ થઈ રહ્યો છે!' : 'PDF Report downloading!');
  };

  const handleBackupJSON = async () => {
    await exportDatabaseToJSON();
    showToast(t.backupSuccess);
  };

  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const success = await restoreDatabaseFromJSON(text);
      if (success) {
        await reloadAllData();
        showToast(t.restoreSuccess);
      } else {
        alert('Invalid backup file. Could not restore.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetSample = async () => {
    if (confirm('Load sample tenant data? This will reset the database with test tenants.')) {
      await restoreSampleData();
      showToast('Sample data restored successfully!');
    }
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to delete all data? This cannot be undone!')) {
      await resetDatabase();
      showToast('All database records cleared.');
    }
  };

  const handleTogglePref = (key: keyof ReminderPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    saveReminderPreferences(updated);
  };

  const handleRequestPush = async () => {
    const permission = await requestNotificationPermission();
    setPushStatus(permission);
    if (permission === 'granted') {
      const updated = { ...prefs, enableBrowserPush: true };
      setPrefs(updated);
      saveReminderPreferences(updated);
    }
  };

  return (
    <div className="space-y-4 pb-24 pt-2 animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Hidden File Input for Restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json"
        className="hidden"
      />

      {/* Title */}
      <div>
        <h2 className="font-extrabold text-lg text-slate-900 tracking-tight">
          {t.settingsTitle}
        </h2>
        <p className="text-xs text-slate-500">
          {t.dataSafetyDesc}
        </p>
      </div>

      {/* Language Switcher Section */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-card">
        <div className="flex items-center gap-2 mb-3">
          <span className="p-1.5 rounded-xl bg-blue-50 text-blue-600">
            <Globe className="w-4 h-4" />
          </span>
          <h3 className="font-bold text-sm text-slate-900">
            {t.language}
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setLanguage('en')}
            className={`p-3 rounded-xl border text-left transition-all ${
              language === 'en'
                ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="font-bold text-sm text-slate-900">English</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Rental Management</div>
          </button>

          <button
            onClick={() => setLanguage('gu')}
            className={`p-3 rounded-xl border text-left transition-all ${
              language === 'gu'
                ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <div className="font-bold text-sm text-slate-900">ગુજરાતી</div>
            <div className="text-[11px] text-slate-500 mt-0.5">ભાડુઆત વ્યવસ્થાપન</div>
          </button>
        </div>
      </div>

      {/* Phone Local Storage Health & Protection Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl p-4 border border-blue-200/80 shadow-card space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <Smartphone className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">
                {language === 'gu' ? 'ફોન લોકલ સ્ટોરેજ સુરક્ષા' : 'Phone Local Storage'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {language === 'gu' ? 'તમારો બધો ડેટા તમારા ફોનમાં જ રહે છે' : 'All data stays on your device'}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{language === 'gu' ? 'કાયમી સંગ્રહ' : 'Persistent'}</span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2.5 bg-white rounded-xl border border-blue-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {language === 'gu' ? 'સ્ટોરેજ પ્રકાર' : 'Storage Type'}
            </span>
            <span className="font-bold text-xs text-slate-800 block mt-0.5">
              Phone Disk (IndexedDB)
            </span>
          </div>

          <div className="p-2.5 bg-white rounded-xl border border-blue-100">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              {language === 'gu' ? 'બંધ કર્યા પછી' : 'App Closed / Restart'}
            </span>
            <span className="font-bold text-xs text-emerald-700 block mt-0.5">
              ✓ {language === 'gu' ? '100% સુરક્ષિત રહે છે' : '100% Retained'}
            </span>
          </div>
        </div>

        <div className="p-2.5 bg-white/90 rounded-xl border border-blue-100 text-[11px] text-slate-600 leading-snug">
          {language === 'gu'
            ? '💡 એપ બંધ કરો, રીસેન્ટમાંથી હટાવો કે ફોન રીસ્ટાર્ટ કરો – તમારો ભાડુઆત અને ચુકવણીનો બધો રેકોર્ડ તમારા ફોનમાં જ સુરક્ષિત સચવાયેલો રહેશે.'
            : '💡 Close the app, swipe it away, or restart your phone – all tenant details and payment histories remain safely saved on your device.'}
        </div>

        <a
          href="/RentManager.apk"
          download="RentManager.apk"
          className="flex items-center justify-between p-3 bg-white hover:bg-emerald-50 border border-emerald-200 rounded-xl transition-all shadow-xs group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-emerald-600 text-white group-hover:scale-105 transition-transform">
              <Smartphone className="w-4 h-4" />
            </span>
            <div className="text-left">
              <span className="font-bold text-xs text-slate-900 block">
                {t.downloadApkTitle}
              </span>
              <span className="text-[11px] text-slate-500 block">
                {t.downloadApkSub}
              </span>
            </div>
          </div>
          <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
            <Download className="w-3.5 h-3.5" />
            <span>4.5 MB</span>
          </span>
        </a>
      </div>

      {/* Data Safety & Export Section */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-card space-y-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600">
            <ShieldCheck className="w-4 h-4" />
          </span>
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              {t.dataSafety}
            </h3>
            <p className="text-[11px] text-slate-500">
              {language === 'gu' ? 'ઓફલાઇન અને સુરક્ષિત સ્થાનિક સ્ટોરેજ' : '100% offline & secure on device'}
            </p>
          </div>
        </div>

        <div className="space-y-2 pt-1">
          {/* Export PDF Report */}
          <button
            onClick={handleDownloadPDF}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-blue-50/80 hover:bg-blue-100 border border-blue-200 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="w-4 h-4 text-blue-600" />
              <div>
                <span className="font-bold text-xs text-blue-950 block">
                  {t.downloadPDFReport}
                </span>
                <span className="text-[10px] text-blue-600/80">
                  {language === 'gu' ? 'તમામ ભાડુઆત અને ચુકવણીઓનો સત્તાવાર PDF રિપોર્ટ' : 'Official PDF statement for all tenants & payments'}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-600">.pdf</span>
          </button>

          {/* Export Excel / CSV */}
          <button
            onClick={handleExportCSV}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="font-bold text-xs text-slate-800 block">
                  {t.exportExcel}
                </span>
                <span className="text-[10px] text-slate-400">
                  {language === 'gu' ? 'બધા ભાડુઆત અને ચુકવણીઓની CSV ફાઇલ' : 'Full tenants & payments sheet (.csv)'}
                </span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400" />
          </button>

          {/* Backup to JSON */}
          <button
            onClick={handleBackupJSON}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4 text-blue-600" />
              <div>
                <span className="font-bold text-xs text-slate-800 block">
                  {t.backupData}
                </span>
                <span className="text-[10px] text-slate-400">
                  {language === 'gu' ? 'તમામ ડેટા સુરક્ષિત ડાઉનલોડ કરો' : 'Complete JSON backup archive'}
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-blue-600">.json</span>
          </button>

          {/* Restore from JSON */}
          <button
            onClick={handleRestoreClick}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Upload className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="font-bold text-xs text-slate-800 block">
                  {t.restoreData}
                </span>
                <span className="text-[10px] text-slate-400">
                  {language === 'gu' ? 'અગાઉ લીધેલ બેકઅપ ફાઇલ અપલોડ કરો' : 'Upload and restore from backup file'}
                </span>
              </div>
            </div>
            <Upload className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Reminder Preferences Section */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-amber-50 text-amber-600">
              <Bell className="w-4 h-4" />
            </span>
            <h3 className="font-bold text-sm text-slate-900">
              {t.reminderSettings}
            </h3>
          </div>
          {pushStatus !== 'granted' && pushStatus !== 'unsupported' && (
            <button
              onClick={handleRequestPush}
              className="px-2.5 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px] hover:bg-blue-700"
            >
              {t.enablePushBtn}
            </button>
          )}
        </div>

        <div className="space-y-2 text-xs">
          <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <span className="font-medium text-slate-700">{t.notify3DaysBefore}</span>
            <input
              type="checkbox"
              checked={prefs.notify3DaysBefore}
              onChange={() => handleTogglePref('notify3DaysBefore')}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <span className="font-medium text-slate-700">{t.notifyOnDueDate}</span>
            <input
              type="checkbox"
              checked={prefs.notifyOnDueDate}
              onChange={() => handleTogglePref('notifyOnDueDate')}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
            <span className="font-medium text-slate-700">{t.notify3DaysAfter}</span>
            <input
              type="checkbox"
              checked={prefs.notify3DaysAfter}
              onChange={() => handleTogglePref('notify3DaysAfter')}
              className="w-4 h-4 accent-blue-600 rounded"
            />
          </label>
        </div>
      </div>

      {/* Sample Data & Danger Zone */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-card space-y-3">
        <h3 className="font-bold text-sm text-slate-900">
          {language === 'gu' ? 'ડેટા વ્યવસ્થાપન' : 'Database Controls'}
        </h3>

        <div className="space-y-2">
          {/* Sample Data Button */}
          <button
            onClick={handleResetSample}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <RotateCcw className="w-4 h-4 text-blue-600" />
              <div>
                <span className="font-bold text-xs text-slate-800 block">
                  {t.sampleData}
                </span>
                <span className="text-[10px] text-slate-400">
                  {t.sampleDataDesc}
                </span>
              </div>
            </div>
          </button>

          {/* Clear All Data */}
          <button
            onClick={handleClearAll}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <div>
                <span className="font-bold text-xs text-rose-800 block">
                  {t.clearAllData}
                </span>
                <span className="text-[10px] text-rose-500">
                  {language === 'gu' ? 'બધા રેકોર્ડ કાયમ માટે કાઢી નાખો' : 'Permanently erase all tenants and payments'}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* App Info Footer */}
      <div className="text-center pt-2 text-xs text-slate-400 space-y-1">
        <p className="font-bold text-slate-600">RentManager Mobile v1.0.0</p>
        <p>Built for Property Owners & Landlords • ભાડુઆત વ્યવસ્થાપન</p>
      </div>
    </div>
  );
};
