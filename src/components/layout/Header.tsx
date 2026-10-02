import React from 'react';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { Bell, Home, Globe, Smartphone, Monitor, Lock, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  onOpenNotifications: () => void;
  isMobileFrame: boolean;
  onToggleMobileFrame: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNotifications,
  isMobileFrame,
  onToggleMobileFrame
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { unreadNotifCount, hasPinSet, lockApp } = useApp();
  const { themeMode, isDark, toggleTheme } = useTheme();

  const toggleLang = () => {
    setLanguage(language === 'en' ? 'gu' : 'en');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-xs">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {/* App Logo & Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Home className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-extrabold text-base leading-tight tracking-tight text-slate-900 flex items-center gap-1.5">
              <span>{t.appName}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                PRO
              </span>
            </h1>
            <p className="text-xs text-slate-500 line-clamp-1 font-medium">
              {t.appSubtitle}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Quick Lock Button if PIN protection enabled */}
          {hasPinSet && (
            <button
              onClick={lockApp}
              title={language === 'gu' ? 'એપ લોક કરો' : 'Lock App'}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <Lock className="w-4 h-4 text-slate-600" />
            </button>
          )}

          {/* Mobile Frame toggle (helpful when running in desktop browser) */}
          <button
            onClick={onToggleMobileFrame}
            title={isMobileFrame ? 'Expand to Full View' : 'Switch to Mobile Frame'}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors hidden sm:flex items-center justify-center"
          >
            {isMobileFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
          </button>

          {/* Language Switcher Badge */}
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all border border-slate-200 active:scale-95"
            title="Switch Language / ભાષા બદલો"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600" />
            <span>{language === 'en' ? 'ગુજરાતી' : 'English'}</span>
          </button>

          {/* Quick Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-200 active:scale-95"
            title={
              themeMode === 'system'
                ? (language === 'gu' ? `થીમ: મોબાઇલ મુજબ (${isDark ? 'ડાર્ક' : 'લાઇટ'})` : `Theme: Mobile Default (${isDark ? 'Dark' : 'Light'})`)
                : isDark
                ? (language === 'gu' ? 'થીમ: ડાર્ક મોડ' : 'Theme: Dark Mode')
                : (language === 'gu' ? 'થીમ: લાઇટ મોડ' : 'Theme: Light Mode')
            }
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          {/* Notification Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95"
            title={t.notificationsTitle}
          >
            <Bell className="w-5 h-5" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce shadow-xs">
                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
