import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Wrench, 
  UserCheck, 
  Package, 
  Eye, 
  EyeOff,
  Briefcase, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Users, 
  LogIn, 
  Building2,
  Delete
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';

interface LoginScreenProps {
  onLoginSuccess?: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const { 
    users, 
    shopName, 
    isCloudSynced, 
    loginUser
  } = useApp();

  const [roleFilter, setRoleFilter] = useState<UserRole | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected user for PIN/password entry in ROSTER mode
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);

  // Status feedback
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Filtered employees
  const filteredUsers = users.filter(user => {
    if (user.isDeactivated) return false;
    if (roleFilter !== 'ALL' && user.role !== roleFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        user.name.toLowerCase().includes(q) ||
        (user.employeeNumber && user.employeeNumber.toLowerCase().includes(q)) ||
        (user.employeeNumber && `#${user.employeeNumber.toLowerCase()}`.includes(q)) ||
        user.title.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'SERVICE_MANAGER': return <Briefcase className="w-4 h-4 text-purple-600" />;
      case 'SERVICE_ADVISOR': return <UserCheck className="w-4 h-4 text-blue-600" />;
      case 'TECHNICIAN': return <Wrench className="w-4 h-4 text-emerald-600" />;
      case 'PARTS_SPECIALIST': return <Package className="w-4 h-4 text-amber-600" />;
      case 'SALES': return <Eye className="w-4 h-4 text-teal-600" />;
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'SERVICE_MANAGER': return 'Service Manager';
      case 'SERVICE_ADVISOR': return 'Service Advisor';
      case 'TECHNICIAN': return 'Technician';
      case 'PARTS_SPECIALIST': return 'Parts Specialist';
      case 'SALES': return 'Sales (Read-Only)';
    }
  };

  // Handle Roster PIN Submit
  const handleRosterSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUser) {
      setErrorMsg('Please select an employee profile.');
      return;
    }
    if (!pinInput.trim()) {
      setErrorMsg('Please enter your 4-digit Quick PIN.');
      return;
    }

    setIsAuthenticating(true);
    setErrorMsg('');

    setTimeout(() => {
      const res = loginUser(selectedUser, pinInput);
      if (res.success) {
        setSuccessMsg(`Welcome, ${selectedUser.name}! Unlocking workstation...`);
        if (onLoginSuccess) onLoginSuccess(selectedUser);
      } else {
        setErrorMsg(res.message || 'Incorrect PIN entered. Please verify your 4-digit PIN and try again.');
        setIsAuthenticating(false);
      }
    }, 250);
  };

  // Quick Keypad append
  const handleKeypadPress = (val: string) => {
    if (pinInput.length < 8) {
      setPinInput(prev => prev + val);
    }
  };

  const handleKeypadBackspace = () => {
    setPinInput(prev => prev.slice(0, -1));
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col justify-between text-slate-100 font-sans relative overflow-x-hidden selection:bg-blue-600 selection:text-white">
      
      {/* Background Ambience / Subtle Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 font-black text-xl">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">The HUB</span>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-400/30">
                PRO SYSTEM
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Everything Moving. Everyone Connected
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-[11px] text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Staff Access Protected</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
        </div>
      </header>

      {/* Main Login Shell */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8">
        <div className="w-full max-w-4xl bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col">
          
          {/* Top Banner Notice */}
          <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Restricted Dealership Workstation</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Staff Authentication & PIN Access
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Select your employee profile from the staff roster and enter your 4-digit PIN to unlock.
              </p>
            </div>

            {/* Staff Roster Indicator Badge */}
            <div className="bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 flex items-center gap-2 text-xs font-bold text-blue-400 shrink-0 self-start sm:self-auto">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Staff Roster Sign-In</span>
            </div>
          </div>

          {/* Feedback Alerts */}
          {errorMsg && (
            <div className="mx-6 mt-4 p-3 bg-red-950/70 border border-red-800/80 text-red-200 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mx-6 mt-4 p-3 bg-emerald-950/70 border border-emerald-800/80 text-emerald-200 rounded-xl text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{successMsg}</span>
            </div>
          )}

          {/* Staff Roster Grid & Quick PIN (Shop-Floor Optimized) */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Staff Roster Cards */}
              <div className="lg:col-span-7 flex flex-col space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  {/* Search input */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search team member..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Role filter buttons */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                    {(['ALL', 'SERVICE_MANAGER', 'SERVICE_ADVISOR', 'TECHNICIAN', 'PARTS_SPECIALIST', 'SALES'] as const).map(roleKey => (
                      <button
                        key={roleKey}
                        type="button"
                        onClick={() => setRoleFilter(roleKey)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase whitespace-nowrap transition-colors cursor-pointer ${
                          roleFilter === roleKey
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                        }`}
                      >
                        {roleKey === 'ALL' ? 'All' : roleKey === 'SERVICE_MANAGER' ? 'Mgr' : roleKey === 'SERVICE_ADVISOR' ? 'Advisors' : roleKey === 'TECHNICIAN' ? 'Techs' : roleKey === 'PARTS_SPECIALIST' ? 'Parts' : 'Sales'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Staff Cards List */}
                <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2">
                  {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800/80 text-slate-500">
                      <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold">No team members match this search</p>
                    </div>
                  ) : (
                    filteredUsers.map(user => {
                      const isSelected = selectedUser?.id === user.id;
                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setPinInput('');
                            setErrorMsg('');
                          }}
                          className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600/20 border-blue-500 ring-2 ring-blue-500 shadow-md'
                              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                              {user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-white truncate">{user.name}</span>
                                {user.employeeNumber && (
                                  <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-blue-900/80 text-blue-200 border border-blue-700/80 shrink-0">
                                    {user.employeeNumber}
                                  </span>
                                )}
                                {getRoleIcon(user.role)}
                              </div>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {user.title} {user.certificationLevel ? `• ${user.certificationLevel}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                              {getRoleLabel(user.role)}
                            </span>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: PIN Pad & Unlock Action */}
              <div className="lg:col-span-5 bg-slate-950/90 rounded-xl border border-slate-800 p-5 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Quick PIN Code</span>
                  </div>

                  {selectedUser ? (
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 mb-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {selectedUser.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white truncate">{selectedUser.name}</span>
                          {selectedUser.employeeNumber && (
                            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-blue-900/80 text-blue-200 border border-blue-700/80 shrink-0">
                              {selectedUser.employeeNumber}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-blue-400 truncate mt-0.5">{selectedUser.title}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-dashed border-slate-800 mb-4 text-center text-xs text-slate-500">
                      Select an employee on the left to enter Quick PIN
                    </div>
                  )}

                  {/* Passcode Input Field */}
                  <form onSubmit={handleRosterSubmit} className="space-y-3">
                    <div className="relative">
                      <input
                        type={showPin ? 'text' : 'password'}
                        placeholder="Enter 4-digit PIN"
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                        disabled={!selectedUser || isAuthenticating}
                        autoFocus={Boolean(selectedUser)}
                        maxLength={8}
                        className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-center text-base font-mono tracking-widest text-white placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1"
                      >
                        {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Touch-Screen Numeric Keypad (for quick shop kiosk/tablet login) */}
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                        <button
                          key={num}
                          type="button"
                          disabled={!selectedUser || isAuthenticating}
                          onClick={() => handleKeypadPress(num)}
                          className="h-10 bg-slate-900 hover:bg-slate-800 active:bg-blue-600 text-white font-bold text-sm rounded-lg border border-slate-800 transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center shadow-xs"
                        >
                          {num}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={!selectedUser || isAuthenticating}
                        onClick={() => setPinInput('')}
                        className="h-10 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-xs rounded-lg border border-slate-800 transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center uppercase"
                      >
                        Clear
                      </button>
                      <button
                        type="button"
                        disabled={!selectedUser || isAuthenticating}
                        onClick={() => handleKeypadPress('0')}
                        className="h-10 bg-slate-900 hover:bg-slate-800 active:bg-blue-600 text-white font-bold text-sm rounded-lg border border-slate-800 transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center shadow-xs"
                      >
                        0
                      </button>
                      <button
                        type="button"
                        disabled={!selectedUser || isAuthenticating}
                        onClick={handleKeypadBackspace}
                        className="h-10 bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold text-xs rounded-lg border border-slate-800 transition-colors disabled:opacity-40 cursor-pointer flex items-center justify-center"
                        title="Backspace"
                      >
                        <Delete className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={!selectedUser || !pinInput || isAuthenticating}
                      className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>{isAuthenticating ? 'Validating Passcode...' : 'Unlock Dealership Console'}</span>
                    </button>
                  </form>
                </div>

              </div>

            </div>

          {/* Footer Notes */}
          <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{shopName ? `${shopName} Dealership Network` : 'Dealership Network'}</span>
              <span>•</span>
              <span className="text-emerald-400 font-semibold">
                {isCloudSynced ? 'Cloud Database Connected' : 'Local Offline Mode Ready'}
              </span>
            </div>
            <div>
              <span>Need help? Contact the Service Director</span>
            </div>
          </div>

        </div>
      </main>

      {/* Bottom Legal / Copyright Strip */}
      <footer className="relative z-10 w-full py-3 px-6 text-center text-[11px] text-slate-500 border-t border-slate-900 bg-slate-950/60">
        {shopName ? `${shopName} Service Management System` : 'Woolwine CDJR Service Management System'} • Version 2.4.0 • Secure Terminal Access Only
      </footer>

    </div>
  );
};
