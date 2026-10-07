import React, { useState, useEffect } from 'react';
import { Clock, Plus, Trash2, X, Check, Calendar } from 'lucide-react';
import { 
  ArrivalTimeFrameOption, 
  getAllArrivalTimeFrames, 
  saveCustomArrivalTimeFrame, 
  deleteCustomArrivalTimeFrame,
  computeEtaAndStatus
} from '../utils/partArrivalOptions';
import { PartStatus } from '../types';

interface ArrivalTimeFrameDropdownProps {
  value: string; // can be timeFrameId or PartStatus or custom label
  onChange: (result: {
    timeFrameId: string;
    label: string;
    status: PartStatus;
    estimatedArrival: string;
  }) => void;
  className?: string;
  size?: 'sm' | 'md';
  autoFulfillId?: string; // roId or partId if used in inline list
  disabled?: boolean;
}

export const ArrivalTimeFrameDropdown: React.FC<ArrivalTimeFrameDropdownProps> = ({
  value,
  onChange,
  className = '',
  size = 'md',
  disabled = false,
}) => {
  const [options, setOptions] = useState<ArrivalTimeFrameOption[]>([]);
  const [selectedOptionId, setSelectedOptionId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [customTime, setCustomTime] = useState('17:00');
  const [saveToDropdown, setSaveToDropdown] = useState(true);

  // Reload options on mount and when modal opens/closes
  const reloadOptions = () => {
    setOptions(getAllArrivalTimeFrames());
  };

  useEffect(() => {
    reloadOptions();
  }, []);

  // Sync selectedOptionId when value prop changes from outside
  useEffect(() => {
    if (value) {
      const matched = findMatchingOption(value, getAllArrivalTimeFrames());
      if (matched) {
        setSelectedOptionId(matched.id);
      }
    }
  }, [value]);

  // Determine current active selection matching the value
  const findMatchingOption = (val: string, opts: ArrivalTimeFrameOption[]): ArrivalTimeFrameOption | undefined => {
    if (!val || !opts.length) return opts[0];

    // 1. Direct ID match
    const byId = opts.find(opt => opt.id.toLowerCase() === val.toLowerCase());
    if (byId) return byId;

    // 2. Direct Label match
    const byLabel = opts.find(opt => opt.label.toLowerCase() === val.toLowerCase() || opt.shortLabel.toLowerCase() === val.toLowerCase());
    if (byLabel) return byLabel;

    // 3. Status match if val is a PartStatus
    if (val === 'IN_STOCK') return opts.find(o => o.id === 'IN_STOCK');
    if (val === 'LOCAL_PURCHASE') return opts.find(o => o.id === 'LOCAL_PURCHASE');
    if (val === 'VOR_UPGRADE') return opts.find(o => o.id === 'VOR_UPGRADE');
    if (val === 'BACKORDERED') return opts.find(o => o.id === 'BACKORDERED');
    if (val === 'SPECIAL_ORDER_1_5_DAYS') return opts.find(o => o.id === '1_2_DAYS' || o.id === 'TOMORROW_5PM');
    if (val === 'SPECIAL_ORDER') return opts.find(o => o.id === '3_5_DAYS' || o.id === '1_2_WEEKS');

    // 4. ISO Date or Timestamp parsing
    if (!isNaN(Date.parse(val)) && val.includes('-')) {
      const targetDate = new Date(val);
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const targetDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const diffDays = Math.round((targetDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const hours = targetDate.getHours();

      if (diffDays <= 0) {
        if (hours <= 14) return opts.find(o => o.id === 'TODAY_2PM') || opts.find(o => o.id === 'TODAY_5PM');
        return opts.find(o => o.id === 'TODAY_5PM');
      } else if (diffDays === 1) {
        if (hours <= 10) return opts.find(o => o.id === 'TOMORROW_MORNING');
        return opts.find(o => o.id === 'TOMORROW_5PM');
      } else if (diffDays === 2) {
        return opts.find(o => o.id === '1_2_DAYS');
      } else if (diffDays >= 3 && diffDays <= 5) {
        return opts.find(o => o.id === '3_5_DAYS');
      } else if (diffDays > 5) {
        return opts.find(o => o.id === '1_2_WEEKS');
      }
    }

    // 5. Text containment matching
    const lower = val.toLowerCase();
    if (lower.includes('in stock') || lower === 'stock') return opts.find(o => o.id === 'IN_STOCK');
    if (lower.includes('local') || lower.includes('hot shot')) return opts.find(o => o.id === 'LOCAL_PURCHASE');
    if (lower.includes('vor') || lower.includes('overnight') || lower.includes('air')) return opts.find(o => o.id === 'VOR_UPGRADE');
    if (lower.includes('backorder')) return opts.find(o => o.id === 'BACKORDERED');
    if (lower.includes('tomorrow') && (lower.includes('morning') || lower.includes('9') || lower.includes('8') || lower.includes('10'))) return opts.find(o => o.id === 'TOMORROW_MORNING');
    if (lower.includes('tomorrow')) return opts.find(o => o.id === 'TOMORROW_5PM');
    if (lower.includes('1 - 2') || lower.includes('1-2') || lower.includes('1 to 2') || lower.includes('1-2 days')) return opts.find(o => o.id === '1_2_DAYS');
    if (lower.includes('3 - 5') || lower.includes('3-5') || lower.includes('3 to 5') || lower.includes('3-5 days')) return opts.find(o => o.id === '3_5_DAYS');
    if (lower.includes('week') || lower.includes('factory')) return opts.find(o => o.id === '1_2_WEEKS');
    if (lower.includes('2:00') || lower.includes('2pm') || lower.includes('noon') || lower.includes('shuttle')) return opts.find(o => o.id === 'TODAY_2PM');
    if (lower.includes('5:00') || lower.includes('5pm') || lower.includes('today') || lower.includes('daily')) return opts.find(o => o.id === 'TODAY_5PM');

    return opts.find(opt => opt.id === 'DAILY_ORDER' || opt.id === 'TODAY_5PM') || opts[0];
  };

  const matchedOption = (selectedOptionId ? options.find(o => o.id === selectedOptionId) : undefined) ||
    findMatchingOption(value, options) ||
    options.find(opt => opt.id === 'DAILY_ORDER' || opt.id === 'TODAY_5PM') ||
    options[0];

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (selectedId === '__ADD_CUSTOM_TIMEFRAME__') {
      setIsModalOpen(true);
      return;
    }

    setSelectedOptionId(selectedId);

    const opt = options.find(o => o.id === selectedId);
    if (opt) {
      const { estimatedArrival, status } = computeEtaAndStatus(opt.id);
      onChange({
        timeFrameId: opt.id,
        label: opt.label,
        status,
        estimatedArrival,
      });
    }
  };

  const handleAddCustom = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customLabel.trim();
    if (!clean) return;

    let effectiveOpt: ArrivalTimeFrameOption;
    if (saveToDropdown) {
      effectiveOpt = saveCustomArrivalTimeFrame(clean, customTime, customDate);
      reloadOptions();
    } else {
      effectiveOpt = {
        id: `temp_${Date.now()}`,
        label: clean,
        shortLabel: clean,
        status: clean.toUpperCase().includes('STOCK') ? 'IN_STOCK' : 'DAILY_ORDER',
        isCustom: true,
      };
    }

    const { estimatedArrival, status } = computeEtaAndStatus(
      effectiveOpt.id, 
      clean, 
      customDate || undefined, 
      customTime || undefined
    );

    setSelectedOptionId(effectiveOpt.id);

    onChange({
      timeFrameId: effectiveOpt.id,
      label: effectiveOpt.label,
      status,
      estimatedArrival,
    });

    setIsModalOpen(false);
    setCustomLabel('');
    setCustomDate('');
    setCustomTime('17:00');
  };

  const handleDeleteCustom = (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteCustomArrivalTimeFrame(idToDelete);
    reloadOptions();
  };

  // Quick preset helper for custom modal
  const applyQuickPreset = (daysFromNow: number, labelPrefix: string, timeStr = '17:00') => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    setCustomDate(`${yyyy}-${mm}-${dd}`);
    setCustomTime(timeStr);
    
    const formattedDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const formattedTime = timeStr === '17:00' ? '5:00 PM' : timeStr === '12:00' ? 'Noon' : timeStr === '09:00' ? '9:00 AM' : timeStr;
    setCustomLabel(`${labelPrefix} (${formattedDate} by ${formattedTime})`);
  };

  const isSmall = size === 'sm';

  return (
    <div className="relative inline-block w-full">
      <div className="flex items-center gap-1 w-full">
        <select
          value={matchedOption?.id || value || 'TODAY_5PM'}
          onChange={handleSelectChange}
          disabled={disabled}
          className={className || `w-full ${isSmall ? 'text-[11px] py-1 px-1.5' : 'text-xs py-2 px-2.5'} font-bold border border-slate-300 rounded-lg bg-white text-slate-800 focus:ring-1 focus:ring-blue-500 focus:outline-none shadow-2xs disabled:bg-slate-100 disabled:text-slate-600 disabled:border-slate-300 disabled:cursor-not-allowed`}
        >
          <optgroup label="Standard Arrival Expectations">
            {options.filter(o => !o.isCustom).map(opt => (
              <option key={opt.id} value={opt.id}>
                {isSmall ? opt.shortLabel : opt.label}
              </option>
            ))}
          </optgroup>

          {options.some(o => o.isCustom) && (
            <optgroup label="Custom Arrival Time Frames">
              {options.filter(o => o.isCustom).map(opt => (
                <option key={opt.id} value={opt.id}>
                  ★ {isSmall ? opt.shortLabel : opt.label}
                </option>
              ))}
            </optgroup>
          )}

          <optgroup label="Actions">
            <option value="__ADD_CUSTOM_TIMEFRAME__">
              + Add Custom Time Frame...
            </option>
          </optgroup>
        </select>

        {/* Quick shortcut button to add custom timeframe */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsModalOpen(true)}
          title="Add a custom arrival time frame"
          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded border border-slate-200 bg-slate-50 transition-colors shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modal Dialog for Adding Custom Time Frame */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-slate-800"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-200" />
                <h3 className="font-bold text-sm">Add Custom Arrival Time Frame</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddCustom} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Time Frame Name / Expectation <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tomorrow 11:30 AM, Friday Afternoon, 2-3 Days Fedex..."
                  value={customLabel}
                  onChange={e => setCustomLabel(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3 py-2 text-xs font-bold border-2 border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 text-slate-900 bg-white placeholder:text-slate-400 placeholder:font-normal"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  This custom expectation will show on part badges, technician screens, and dispatcher boards.
                </p>
              </div>

              {/* Quick Helper Presets */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Quick Helper Presets
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyQuickPreset(0, 'Today Express', '14:00')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    Today 2 PM
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickPreset(1, 'Tomorrow Morning', '09:00')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    Tomorrow 9 AM
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickPreset(1, 'Tomorrow Afternoon', '14:00')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    Tomorrow 2 PM
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickPreset(2, 'In 2 Days', '12:00')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    In 2 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickPreset(3, 'Friday Delivery', '15:00')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    In 3 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickPreset(7, 'Next Week Factory', '17:00')}
                    className="px-2.5 py-1 text-[11px] font-bold bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                  >
                    Next Week
                  </button>
                </div>
              </div>

              {/* Optional Exact Date & Time Picker */}
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>Exact Date (Optional)</span>
                  </label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Exact Time (Optional)</span>
                  </label>
                  <input
                    type="time"
                    value={customTime}
                    onChange={e => setCustomTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>

              {/* Save to Dropdown Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="saveToDropdown"
                  checked={saveToDropdown}
                  onChange={e => setSaveToDropdown(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="saveToDropdown" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Save to dropdown options for future orders
                </label>
              </div>

              {/* Existing Custom Timeframes with Delete capability */}
              {options.some(o => o.isCustom) && (
                <div className="pt-2 border-t border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Saved Custom Time Frames
                  </div>
                  <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                    {options.filter(o => o.isCustom).map(opt => (
                      <div 
                        key={opt.id} 
                        className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-50 border border-slate-200"
                      >
                        <span className="font-semibold text-slate-800 truncate">{opt.label}</span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustom(opt.id, e)}
                          title="Delete this custom timeframe"
                          className="text-slate-400 hover:text-red-600 p-0.5 rounded cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customLabel.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Apply Time Frame</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
