import React, { useState, useMemo } from 'react';
import { 
  X, 
  Tag, 
  Plus, 
  Search, 
  Copy, 
  Check, 
  Trash2, 
  Edit2, 
  CheckCheck,
  Bookmark,
  Layers,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SpecialPartNumber } from '../types';

export const SpecialPartsModal: React.FC = () => {
  const { 
    isSpecialPartsModalOpen, 
    closeSpecialPartsModal, 
    specialParts, 
    addSpecialPart, 
    updateSpecialPart, 
    deleteSpecialPart 
  } = useApp();

  const [newName, setNewName] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPartNumber, setEditPartNumber] = useState('');

  // Filtered parts
  const filteredParts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return specialParts;
    return specialParts.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.partNumber.toLowerCase().includes(q)
    );
  }, [specialParts, searchQuery]);

  if (!isSpecialPartsModalOpen) return null;

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanName = newName.trim();
    const cleanPn = newPartNumber.trim().toUpperCase();
    if (!cleanName || !cleanPn) return;

    addSpecialPart(cleanName, cleanPn);
    setNewName('');
    setNewPartNumber('');
  };

  const handleStartEdit = (part: SpecialPartNumber) => {
    setEditingId(part.id);
    setEditName(part.name);
    setEditPartNumber(part.partNumber);
  };

  const handleSaveEdit = (id: string) => {
    const cleanName = editName.trim();
    const cleanPn = editPartNumber.trim().toUpperCase();
    if (!cleanName || !cleanPn) return;

    updateSpecialPart(id, cleanName, cleanPn);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditPartNumber('');
  };

  const handleCopy = (part: SpecialPartNumber) => {
    try {
      navigator.clipboard.writeText(part.partNumber);
      setCopiedId(part.id);
      setTimeout(() => {
        setCopiedId(prev => prev === part.id ? null : prev);
      }, 2000);
    } catch (err) {
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-300 max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950 shadow-sm">
              <Bookmark className="w-5 h-5 fill-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Special Part Numbers
                </h3>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40">
                  {specialParts.length} Saved
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Service Manager quick-reference cheat sheet for frequent & special part numbers
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeSpecialPartsModal}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close special parts directory"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Quick Add Form: Name and Part Number ONLY */}
          <form onSubmit={handleAdd} className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border-2 border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                <span>Add Special Part</span>
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                Name & Part Number only
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-6">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Name of Part
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5.7L Hemi Oil Filter, Drain Plug Gasket..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="sm:col-span-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Part Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 04884899AC"
                  value={newPartNumber}
                  onChange={e => setNewPartNumber(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-950 uppercase placeholder:text-slate-400"
                />
              </div>

              <div className="sm:col-span-2 flex items-end">
                <button
                  type="submit"
                  disabled={!newName.trim() || !newPartNumber.trim()}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </form>

          {/* Quick Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by part name or part number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
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

          {/* Parts List */}
          <div className="space-y-2">
            {filteredParts.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300 p-6 space-y-2">
                <Tag className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs font-bold text-slate-700">
                  {searchQuery ? `No part numbers match "${searchQuery}"` : 'No special part numbers added yet'}
                </p>
                <p className="text-[11px] text-slate-500">
                  {searchQuery 
                    ? 'Try searching with a different keyword or part number.' 
                    : 'Use the form above to add part numbers you use all the time.'}
                </p>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="mt-1 text-xs text-blue-600 hover:underline font-bold cursor-pointer"
                  >
                    Clear search filter
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                {filteredParts.map(part => {
                  const isEditing = editingId === part.id;
                  const isCopied = copiedId === part.id;

                  if (isEditing) {
                    return (
                      <div key={part.id} className="p-3 bg-blue-50/60 flex flex-col sm:flex-row items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          placeholder="Part Name"
                          className="flex-1 w-full px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white border border-blue-400 rounded-lg focus:outline-none"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={editPartNumber}
                          onChange={e => setEditPartNumber(e.target.value.toUpperCase())}
                          placeholder="Part Number"
                          className="w-full sm:w-44 px-2.5 py-1.5 text-xs font-mono font-bold text-slate-950 bg-white border border-blue-400 rounded-lg focus:outline-none uppercase"
                        />
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(part.id)}
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
                    );
                  }

                  return (
                    <div 
                      key={part.id}
                      className="p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Name of Part */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Tag className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-xs sm:text-sm font-bold text-slate-900 truncate" title={part.name}>
                          {part.name}
                        </span>
                      </div>

                      {/* Part Number & Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        {/* 1-Click Copy Badge */}
                        <button
                          type="button"
                          onClick={() => handleCopy(part)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono font-black text-xs transition-all cursor-pointer shadow-2xs active:scale-95 ${
                            isCopied
                              ? 'bg-emerald-600 text-white border-emerald-700 ring-2 ring-emerald-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-950 border-slate-300 hover:border-slate-400'
                          }`}
                          title="Click to copy part number to clipboard"
                        >
                          {isCopied ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-white" />
                              <span>COPIED!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-slate-500 group-hover:text-slate-800" />
                              <span>{part.partNumber}</span>
                            </>
                          )}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(part)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit this part name or part number"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => deleteSpecialPart(part.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete this part"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">
              Showing {filteredParts.length} of {specialParts.length} part{specialParts.length === 1 ? '' : 's'}
            </span>
          </div>

          <button
            type="button"
            onClick={closeSpecialPartsModal}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
