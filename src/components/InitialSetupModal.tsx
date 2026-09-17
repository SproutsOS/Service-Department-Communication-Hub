import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Users, 
  Wrench, 
  UserCheck, 
  Package, 
  Briefcase, 
  Plus, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  X, 
  KeyRound, 
  Mail, 
  Phone, 
  Sparkles, 
  Layers, 
  ChevronRight,
  ChevronLeft,
  Award
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';

interface InitialStaffDraft {
  tempId: string;
  name: string;
  employeeNumber?: string;
  email: string;
  pin?: string;
  role: UserRole;
  title: string;
  certificationLevel?: string;
  bayNumber?: string;
  phone?: string;
}

const DEFAULT_INITIAL_STAFF: InitialStaffDraft[] = [];

export const InitialSetupModal: React.FC = () => {
  const { 
    isSetupWizardOpen, 
    setIsSetupWizardOpen, 
    completeInitialSetup,
    shopName: existingShopName,
    currentUser,
    users
  } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Shop & Manager
  const [shopNameInput, setShopNameInput] = useState(existingShopName || 'My Service Department');
  const [mgrName, setMgrName] = useState(currentUser.role === 'SERVICE_MANAGER' && currentUser.name !== 'Service Manager' ? currentUser.name : '');
  const [mgrEmployeeNumber, setMgrEmployeeNumber] = useState(currentUser.employeeNumber || '');
  const [mgrEmail, setMgrEmail] = useState(currentUser.role === 'SERVICE_MANAGER' && currentUser.email !== 'admin@precisionauto.com' ? currentUser.email : '');
  const [mgrPin, setMgrPin] = useState(currentUser.pin || '1234');
  const [mgrTitle, setMgrTitle] = useState(currentUser.title || 'Service Manager');
  const [mgrPhone, setMgrPhone] = useState(currentUser.phone || '');

  // Step 2: Staff Roster by Category
  const [staffCategory, setStaffCategory] = useState<UserRole>('TECHNICIAN');
  const [staffDrafts, setStaffDrafts] = useState<InitialStaffDraft[]>(() => {
    // If users already exist and customized, convert to drafts
    if (users && users.length > 1) {
      return users
        .filter(u => u.role !== 'SERVICE_MANAGER')
        .map((u, idx) => ({
          tempId: u.id,
          name: u.name,
          employeeNumber: u.employeeNumber || undefined,
          email: u.email,
          pin: u.pin || '1234',
          role: u.role,
          title: u.title,
          certificationLevel: u.certificationLevel || u.bayNumber,
          bayNumber: u.bayNumber,
          phone: u.phone
        }));
    }
    return DEFAULT_INITIAL_STAFF;
  });

  // Adding quick employee inline
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmployeeNumber, setNewStaffEmployeeNumber] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffPin, setNewStaffPin] = useState('1234');
  const [newStaffCert, setNewStaffCert] = useState('');
  const [isAddingInline, setIsAddingInline] = useState(false);

  // Step 3: Initial State
  const [startWithEmptyROs, setStartWithEmptyROs] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isSetupWizardOpen) return null;

  const handleAddDraftStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    const email = newStaffEmail.trim() || `${newStaffName.toLowerCase().replace(/\s+/g, '.')}@${shopNameInput.toLowerCase().replace(/\s+/g, '')}.com`;
    const defaultTitle = 
      staffCategory === 'TECHNICIAN' ? 'Automotive Technician' :
      staffCategory === 'SERVICE_ADVISOR' ? 'Service Advisor' :
      staffCategory === 'PARTS_SPECIALIST' ? 'Parts Specialist' :
      staffCategory === 'SALES' ? 'Sales Consultant' : 'Assistant Service Manager';

    const empNum = newStaffEmployeeNumber.trim() || undefined;

    const newDraft: InitialStaffDraft = {
      tempId: `draft_${Date.now()}`,
      name: newStaffName.trim(),
      employeeNumber: empNum,
      email,
      pin: newStaffPin.trim() || '1234',
      role: staffCategory,
      title: defaultTitle,
      certificationLevel: staffCategory === 'TECHNICIAN' ? newStaffCert.trim() : '',
      bayNumber: staffCategory === 'TECHNICIAN' ? newStaffCert.trim() : '',
      phone: '',
    };

    setStaffDrafts(prev => [...prev, newDraft]);
    setNewStaffName('');
    setNewStaffEmployeeNumber('');
    setNewStaffEmail('');
    setNewStaffPin('1234');
    setNewStaffCert('ASE Master Tech');
    setIsAddingInline(false);
  };

  const handleRemoveDraft = (tempId: string) => {
    setStaffDrafts(prev => prev.filter(s => s.tempId !== tempId));
  };

  const handleFinishSetup = () => {
    setErrorMsg('');
    if (!shopNameInput.trim()) {
      setErrorMsg('Please enter your Dealership or Shop Name.');
      setStep(1);
      return;
    }
    if (!mgrName.trim() || !mgrEmail.trim() || !mgrPin.trim()) {
      setErrorMsg('Please complete the primary manager account details (Name, Email, and 4-Digit PIN).');
      setStep(1);
      return;
    }

    // Map drafts into User objects
    const initialUsers: User[] = staffDrafts.map((draft, idx) => ({
      id: draft.tempId.startsWith('usr_') ? draft.tempId : `usr_${draft.tempId}`,
      name: draft.name,
      employeeNumber: draft.employeeNumber?.trim() || undefined,
      email: draft.email,
      pin: draft.pin || '1234',
      role: draft.role,
      title: draft.title,
      certificationLevel: draft.certificationLevel || '',
      bayNumber: draft.certificationLevel || draft.bayNumber || '',
      phone: draft.phone || '',
      avatar: draft.role === 'SERVICE_ADVISOR' 
        ? 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
        : draft.role === 'PARTS_SPECIALIST'
        ? 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'
        : draft.role === 'SALES'
        ? 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    }));

    completeInitialSetup({
      shopName: shopNameInput.trim(),
      manager: {
        name: mgrName.trim(),
        employeeNumber: mgrEmployeeNumber.trim() || undefined,
        email: mgrEmail.trim(),
        pin: mgrPin.trim() || '1234',
        title: mgrTitle.trim(),
        phone: mgrPhone.trim(),
      },
      initialUsers,
      startWithEmptyROs,
    });
  };

  const currentCategoryDrafts = staffDrafts.filter(s => s.role === staffCategory);

  if (!isSetupWizardOpen) return null;
  // Restrict access to Service Manager if shop is already initialized
  if (users.length > 0 && currentUser.role !== 'SERVICE_MANAGER') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div 
        id="initial-shop-setup-modal"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">Dealership & Shop Setup</h2>
              <p className="text-xs text-slate-400">
                Configure your shop name, admin credentials, staff roles, and initial board state
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSetupWizardOpen(false)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close Wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Step Progress Indicator */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>1</span>
            <span className={step === 1 ? 'font-bold text-slate-900' : 'text-slate-500'}>
              Shop & Manager Login
            </span>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-300" />

          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>2</span>
            <span className={step === 2 ? 'font-bold text-slate-900' : 'text-slate-500'}>
              Staff by Role ({staffDrafts.length})
            </span>
          </div>

          <ChevronRight className="w-4 h-4 text-slate-300" />

          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              step === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'
            }`}>3</span>
            <span className={step === 3 ? 'font-bold text-slate-900' : 'text-slate-500'}>
              Board State
            </span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: Shop Information & Manager Credentials */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4">
                <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Initial Shop Administrator Account</span>
                </h3>
                <p className="text-xs text-blue-700 mt-1">
                  Set up your Dealership / Shop Name and your primary Service Manager login with Employee Number and Quick PIN.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Dealership or Shop Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Performance Auto Care"
                  value={shopNameInput}
                  onChange={(e) => setShopNameInput(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Manager Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Greg Saulters"
                    value={mgrName}
                    onChange={(e) => setMgrName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Position / Job Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Service Director / GM"
                    value={mgrTitle}
                    onChange={(e) => setMgrTitle(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Login Email or Username
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. admin@precisionauto.com"
                      value={mgrEmail}
                      onChange={(e) => setMgrEmail(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Direct Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="(555) 302-8811"
                      value={mgrPhone}
                      onChange={(e) => setMgrPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Employee Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 100"
                    value={mgrEmployeeNumber}
                    onChange={(e) => setMgrEmployeeNumber(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Visible identifier to the right of your name.</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Quick PIN Code (4-Digits) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="1234"
                    value={mgrPin}
                    onChange={(e) => setMgrPin(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-mono text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Used exclusively for all workstation sign-ins.</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Categorized Employee Roster */}
          {step === 2 && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Configure Staff by Category</h3>
                  <p className="text-xs text-slate-500">
                    Assign employees to each job role category so they can log in individually.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingInline(!isAddingInline)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add {staffCategory === 'TECHNICIAN' ? 'Tech' : staffCategory === 'SERVICE_ADVISOR' ? 'Advisor' : 'Specialist'}</span>
                </button>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-2 pt-1 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => { setStaffCategory('TECHNICIAN'); setIsAddingInline(false); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    staffCategory === 'TECHNICIAN'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>Technicians ({staffDrafts.filter(s => s.role === 'TECHNICIAN').length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setStaffCategory('SERVICE_ADVISOR'); setIsAddingInline(false); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    staffCategory === 'SERVICE_ADVISOR'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Service Advisors ({staffDrafts.filter(s => s.role === 'SERVICE_ADVISOR').length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setStaffCategory('PARTS_SPECIALIST'); setIsAddingInline(false); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    staffCategory === 'PARTS_SPECIALIST'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Parts Specialists ({staffDrafts.filter(s => s.role === 'PARTS_SPECIALIST').length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => { setStaffCategory('SALES'); setIsAddingInline(false); }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    staffCategory === 'SALES'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Sales ({staffDrafts.filter(s => s.role === 'SALES').length})</span>
                </button>
              </div>

              {/* Inline Add Form */}
              {isAddingInline && (
                <form onSubmit={handleAddDraftStaff} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 animate-in fade-in duration-150">
                  <div className="text-xs font-bold text-slate-800">
                    Add New {staffCategory === 'TECHNICIAN' ? 'Technician' : staffCategory === 'SERVICE_ADVISOR' ? 'Service Advisor' : staffCategory === 'PARTS_SPECIALIST' ? 'Parts Specialist' : 'Sales Member'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Full Name (e.g. Alex Chen)"
                      value={newStaffName}
                      onChange={(e) => setNewStaffName(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 sm:col-span-2"
                    />
                    <input
                      type="text"
                      placeholder="Emp # (optional)"
                      value={newStaffEmployeeNumber}
                      onChange={(e) => setNewStaffEmployeeNumber(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Login Email (e.g. a.chen@precisionauto.com)"
                      value={newStaffEmail}
                      onChange={(e) => setNewStaffEmail(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900"
                    />
                    <input
                      type="text"
                      maxLength={8}
                      placeholder="4-Digit PIN (default 1234)"
                      value={newStaffPin}
                      onChange={(e) => setNewStaffPin(e.target.value)}
                      className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono text-slate-900"
                    />
                  </div>
                  {staffCategory === 'TECHNICIAN' && (
                    <input
                      type="text"
                      placeholder="Certification Level (e.g. Master Tech, ASE A-Level, L1)"
                      value={newStaffCert}
                      onChange={(e) => setNewStaffCert(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900"
                    />
                  )}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingInline(false)}
                      className="px-3 py-1 text-xs font-semibold text-slate-600 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs font-bold"
                    >
                      Save to Roster
                    </button>
                  </div>
                </form>
              )}

              {/* Roster list for active category */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {currentCategoryDrafts.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl">
                    <p className="text-xs text-slate-500 font-medium">
                      No staff members yet in this category. Click "Add" above to register someone.
                    </p>
                  </div>
                ) : (
                  currentCategoryDrafts.map((draft) => (
                    <div 
                      key={draft.tempId}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-xs hover:border-slate-300"
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">{draft.name}</span>
                          {draft.employeeNumber && (
                            <span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                              {draft.employeeNumber}
                            </span>
                          )}
                          {(draft.certificationLevel || draft.bayNumber) && (
                            <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Award className="w-3 h-3 text-blue-600" />
                              <span>{draft.certificationLevel || draft.bayNumber}</span>
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{draft.email}</span>
                          <span>•</span>
                          <span className="font-mono text-slate-400">PIN: {draft.pin || '1234'}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDraft(draft.tempId)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove from roster"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Board Data State (Clean vs Demo) */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="text-center py-2">
                <h3 className="text-base font-bold text-slate-900">Choose Initial Board State</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Decide whether you want to start with a fresh clean board or sample demo tickets.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Clean Slate Option */}
                <div 
                  onClick={() => setStartWithEmptyROs(true)}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    startWithEmptyROs 
                      ? 'border-blue-600 bg-blue-50/50 shadow-md ring-1 ring-blue-500' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-800">
                      Recommended
                    </span>
                    {startWithEmptyROs && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Clean Slate (0 Tickets)</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Starts your repair orders board at zero tickets. Ideal for inputting your actual live customer repair orders right away.
                  </p>
                </div>

                {/* Demo Data Option */}
                <div 
                  onClick={() => setStartWithEmptyROs(false)}
                  className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${
                    !startWithEmptyROs 
                      ? 'border-blue-600 bg-blue-50/50 shadow-md ring-1 ring-blue-500' 
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Sample Data
                    </span>
                    {!startWithEmptyROs && <CheckCircle2 className="w-5 h-5 text-blue-600" />}
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Load 8 Demo Tickets</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Loads pre-configured demo repair orders with hot-shot parts ETAs, technician diagnostic timers, and sample messaging.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">Setup Summary:</div>
                <div>• Shop Name: <span className="font-semibold text-slate-900">{shopNameInput || 'Precision Auto Care'}</span></div>
                <div>• Primary Manager: <span className="font-semibold text-slate-900">{mgrName} ({mgrEmail})</span></div>
                <div>• Team Size: <span className="font-semibold text-slate-900">{staffDrafts.length + 1} employees registered</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((step - 1) as 1 | 2)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsSetupWizardOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                Skip / Later
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep((step + 1) as 2 | 3)}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinishSetup}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete Setup & Open Hub</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
