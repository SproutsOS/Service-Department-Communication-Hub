import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Customer, VehicleInfo, RepairOrder } from '../types';
import { 
  Users, 
  Search, 
  Plus, 
  X, 
  Phone, 
  Mail, 
  MapPin, 
  Car, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Edit3, 
  Trash2, 
  ChevronRight, 
  Sparkles, 
  Cloud, 
  ArrowUpRight,
  Save,
  AlertCircle
} from 'lucide-react';

export const CustomerDirectoryModal: React.FC = () => {
  const { 
    customers, 
    saveCustomer, 
    deleteCustomer, 
    repairOrders, 
    setSelectedRO, 
    setIsNewROModalOpen,
    isCustomerDirectoryOpen, 
    setIsCustomerDirectoryOpen,
    setPrefilledCustomerForNewRO,
    isCloudSynced
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'TAX_EXEMPT' | 'MULTI_VEHICLE'>('ALL');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // New Customer Form State
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newIsTaxExempt, setNewIsTaxExempt] = useState(false);
  const [newTaxExemptNumber, setNewTaxExemptNumber] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newVehicleYear, setNewVehicleYear] = useState('');
  const [newVehicleMake, setNewVehicleMake] = useState('');
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [newVehicleVin, setNewVehicleVin] = useState('');
  const [newVehicleMileage, setNewVehicleMileage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Edit Customer State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editIsTaxExempt, setEditIsTaxExempt] = useState(false);
  const [editTaxExemptNumber, setEditTaxExemptNumber] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Add Vehicle to Existing Customer State
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);
  const [addVehYear, setAddVehYear] = useState('');
  const [addVehMake, setAddVehMake] = useState('');
  const [addVehModel, setAddVehModel] = useState('');
  const [addVehVin, setAddVehVin] = useState('');
  const [addVehMileage, setAddVehMileage] = useState('');

  // Filtered customers list
  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const queryDigits = query.replace(/\D/g, '');

    return customers.filter(cust => {
      // Search filter
      if (query) {
        const matchesName = cust.name?.toLowerCase().includes(query);
        const matchesPhone = cust.phone?.toLowerCase().includes(query) || 
          (queryDigits && cust.phone?.replace(/\D/g, '').includes(queryDigits));
        const matchesEmail = cust.email?.toLowerCase().includes(query);
        const matchesAddress = cust.address?.toLowerCase().includes(query);
        const matchesVehicles = cust.vehicles?.some(v => 
          v.vin?.toLowerCase().includes(query) ||
          v.make?.toLowerCase().includes(query) ||
          v.model?.toLowerCase().includes(query) ||
          String(v.year).includes(query)
        );

        if (!matchesName && !matchesPhone && !matchesEmail && !matchesAddress && !matchesVehicles) {
          return false;
        }
      }

      // Filter chips
      if (filterType === 'TAX_EXEMPT' && !cust.isTaxExempt) {
        return false;
      }
      if (filterType === 'MULTI_VEHICLE' && (!cust.vehicles || cust.vehicles.length < 2)) {
        return false;
      }

      return true;
    });
  }, [customers, searchQuery, filterType]);

  // Selected customer object
  const activeCustomer = useMemo(() => {
    if (selectedCustomerId) {
      const found = customers.find(c => c.id === selectedCustomerId);
      if (found) return found;
    }
    return filteredCustomers[0] || null;
  }, [customers, selectedCustomerId, filteredCustomers]);

  // Sync edit fields when active customer changes
  React.useEffect(() => {
    if (activeCustomer) {
      setEditName(activeCustomer.name || '');
      setEditPhone(activeCustomer.phone || '');
      setEditEmail(activeCustomer.email || '');
      setEditAddress(activeCustomer.address || '');
      setEditIsTaxExempt(!!activeCustomer.isTaxExempt);
      setEditTaxExemptNumber(activeCustomer.taxExemptNumber || '');
      setEditNotes(activeCustomer.notes || '');
      setIsEditing(false);
      setIsAddingVehicle(false);
    }
  }, [activeCustomer?.id]);

  // Find all service repair orders for active customer
  const customerROs = useMemo(() => {
    if (!activeCustomer) return [];
    const custPhoneDigits = activeCustomer.phone?.replace(/\D/g, '') || '';
    const custNameLower = activeCustomer.name?.trim().toLowerCase() || '';

    return repairOrders.filter(ro => {
      const roPhoneDigits = ro.customerPhone?.replace(/\D/g, '') || '';
      const roNameLower = ro.customerName?.trim().toLowerCase() || '';

      if (custPhoneDigits && roPhoneDigits && custPhoneDigits === roPhoneDigits) {
        return true;
      }
      if (custNameLower && roNameLower && custNameLower === roNameLower) {
        return true;
      }
      return false;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activeCustomer, repairOrders]);

  if (!isCustomerDirectoryOpen) return null;

  // Save new customer to Cloud Firestore
  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setIsSaving(true);
    const now = new Date().toISOString();
    const initialVehicles: VehicleInfo[] = [];

    if (newVehicleMake.trim() || newVehicleModel.trim() || newVehicleVin.trim()) {
      initialVehicles.push({
        year: parseInt(String(newVehicleYear), 10) || new Date().getFullYear(),
        make: newVehicleMake.trim(),
        model: newVehicleModel.trim(),
        vin: newVehicleVin.trim().toUpperCase(),
        mileage: newVehicleMileage ? parseInt(String(newVehicleMileage), 10) : undefined,
      });
    }

    const newCust: Customer = {
      id: `cust_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      name: newName.trim(),
      phone: newPhone.trim(),
      email: newEmail.trim().toLowerCase(),
      address: newAddress.trim(),
      isTaxExempt: newIsTaxExempt,
      taxExemptNumber: newTaxExemptNumber.trim(),
      notes: newNotes.trim(),
      vehicles: initialVehicles,
      lastVisit: now,
      totalVisits: 0,
      createdAt: now,
      updatedAt: now,
    };

    const success = await saveCustomer(newCust);
    setIsSaving(false);
    if (success) {
      setSelectedCustomerId(newCust.id);
      setIsAddingNew(false);
      // Reset form
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewAddress('');
      setNewIsTaxExempt(false);
      setNewTaxExemptNumber('');
      setNewNotes('');
      setNewVehicleYear('');
      setNewVehicleMake('');
      setNewVehicleModel('');
      setNewVehicleVin('');
      setNewVehicleMileage('');
      setStatusMessage('Customer saved to Google Cloud Firestore successfully!');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // Save existing customer edits
  const handleSaveCustomerEdits = async () => {
    if (!activeCustomer || !editName.trim()) return;
    setIsSaving(true);

    const updated: Customer = {
      ...activeCustomer,
      name: editName.trim(),
      phone: editPhone.trim(),
      email: editEmail.trim().toLowerCase(),
      address: editAddress.trim(),
      isTaxExempt: editIsTaxExempt,
      taxExemptNumber: editTaxExemptNumber.trim(),
      notes: editNotes.trim(),
      updatedAt: new Date().toISOString(),
    };

    await saveCustomer(updated);
    setIsSaving(false);
    setIsEditing(false);
    setStatusMessage('Customer changes synced to Cloud Firestore.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Add vehicle to active customer
  const handleAddVehicleToCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;

    const newVehicle: VehicleInfo = {
      year: parseInt(String(addVehYear), 10) || new Date().getFullYear(),
      make: addVehMake.trim(),
      model: addVehModel.trim(),
      vin: addVehVin.trim().toUpperCase(),
      mileage: addVehMileage ? parseInt(String(addVehMileage), 10) : undefined,
    };

    const existingVehicles = activeCustomer.vehicles || [];
    const updatedVehicles = [...existingVehicles, newVehicle];

    const updatedCust: Customer = {
      ...activeCustomer,
      vehicles: updatedVehicles,
      updatedAt: new Date().toISOString(),
    };

    await saveCustomer(updatedCust);
    setIsAddingVehicle(false);
    setAddVehYear('');
    setAddVehMake('');
    setAddVehModel('');
    setAddVehVin('');
    setAddVehMileage('');
    setStatusMessage('Vehicle added to customer profile in Cloud Firestore.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Launch New RO with pre-filled customer & vehicle
  const handleStartROForCustomer = (vehicle?: VehicleInfo) => {
    if (!activeCustomer) return;
    const targetCustomer: Customer = {
      ...activeCustomer,
      vehicles: vehicle ? [vehicle, ...activeCustomer.vehicles.filter(v => v.vin !== vehicle.vin)] : activeCustomer.vehicles
    };
    setPrefilledCustomerForNewRO(targetCustomer);
    setIsCustomerDirectoryOpen(false);
    setIsNewROModalOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        id="customer-cloud-directory-modal"
        className="bg-white w-full max-w-6xl h-[92vh] max-h-[850px] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden text-slate-900"
      >
        {/* Modal Top Bar */}
        <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between border-b border-slate-800 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight">Customer Cloud Directory</h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2.5 py-0.5 rounded-full">
                  <Cloud className="w-3 h-3 text-emerald-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>{isCloudSynced ? 'Firestore Cloud Active' : 'Connecting Cloud...'}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Persistent customer contact information, tax exemptions, registered vehicles & visit history
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              id="customer-directory-add-new-btn"
              type="button"
              onClick={() => {
                setIsAddingNew(true);
                setIsEditing(false);
              }}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Customer</span>
            </button>
            <button
              id="customer-directory-close-btn"
              type="button"
              onClick={() => setIsCustomerDirectoryOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Directory"
              aria-label="Close Customer Directory"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {statusMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shrink-0 animate-in slide-in-from-top duration-200">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {statusMessage}
            </span>
            <button 
              type="button" 
              onClick={() => setStatusMessage(null)}
              className="text-white hover:text-emerald-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main Content Area: Left Directory List, Right Details Pane */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-100/60">
          
          {/* Left Column: Search & Customer List */}
          <div className="w-full md:w-[380px] lg:w-[410px] bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
            
            {/* Search & Filter Header */}
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search name, phone, VIN, vehicle..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-slate-900 placeholder:text-slate-400 shadow-2xs font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto pb-0.5">
                <button
                  type="button"
                  onClick={() => setFilterType('ALL')}
                  className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap ${
                    filterType === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-300'
                  }`}
                >
                  All ({customers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('TAX_EXEMPT')}
                  className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    filterType === 'TAX_EXEMPT'
                      ? 'bg-emerald-700 text-white'
                      : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-emerald-300'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  <span>Tax Exempt ({customers.filter(c => c.isTaxExempt).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType('MULTI_VEHICLE')}
                  className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                    filterType === 'MULTI_VEHICLE'
                      ? 'bg-blue-700 text-white'
                      : 'bg-white text-blue-800 hover:bg-blue-50 border border-blue-300'
                  }`}
                >
                  <Car className="w-3 h-3" />
                  <span>Multi-Vehicle ({customers.filter(c => (c.vehicles?.length || 0) >= 2).length})</span>
                </button>
              </div>
            </div>

            {/* Customers List Container */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">No Customers Found</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {searchQuery ? 'Try a different search term or clear the filter.' : 'Click "Add Customer" to save your first customer profile to the cloud.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(true)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New Customer
                  </button>
                </div>
              ) : (
                filteredCustomers.map(cust => {
                  const isSelected = activeCustomer?.id === cust.id;
                  const totalVehicles = cust.vehicles?.length || 0;
                  const firstVehicle = cust.vehicles?.[0];

                  return (
                    <div
                      key={cust.id}
                      onClick={() => {
                        setSelectedCustomerId(cust.id);
                        setIsAddingNew(false);
                      }}
                      className={`p-3.5 text-left cursor-pointer transition-all border-l-4 ${
                        isSelected 
                          ? 'bg-blue-50/70 border-blue-600 shadow-2xs' 
                          : 'bg-white hover:bg-slate-50 border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate flex items-center gap-1.5">
                            <span>{cust.name}</span>
                            {cust.isTaxExempt && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300 uppercase shrink-0">
                                0% Tax Exempt
                              </span>
                            )}
                          </h4>
                          
                          <p className="text-xs text-slate-600 flex items-center gap-1.5 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-mono text-[11px]">{cust.phone || 'No phone'}</span>
                          </p>

                          {firstVehicle && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                              <Car className="w-3 h-3 text-blue-600 shrink-0" />
                              <span className="truncate">
                                {firstVehicle.year} {firstVehicle.make} {firstVehicle.model}
                              </span>
                              {totalVehicles > 1 && (
                                <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-1 rounded-full shrink-0">
                                  +{totalVehicles - 1}
                                </span>
                              )}
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                            {cust.totalVisits || 0} Visit{(cust.totalVisits || 0) === 1 ? '' : 's'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Customer Details or Add New Form */}
          <div className="flex-1 bg-white overflow-y-auto flex flex-col p-4 sm:p-6">
            
            {/* Add New Customer Form View */}
            {isAddingNew ? (
              <form onSubmit={handleCreateCustomer} className="max-w-2xl mx-auto w-full space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Plus className="w-5 h-5 text-blue-600" />
                      <span>Register New Customer in Cloud</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Stores profile and vehicle info to Google Cloud Firestore for immediate and future visits
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 px-2.5 py-1 rounded bg-slate-100 border border-slate-300"
                  >
                    Cancel
                  </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Contact Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">Customer Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John Doe / Acme Fleet"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="e.g. 662-555-0199"
                        value={newPhone}
                        onChange={e => setNewPhone(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. john@example.com"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">Physical Address / City</label>
                      <input
                        type="text"
                        placeholder="e.g. 100 Main St, Tupelo MS"
                        value={newAddress}
                        onChange={e => setNewAddress(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Tax Exemption Control */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                      <input
                        type="checkbox"
                        checked={newIsTaxExempt}
                        onChange={e => setNewIsTaxExempt(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      <span className="flex items-center gap-1.5 text-emerald-800">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Customer is Tax Exempt (0% Sales Tax)</span>
                      </span>
                    </label>

                    {newIsTaxExempt && (
                      <input
                        type="text"
                        placeholder="Exemption Certificate / Permit #"
                        value={newTaxExemptNumber}
                        onChange={e => setNewTaxExemptNumber(e.target.value)}
                        className="text-xs px-3 py-1.5 border border-emerald-400 bg-emerald-50 text-slate-900 rounded-lg focus:ring-2 focus:ring-emerald-500 w-64"
                      />
                    )}
                  </div>
                </div>

                {/* Initial Vehicle (Optional) */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-blue-600" />
                      <span>Registered Vehicle (Optional)</span>
                    </h4>
                    <span className="text-[11px] text-slate-500">Can add more vehicles anytime</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">Year</label>
                      <input
                        type="number"
                        placeholder="2022"
                        value={newVehicleYear}
                        onChange={e => setNewVehicleYear(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">Make</label>
                      <input
                        type="text"
                        placeholder="Jeep"
                        value={newVehicleMake}
                        onChange={e => setNewVehicleMake(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">Model</label>
                      <input
                        type="text"
                        placeholder="Grand Cherokee"
                        value={newVehicleModel}
                        onChange={e => setNewVehicleModel(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">Mileage</label>
                      <input
                        type="number"
                        placeholder="45000"
                        value={newVehicleMileage}
                        onChange={e => setNewVehicleMileage(e.target.value)}
                        className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">VIN (Vehicle Identification Number)</label>
                    <input
                      type="text"
                      placeholder="17-character VIN"
                      value={newVehicleVin}
                      onChange={e => setNewVehicleVin(e.target.value.toUpperCase())}
                      className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-mono bg-white uppercase"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">Customer Preferences & Notes</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Prefers text updates, fleet account, authorized drivers..."
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving || !newName.trim()}
                    className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving to Cloud...' : 'Save to Cloud Database'}</span>
                  </button>
                </div>
              </form>
            ) : activeCustomer ? (
              /* Customer Details Pane */
              <div className="space-y-6">
                
                {/* Profile Header Card */}
                <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                          {activeCustomer.name}
                        </h3>
                        {activeCustomer.isTaxExempt && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-300">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Tax Exempt Customer (0% Sales Tax)</span>
                          </span>
                        )}
                        <span className="text-xs font-semibold text-slate-500 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
                          {activeCustomer.totalVisits || 0} Total Service Visit{(activeCustomer.totalVisits || 0) === 1 ? '' : 's'}
                        </span>
                      </div>

                      {/* Contact metadata */}
                      <div className="flex items-center gap-4 text-xs text-slate-600 mt-2 flex-wrap">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Phone className="w-3.5 h-3.5 text-blue-600" />
                          <span className="font-mono text-slate-900">{activeCustomer.phone || 'No phone on file'}</span>
                        </span>
                        {activeCustomer.email && (
                          <span className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-blue-600" />
                            <span>{activeCustomer.email}</span>
                          </span>
                        )}
                        {activeCustomer.address && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                            <span>{activeCustomer.address}</span>
                          </span>
                        )}
                      </div>

                      {activeCustomer.taxExemptNumber && (
                        <p className="text-[11px] font-mono text-emerald-800 mt-1.5 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                          Certificate / Permit #: {activeCustomer.taxExemptNumber}
                        </p>
                      )}
                    </div>

                    {/* Quick Top Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartROForCustomer()}
                        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
                        title="Start a new Repair Order with this customer pre-filled"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Start New RO</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsEditing(!isEditing)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 px-3 py-2 rounded-xl border border-slate-300 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isEditing ? 'Close Edit' : 'Edit Profile'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Are you sure you want to remove ${activeCustomer.name} from the customer directory?`)) {
                            deleteCustomer(activeCustomer.id);
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Delete customer profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Customer Notes */}
                  {activeCustomer.notes && !isEditing && (
                    <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-800">Account Notes: </span>
                      <span>{activeCustomer.notes}</span>
                    </div>
                  )}

                  {/* Edit Form Drawer */}
                  {isEditing && (
                    <div className="mt-4 pt-4 border-t border-slate-200 space-y-3 animate-in fade-in duration-150">
                      <h4 className="text-xs font-bold text-slate-900 uppercase">Update Customer Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">Customer Full Name</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">Phone Number</label>
                          <input
                            type="tel"
                            value={editPhone}
                            onChange={e => setEditPhone(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">Email</label>
                          <input
                            type="email"
                            value={editEmail}
                            onChange={e => setEditEmail(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">Physical Address</label>
                          <input
                            type="text"
                            value={editAddress}
                            onChange={e => setEditAddress(e.target.value)}
                            className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                      </div>

                      {/* Tax Exempt toggle */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-200">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                          <input
                            type="checkbox"
                            checked={editIsTaxExempt}
                            onChange={e => setEditIsTaxExempt(e.target.checked)}
                            className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                          />
                          <span className="text-emerald-800">Tax Exempt Customer (0% Sales Tax)</span>
                        </label>

                        {editIsTaxExempt && (
                          <input
                            type="text"
                            placeholder="Permit / Certificate #"
                            value={editTaxExemptNumber}
                            onChange={e => setEditTaxExemptNumber(e.target.value)}
                            className="text-xs px-3 py-1 border border-emerald-400 bg-emerald-50 text-slate-900 rounded-lg w-56"
                          />
                        )}
                      </div>

                      <div>
                        <label className="text-[11px] font-bold uppercase text-slate-700 block mb-1">Notes</label>
                        <textarea
                          rows={2}
                          value={editNotes}
                          onChange={e => setEditNotes(e.target.value)}
                          className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveCustomerEdits}
                          disabled={isSaving || !editName.trim()}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isSaving ? 'Syncing...' : 'Save Changes'}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Registered Vehicles Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Car className="w-4 h-4 text-blue-600" />
                      <span>Registered Customer Vehicles ({activeCustomer.vehicles?.length || 0})</span>
                    </h4>
                    <button
                      type="button"
                      onClick={() => setIsAddingVehicle(!isAddingVehicle)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Vehicle</span>
                    </button>
                  </div>

                  {/* Add Vehicle Form */}
                  {isAddingVehicle && (
                    <form onSubmit={handleAddVehicleToCustomer} className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 space-y-2.5">
                      <div className="text-xs font-bold text-blue-900">Add Vehicle to {activeCustomer.name}'s Fleet</div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-700 block mb-0.5">Year</label>
                          <input
                            type="number"
                            required
                            placeholder="2022"
                            value={addVehYear}
                            onChange={e => setAddVehYear(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-700 block mb-0.5">Make</label>
                          <input
                            type="text"
                            required
                            placeholder="Ram"
                            value={addVehMake}
                            onChange={e => setAddVehMake(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-700 block mb-0.5">Model</label>
                          <input
                            type="text"
                            required
                            placeholder="1500"
                            value={addVehModel}
                            onChange={e => setAddVehModel(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase text-slate-700 block mb-0.5">Mileage</label>
                          <input
                            type="number"
                            placeholder="32000"
                            value={addVehMileage}
                            onChange={e => setAddVehMileage(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-700 block mb-0.5">VIN</label>
                        <input
                          type="text"
                          required
                          placeholder="17-character VIN"
                          value={addVehVin}
                          onChange={e => setAddVehVin(e.target.value.toUpperCase())}
                          className="w-full text-xs px-3 py-1.5 border border-slate-300 rounded-lg font-mono uppercase bg-white"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsAddingVehicle(false)}
                          className="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-lg"
                        >
                          Save Vehicle
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Vehicles Cards */}
                  {(!activeCustomer.vehicles || activeCustomer.vehicles.length === 0) ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                      No vehicles on file yet. Click "+ Add Vehicle" to add one.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeCustomer.vehicles.map((veh, idx) => (
                        <div 
                          key={veh.vin || idx}
                          className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between hover:border-blue-300 hover:bg-blue-50/30 transition-all"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs sm:text-sm font-bold text-slate-900">
                                {veh.year} {veh.make} {veh.model}
                              </h5>
                              {veh.mileage && (
                                <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                                  {Number(veh.mileage).toLocaleString()} mi
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-slate-900 font-semibold mt-1">
                              VIN: {veh.vin}
                            </p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-slate-200/80 flex items-center justify-between">
                            <span className="text-[10px] text-slate-500">
                              Vehicle #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleStartROForCustomer(veh)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 bg-white hover:bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors shadow-2xs"
                            >
                              <span>Create RO</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Service History with Dealership */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Repair Order History ({customerROs.length})</span>
                    </h4>
                    <span className="text-[11px] text-slate-500">Tracked across department visits</span>
                  </div>

                  {customerROs.length === 0 ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                      No prior repair orders found for this customer.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
                      {customerROs.map(ro => (
                        <div
                          key={ro.id}
                          onClick={() => {
                            setSelectedRO(ro);
                            setIsCustomerDirectoryOpen(false);
                          }}
                          className="p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                {ro.id}
                              </span>
                              <span className="text-xs font-semibold text-slate-800 truncate">
                                {ro.vehicle?.year} {ro.vehicle?.make} {ro.vehicle?.model}
                              </span>
                              {ro.isTaxExempt && (
                                <span className="text-[9px] font-extrabold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-300 uppercase">
                                  0% Tax
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1 truncate">
                              Concern: {ro.primaryConcern || (ro.concerns && ro.concerns[0]) || 'General Service'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              Advisor: {ro.advisorName} • {new Date(ro.createdAt).toLocaleDateString()}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                              {ro.status.replace(/_/g, ' ')}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="p-12 text-center text-slate-400">
                Select a customer from the left list to view their details or click "+ Add Customer".
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
