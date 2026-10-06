import React, { useState, useEffect } from 'react';
import { 
  Pin, 
  X, 
  Trash2, 
  AlertTriangle, 
  Sparkles, 
  Clock, 
  User as UserIcon,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StickyNoteColor } from '../types';

const COLOR_OPTIONS: {
  id: StickyNoteColor;
  label: string;
  desc: string;
  bgClass: string;
  borderClass: string;
  ringClass: string;
  textClass: string;
  headerClass: string;
  pinClass: string;
}[] = [
  {
    id: 'yellow',
    label: 'Yellow',
    desc: 'General Memo & Reminders',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-300',
    ringClass: 'ring-amber-400',
    textClass: 'text-amber-950',
    headerClass: 'bg-amber-200/70 border-amber-300 text-amber-900',
    pinClass: 'text-amber-600 fill-amber-500',
  },
  {
    id: 'red',
    label: 'Red / Urgent',
    desc: 'Critical Warnings & Rush Deadlines',
    bgClass: 'bg-rose-50',
    borderClass: 'border-rose-300',
    ringClass: 'ring-rose-400',
    textClass: 'text-rose-950',
    headerClass: 'bg-rose-200/80 border-rose-300 text-rose-900',
    pinClass: 'text-rose-600 fill-rose-500',
  },
  {
    id: 'blue',
    label: 'Blue',
    desc: 'Parts, Delivery & Logistics',
    bgClass: 'bg-sky-50',
    borderClass: 'border-sky-300',
    ringClass: 'ring-sky-400',
    textClass: 'text-sky-950',
    headerClass: 'bg-sky-200/70 border-sky-300 text-sky-900',
    pinClass: 'text-sky-600 fill-sky-500',
  },
  {
    id: 'green',
    label: 'Green',
    desc: 'Advisor Approvals & Warranty',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-300',
    ringClass: 'ring-emerald-400',
    textClass: 'text-emerald-950',
    headerClass: 'bg-emerald-200/70 border-emerald-300 text-emerald-900',
    pinClass: 'text-emerald-600 fill-emerald-500',
  },
  {
    id: 'purple',
    label: 'Purple',
    desc: 'VIP Customer & Special Handling',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-300',
    ringClass: 'ring-purple-400',
    textClass: 'text-purple-950',
    headerClass: 'bg-purple-200/70 border-purple-300 text-purple-900',
    pinClass: 'text-purple-600 fill-purple-500',
  },
  {
    id: 'orange',
    label: 'Orange',
    desc: 'Technician & Shop Bay Notes',
    bgClass: 'bg-orange-50',
    borderClass: 'border-orange-300',
    ringClass: 'ring-orange-400',
    textClass: 'text-orange-950',
    headerClass: 'bg-orange-200/70 border-orange-300 text-orange-900',
    pinClass: 'text-orange-600 fill-orange-500',
  },
];

const PRESET_SUGGESTIONS = [
  { text: 'Customer waiting in customer lounge — prioritize turnaround', color: 'yellow', urgent: true },
  { text: 'DO NOT ROAD TEST - Check with technician first', color: 'red', urgent: true },
  { text: 'Wheel lock key located in glove box / center console', color: 'yellow', urgent: false },
  { text: 'Customer promised pickup time: 3:00 PM SHARP', color: 'red', urgent: true },
  { text: 'Special order parts arriving on next parts shuttle', color: 'blue', urgent: false },
  { text: 'Extended warranty authorization # pending with adjuster', color: 'green', urgent: false },
  { text: 'Call customer for approval before any additional tear-down', color: 'purple', urgent: false },
  { text: 'Save old parts in box in trunk for customer inspection', color: 'orange', urgent: false },
];

export const ROStickyNoteModal: React.FC = () => {
  const { 
    repairOrders, 
    isStickyNoteModalOpen, 
    stickyNoteModalROId, 
    closeStickyNoteModal, 
    setROStickyNote, 
    removeROStickyNote,
    currentUser 
  } = useApp();

  const currentRO = repairOrders.find(r => r.id === stickyNoteModalROId);

  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState<StickyNoteColor>('yellow');
  const [isUrgent, setIsUrgent] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Initialize or reset form when modal opens
  useEffect(() => {
    if (isStickyNoteModalOpen && currentRO) {
      if (currentRO.stickyNote) {
        setNoteText(currentRO.stickyNote.text || '');
        setSelectedColor(currentRO.stickyNote.color || 'yellow');
        setIsUrgent(Boolean(currentRO.stickyNote.isUrgent));
      } else {
        setNoteText('');
        setSelectedColor('yellow');
        setIsUrgent(false);
      }
      setShowConfirmDelete(false);
    }
  }, [isStickyNoteModalOpen, currentRO]);

  if (!isStickyNoteModalOpen || !currentRO) return null;

  const existingNote = currentRO.stickyNote;
  const activeColorConfig = COLOR_OPTIONS.find(c => c.id === selectedColor) || COLOR_OPTIONS[0];

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!noteText.trim()) return;

    setROStickyNote(currentRO.id, {
      text: noteText.trim(),
      color: selectedColor,
      isUrgent: isUrgent || selectedColor === 'red',
    });

    closeStickyNoteModal();
  };

  const handleRemove = () => {
    removeROStickyNote(currentRO.id);
    closeStickyNoteModal();
  };

  const applyPreset = (preset: { text: string; color: string; urgent: boolean }) => {
    setNoteText(preset.text);
    setSelectedColor(preset.color as StickyNoteColor);
    setIsUrgent(preset.urgent);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div 
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Pin className="w-4 h-4 fill-amber-400 rotate-45" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-2">
                <span>{existingNote ? 'Edit Sticky Note' : 'Pin Sticky Note to RO'}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 font-mono font-bold">
                  RO #{currentRO.id}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
                {currentRO.vehicle.year} {currentRO.vehicle.make} {currentRO.vehicle.model} • {currentRO.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={closeStickyNoteModal}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          
          {/* Note Color Palette Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Sticky Note Color
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {COLOR_OPTIONS.map(opt => {
                const isSelected = selectedColor === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedColor(opt.id);
                      if (opt.id === 'red') setIsUrgent(true);
                    }}
                    className={`p-2 rounded-xl border text-center transition-all flex flex-col items-center gap-1 cursor-pointer ${
                      isSelected 
                        ? `${opt.bgClass} ${opt.borderClass} ring-2 ${opt.ringClass} shadow-xs font-bold` 
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 opacity-75'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border shadow-2xs flex items-center justify-center ${opt.bgClass} ${opt.borderClass}`}>
                      {isSelected && <div className={`w-2 h-2 rounded-full ${opt.id === 'yellow' ? 'bg-amber-600' : opt.id === 'red' ? 'bg-rose-600' : opt.id === 'blue' ? 'bg-sky-600' : opt.id === 'green' ? 'bg-emerald-600' : opt.id === 'purple' ? 'bg-purple-600' : 'bg-orange-600'}`} />}
                    </div>
                    <span className="text-[11px] text-slate-700 leading-tight">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Sticky Note Preview / Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Note Content
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {noteText.length}/350 chars
              </span>
            </div>

            {/* Post-It Note Style Container */}
            <div className={`relative rounded-xl border-2 shadow-md transition-all overflow-hidden ${activeColorConfig.bgClass} ${activeColorConfig.borderClass}`}>
              {/* Tape / Pin Header strip */}
              <div className={`px-3 py-1.5 border-b flex items-center justify-between text-xs font-medium ${activeColorConfig.headerClass}`}>
                <div className="flex items-center gap-1.5 font-bold">
                  <Pin className={`w-3.5 h-3.5 ${activeColorConfig.pinClass} rotate-45`} />
                  <span>Pinned Note</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] opacity-80">
                  <span className="flex items-center gap-1">
                    <UserIcon className="w-3 h-3" />
                    {existingNote ? existingNote.authorName : currentUser.name}
                  </span>
                </div>
              </div>

              {/* Text Area */}
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                maxLength={350}
                rows={4}
                placeholder="Write an important memo, customer note, technician reminder, or critical instruction..."
                className={`w-full p-3.5 bg-transparent border-0 focus:outline-none focus:ring-0 text-sm font-medium leading-relaxed resize-none ${activeColorConfig.textClass} placeholder:text-slate-400`}
                autoFocus
              />

              {/* Sticky Note Bottom Fold visual accent */}
              <div className="px-3 pb-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-black/5 bg-black/5">
                <span className="italic flex items-center gap-1">
                  <Bookmark className="w-3 h-3" />
                  Appears at the top of this RO across all stations
                </span>
                {existingNote?.updatedAt && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Last updated {new Date(existingNote.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Presets / Suggestions */}
          <div>
            <div className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Quick Presets:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
              {PRESET_SUGGESTIONS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="text-left text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/80 transition-colors cursor-pointer"
                >
                  {preset.text}
                </button>
              ))}
            </div>
          </div>

          {/* High Priority / Urgent Flag */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={e => setIsUrgent(e.target.checked)}
                className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
              />
              <span className="flex items-center gap-1 font-semibold">
                <AlertTriangle className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-600' : 'text-slate-400'}`} />
                Mark as High Priority / Urgent Warning
              </span>
            </label>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            {existingNote ? (
              <div>
                {showConfirmDelete ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleRemove}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Confirm Peel Off
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowConfirmDelete(false)}
                      className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowConfirmDelete(true)}
                    className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-200 font-medium transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Peel Off / Remove Note</span>
                  </button>
                )}
              </div>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeStickyNoteModal}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!noteText.trim()}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{existingNote ? 'Save Changes' : 'Pin Note to RO'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
