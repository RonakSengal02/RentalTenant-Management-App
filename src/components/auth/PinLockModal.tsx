import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../i18n';
import { useApp } from '../../context/AppContext';
import { Lock, Unlock, Shield, Delete, X, Check, KeyRound } from 'lucide-react';

interface PinLockModalProps {
  mode: 'unlock' | 'setup';
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  mode,
  isOpen,
  onClose,
  onSuccess
}) => {
  const { language } = useLanguage();
  const { unlockApp, setupPin, removePin, hasPinSet } = useApp();

  const [pin, setPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [step, setStep] = useState<'enter_new' | 'confirm_new'>('enter_new');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setConfirmPin('');
      setStep('enter_new');
      setErrorMsg('');
      setIsShaking(false);
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const triggerError = (msg: string) => {
    setErrorMsg(msg);
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
      setPin('');
    }, 600);
  };

  const handleKeyPress = async (num: string) => {
    if (pin.length >= 4) return;
    const nextPin = pin + num;
    setPin(nextPin);
    setErrorMsg('');

    if (nextPin.length === 4) {
      if (mode === 'unlock') {
        const isValid = await unlockApp(nextPin);
        if (isValid) {
          onSuccess?.();
          onClose?.();
        } else {
          triggerError(language === 'gu' ? 'ખોટો પિન. ફરી પ્રયાસ કરો.' : 'Incorrect PIN. Try again.');
        }
      } else {
        // Setup mode
        if (step === 'enter_new') {
          setTimeout(() => {
            setConfirmPin(nextPin);
            setPin('');
            setStep('confirm_new');
          }, 200);
        } else if (step === 'confirm_new') {
          if (nextPin === confirmPin) {
            await setupPin(nextPin);
            onSuccess?.();
            onClose?.();
          } else {
            triggerError(language === 'gu' ? 'પિન મેળ ખાતો નથી. ફરી પ્રયાસ કરો.' : 'PINs do not match. Try again.');
            setTimeout(() => {
              setStep('enter_new');
              setConfirmPin('');
              setPin('');
            }, 700);
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  return (
    <div className={`fixed inset-0 z-100 flex items-center justify-center p-4 ${
      mode === 'unlock' ? 'bg-slate-950 text-white' : 'bg-black/60 backdrop-blur-xs'
    } animate-fade-in`}>
      <div className={`w-full max-w-sm rounded-3xl p-6 flex flex-col items-center ${
        mode === 'unlock' ? 'bg-slate-900/90 border border-slate-800' : 'bg-white text-slate-900 border border-slate-200'
      } shadow-2xl`}>
        {/* Header close button (only if setup mode) */}
        {mode === 'setup' && onClose && (
          <div className="w-full flex justify-end mb-2">
            <button
              onClick={onClose}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Lock Icon */}
        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 ${
          mode === 'unlock' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'bg-blue-50 text-blue-600 border border-blue-100'
        }`}>
          {mode === 'unlock' ? <Lock className="w-8 h-8" /> : <KeyRound className="w-8 h-8" />}
        </div>

        {/* Title */}
        <h3 className="font-extrabold text-lg text-center tracking-tight mb-1">
          {mode === 'unlock'
            ? (language === 'gu' ? 'એપ અનલોક કરવા પિન દાખલ કરો' : 'Enter 4-Digit Security PIN')
            : step === 'enter_new'
            ? (language === 'gu' ? 'નવો 4-અંકનો પિન દાખલ કરો' : 'Set 4-Digit Security PIN')
            : (language === 'gu' ? 'પિનની પુષ્ટિ કરો' : 'Confirm Security PIN')}
        </h3>

        <p className={`text-xs text-center mb-6 ${mode === 'unlock' ? 'text-slate-400' : 'text-slate-500'}`}>
          {mode === 'unlock'
            ? (language === 'gu' ? 'ભાડુઆત અને નાણાકીય ડેટા સુરક્ષિત છે' : 'Your offline rental data is locked & secure')
            : step === 'enter_new'
            ? (language === 'gu' ? 'એપ ખોલતી વખતે આ પિન પૂછવામાં આવશે' : 'Enter 4 digits to secure app access')
            : (language === 'gu' ? 'ખાતરી માટે ફરીથી પિન દાખલ કરો' : 'Re-enter the 4 digits to confirm')}
        </p>

        {/* 4 Pin Dots */}
        <div className={`flex items-center gap-4 mb-6 transition-transform ${isShaking ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? mode === 'unlock'
                      ? 'bg-indigo-500 scale-125 shadow-md shadow-indigo-500/40'
                      : 'bg-blue-600 scale-125 shadow-md shadow-blue-500/30'
                    : mode === 'unlock'
                    ? 'border-2 border-slate-700 bg-slate-800/60'
                    : 'border-2 border-slate-300 bg-slate-100'
                }`}
              />
            );
          })}
        </div>

        {/* Error message */}
        {errorMsg && (
          <p className="text-xs font-bold text-rose-500 mb-4 animate-bounce text-center">
            {errorMsg}
          </p>
        )}

        {/* Number Keypad */}
        <div className="grid grid-cols-3 gap-3.5 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeyPress(digit)}
              className={`h-14 rounded-2xl font-black text-xl flex items-center justify-center transition-all active:scale-90 ${
                mode === 'unlock'
                  ? 'bg-slate-800/80 hover:bg-slate-700 active:bg-indigo-600 text-white border border-slate-700/60'
                  : 'bg-slate-100 hover:bg-slate-200 active:bg-blue-600 active:text-white text-slate-800'
              }`}
            >
              {digit}
            </button>
          ))}

          {/* Empty or Remove PIN action if in setup mode */}
          {mode === 'setup' && hasPinSet ? (
            <button
              type="button"
              onClick={() => {
                if (confirm(language === 'gu' ? 'શું તમે પિન સુરક્ષા દૂર કરવા માંગો છો?' : 'Remove PIN protection?')) {
                  removePin();
                  onSuccess?.();
                  onClose?.();
                }
              }}
              className="h-14 rounded-2xl text-[11px] font-bold text-rose-500 hover:bg-rose-50/20 flex items-center justify-center"
            >
              {language === 'gu' ? 'દૂર કરો' : 'Disable'}
            </button>
          ) : (
            <div />
          )}

          {/* Zero */}
          <button
            type="button"
            onClick={() => handleKeyPress('0')}
            className={`h-14 rounded-2xl font-black text-xl flex items-center justify-center transition-all active:scale-90 ${
              mode === 'unlock'
                ? 'bg-slate-800/80 hover:bg-slate-700 active:bg-indigo-600 text-white border border-slate-700/60'
                : 'bg-slate-100 hover:bg-slate-200 active:bg-blue-600 active:text-white text-slate-800'
            }`}
          >
            0
          </button>

          {/* Backspace / Delete */}
          <button
            type="button"
            onClick={handleDelete}
            className={`h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
              mode === 'unlock'
                ? 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
            }`}
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
