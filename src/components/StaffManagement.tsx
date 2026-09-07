import React, { useState, useRef } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  Briefcase, 
  UserCheck, 
  Wrench, 
  Package, 
  KeyRound, 
  Phone, 
  Mail, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  X, 
  Eye, 
  EyeOff, 
  RotateCcw,
  Sparkles,
  Info,
  Camera,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User, UserRole } from '../types';

export const StaffManagement: React.FC = () => {
  const { 
    users, 
    currentUser, 
    addUser, 
    updateUser, 
    removeUser, 
    repairOrders, 
    clearAllRepairOrders, 
    resetToDemoData,
    isStaffManagementOpen,
    setIsStaffManagementOpen,
    setIsSetupWizardOpen,
    shopName
  } = useApp();

  const [activeCategory, setActiveCategory] = useState<'ALL' | UserRole>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isClearDataConfirmOpen, setIsClearDataConfirmOpen] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [visiblePins, setVisiblePins] = useState<{ [userId: string]: boolean }>({});

  // Form fields
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<UserRole>('TECHNICIAN');
  const [titleInput, setTitleInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('1234');
  const [pinInput, setPinInput] = useState('1234');
  const [showPassword, setShowPassword] = useState(false);
  const [bayInput, setBayInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-save any field change directly to the employee record
  const triggerAutoSave = (updates: Partial<User>) => {
    if (!editingUserId) return;
    setAutoSaveStatus('saving');
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      updateUser(editingUserId, updates);
      setAutoSaveStatus('saved');
    }, 150);
  };

  // Auto-clear feedback after 4 seconds
  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const togglePinVisibility = (userId: string) => {
    setVisiblePins(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Open modal to add a new employee
  const handleOpenAdd = () => {
    setEditingUserId(null);
    setNameInput('');
    setEmailInput('');
    setRoleInput(activeCategory === 'ALL' ? 'TECHNICIAN' : activeCategory);
    setTitleInput(
      activeCategory === 'SERVICE_ADVISOR' ? 'Service Advisor' :
      activeCategory === 'SERVICE_MANAGER' ? 'Assistant Service Manager' :
      activeCategory === 'PARTS_SPECIALIST' ? 'Parts Specialist' : 'Automotive Technician'
    );
    setPasswordInput('1234');
    setPinInput('1234');
    setShowPassword(false);
    setBayInput(activeCategory === 'TECHNICIAN' ? 'Bay 2' : '');
    setPhoneInput('(555) 302-');
    setAvatarInput(getRoleDefaultAvatar(activeCategory === 'ALL' ? 'TECHNICIAN' : activeCategory));
    setAutoSaveStatus('saved');
    setIsAddEditModalOpen(true);
  };

  // Open modal to edit employee (clicking card or edit button)
  const handleOpenEdit = (user: User) => {
    setEditingUserId(user.id);
    setNameInput(user.name);
    setEmailInput(user.email);
    setRoleInput(user.role);
    setTitleInput(user.title);
    setPasswordInput(user.password || user.pin || '1234');
    setPinInput(user.pin || '1234');
    setShowPassword(false);
    setBayInput(user.bayNumber || '');
    setPhoneInput(user.phone || '');
    setAvatarInput(user.avatar || getRoleDefaultAvatar(user.role));
    setAutoSaveStatus('saved');
    setIsAddEditModalOpen(true);
  };

  // Save add/edit
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      showFeedback('Employee name is required', 'error');
      return;
    }
    if (!emailInput.trim()) {
      showFeedback('Employee email / username is required', 'error');
      return;
    }

    if (editingUserId) {
      updateUser(editingUserId, {
        name: nameInput.trim(),
        email: emailInput.trim().toLowerCase(),
        role: roleInput,
        title: titleInput.trim(),
        password: passwordInput.trim() || '1234',
        pin: pinInput.trim() || '1234',
        bayNumber: roleInput === 'TECHNICIAN' ? (bayInput.trim() || undefined) : undefined,
        phone: phoneInput.trim() || undefined,
        avatar: avatarInput || undefined,
      });
      showFeedback(`Profile for ${nameInput.trim()} saved.`);
    } else {
      addUser({
        name: nameInput.trim(),
        email: emailInput.trim().toLowerCase(),
        role: roleInput,
        title: titleInput.trim(),
        password: passwordInput.trim() || '1234',
        pin: pinInput.trim() || '1234',
        bayNumber: roleInput === 'TECHNICIAN' ? (bayInput.trim() || undefined) : undefined,
        phone: phoneInput.trim() || undefined,
        avatar: avatarInput || getRoleDefaultAvatar(roleInput),
      });
      showFeedback(`Added new employee: ${nameInput.trim()} (${getRoleLabel(roleInput)})`);
    }

    setIsAddEditModalOpen(false);
  };

  // Handle remove confirmation
  const handleConfirmRemove = () => {
    if (!userToDelete) return;
    const result = removeUser(userToDelete.id);
    if (result.success) {
      showFeedback(`Removed employee ${userToDelete.name} from the shop.`);
    } else {
      showFeedback(result.message || 'Failed to remove employee', 'error');
    }
    setUserToDelete(null);
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'SERVICE_MANAGER': return 'Service Manager';
      case 'SERVICE_ADVISOR': return 'Service Advisor';
      case 'TECHNICIAN': return 'Technician';
      case 'PARTS_SPECIALIST': return 'Parts Specialist';
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SERVICE_MANAGER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Briefcase className="w-3.5 h-3.5 text-purple-600" />
            Service Manager
          </span>
        );
      case 'SERVICE_ADVISOR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <UserCheck className="w-3.5 h-3.5 text-blue-600" />
            Service Advisor
          </span>
        );
      case 'TECHNICIAN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Wrench className="w-3.5 h-3.5 text-emerald-600" />
            Technician
          </span>
        );
      case 'PARTS_SPECIALIST':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Package className="w-3.5 h-3.5 text-amber-600" />
            Parts Specialist
          </span>
        );
    }
  };

  const getRoleDefaultAvatar = (role: UserRole) => {
    switch (role) {
      case 'SERVICE_MANAGER':
        return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
      case 'SERVICE_ADVISOR':
        return 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80';
      case 'TECHNICIAN':
        return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80';
      case 'PARTS_SPECIALIST':
        return 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80';
    }
  };

  // Counts by role
  const totalCount = users.length;
  const managerCount = users.filter(u => u.role === 'SERVICE_MANAGER').length;
  const advisorCount = users.filter(u => u.role === 'SERVICE_ADVISOR').length;
  const techCount = users.filter(u => u.role === 'TECHNICIAN').length;
  const partsCount = users.filter(u => u.role === 'PARTS_SPECIALIST').length;

  // Filtered staff list
  const filteredUsers = users.filter(user => {
    if (activeCategory !== 'ALL' && user.role !== activeCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = user.name.toLowerCase().includes(q);
      const matchEmail = user.email.toLowerCase().includes(q);
      const matchTitle = user.title.toLowerCase().includes(q);
      const matchBay = user.bayNumber?.toLowerCase().includes(q);
      return matchName || matchEmail || matchTitle || matchBay;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className={`p-4 rounded-xl border flex items-center justify-between shadow-md animate-in slide-in-from-top-2 ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-red-50 border-red-200 text-red-900'
        }`}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Shop Data Reset Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Staff & Employee Management
                </h1>
                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {totalCount} Total Employees
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Add, assign job roles, set login PINs, and remove employees when they leave the shop.
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="open-shop-setup-wizard-btn"
              onClick={() => setIsSetupWizardOpen(true)}
              className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
              title="Open dealership & shop onboarding wizard"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Shop Setup Wizard</span>
            </button>

            <button
              id="add-employee-btn"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Employee</span>
            </button>

            <button
              id="clear-sample-data-btn"
              onClick={() => setIsClearDataConfirmOpen(true)}
              className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 border border-slate-300 hover:border-red-300 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Clear all demo repair orders for clean private shop use"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span>Clear Sample ROs (Start Fresh)</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Reset all sample team members and demo repair orders?')) {
                  resetToDemoData();
                  showFeedback('Restored default demo team and repair orders.');
                }
              }}
              className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-300 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              title="Restore demo users and sample repair orders"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Restore Demo</span>
            </button>
          </div>
        </div>

        {/* Clean Launch Notice */}
        <div className="mt-4 p-3 bg-blue-50/60 border border-blue-200 rounded-lg flex items-start gap-2 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Private & Clean Launch Tip: </span>
            <span>
              To make your shop private with zero sample tickets, click <strong>"Clear Sample ROs (Start Fresh)"</strong>. You can then add your actual technicians, advisors, and managers below. Each employee logs in with their designated email and private PIN.
            </span>
          </div>
        </div>
      </div>

      {/* Role Category Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Categories */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveCategory('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            All Staff ({totalCount})
          </button>

          <button
            onClick={() => setActiveCategory('SERVICE_MANAGER')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeCategory === 'SERVICE_MANAGER'
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50 hover:text-purple-700'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Service Managers ({managerCount})
          </button>

          <button
            onClick={() => setActiveCategory('SERVICE_ADVISOR')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeCategory === 'SERVICE_ADVISOR'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-blue-50 hover:text-blue-700'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Service Advisors ({advisorCount})
          </button>

          <button
            onClick={() => setActiveCategory('TECHNICIAN')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeCategory === 'TECHNICIAN'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            Technicians ({techCount})
          </button>

          <button
            onClick={() => setActiveCategory('PARTS_SPECIALIST')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeCategory === 'PARTS_SPECIALIST'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-amber-50 hover:text-amber-700'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Parts Specialists ({partsCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee or bay..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
          />
        </div>
      </div>

      {/* Quick Edit Guidance Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <Edit3 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Interactive Staff Directory:</strong> Click directly on any employee card below to edit their profile details. <strong>All edits auto-save automatically.</strong>
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shrink-0 self-start sm:self-auto">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Auto-Save Active
        </span>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800">No employees found in this category</h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery ? 'Try changing your search filter.' : 'Click "Add Employee" above to add staff to this job role.'}
            </p>
            <button
              onClick={handleOpenAdd}
              className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add First Employee in this Category
            </button>
          </div>
        ) : (
          filteredUsers.map(user => {
            const isSelf = user.id === currentUser.id;
            const assignedROs = repairOrders.filter(ro => 
              user.role === 'TECHNICIAN' ? ro.techId === user.id && ro.status !== 'COMPLETED' :
              user.role === 'SERVICE_ADVISOR' ? ro.advisorId === user.id && ro.status !== 'COMPLETED' :
              false
            );
            const isPinShown = visiblePins[user.id] || false;

            return (
              <div 
                key={user.id}
                onClick={() => handleOpenEdit(user)}
                className={`bg-white rounded-xl border p-5 shadow-xs flex flex-col justify-between transition-all cursor-pointer group hover:shadow-md hover:border-blue-400 hover:ring-2 hover:ring-blue-500/10 ${
                  isSelf ? 'border-blue-300 ring-2 ring-blue-500/20' : 'border-slate-200'
                }`}
                title="Click anywhere on card to edit employee profile (auto-saves changes)"
              >
                <div>
                  {/* Top Card Bar */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img 
                          src={user.avatar} 
                          alt={user.name} 
                          className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-100 group-hover:ring-blue-400 transition-all"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-2xs border border-slate-200 group-hover:border-blue-400">
                          <Edit3 className="w-3 h-3 text-blue-600" />
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                            {user.name}
                          </h3>
                          {isSelf && (
                            <span className="text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-200 shrink-0">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 truncate font-medium">
                          {user.title}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div>{getRoleBadge(user.role)}</div>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 group-hover:bg-blue-100 group-hover:text-blue-800 px-2 py-0.5 rounded-md border border-blue-200/60 flex items-center gap-1 transition-colors">
                        <Edit3 className="w-3 h-3" />
                        <span>Click to Edit</span>
                      </span>
                    </div>
                  </div>

                  {/* Attributes & Bay */}
                  <div className="space-y-2 py-3 border-y border-slate-100 text-xs">
                    
                    {/* Bay (if tech) */}
                    {user.role === 'TECHNICIAN' && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-medium">Bay Assignment:</span>
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {user.bayNumber || 'Floating / Unassigned'}
                        </span>
                      </div>
                    )}

                    {/* Contact info */}
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <Mail className="w-3 h-3 text-slate-400" /> Email/Login:
                      </span>
                      <span className="font-medium text-slate-800 truncate max-w-[170px]" title={user.email}>
                        {user.email}
                      </span>
                    </div>

                    {user.phone && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-400 font-medium flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> Phone:
                        </span>
                        <span className="font-medium text-slate-800">
                          {user.phone}
                        </span>
                      </div>
                    )}

                    {/* Login PIN */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-slate-400" /> Login PIN:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {isPinShown ? (user.pin || '1234') : '••••'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePinVisibility(user.id);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                          title={isPinShown ? 'Hide PIN' : 'Reveal PIN'}
                        >
                          {isPinShown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Active Workload */}
                    {(user.role === 'TECHNICIAN' || user.role === 'SERVICE_ADVISOR') && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-slate-400 font-medium">Active RO Workload:</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                          assignedROs.length > 0 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-slate-50 text-slate-500'
                        }`}>
                          {assignedROs.length} Open Ticket{assignedROs.length === 1 ? '' : 's'}
                        </span>
                      </div>
                    )}

                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 group-hover:text-blue-600 transition-colors">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    Auto-saves
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(user);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white group-hover:border-blue-300 group-hover:bg-blue-50 text-slate-700 group-hover:text-blue-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Edit Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setUserToDelete(user);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold transition-colors cursor-pointer"
                      title="Remove employee from shop"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Remove</span>
                    </button>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Employee Modal */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                  {editingUserId ? <Edit3 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingUserId ? 'Edit Employee Profile' : 'Add New Shop Employee'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {editingUserId 
                      ? 'Edits auto-save immediately to shop storage as you make changes.' 
                      : 'Fill in details below to create a new team member.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {editingUserId && (
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{autoSaveStatus === 'saving' ? 'Saving...' : 'Auto-Saved'}</span>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveUser} className="p-6 space-y-4 overflow-y-auto">
              
              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={nameInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNameInput(val);
                    if (editingUserId && val.trim()) {
                      triggerAutoSave({ name: val.trim() });
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Email / Username */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Dealership Email / Login Username *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. j.doe@precisionauto.com"
                  value={emailInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEmailInput(val);
                    if (editingUserId && val.trim()) {
                      triggerAutoSave({ email: val.trim().toLowerCase() });
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Job Role Category */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Job Role & Category *
                </label>
                <select
                  value={roleInput}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    setRoleInput(newRole);
                    const defaultTitle = (
                      newRole === 'SERVICE_MANAGER' ? 'Service Manager' :
                      newRole === 'SERVICE_ADVISOR' ? 'Service Advisor' :
                      newRole === 'PARTS_SPECIALIST' ? 'Parts Specialist' : 'Automotive Technician'
                    );
                    const newTitle = titleInput || defaultTitle;
                    setTitleInput(newTitle);
                    if (editingUserId) {
                      triggerAutoSave({ role: newRole, title: newTitle });
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="SERVICE_MANAGER">Service Manager (Admin / Full Shop Oversight)</option>
                  <option value="SERVICE_ADVISOR">Service Advisor (Customer Facing / Estimates & Authorizations)</option>
                  <option value="TECHNICIAN">Technician (Bay Diagnoses, Parts Orders & Assembly)</option>
                  <option value="PARTS_SPECIALIST">Parts Specialist (Inventory, Orders & Courier Tracking)</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Position / Job Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Master Diagnostic Technician, Senior Advisor"
                  value={titleInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTitleInput(val);
                    if (editingUserId) {
                      triggerAutoSave({ title: val.trim() });
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Technician Bay (Conditional) */}
              {roleInput === 'TECHNICIAN' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Bay Assignment / Specialty
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bay 2 - Undercar, Bay 4 - Diagnostics"
                    value={bayInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBayInput(val);
                      if (editingUserId) {
                        triggerAutoSave({ bayNumber: val.trim() || undefined });
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Shows in technician dispatch lists and shop bay matrix.
                  </p>
                </div>
              )}

              {/* Avatar Preset Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Profile Photo
                </label>
                <div className="flex items-center gap-3">
                  <img 
                    src={avatarInput || getRoleDefaultAvatar(roleInput)} 
                    alt="Preview" 
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-blue-500 shrink-0 shadow-xs" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5">
                      {[
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
                        'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
                      ].map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setAvatarInput(url);
                            if (editingUserId) triggerAutoSave({ avatar: url });
                          }}
                          className={`w-9 h-9 rounded-lg overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                            avatarInput === url 
                              ? 'border-blue-600 ring-2 ring-blue-400/40 scale-105' 
                              : 'border-slate-200 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={url} alt={`Option ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-400">Click a photo above to instantly update profile picture.</p>
                  </div>
                </div>
              </div>

              {/* Password & Login PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Account Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      <span>{showPassword ? 'Hide' : 'Show'}</span>
                    </button>
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter employee password"
                    value={passwordInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPasswordInput(val);
                      if (editingUserId) {
                        triggerAutoSave({ password: val.trim() || '1234' });
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Used for individual login.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Quick PIN Code (4-digits) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    placeholder="1234"
                    value={pinInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPinInput(val);
                      if (editingUserId) {
                        triggerAutoSave({ pin: val.trim() || '1234' });
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Used for quick kiosk & bay switching.</p>
                </div>
              </div>

              {/* Direct Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Direct Phone (Optional)
                </label>
                <input
                  type="text"
                  placeholder="(555) 302-8811"
                  value={phoneInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPhoneInput(val);
                    if (editingUserId) {
                      triggerAutoSave({ phone: val.trim() || undefined });
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 shrink-0">
                {editingUserId ? (
                  <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>All changes auto-saved</span>
                  </span>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddEditModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  >
                    {editingUserId ? 'Close' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    {editingUserId ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Done (Auto-Saved)</span>
                      </>
                    ) : (
                      <span>Create Employee</span>
                    )}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete / Remove Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-red-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Remove {userToDelete.name}?
            </h3>
            
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Are you sure you want to remove <strong>{userToDelete.name}</strong> ({getRoleLabel(userToDelete.role)}) from the employee roster?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mt-3 text-xs text-amber-900">
              <span className="font-bold">Workload safeguard: </span>
              Any active repair orders currently assigned to {userToDelete.name} will be automatically moved to the dispatch queue so repair progress and customer data are preserved.
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemove}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Yes, Remove Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Sample Data Confirmation Modal */}
      {isClearDataConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900">
              Start Clean with Zero Sample Orders?
            </h3>
            
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              This will clear out all 8 sample demo repair orders, test parts deliveries, and sample chat messages.
            </p>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mt-3 text-xs text-blue-900">
              <span className="font-bold">Your employee roster remains intact. </span>
              You can immediately start creating real repair orders for your actual customers and shop operations. You can also restore sample data anytime using the "Restore Demo" button.
            </div>

            <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsClearDataConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearAllRepairOrders();
                  setIsClearDataConfirmOpen(false);
                  showFeedback('All demo repair orders cleared. Clean shop slate ready!');
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                Clear All & Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
