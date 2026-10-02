import React, { useState, useEffect, useRef } from 'react';
import { 
  Gauge, 
  CheckCircle2, 
  AlertCircle, 
  Car, 
  Check, 
  Clock, 
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { RepairOrder } from '../types';
import { useApp } from '../context/AppContext';
import { normalizeROStatus } from '../data/mockData';

interface TechTestDriveSectionProps {
  ro: RepairOrder;
  isCompact?: boolean;
  onCompleted?: () => void;
}

const QUICK_TEST_DRIVE_NOTES = [
  'Road test verified resolved',
  'No noise or vibration found',
  'Brakes firm & operating normally',
  'Steering & alignment straight',
  'No CEL / Warning lights',
  'Passed post-repair quality check'
];

export const TechTestDriveSection: React.FC<TechTestDriveSectionProps> = ({ ro, isCompact = false, onCompleted }) => {
  const { currentUser, updateOutMileage } = useApp();

  const inMiles = ro.vehicle.mileage ?? 0;
  const initialOut = ro.outMileage ?? ro.vehicle.outMileage;

  const [outMilesInput, setOutMilesInput] = useState<string>(initialOut !== undefined ? String(initialOut) : '');
  const [testDriveNotes, setTestDriveNotes] = useState<string>(ro.testDriveNotes || '');
  const [isSaved, setIsSaved] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!ro.outMileage);

  // Sync if prop updates from outside
  useEffect(() => {
    const currentOut = ro.outMileage ?? ro.vehicle.outMileage;
    if (currentOut !== undefined) {
      setOutMilesInput(String(currentOut));
    }
    if (ro.testDriveNotes) {
      setTestDriveNotes(ro.testDriveNotes);
    }
  }, [ro.outMileage, ro.vehicle.outMileage, ro.testDriveNotes]);

  const parsedOutMiles = outMilesInput.trim() !== '' && !isNaN(Number(outMilesInput)) ? Number(outMilesInput) : undefined;
  const testDriveDistance = parsedOutMiles !== undefined && inMiles > 0 ? (parsedOutMiles - inMiles) : undefined;
  const isOutLessThanIn = parsedOutMiles !== undefined && inMiles > 0 && parsedOutMiles < inMiles;
  const isRepairCompleted = normalizeROStatus(ro.status) === 'REPAIR_COMPLETE' || ro.status === 'COMPLETED' || ro.status === 'READY_FOR_PICKUP' || ro.status === 'CLOSED';

  // Apply quick mileage bump (e.g. +2 miles test drive)
  const handleQuickAddMiles = (milesToAdd: number) => {
    const base = inMiles > 0 ? inMiles : (parsedOutMiles || 0);
    const newTotal = base + milesToAdd;
    setOutMilesInput(String(newTotal));
  };

  // Add observation note chip
  const handleAddNoteChip = (chip: string) => {
    if (!testDriveNotes.includes(chip)) {
      setTestDriveNotes(prev => prev.trim() ? `${prev.trim()}, ${chip}` : chip);
    }
  };

  // Save Out Miles and optionally mark repair completed
  const handleSave = (markComplete: boolean) => {
    const success = updateOutMileage(ro.id, parsedOutMiles, testDriveNotes.trim() || undefined, markComplete);
    if (success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
      if (markComplete && onCompleted) {
        onCompleted();
      }
    }
  };

  return (
    <div className="bg-white rounded-xl border-2 border-slate-300 overflow-hidden shadow-2xs">
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-3 bg-gradient-to-r from-slate-50 to-emerald-50/50 border-b border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100/90 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`p-1.5 rounded-lg border ${
            ro.outMileage !== undefined 
              ? 'bg-emerald-100 text-emerald-700 border-emerald-300' 
              : 'bg-indigo-100 text-indigo-700 border-indigo-300'
          }`}>
            <Gauge className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Test Drive & Out Miles
              </span>

              {ro.outMileage !== undefined ? (
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border-2 border-emerald-400 flex items-center gap-1 shadow-2xs">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> 
                  Out Miles: {Number(ro.outMileage).toLocaleString()} mi
                  {ro.vehicle.mileage ? ` (+${Math.max(0, Number(ro.outMileage) - ro.vehicle.mileage).toFixed(1)} mi drive)` : ''}
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" /> Pending Test Drive Entry
                </span>
              )}

              {isRepairCompleted && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-300">
                  Repair Completed
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300 flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> Saved!
            </span>
          )}
          <button
            type="button"
            className="text-slate-500 hover:text-slate-800 p-1 rounded-md"
            title={isExpanded ? "Collapse" : "Expand"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Body Content */}
      {isExpanded && (
        <div className="p-3.5 space-y-3.5 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
            
            {/* Left Column: Mileage Counters */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-300 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-600 tracking-wider">
                  Odometer Tracking
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">
                  Required at vehicle completion
                </span>
              </div>

              {/* In vs Out Counter Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Intake / In Miles (Readonly) */}
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                    1. In Miles (Intake)
                  </label>
                  <div className="text-sm font-black text-slate-800">
                    {inMiles > 0 ? `${Number(inMiles).toLocaleString()} mi` : 'Not recorded'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Recorded at RO check-in
                  </div>
                </div>

                {/* Out Miles (Editable Input) */}
                <div className={`p-2.5 rounded-lg border-2 bg-white ${
                  isOutLessThanIn 
                    ? 'border-amber-400 ring-2 ring-amber-100' 
                    : parsedOutMiles !== undefined 
                    ? 'border-emerald-500 ring-2 ring-emerald-50' 
                    : 'border-blue-400 ring-2 ring-blue-50'
                }`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="block text-[10px] font-black text-slate-900 uppercase tracking-wider">
                      2. Out Miles <span className="text-rose-500">*</span>
                    </label>
                    {outMilesInput && (
                      <button
                        type="button"
                        onClick={() => setOutMilesInput('')}
                        className="text-[10px] text-slate-400 hover:text-rose-600 font-bold cursor-pointer"
                        title="Clear Out Miles"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={inMiles || 0}
                      placeholder={inMiles > 0 ? `e.g. ${inMiles + 3}` : "Out Miles"}
                      value={outMilesInput}
                      onChange={(e) => setOutMilesInput(e.target.value)}
                      className="w-full text-sm font-black text-slate-900 bg-transparent focus:outline-hidden"
                    />
                    <span className="text-xs font-bold text-slate-500 shrink-0">mi</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Post-test drive odometer
                  </div>
                </div>
              </div>

              {/* Quick Distance Add Buttons */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Quick Test Drive Auto-Fill (+ Miles from In Miles):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[1, 2, 3, 5, 8, 10].map((addAmount) => {
                    const previewValue = inMiles + addAmount;
                    const isSelected = parsedOutMiles === previewValue;
                    return (
                      <button
                        key={addAmount}
                        type="button"
                        onClick={() => handleQuickAddMiles(addAmount)}
                        className={`px-2.5 py-1 rounded-md text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-300'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100 hover:border-slate-400'
                        }`}
                        title={`Set Out Miles to ${inMiles} + ${addAmount} = ${previewValue} mi`}
                      >
                        +{addAmount} mi
                      </button>
                    );
                  })}
                  {inMiles > 0 && (
                    <button
                      type="button"
                      onClick={() => setOutMilesInput(String(inMiles))}
                      className="px-2.5 py-1 rounded-md text-xs font-bold bg-white text-slate-600 border border-slate-300 hover:bg-slate-100 cursor-pointer"
                      title="Set Out Miles same as In Miles (0 mi driven)"
                    >
                      Same (0 mi)
                    </button>
                  )}
                </div>
              </div>

              {/* Calculated Distance Result */}
              {testDriveDistance !== undefined && (
                <div className={`p-2.5 rounded-lg border flex items-center justify-between text-xs font-bold ${
                  testDriveDistance < 0
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-emerald-50 text-emerald-900 border-emerald-300'
                }`}>
                  <div className="flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      {testDriveDistance < 0 
                        ? `Warning: Out Miles (${parsedOutMiles}) is less than Intake Miles (${inMiles})` 
                        : `Test Drive Distance: ${testDriveDistance.toFixed(1)} miles driven`}
                    </span>
                  </div>
                  {testDriveDistance >= 0 && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded">
                      Verified
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Road Test Observations & Action Buttons */}
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-black uppercase text-slate-700 tracking-wider mb-1">
                  Test Drive Notes / Observations:
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes from road test (e.g. noise resolved, shifts smooth, brakes firm, alignment straight)..."
                  value={testDriveNotes}
                  onChange={(e) => setTestDriveNotes(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden focus:border-blue-500 bg-white"
                />
              </div>

              {/* Quick Observation Chips */}
              <div>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Quick Observations:
                </span>
                <div className="flex flex-wrap gap-1">
                  {QUICK_TEST_DRIVE_NOTES.map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddNoteChip(chip)}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons: Complete Repair vs Save Out Miles Only */}
              <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={parsedOutMiles === undefined && !testDriveNotes.trim()}
                  className="px-3.5 py-2 rounded-lg text-xs font-bold border-2 border-blue-600 bg-white hover:bg-blue-50 text-blue-700 disabled:opacity-50 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                  title="Save Out Miles without marking repair completed"
                >
                  <Gauge className="w-3.5 h-3.5 text-blue-600" />
                  <span>Save Out Miles</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  className={`px-4 py-2 rounded-lg text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-2 border-2 ${
                    isRepairCompleted
                      ? 'bg-teal-700 hover:bg-teal-800 text-white border-teal-800'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 active:scale-98'
                  }`}
                  title="Save Out Miles, finish road test, and mark RO as Repair Complete"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>
                    {isRepairCompleted ? 'Update Out Miles & Keep Complete' : 'Finish Test Drive & Complete Repair'}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
