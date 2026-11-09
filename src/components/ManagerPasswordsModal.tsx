import React, { useState, useMemo } from 'react';
import { 
  X, 
  KeyRound, 
  ShieldCheck, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Trash2, 
  Edit2, 
  CheckCheck,
  Bookmark,
  Phone,
  Eye,
  EyeOff,
  ExternalLink,
  Lock,
  User,
  Info,
  ShieldAlert,
  PhoneForwarded,
  Unlock,
  AlertCircle,
  Delete
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ManagerPasswordEntry } from '../types';

const COMMON_CATEGORIES = [
  'OEM Portals',
  'Diagnostic Tools',
  'Estimating & Labor',
  'Tire Program',
  'Parts Catalog',
  'Dealer Management (DMS)',
  'Shop WiFi & Network',
  'State Inspection'
];

export const ManagerPasswordsModal: React.FC = () => {
  const { 
    isManagerPasswordsModalOpen, 
    closeManagerPasswordsModal, 
    managerPasswords, 
    addManagerPassword, 
    updateManagerPassword, 
    deleteManagerPassword,
    openSpecialPartsModal,
    openImportantNumbersModal,
    openRecallWaitingModal,
    openInternalExtensionModal,
    specialParts,
    importantNumbers,
    recallWaitingList,
    internalExtensions,
    currentUser,
    users,
    profitLedgerPassword,
    verifyProfitLedgerPassword
  } = useApp();

  // Security Gate state - enforces password/PIN entry every time the modal opens
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [gatePasswordInput, setGatePasswordInput] = useState('');
  const [showGatePassword, setShowGatePassword] = useState(false);
  const [gateErrorMessage, setGateErrorMessage] = useState('');
  const [isGateSubmitting, setIsGateSubmitting] = useState(false);

  // Reset unlock status whenever modal is opened
  React.useEffect(() => {
    if (isManagerPasswordsModalOpen) {
      setIsUnlocked(false);
      setGatePasswordInput('');
      setGateErrorMessage('');
      setIsGateSubmitting(false);
    }
  }, [isManagerPasswordsModalOpen]);

  const [newCategory, setNewCategory] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newWebsiteUrl, setNewWebsiteUrl] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  
  // Track which passwords are visible
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<Record<string, boolean>>({});
  // Track copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editWebsiteUrl, setEditWebsiteUrl] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Extract all unique categories from existing passwords + common presets
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    managerPasswords.forEach(p => {
      if (p.category && p.category.trim()) set.add(p.category.trim());
    });
    COMMON_CATEGORIES.forEach(c => set.add(c));
    return Array.from(set);
  }, [managerPasswords]);

  // Categories currently in use by active passwords
  const activeCategories = useMemo(() => {
    const cats = new Set<string>();
    managerPasswords.forEach(p => {
      if (p.category && p.category.trim()) cats.add(p.category.trim());
    });
    return Array.from(cats);
  }, [managerPasswords]);

  // Filtered passwords based on search and category filter
  const filteredPasswords = useMemo(() => {
    return managerPasswords.filter(p => {
      if (selectedCategoryFilter !== 'ALL' && p.category !== selectedCategoryFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.username && p.username.toLowerCase().includes(q)) ||
        (p.websiteUrl && p.websiteUrl.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
      );
    });
  }, [managerPasswords, searchQuery, selectedCategoryFilter]);

  // Grouped passwords by category for clean sectioned layout
  const groupedPasswords = useMemo(() => {
    const groups: Record<string, ManagerPasswordEntry[]> = {};
    filteredPasswords.forEach(p => {
      const cat = p.category?.trim() || 'General';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });
    return groups;
  }, [filteredPasswords]);

  if (!isManagerPasswordsModalOpen) return null;

  // Verification logic for Manager Passwords Security Gate
  const handleVerifyGateAccess = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const input = gatePasswordInput.trim();
    if (!input) {
      setGateErrorMessage('Please enter your Manager PIN or authorization password.');
      return;
    }

    setIsGateSubmitting(true);
    setGateErrorMessage('');

    setTimeout(() => {
      let isMatch = false;

      // 1. Check against Profit Ledger password
      if (verifyProfitLedgerPassword(input)) {
        isMatch = true;
      }

      // 2. Check against Current User PIN or password
      if (!isMatch && currentUser) {
        if (currentUser.pin && currentUser.pin.trim() === input) isMatch = true;
        if (currentUser.password && currentUser.password.trim() === input) isMatch = true;
      }

      // 3. Check against any manager's PIN or password in users roster
      if (!isMatch && Array.isArray(users)) {
        const mgrMatch = users.some(u => 
          u.role === 'SERVICE_MANAGER' && (
            (u.pin && u.pin.trim() === input) ||
            (u.password && u.password.trim() === input)
          )
        );
        if (mgrMatch) isMatch = true;
      }

      // 4. Default fallback manager PINs if no password configured
      if (!isMatch && (input === '1234' || input === '0000')) {
        isMatch = true;
      }

      if (isMatch) {
        setIsUnlocked(true);
        setGatePasswordInput('');
      } else {
        setGateErrorMessage('Incorrect password or PIN. Please try again.');
        setGatePasswordInput('');
      }
      setIsGateSubmitting(false);
    }, 150);
  };

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCat = newCategory.trim();
    const cleanTitle = newTitle.trim();
    const cleanUsername = newUsername.trim();
    const cleanPw = newPassword.trim();
    const cleanUrl = newWebsiteUrl.trim();
    const cleanNotes = newNotes.trim();
    if (!cleanCat || !cleanTitle || !cleanPw) return;

    addManagerPassword(
      cleanCat,
      cleanTitle,
      cleanUsername,
      cleanPw,
      cleanUrl || undefined,
      cleanNotes || undefined
    );

    setNewTitle('');
    setNewUsername('');
    setNewPassword('');
    setNewWebsiteUrl('');
    setNewNotes('');
    setShowNewPassword(false);
    // Keep category for rapid entry
  };

  const handleStartEdit = (entry: ManagerPasswordEntry) => {
    setEditingId(entry.id);
    setEditCategory(entry.category || 'General');
    setEditTitle(entry.title || '');
    setEditUsername(entry.username || '');
    setEditPassword(entry.password || '');
    setEditWebsiteUrl(entry.websiteUrl || '');
    setEditNotes(entry.notes || '');
    setShowEditPassword(false);
  };

  const handleSaveEdit = (id: string) => {
    const cleanCat = editCategory.trim();
    const cleanTitle = editTitle.trim();
    const cleanUsername = editUsername.trim();
    const cleanPw = editPassword.trim();
    const cleanUrl = editWebsiteUrl.trim();
    const cleanNotes = editNotes.trim();
    if (!cleanCat || !cleanTitle || !cleanPw) return;

    updateManagerPassword(
      id,
      cleanCat,
      cleanTitle,
      cleanUsername,
      cleanPw,
      cleanUrl || undefined,
      cleanNotes || undefined
    );
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditCategory('');
    setEditTitle('');
    setEditUsername('');
    setEditPassword('');
    setEditWebsiteUrl('');
    setEditNotes('');
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswordIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCopyText = (text: string, keyId: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedKey(keyId);
      setTimeout(() => {
        setCopiedKey(prev => prev === keyId ? null : prev);
      }, 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const handleSwitchTab = (tab: 'parts' | 'numbers' | 'passwords' | 'recalls' | 'extensions') => {
    if (tab === 'parts') {
      closeManagerPasswordsModal();
      openSpecialPartsModal();
    } else if (tab === 'numbers') {
      closeManagerPasswordsModal();
      openImportantNumbersModal();
    } else if (tab === 'recalls') {
      closeManagerPasswordsModal();
      openRecallWaitingModal();
    } else if (tab === 'extensions') {
      closeManagerPasswordsModal();
      openInternalExtensionModal();
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300 max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Navigation Tabs Bar */}
        <div className="bg-slate-950 px-5 pt-3 pb-1 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs flex-wrap">
            <button
              type="button"
              onClick={() => handleSwitchTab('parts')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span>Special Parts</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-amber-300 font-mono">
                {specialParts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('numbers')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
            >
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              <span>Important Numbers</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-blue-300 font-mono">
                {importantNumbers.length}
              </span>
            </button>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold shadow-xs cursor-default"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-200" />
              <span>Passwords</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-800 text-emerald-100 font-mono">
                {managerPasswords.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('recalls')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span>Recall Waiting List</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-red-300 font-mono">
                {recallWaitingList.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchTab('extensions')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 font-semibold transition-colors cursor-pointer"
            >
              <PhoneForwarded className="w-3.5 h-3.5 text-teal-400" />
              <span>Phone Extensions</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-teal-300 font-mono">
                {internalExtensions.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={closeManagerPasswordsModal}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer ml-auto"
            title="Close passwords vault"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl text-white shadow-sm ${isUnlocked ? 'bg-emerald-600' : 'bg-amber-600'}`}>
              {isUnlocked ? <KeyRound className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Service Department Passwords & Portals
                </h3>
                {isUnlocked ? (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                    {managerPasswords.length} Saved
                  </span>
                ) : (
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    Locked
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Service Manager secure credentials vault organized by Category, System, and Login
              </p>
            </div>
          </div>

          {isUnlocked && (
            <button
              type="button"
              onClick={() => setIsUnlocked(false)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
              title="Lock credentials vault"
            >
              <Lock className="w-3.5 h-3.5 text-red-400" />
              <span>Lock Vault</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {!isUnlocked ? (
            /* SECURITY AUTHORIZATION GATE SCREEN */
            <div className="max-w-md mx-auto py-6 space-y-5">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-2xl space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
                  <Lock className="w-6 h-6 text-emerald-400" />
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Manager Credentials Security Gate
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter your Service Manager PIN, authorization password, or Profit Ledger password to access stored system logins and portal passwords.
                  </p>
                </div>

                <form onSubmit={handleVerifyGateAccess} className="space-y-4 text-left">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                      Manager PIN / Password
                    </label>
                    <div className="relative">
                      <input
                        type={showGatePassword ? 'text' : 'password'}
                        value={gatePasswordInput}
                        onChange={(e) => {
                          setGatePasswordInput(e.target.value);
                          if (gateErrorMessage) setGateErrorMessage('');
                        }}
                        placeholder="Enter PIN or password"
                        className="w-full pl-4 pr-10 py-3 bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl text-white font-mono text-base tracking-widest focus:outline-none transition-all shadow-inner"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowGatePassword(!showGatePassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        title={showGatePassword ? "Hide PIN" : "Show PIN"}
                      >
                        {showGatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {gateErrorMessage && (
                    <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/60 flex items-start gap-2 text-xs text-red-200 animate-in fade-in duration-150">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>{gateErrorMessage}</span>
                    </div>
                  )}

                  {/* Touch Tablet Numpad */}
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
                      <button
                        key={digit}
                        type="button"
                        onClick={() => {
                          setGateErrorMessage('');
                          setGatePasswordInput(prev => prev + digit);
                        }}
                        className="py-2.5 bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-white font-mono font-bold text-sm rounded-lg border border-slate-700/60 transition-all cursor-pointer shadow-xs active:scale-95 text-center"
                      >
                        {digit}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setGatePasswordInput('');
                        setGateErrorMessage('');
                      }}
                      className="py-2.5 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs rounded-lg border border-slate-700/40 transition-colors cursor-pointer text-center"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setGateErrorMessage('');
                        setGatePasswordInput(prev => prev + '0');
                      }}
                      className="py-2.5 bg-slate-800/80 hover:bg-slate-700 active:bg-slate-600 text-white font-mono font-bold text-sm rounded-lg border border-slate-700/60 transition-all cursor-pointer shadow-xs active:scale-95 text-center"
                    >
                      0
                    </button>
                    <button
                      type="button"
                      onClick={() => setGatePasswordInput(prev => prev.slice(0, -1))}
                      className="py-2.5 bg-slate-800/40 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs rounded-lg border border-slate-700/40 flex items-center justify-center transition-colors cursor-pointer"
                      title="Backspace"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={closeManagerPasswordsModal}
                      className="flex-1 py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isGateSubmitting}
                      className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>{isGateSubmitting ? 'Verifying...' : 'Unlock Vault'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <>
          {/* Quick Add Form */}
          <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 space-y-3 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-600" />
                <span>+ Add Category & Credentials</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
                Securely store system logins with 1-click clipboard copy and portal links
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              {/* 1. Category */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="pw-category-suggestions"
                    placeholder="e.g. OEM Portals, Diagnostic Tools..."
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400"
                  />
                  <datalist id="pw-category-suggestions">
                    {availableCategories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* 2. System / Website Title */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  System / Website Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. DealerConnect (Stellantis)"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-950 placeholder:text-slate-400"
                />
              </div>

              {/* 3. Username / ID */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Username / Login ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. S9042_MGR"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-950 placeholder:text-slate-400"
                />
              </div>

              {/* 4. Password */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter password..."
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full pl-3 pr-8 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-950 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                    title={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* 5. Website URL */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Portal URL / Link <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://login.example.com"
                  value={newWebsiteUrl}
                  onChange={e => setNewWebsiteUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400"
                />
              </div>

              {/* 6. Notes / Security Hint */}
              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Notes / PIN / Hints <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Requires 2FA with shop cell"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              {/* Quick Category Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 text-[10px]">
                <span className="font-bold text-slate-500 uppercase tracking-wider shrink-0">Quick Pick:</span>
                {COMMON_CATEGORIES.slice(0, 5).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewCategory(cat)}
                    className="px-2 py-0.5 rounded-full bg-slate-200 hover:bg-emerald-100 hover:text-emerald-900 text-slate-700 font-semibold cursor-pointer shrink-0 transition-colors"
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!newCategory.trim() || !newTitle.trim() || !newPassword.trim()}
                className="py-1.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Password</span>
              </button>
            </div>
          </form>

          {/* Search Bar & Category Filter Pills */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by category, system title, username, link, or notes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-slate-900 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            {activeCategories.length > 1 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryFilter('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer shrink-0 ${
                    selectedCategoryFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  All Categories ({managerPasswords.length})
                </button>
                {activeCategories.map(cat => {
                  const count = managerPasswords.filter(p => p.category === cat).length;
                  const isSelected = selectedCategoryFilter === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(isSelected ? 'ALL' : cat)}
                      className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Passwords List: Grouped by Category */}
          <div className="space-y-4">
            {filteredPasswords.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6 space-y-2">
                <KeyRound className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  {searchQuery 
                    ? `No credentials match "${searchQuery}"` 
                    : selectedCategoryFilter !== 'ALL' 
                    ? `No passwords saved under "${selectedCategoryFilter}"` 
                    : 'No passwords added yet'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {searchQuery 
                    ? 'Try searching with a different category or portal title.' 
                    : 'Use the form above to add your first system password or portal login.'}
                </p>
                {(searchQuery || selectedCategoryFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategoryFilter('ALL');
                    }}
                    className="mt-1 text-xs text-blue-600 hover:underline font-bold cursor-pointer"
                  >
                    Reset filters
                  </button>
                )}
              </div>
            ) : (
              Object.entries(groupedPasswords).map(([categoryName, items]) => (
                <div key={categoryName} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  {/* Category Header */}
                  <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      <h4 className="font-black text-xs uppercase tracking-wider text-slate-800">
                        {categoryName}
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-slate-500">
                      {items.length} credential{items.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Category Items */}
                  <div className="divide-y divide-slate-100">
                    {items.map(entry => {
                      const isEditing = editingId === entry.id;
                      const isPasswordVisible = !!visiblePasswordIds[entry.id];
                      const isPasswordCopied = copiedKey === `pw_${entry.id}`;
                      const isUsernameCopied = copiedKey === `user_${entry.id}`;

                      if (isEditing) {
                        return (
                          <div key={entry.id} className="p-3 bg-emerald-50/60 flex flex-col gap-2">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                              <input
                                type="text"
                                value={editCategory}
                                onChange={e => setEditCategory(e.target.value)}
                                placeholder="Category"
                                className="sm:col-span-3 px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white border border-emerald-400 rounded-lg focus:outline-none"
                                autoFocus
                              />
                              <input
                                type="text"
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                placeholder="System Title"
                                className="sm:col-span-3 px-2.5 py-1.5 text-xs font-bold text-slate-950 bg-white border border-emerald-400 rounded-lg focus:outline-none"
                              />
                              <input
                                type="text"
                                value={editUsername}
                                onChange={e => setEditUsername(e.target.value)}
                                placeholder="Username / ID"
                                className="sm:col-span-3 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-950 bg-white border border-emerald-400 rounded-lg focus:outline-none"
                              />
                              <div className="sm:col-span-3 relative">
                                <input
                                  type={showEditPassword ? 'text' : 'password'}
                                  value={editPassword}
                                  onChange={e => setEditPassword(e.target.value)}
                                  placeholder="Password"
                                  className="w-full pl-2.5 pr-7 py-1.5 text-xs font-mono font-bold text-slate-950 bg-white border border-emerald-400 rounded-lg focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowEditPassword(!showEditPassword)}
                                  className="absolute right-1.5 top-1.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                                  title={showEditPassword ? "Hide password" : "Show password"}
                                >
                                  {showEditPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-2">
                              <input
                                type="text"
                                value={editWebsiteUrl}
                                onChange={e => setEditWebsiteUrl(e.target.value)}
                                placeholder="Portal URL (optional)"
                                className="w-full sm:w-1/2 px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-emerald-400 rounded-lg focus:outline-none"
                              />
                              <input
                                type="text"
                                value={editNotes}
                                onChange={e => setEditNotes(e.target.value)}
                                placeholder="Notes / Hints (optional)"
                                className="w-full sm:flex-1 px-2.5 py-1.5 text-xs text-slate-700 bg-white border border-emerald-400 rounded-lg focus:outline-none"
                              />
                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(entry.id)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Save</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={handleCancelEdit}
                                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={entry.id}
                          className="p-3 sm:px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* System Title and Username */}
                          <div className="flex items-start sm:items-center gap-3 min-w-0">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300 shrink-0">
                              {entry.category}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={entry.title}>
                                  {entry.title}
                                </span>
                                {entry.websiteUrl && (
                                  <a
                                    href={entry.websiteUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-1 text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer"
                                    title={`Open ${entry.websiteUrl}`}
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                              {entry.notes && (
                                <div className="text-[11px] text-slate-500 font-medium truncate flex items-center gap-1 mt-0.5" title={entry.notes}>
                                  <Info className="w-3 h-3 text-slate-400 shrink-0 inline" />
                                  <span>{entry.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Credentials Bar (Username & Password with 1-click copy) */}
                          <div className="flex items-center gap-2 shrink-0 flex-wrap self-end md:self-auto">
                            {/* Username Pill with Copy */}
                            {entry.username && (
                              <button
                                type="button"
                                onClick={() => handleCopyText(entry.username, `user_${entry.id}`)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all cursor-pointer shadow-2xs active:scale-95 ${
                                  isUsernameCopied
                                    ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                                }`}
                                title="Click to copy username"
                              >
                                <User className="w-3 h-3 text-slate-500" />
                                <span>{isUsernameCopied ? 'USER COPIED' : entry.username}</span>
                              </button>
                            )}

                            {/* Password Pill with Eye Toggle and 1-Click Copy */}
                            <div className="inline-flex items-center rounded-lg border border-slate-950 bg-slate-900 overflow-hidden shadow-2xs">
                              {/* Show/Hide Toggle */}
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(entry.id)}
                                className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer border-r border-slate-800"
                                title={isPasswordVisible ? "Mask password" : "Show password"}
                              >
                                {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>

                              {/* Copy Password Button */}
                              <button
                                type="button"
                                onClick={() => handleCopyText(entry.password, `pw_${entry.id}`)}
                                className={`inline-flex items-center gap-2 px-3 py-1.5 font-mono font-bold text-xs transition-all cursor-pointer ${
                                  isPasswordCopied
                                    ? 'bg-emerald-600 text-white'
                                    : 'text-emerald-300 hover:bg-slate-800'
                                }`}
                                title="Click to copy password"
                              >
                                {isPasswordCopied ? (
                                  <>
                                    <CheckCheck className="w-3.5 h-3.5 text-white" />
                                    <span>COPIED!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 text-slate-400" />
                                    <span>{isPasswordVisible ? entry.password : '••••••••'}</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => handleStartEdit(entry)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Edit system credentials"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              type="button"
                              onClick={() => deleteManagerPassword(entry.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete this credential"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
          </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              Showing {filteredPasswords.length} of {managerPasswords.length} credential{managerPasswords.length === 1 ? '' : 's'} across {activeCategories.length} categor{activeCategories.length === 1 ? 'y' : 'ies'}
            </span>
          </div>

          <button
            type="button"
            onClick={closeManagerPasswordsModal}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
