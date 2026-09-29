import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  UserCheck, 
  Lock, 
  Wrench, 
  Briefcase, 
  Package, 
  CheckCircle2, 
  AlertCircle,
  Users,
  Eye,
  Award
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';

export const LoginModal: React.FC = () => {
  const { 
    isLoginModalOpen, 
    setIsLoginModalOpen, 
    currentUser, 
    users, 
    loginWithCredentials,
    setIsStaffManagementOpen,
    lockWorkstation
  } = useApp();

  const [selectedRoleFilter, setSelectedRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [successMsg, setSuccessMsg] = useState('');

  // Prompt for PIN when switching to a user from the roster
  const [pinPromptUser, setPinPromptUser] = useState<User | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  if (!isLoginModalOpen) return null;

  const handleSelectUser = (user: User) => {
    // Open secure PIN verification for this specific user
    setPinPromptUser(user);
    setEnteredPin('');
    setPinError('');
  };

  const handleVerifyUserPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinPromptUser) return;
    setPinError('');

    if (!enteredPin.trim()) {
      setPinError('Please enter 4-digit PIN.');
      return;
    }

    const result = loginWithCredentials(pinPromptUser.email, enteredPin);
    if (result.success && result.user) {
      setSuccessMsg(`Authenticated as ${result.user.name} (${result.user.title})`);
      setPinPromptUser(null);
      setEnteredPin('');
      setTimeout(() => {
        setIsLoginModalOpen(false);
        setSuccessMsg('');
      }, 400);
    } else {
      setPinError('Incorrect PIN entered. Access denied.');
    }
  };

  const filteredUsers = selectedRoleFilter === 'ALL' 
    ? users 
    : users.filter(u => u.role === selectedRoleFilter);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'SERVICE_MANAGER': return <Briefcase className="w-4 h-4 text-purple-600" />;
      case 'SERVICE_ADVISOR': return <UserCheck className="w-4 h-4 text-blue-600" />;
      case 'TECHNICIAN': return <Wrench className="w-4 h-4 text-emerald-600" />;
      case 'PARTS_SPECIALIST': return <Package className="w-4 h-4 text-amber-600" />;
      case 'SALES': return <Eye className="w-4 h-4 text-teal-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        id="login-rbac-modal"
        className="bg-white rounded-xl shadow-2xl border-2 border-slate-400 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-6 border-b-2 border-slate-300 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Staff Roster Sign-In</h2>
              <p className="text-xs text-slate-500 font-medium">
                Select your employee profile from the roster and enter your PIN
              </p>
            </div>
          </div>
          <button
            id="close-login-modal-btn"
            onClick={() => setIsLoginModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-header with Manage Staff shortcut */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Employee Workstation Switcher</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsLoginModalOpen(false);
              setIsStaffManagementOpen(true);
            }}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Manage Staff Roster</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Active Session Callout */}
          <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center ring-2 ring-blue-400 shrink-0">
                {currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-blue-900">Current Session:</span>
                  <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
                  {currentUser.employeeNumber && (
                    <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200">
                      {currentUser.employeeNumber}
                    </span>
                  )}
                </div>
                <div className="text-xs text-blue-700">
                  {currentUser.title} {currentUser.certificationLevel ? `• ${currentUser.certificationLevel}` : ''}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 border border-green-200 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          </div>

          {/* Quick Switch Roster */}
          <div>
            {pinPromptUser ? (
              <form onSubmit={handleVerifyUserPin} className="space-y-4 max-w-md mx-auto p-5 bg-slate-50 rounded-xl border-2 border-slate-400 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-xs">
                    {pinPromptUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{pinPromptUser.name}</h4>
                      {pinPromptUser.employeeNumber && (
                        <span className="text-sm font-mono font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 border border-blue-200">
                          {pinPromptUser.employeeNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">{pinPromptUser.title} • {pinPromptUser.role}</p>
                  </div>
                </div>

                {pinError && (
                  <div className="p-2.5 bg-red-50 border-2 border-red-300 text-red-700 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{pinError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Enter 4-Digit Quick PIN
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      autoFocus
                      maxLength={8}
                      value={enteredPin}
                      onChange={(e) => setEnteredPin(e.target.value)}
                      placeholder="Enter 4-digit PIN"
                      className="w-full pl-9 pr-3 py-2 text-base bg-white border-2 border-slate-600 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono tracking-widest text-center text-slate-900"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 text-center">
                    Quick PIN verification is required to switch into {pinPromptUser.name}&apos;s profile.
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPinPromptUser(null);
                      setEnteredPin('');
                      setPinError('');
                    }}
                    className="flex-1 py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Unlock Session</span>
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Select Team Member
                  </h3>
                  
                  {/* Role filter buttons */}
                  <div className="flex gap-1 flex-wrap">
                    {(['ALL', 'SERVICE_MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN', 'PARTS_SPECIALIST', 'SALES'] as const).map(roleKey => (
                      <button
                        key={roleKey}
                        type="button"
                        onClick={() => setSelectedRoleFilter(roleKey)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                          selectedRoleFilter === roleKey
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {roleKey === 'ALL' ? 'All' : roleKey === 'SERVICE_MANAGER' ? 'Manager' : roleKey === 'SERVICE_ADVISOR' ? 'Advisors' : roleKey === 'TECHNICIAN' ? 'Techs' : roleKey === 'PARTS_SPECIALIST' ? 'Parts' : 'Sales'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {filteredUsers.map(user => {
                    const isCurrent = user.id === currentUser.id;
                    return (
                      <button
                        key={user.id}
                        id={`login-switch-user-${user.id}`}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isCurrent
                            ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-sm font-bold text-slate-900 truncate">{user.name}</span>
                              {user.employeeNumber && (
                                <span className="text-sm font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-300 shrink-0">
                                  {user.employeeNumber}
                                </span>
                              )}
                            </div>
                            {getRoleIcon(user.role)}
                          </div>
                          <p className="text-xs text-slate-500 truncate">{user.title}</p>
                          {user.certificationLevel && (
                            <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              {user.role === 'TECHNICIAN' && <Award className="w-3 h-3 text-blue-600" />}
                              <span>{user.certificationLevel}</span>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <button
            type="button"
            onClick={lockWorkstation}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5 text-red-600" />
            <span>Lock Workstation (Sign Out)</span>
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">
              {users.length} registered employees
            </span>
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(false)}
              className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
