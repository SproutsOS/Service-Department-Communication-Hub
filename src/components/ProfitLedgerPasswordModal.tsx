import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Key, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  FileSpreadsheet, 
  Sparkles,
  Delete,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const ProfitLedgerPasswordModal: React.FC = () => {
  const { 
    isProfitLedgerPasswordModalOpen, 
    closeProfitLedgerPasswordModal,
    verifyProfitLedgerPassword,
    updateProfitLedgerPassword,
    setIsProfitLedgerUnlocked,
    openEmployeeProfitability,
    profitLedgerPassword
  } = useApp();

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Change Password Tab State
  const [isChangePasswordMode, setIsChangePasswordMode] = useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isProfitLedgerPasswordModalOpen) {
      setPasswordInput('');
      setErrorMessage('');
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setChangeError('');
      setChangeSuccess('');
      if (!profitLedgerPassword) {
        setIsChangePasswordMode(true);
      } else {
        setIsChangePasswordMode(false);
      }
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isProfitLedgerPasswordModalOpen, profitLedgerPassword]);

  if (!isProfitLedgerPasswordModalOpen) return null;

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!passwordInput.trim()) {
      setErrorMessage('Please enter the authorization password.');
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    setTimeout(() => {
      const isValid = verifyProfitLedgerPassword(passwordInput);
      if (isValid) {
        setIsProfitLedgerUnlocked(true);
        closeProfitLedgerPasswordModal();
        openEmployeeProfitability();
      } else {
        setErrorMessage('Incorrect password. Please try again.');
        setPasswordInput('');
        inputRef.current?.focus();
      }
      setIsSubmitting(false);
    }, 200);
  };

  const handleNumpadPress = (digit: string) => {
    setErrorMessage('');
    setPasswordInput(prev => prev + digit);
    inputRef.current?.focus();
  };

  const handleNumpadBackspace = () => {
    setPasswordInput(prev => prev.slice(0, -1));
    inputRef.current?.focus();
  };

  const handleNumpadClear = () => {
    setPasswordInput('');
    setErrorMessage('');
    inputRef.current?.focus();
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError('');
    setChangeSuccess('');

    if (profitLedgerPassword) {
      if (!currentPasswordInput.trim()) {
        setChangeError('Please enter your current password.');
        return;
      }

      if (!verifyProfitLedgerPassword(currentPasswordInput)) {
        setChangeError('Current password does not match.');
        return;
      }
    }

    if (!newPasswordInput.trim()) {
      setChangeError('Please enter a new password.');
      return;
    }

    if (newPasswordInput.trim().length < 4) {
      setChangeError('New password must be at least 4 characters.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setChangeError('New password and confirmation do not match.');
      return;
    }

    const updated = updateProfitLedgerPassword(newPasswordInput.trim());
    if (updated) {
      setChangeSuccess('Password successfully updated! You can now use your new password.');
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setTimeout(() => {
        setIsChangePasswordMode(false);
        setPasswordInput(newPasswordInput.trim());
      }, 1500);
    } else {
      setChangeError('Failed to update password. Please try again.');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeProfitLedgerPasswordModal();
        }
      }}
    >
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="bg-slate-800/90 px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
              <Lock className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  Profit Ledger Security Gate
                </h2>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-700/50">
                  Protected
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Confidential employee wage & profitability records
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeProfitLedgerPasswordModal}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
            title="Cancel and close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          
          {!isChangePasswordMode ? (
            /* ================================================================= */
            /* MODE 1: ENTER PASSWORD TO UNLOCK                                   */
            /* ================================================================= */
            <form onSubmit={handleUnlock} className="space-y-4">
              <div className="text-center space-y-1">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Enter the authorization password or Quick PIN to view employee hours, pay rates, and dealership profitability margins.
                </p>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Authorization Password / PIN
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    ref={inputRef}
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Enter authorization password"
                    className="w-full pl-10 pr-12 py-3 bg-slate-950/70 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-white font-mono text-base tracking-widest focus:outline-hidden transition-all shadow-inner"
                    autoComplete="off"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Alert */}
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/60 flex items-start gap-2.5 text-xs text-red-200 animate-in fade-in duration-150">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Quick Touch Numpad (Convenient on Service Drive Tablets & Workstations) */}
              <div className="pt-2">
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleNumpadPress(digit)}
                      className="py-2.5 bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-white font-mono font-bold text-sm rounded-lg border border-slate-700/60 transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleNumpadClear}
                    className="py-2.5 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs rounded-lg border border-slate-700/40 transition-colors cursor-pointer"
                    title="Clear entered password"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumpadPress('0')}
                    className="py-2.5 bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-white font-mono font-bold text-sm rounded-lg border border-slate-700/60 transition-all cursor-pointer shadow-xs active:scale-95"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleNumpadBackspace}
                    className="py-2.5 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs rounded-lg border border-slate-700/40 flex items-center justify-center transition-colors cursor-pointer"
                    title="Backspace"
                  >
                    <Delete className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Change Password Link */}
              <div className="pt-2 flex items-center justify-end text-[11px] text-slate-400 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordMode(true)}
                  className="text-blue-400 hover:text-blue-300 font-semibold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Key className="w-3 h-3" />
                  <span>Change Password</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={closeProfitLedgerPasswordModal}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-emerald-900/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{isSubmitting ? 'Verifying...' : 'Unlock & Open'}</span>
                </button>
              </div>
            </form>
          ) : (
            /* ================================================================= */
            /* MODE 2: CHANGE PROFIT LEDGER PASSWORD                              */
            /* ================================================================= */
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-blue-400" />
                  <span>{profitLedgerPassword ? 'Change Profit Ledger Password' : 'Set Profit Ledger Password'}</span>
                </h3>
                <p className="text-xs text-slate-400">
                  {profitLedgerPassword 
                    ? 'Update the authorization password required to access the Profit Ledger.'
                    : 'Create an authorization password required to access the Profit Ledger.'}
                </p>
              </div>

              {changeError && (
                <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800/60 flex items-start gap-2 text-xs text-red-200">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{changeError}</span>
                </div>
              )}

              {changeSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/60 flex items-start gap-2 text-xs text-emerald-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{changeSuccess}</span>
                </div>
              )}

              <div className="space-y-3">
                {/* Current Password (only required if a password is already set) */}
                {profitLedgerPassword ? (
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={currentPasswordInput}
                      onChange={(e) => setCurrentPasswordInput(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-lg text-white font-mono text-sm focus:border-blue-500 focus:outline-hidden"
                    />
                  </div>
                ) : null}

                {/* New Password */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    {profitLedgerPassword ? 'New Password / PIN' : 'Password / PIN'}
                  </label>
                  <input
                    type="password"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Enter at least 4 characters/digits"
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-lg text-white font-mono text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    {profitLedgerPassword ? 'Confirm New Password' : 'Confirm Password'}
                  </label>
                  <input
                    type="password"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3 py-2 bg-slate-950/70 border border-slate-700 rounded-lg text-white font-mono text-sm focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (profitLedgerPassword) {
                      setIsChangePasswordMode(false);
                    } else {
                      closeProfitLedgerPasswordModal();
                    }
                  }}
                  className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                >
                  {profitLedgerPassword ? 'Back' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  {profitLedgerPassword ? 'Save New Password' : 'Save Password'}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
