import React, { useState, useEffect } from 'react';
import { 
  Gauge, 
  X, 
  CheckCircle2, 
  Car, 
  Clock, 
  AlertCircle,
  Wrench
} from 'lucide-react';
import { RepairOrder } from '../types';
import { useApp } from '../context/AppContext';

interface TechTestDriveModalProps {
  ro: RepairOrder | null;
  onClose: () => void;
  onCompleted?: () => void;
}

const QUICK_TEST_DRIVE_NOTES = [
  'Road test verified resolved',
  'No noise or vibration found',
  'Brakes operating normally',
  'Steering & alignment straight',
  'No CEL / Warning lights'
];

export const TechTestDriveModal: React.FC<TechTestDriveModalProps> = ({ ro, onClose, onCompleted }) => {
  const { updateOutMileage, updateROStatus, currentUser } = useApp();

  const [outMilesInput, setOutMilesInput] = useState('');
  const [testDriveNotes, setTestDriveNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (ro) {
      const currentOut = ro.outMileage ?? ro.vehicle.outMileage;
      setOutMilesInput(currentOut !== undefined ? String(currentOut) : '');
      setTestDriveNotes(ro.testDriveNotes || '');
      setErrorMsg(null);
    }
  }, [ro]);

  if (!ro) return null;

  const inMiles = ro.vehicle.mileage ?? 0;
  const parsedOutMiles = outMilesInput.trim() !== '' && !isNaN(Number(outMilesInput)) ? Number(outMilesInput) : undefined;
  const testDriveDistance = parsedOutMiles !== undefined && inMiles > 0 ? (parsedOutMiles - inMiles) : undefined;

  const handleQuickAdd = (addAmount: number) => {
    const base = inMiles > 0 ? inMiles : (parsedOutMiles || 0);
    setOutMilesInput(String(base + addAmount));
    setErrorMsg(null);
  };

  const handleAddNoteChip = (chip: string) => {
    if (!testDriveNotes.includes(chip)) {
      setTestDriveNotes(prev => prev.trim() ? `${prev.trim()}, ${chip}` : chip);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (parsedOutMiles !== undefined && inMiles > 0 && parsedOutMiles < inMiles) {
      setErrorMsg(`Out Miles (${parsedOutMiles}) cannot be less than intake mileage (${inMiles} mi).`);
      return;
    }

    updateOutMileage(ro.id, parsedOutMiles, testDriveNotes.trim() || undefined, true);
    if (onCompleted) onCompleted();
    onClose();
  };

  const handleSkipAndComplete = () => {
    updateROStatus(ro.id, 'REPAIR_COMPLETE', `Repairs completed by technician ${currentUser.name}.`);
    if (onCompleted) onCompleted();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border-2 border-slate-300 w-full max-w-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600/30 border border-blue-400 text-blue-300">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black flex items-center gap-2">
                <span>Test Drive & Out Miles</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 font-mono">
                  #{ro.id}
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Record final odometer after road test to complete repair order
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vehicle & Customer summary strip */}
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700">
          <div className="font-bold">
            {ro.customerName} • <span className="text-slate-900">{ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model}</span>
          </div>
          <div className="font-semibold text-slate-500">
            Advisor: {ro.advisorName}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-900 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Odometer Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* In Miles */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Intake / In Miles
              </span>
              <div className="text-lg font-black text-slate-900">
                {inMiles > 0 ? `${Number(inMiles).toLocaleString()} mi` : 'Not recorded'}
              </div>
              <span className="block text-[10px] text-slate-400 mt-0.5">
                Recorded at vehicle check-in
              </span>
            </div>

            {/* Out Miles Input */}
            <div className="p-3 rounded-xl bg-white border-2 border-blue-600 ring-2 ring-blue-100">
              <div className="flex items-center justify-between mb-1">
                <span className="block text-[10px] font-black text-blue-900 uppercase tracking-wider">
                  Out Miles <span className="text-rose-500">*</span>
                </span>
                {outMilesInput && (
                  <button
                    type="button"
                    onClick={() => setOutMilesInput('')}
                    className="text-[10px] text-slate-400 hover:text-rose-600 font-bold cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={inMiles || 0}
                  autoFocus
                  placeholder={inMiles > 0 ? `e.g. ${inMiles + 3}` : "Out Miles"}
                  value={outMilesInput}
                  onChange={(e) => {
                    setOutMilesInput(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full text-lg font-black text-slate-900 bg-transparent focus:outline-hidden"
                />
                <span className="text-xs font-bold text-slate-500 shrink-0">mi</span>
              </div>
              <span className="block text-[10px] text-slate-500 mt-0.5">
                Odometer after road test
              </span>
            </div>
          </div>

          {/* Quick Increment Chips */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Quick Test Drive Distance (+ Miles from intake):
            </label>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 5, 8, 10].map((addAmount) => (
                <button
                  key={addAmount}
                  type="button"
                  onClick={() => handleQuickAdd(addAmount)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                    parsedOutMiles === (inMiles + addAmount)
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  }`}
                >
                  +{addAmount} mi ({inMiles + addAmount} mi)
                </button>
              ))}
            </div>
          </div>

          {/* Distance calculation banner */}
          {testDriveDistance !== undefined && (
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
              testDriveDistance < 0
                ? 'bg-amber-50 text-amber-900 border-amber-300'
                : 'bg-emerald-50 text-emerald-900 border-emerald-300'
            }`}>
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {testDriveDistance < 0 
                    ? `Warning: Out Miles (${parsedOutMiles}) is less than intake miles (${inMiles})` 
                    : `Test Drive: ${testDriveDistance.toFixed(1)} miles driven`}
                </span>
              </div>
              {testDriveDistance >= 0 && (
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded text-[10px] font-black uppercase">
                  Verified
                </span>
              )}
            </div>
          )}

          {/* Test Drive Observations Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Test Drive Notes / Observations:
            </label>
            <textarea
              rows={2}
              placeholder="Road test findings (e.g. noise gone, shifts smooth, alignment straight)..."
              value={testDriveNotes}
              onChange={(e) => setTestDriveNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-hidden focus:border-blue-500"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {QUICK_TEST_DRIVE_NOTES.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddNoteChip(chip)}
                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                >
                  + {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleSkipAndComplete}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
              title="Mark Repair Complete without logging out miles"
            >
              Skip Out Miles & Complete
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-2 border-2 border-emerald-700 cursor-pointer transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Out Miles & Complete Repair</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
