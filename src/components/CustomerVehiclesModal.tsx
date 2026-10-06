import React, { useState } from 'react';
import { 
  Car, 
  X, 
  Plus, 
  Check, 
  Copy, 
  ExternalLink, 
  Wrench, 
  FileText, 
  User, 
  Save, 
  ShieldCheck,
  ChevronRight,
  Hash
} from 'lucide-react';
import { Customer, Vehicle } from '../types';
import { useApp } from '../context/AppContext';

interface CustomerVehiclesModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSelectVehicle?: (vehicle: Vehicle) => void;
  selectedVin?: string;
  title?: string;
}

export const CustomerVehiclesModal: React.FC<CustomerVehiclesModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSelectVehicle,
  selectedVin,
  title = 'Customer Registered Vehicles'
}) => {
  const { saveCustomer, repairOrders, setSelectedRO } = useApp();
  const [copiedVin, setCopiedVin] = useState<string | null>(null);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);

  // New Vehicle form state
  const [newYear, setNewYear] = useState('');
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newVin, setNewVin] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newMileage, setNewMileage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !customer) return null;

  const vehicles = customer.vehicles || [];

  const handleCopyVin = (vinStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(vinStr);
    setCopiedVin(vinStr);
    setTimeout(() => setCopiedVin(null), 2000);
  };

  const handleSaveNewVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMake.trim() || !newModel.trim()) return;

    setIsSaving(true);
    const addedVehicle: Vehicle = {
      year: newYear ? parseInt(newYear) : new Date().getFullYear(),
      make: newMake.trim(),
      model: newModel.trim(),
      vin: newVin.trim().toUpperCase() || `VIN${Date.now().toString().slice(-6)}`,
      licensePlate: newPlate.trim().toUpperCase() || undefined,
      mileage: newMileage ? parseInt(newMileage) : undefined,
    };

    const updatedVehicles = [...vehicles, addedVehicle];
    await saveCustomer({
      ...customer,
      vehicles: updatedVehicles
    });

    setIsSaving(false);
    setIsAddingVehicle(false);
    setNewYear('');
    setNewMake('');
    setNewModel('');
    setNewVin('');
    setNewPlate('');
    setNewMileage('');

    // If callback provided, automatically select newly added vehicle
    if (onSelectVehicle) {
      onSelectVehicle(addedVehicle);
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl border border-slate-300 shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-sm">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">{title}</h3>
                <span className="px-2 py-0.5 bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[10px] font-extrabold rounded-full">
                  {vehicles.length} Vehicle{vehicles.length === 1 ? '' : 's'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Customer: <strong className="text-white">{customer.name}</strong> {customer.phone ? `(${customer.phone})` : ''}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* Quick Action: Add Another Vehicle Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Select or Manage Fleet Vehicles
            </span>
            <button
              type="button"
              onClick={() => setIsAddingVehicle(!isAddingVehicle)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingVehicle ? 'Cancel Adding' : 'Add Another Vehicle'}</span>
            </button>
          </div>

          {/* New Vehicle Form */}
          {isAddingVehicle && (
            <form 
              onSubmit={handleSaveNewVehicle} 
              className="p-4 bg-slate-50 border-2 border-blue-300 rounded-xl space-y-3 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <h4 className="text-xs font-black uppercase text-blue-900 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Add New Vehicle to {customer.name}</span>
                </h4>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-0.5">Year</label>
                  <input
                    type="number"
                    placeholder="2023"
                    value={newYear}
                    onChange={e => setNewYear(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-0.5">Make *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ford, Ram, Chevy"
                    value={newMake}
                    onChange={e => setNewMake(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-0.5">Model *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. F-150, 1500, Tahoe"
                    value={newModel}
                    onChange={e => setNewModel(e.target.value)}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-0.5">VIN</label>
                  <input
                    type="text"
                    placeholder="17-character VIN"
                    value={newVin}
                    onChange={e => setNewVin(e.target.value.toUpperCase())}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono uppercase bg-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-600 block mb-0.5">License Tag</label>
                  <input
                    type="text"
                    placeholder="Tag / Plate #"
                    value={newPlate}
                    onChange={e => setNewPlate(e.target.value.toUpperCase())}
                    className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg uppercase bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddingVehicle(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || !newMake.trim() || !newModel.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving Vehicle...' : 'Save to Customer Profile'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Vehicles List */}
          {vehicles.length === 0 ? (
            <div className="p-8 bg-slate-50 border border-slate-200 rounded-xl text-center">
              <Car className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No vehicles registered on file for {customer.name}.</p>
              <button
                type="button"
                onClick={() => setIsAddingVehicle(true)}
                className="mt-2 text-xs font-bold text-blue-600 hover:underline"
              >
                + Register First Vehicle Now
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {vehicles.map((veh, idx) => {
                const isCurrentSelected = selectedVin && veh.vin && selectedVin.toUpperCase() === veh.vin.toUpperCase();
                
                // Past service history for this vehicle
                const vehROs = repairOrders.filter(ro => 
                  ro.vehicle?.vin && veh.vin && ro.vehicle.vin.toUpperCase() === veh.vin.toUpperCase()
                );

                return (
                  <div
                    key={veh.vin || idx}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      isCurrentSelected
                        ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-300/40 shadow-sm'
                        : 'border-slate-300 bg-white hover:border-slate-400 shadow-2xs'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900">
                            {veh.year} {veh.make} {veh.model}
                          </span>
                          {veh.licensePlate && (
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-300">
                              Tag: {veh.licensePlate}
                            </span>
                          )}
                          {isCurrentSelected && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-600 text-white">
                              Active Selection
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="text-slate-400 font-sans">VIN:</span>
                            <strong className="text-slate-800">{veh.vin || 'N/A'}</strong>
                            {veh.vin && (
                              <button
                                type="button"
                                onClick={(e) => handleCopyVin(veh.vin!, e)}
                                className="p-0.5 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer"
                                title="Copy VIN"
                              >
                                {copiedVin === veh.vin ? (
                                  <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>

                          {veh.mileage && (
                            <span>• Mileage: <strong className="text-slate-800">{Number(veh.mileage).toLocaleString()} mi</strong></span>
                          )}

                          {vehROs.length > 0 && (
                            <span className="text-blue-700 font-semibold">
                              • {vehROs.length} Prior RO Visit{vehROs.length === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        {onSelectVehicle && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectVehicle(veh);
                              onClose();
                            }}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                              isCurrentSelected
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-900 hover:bg-black text-white'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{isCurrentSelected ? 'Selected' : 'Select Vehicle'}</span>
                          </button>
                        )}

                        {vehROs.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              setSelectedRO(vehROs[0]);
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold border border-slate-300 transition-colors flex items-center gap-1"
                            title="View most recent RO for this vehicle"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                            <span>Last RO</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-100 border-t border-slate-200 shrink-0">
          <span className="text-xs text-slate-500">
            {customer.name} has <strong>{vehicles.length}</strong> vehicle{vehicles.length === 1 ? '' : 's'} saved in cloud
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg border border-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
