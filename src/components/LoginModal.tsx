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
  KeyRound, 
  Mail, 
  AlertCircle,
  Users,
  Eye,
  EyeOff,
  Award
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';

export const LoginModal: React.FC = () => {
  const { 
    isLoginModalOpen, 
    setIsLoginModalOpen, 
    currentUser, 
    setCurrentUser, 
    users, 
    loginWithCredentials,
    setIsStaffManagementOpen,
    setIsSetupWizardOpen,
    shopName
  } = useApp();

  const [loginMode, setLoginMode] = useState<'INDIVIDUAL' | 'QUICK_SWITCH'>('INDIVIDUAL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [emailOrNameInput, setEmailOrNameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isLoginModalOpen) return null;

  const handleSelectUser = (user: User) => {
    // In Quick Switch mode: switch directly
    setCurrentUser(user);
    setSuccessMsg(`Switched session to ${user.name} (${user.title})`);
    setTimeout(() => {
      setIsLoginModalOpen(false);
      setSuccessMsg('');
    }, 400);
  };

  const handleIndividualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!emailOrNameInput.trim()) {
      setErrorMsg('Please enter your employee email or name.');
      return;
    }

    const result = loginWithCredentials(emailOrNameInput, passwordInput || '1234');
    if (result.success && result.user) {
      setSuccessMsg(`Welcome back, ${result.user.name}!`);
      setTimeout(() => {
        setIsLoginModalOpen(false);
        setSuccessMsg('');
      }, 500);
    } else {
      setErrorMsg(result.message || 'Invalid email, password, or PIN.');
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
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        id="login-rbac-modal"
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Individual Employee Sign-In</h2>
              <p className="text-xs text-slate-500 font-medium">
                Log in to access your designated role, assigned repair orders, and shop bay status
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

        {/* Mode Selector Tabs */}
        <div className="px-6 pt-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex gap-2">
            <button
              onClick={() => setLoginMode('INDIVIDUAL')}
              className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                loginMode === 'INDIVIDUAL'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Individual Login</span>
            </button>
            <button
              onClick={() => setLoginMode('QUICK_SWITCH')}
              className={`pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                loginMode === 'QUICK_SWITCH'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Quick Roster Switch</span>
            </button>
          </div>

          <div className="flex items-center gap-3 pb-3">
            <button
              type="button"
              onClick={() => {
                setIsLoginModalOpen(false);
                setIsSetupWizardOpen(true);
              }}
              className="text-xs font-semibold text-slate-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>Shop Setup</span>
            </button>
            <span className="text-slate-300">•</span>
            <button
              type="button"
              onClick={() => {
                setIsLoginModalOpen(false);
                setIsStaffManagementOpen(true);
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Staff</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

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
                </div>
                <div className="text-xs text-blue-700">
                  {currentUser.title} {(currentUser.certificationLevel || currentUser.bayNumber) ? `• ${currentUser.certificationLevel || currentUser.bayNumber}` : ''}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-green-700 bg-green-100 border border-green-200 px-2.5 py-0.5 rounded-full">
              <CheckCircle2 className="w-3 h-3" /> Active
            </span>
          </div>

          {loginMode === 'INDIVIDUAL' ? (
            /* Individual Password / PIN Login Form */
            <form onSubmit={handleIndividualLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Employee Email or Full Name
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. c.ramirez@precisionauto.com or Carlos Ramirez"
                    value={emailOrNameInput}
                    onChange={(e) => setEmailOrNameInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Password or PIN
                  </label>
                  <span className="text-[11px] text-blue-600 font-medium">Accepts employee password or PIN</span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password or 4-digit PIN"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Log In to Role Dashboard</span>
                </button>
              </div>

              {/* Quick Select Preset to Fill Name */}
              <div className="pt-4 border-t border-slate-100">
                <p className="text-xs font-bold text-slate-500 mb-2">Select your profile from the roster to auto-fill:</p>
                <div className="flex flex-wrap gap-1.5">
                  {users.slice(0, 6).map(u => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => {
                        setEmailOrNameInput(u.email);
                        setPasswordInput(u.password || u.pin || '1234');
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs text-slate-700 transition-colors"
                    >
                      <div className="w-4 h-4 rounded-full bg-blue-600 text-white font-bold text-[9px] flex items-center justify-center">
                        {u.name.slice(0, 1).toUpperCase()}
                      </div>
                      <span className="font-medium">{u.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          ) : (
            /* Quick Switch Roster */
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Select Team Member
                </h3>
                
                {/* Role filter buttons */}
                <div className="flex gap-1">
                  {(['ALL', 'SERVICE_MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN', 'PARTS_SPECIALIST'] as const).map(roleKey => (
                    <button
                      key={roleKey}
                      onClick={() => setSelectedRoleFilter(roleKey)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer ${
                        selectedRoleFilter === roleKey
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {roleKey === 'ALL' ? 'All' : roleKey === 'SERVICE_MANAGER' ? 'Manager' : roleKey === 'SERVICE_ADVISOR' ? 'Advisors' : roleKey === 'TECHNICIAN' ? 'Techs' : 'Parts'}
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
                          <span className="text-sm font-bold text-slate-900 truncate">{user.name}</span>
                          {getRoleIcon(user.role)}
                        </div>
                        <p className="text-xs text-slate-500 truncate">{user.title}</p>
                        {(user.certificationLevel || user.bayNumber) && (
                          <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                            {user.role === 'TECHNICIAN' && <Award className="w-3 h-3 text-blue-600" />}
                            <span>{user.certificationLevel || user.bayNumber}</span>
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            {users.length} registered employees
          </span>
          <button
            onClick={() => setIsLoginModalOpen(false)}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

