import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Wrench,
  Search,
  CheckCircle2,
  Clock,
  Package,
  AlertTriangle,
  Flag,
  ChevronDown,
  ChevronUp,
  Car,
  User as UserIcon,
  Check,
  X,
  MessageSquareText,
  Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ManagerSpreadsheetRow, ManagerLogStatus } from '../types/managerSpreadsheet';
import { getStatusBadgeStyle, formatEtaDisplayDate } from './ManagerROPartsSpreadsheet';
import { CauseCorrectionStoryBox } from './CauseCorrectionStoryBox';
import {
  subscribeToShopSettings,
  updateManagerSpreadsheetRowInCloud,
  syncShopSettings
} from '../lib/firestoreSync';

const STORAGE_KEY_MANAGER_SPREADSHEET = 'dealership_service_manager_ro_parts_spreadsheet_v2';

const TECH_QUICK_STATUSES: {
  status: ManagerLogStatus;
  label: string;
  activeClass: string;
  idleClass: string;
}[] = [
  {
    status: 'In Diag',
    label: 'In Diag',
    activeClass: 'bg-green-200 text-green-950 border-green-600 ring-2 ring-green-500 shadow-xs',
    idleClass: 'bg-green-50 hover:bg-green-100 text-green-900 border-green-300'
  },
  {
    status: 'Pending Customer Approval',
    label: 'Pending Customer Approval',
    activeClass: 'bg-blue-200 text-blue-950 border-blue-600 ring-2 ring-blue-500 shadow-xs',
    idleClass: 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300'
  },
  {
    status: 'Pending Warranty Approval',
    label: 'Pending Warranty Approval',
    activeClass: 'bg-emerald-600 text-white border-emerald-800 ring-2 ring-emerald-500 shadow-xs',
    idleClass: 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
  },
  {
    status: 'Waiting on Parts',
    label: 'Waiting on Parts',
    activeClass: 'bg-red-200 text-red-950 border-red-600 ring-2 ring-red-500 shadow-xs',
    idleClass: 'bg-red-50 hover:bg-red-100 text-red-900 border-red-300'
  },
  {
    status: 'Parts In – Awaiting Tech',
    label: 'Parts In – Awaiting Tech',
    activeClass: 'bg-teal-200 text-teal-950 border-teal-600 ring-2 ring-teal-500 shadow-xs',
    idleClass: 'bg-teal-50 hover:bg-teal-100 text-teal-900 border-teal-300'
  },
  {
    status: 'In Repair',
    label: 'In Repair',
    activeClass: 'bg-blue-900 text-white border-blue-950 ring-2 ring-blue-700 shadow-xs',
    idleClass: 'bg-slate-100 hover:bg-blue-900 hover:text-white text-blue-950 border-blue-300'
  },
  {
    status: 'Finished',
    label: 'Finished',
    activeClass: 'bg-emerald-950 text-white border-emerald-900 ring-2 ring-emerald-700 shadow-xs',
    idleClass: 'bg-slate-100 hover:bg-emerald-900 hover:text-white text-emerald-950 border-emerald-400'
  }
];

const QUICK_NOTE_CHIPS = [
  'Starting Diag',
  'Diag Complete - Needs Approval',
  'Need Parts Ordered',
  'Repair in Progress',
  'Road Testing',
  'Ready for Pickup'
];

export const TechQuickStatusBoard: React.FC = () => {
  const { currentUser } = useApp();

  const [rows, setRows] = useState<ManagerSpreadsheetRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MANAGER_SPREADSHEET);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [viewScope, setViewScope] = useState<'MY' | 'ALL'>('MY');
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({});
  const [savingNoteIds, setSavingNoteIds] = useState<Set<string>>(new Set());
  const [expandedPartsRowIds, setExpandedPartsRowIds] = useState<Set<string>>(new Set());
  const [expandedStoryRowIds, setExpandedStoryRowIds] = useState<Set<string>>(new Set());
  const [savedIndicatorRowId, setSavedIndicatorRowId] = useState<string | null>(null);

  const noteTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const latestDraftsRef = useRef<Record<string, string>>({});
  const focusedNoteRowIdsRef = useRef<Set<string>>(new Set());
  const inFlightRowsRef = useRef<Map<string, number>>(new Map());
  const lastLocalEditAtRef = useRef<Map<string, number>>(new Map());
  const dirtyFieldsRef = useRef<Map<string, Set<string>>>(new Map());
  const latestRowsRef = useRef<ManagerSpreadsheetRow[]>(rows);

  useEffect(() => {
    latestRowsRef.current = rows;
  }, [rows]);

  // Subscribe live to Service Manager Master RO & Parts Log without clobbering active typing or in-flight saves
  useEffect(() => {
    const unsubscribe = subscribeToShopSettings((settings) => {
      if (settings?.managerROPartsSpreadsheet && Array.isArray(settings.managerROPartsSpreadsheet)) {
        const incomingRows = settings.managerROPartsSpreadsheet as ManagerSpreadsheetRow[];
        const now = Date.now();

        setRows((prevRows) => {
          const prevMap = new Map(prevRows.map((r) => [r.id, r]));

          const mergedRows = incomingRows.map((cloudRow) => {
            const localRow = prevMap.get(cloudRow.id);
            if (!localRow) return cloudRow;

            const isFocused = focusedNoteRowIdsRef.current.has(cloudRow.id);
            const hasPendingDraft = latestDraftsRef.current[cloudRow.id] !== undefined;
            const hasTimer = Boolean(noteTimersRef.current[cloudRow.id]);
            const isInFlight = (inFlightRowsRef.current.get(cloudRow.id) || 0) > 0;
            const lastEditAt = lastLocalEditAtRef.current.get(cloudRow.id) || 0;
            const hasRecentEdit = now - lastEditAt < 2500;

            if (!isFocused && !hasPendingDraft && !hasTimer && !isInFlight && !hasRecentEdit) {
              return cloudRow;
            }

            const mergedRow: ManagerSpreadsheetRow = { ...cloudRow };
            if (isFocused || hasPendingDraft || hasTimer) {
              mergedRow.techNotes =
                latestDraftsRef.current[cloudRow.id] !== undefined
                  ? latestDraftsRef.current[cloudRow.id]
                  : localRow.techNotes;
              mergedRow.techNotesUpdatedAt = localRow.techNotesUpdatedAt;
              mergedRow.techNotesUpdatedBy = localRow.techNotesUpdatedBy;
            }

            if (isInFlight || hasRecentEdit) {
              const dirty = dirtyFieldsRef.current.get(cloudRow.id);
              dirty?.forEach((field) => {
                const key = field as keyof ManagerSpreadsheetRow;
                (mergedRow as unknown as Record<string, unknown>)[key] =
                  (localRow as unknown as Record<string, unknown>)[key];
              });
            }

            return mergedRow;
          });

          latestRowsRef.current = mergedRows;
          try {
            localStorage.setItem(STORAGE_KEY_MANAGER_SPREADSHEET, JSON.stringify(mergedRows));
          } catch {
            // ignore
          }
          return mergedRows;
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const flashSaved = (rowId: string) => {
    setSavedIndicatorRowId(rowId);
    setTimeout(() => {
      setSavedIndicatorRowId((prev) => (prev === rowId ? null : prev));
    }, 2000);
  };

  const patchRow = useCallback(
    async (rowId: string, patch: Partial<ManagerSpreadsheetRow>) => {
      const now = new Date().toISOString();
      const dirtySet = dirtyFieldsRef.current.get(rowId) || new Set<string>();
      Object.keys(patch).forEach((k) => dirtySet.add(k));
      dirtyFieldsRef.current.set(rowId, dirtySet);
      lastLocalEditAtRef.current.set(rowId, Date.now());
      inFlightRowsRef.current.set(rowId, (inFlightRowsRef.current.get(rowId) || 0) + 1);

      const updated = latestRowsRef.current.map((r) => {
        if (r.id !== rowId) return r;
        return {
          ...r,
          ...patch,
          updatedAt: now
        };
      });
      latestRowsRef.current = updated;
      setRows(updated);
      try {
        localStorage.setItem(STORAGE_KEY_MANAGER_SPREADSHEET, JSON.stringify(updated));
      } catch {
        // ignore
      }

      flashSaved(rowId);

      try {
        const ok = await updateManagerSpreadsheetRowInCloud(rowId, {
          ...patch,
          updatedAt: now
        });
        if (!ok && latestRowsRef.current.length > 0) {
          await syncShopSettings({ managerROPartsSpreadsheet: latestRowsRef.current });
        }
      } finally {
        const nextCount = Math.max(0, (inFlightRowsRef.current.get(rowId) || 1) - 1);
        if (nextCount === 0) {
          inFlightRowsRef.current.delete(rowId);
        } else {
          inFlightRowsRef.current.set(rowId, nextCount);
        }
        lastLocalEditAtRef.current.set(rowId, Date.now());
      }
    },
    []
  );

  const handleSetStatus = (row: ManagerSpreadsheetRow, nextStatus: ManagerLogStatus) => {
    const now = new Date().toISOString();
    patchRow(row.id, {
      status: nextStatus,
      techStatusUpdatedAt: now
    });
  };

  const handleSaveNote = useCallback(
    async (
      row: ManagerSpreadsheetRow,
      explicitText?: string,
      options?: { trim?: boolean }
    ) => {
      if (noteTimersRef.current[row.id]) {
        clearTimeout(noteTimersRef.current[row.id]);
        delete noteTimersRef.current[row.id];
      }

      const now = new Date().toISOString();
      const rawText =
        explicitText !== undefined
          ? explicitText
          : latestDraftsRef.current[row.id] !== undefined
          ? latestDraftsRef.current[row.id]
          : row.techNotes || '';

      const shouldTrim =
        options?.trim !== undefined
          ? options.trim
          : !focusedNoteRowIdsRef.current.has(row.id);
      const textToSave = shouldTrim ? rawText.trim() : rawText;

      if (explicitText !== undefined) {
        latestDraftsRef.current[row.id] = textToSave;
        if (!focusedNoteRowIdsRef.current.has(row.id)) {
          setDraftNotes((prev) => {
            if (prev[row.id] === undefined) return prev;
            const copy = { ...prev };
            delete copy[row.id];
            return copy;
          });
        } else {
          setDraftNotes((prev) => ({
            ...prev,
            [row.id]: textToSave
          }));
        }
      }

      lastLocalEditAtRef.current.set(row.id, Date.now());

      await patchRow(row.id, {
        techNotes: textToSave,
        techNotesUpdatedAt: now,
        techNotesUpdatedBy: currentUser.name
      });

      // Only release local draft once cloud save finishes AND user hasn't typed newer text or stayed focused with differing text
      const currentLatest = latestDraftsRef.current[row.id];
      if (
        !focusedNoteRowIdsRef.current.has(row.id) &&
        (currentLatest === undefined || currentLatest === rawText || currentLatest === textToSave)
      ) {
        delete latestDraftsRef.current[row.id];
        setDraftNotes((prev) => {
          if (prev[row.id] === undefined) return prev;
          const copy = { ...prev };
          delete copy[row.id];
          return copy;
        });
      }

      if (!noteTimersRef.current[row.id]) {
        setSavingNoteIds((prev) => {
          if (!prev.has(row.id)) return prev;
          const next = new Set(prev);
          next.delete(row.id);
          return next;
        });
      }
    },
    [currentUser.name, patchRow]
  );

  useEffect(() => {
    return () => {
      Object.entries(noteTimersRef.current).forEach(([rowId, t]) => {
        clearTimeout(t);
        const pendingText = latestDraftsRef.current[rowId];
        if (pendingText !== undefined) {
          const now = new Date().toISOString();
          updateManagerSpreadsheetRowInCloud(rowId, {
            techNotes: pendingText.trim(),
            techNotesUpdatedAt: now,
            techNotesUpdatedBy: currentUser.name,
            updatedAt: now
          });
        }
      });
      noteTimersRef.current = {};
    };
  }, [currentUser.name]);

  const handleNoteChange = useCallback(
    (row: ManagerSpreadsheetRow, nextValue: string) => {
      latestDraftsRef.current[row.id] = nextValue;
      lastLocalEditAtRef.current.set(row.id, Date.now());
      setDraftNotes((prev) => ({
        ...prev,
        [row.id]: nextValue
      }));

      setSavingNoteIds((prev) => {
        const next = new Set(prev);
        next.add(row.id);
        return next;
      });

      if (noteTimersRef.current[row.id]) {
        clearTimeout(noteTimersRef.current[row.id]);
      }

      noteTimersRef.current[row.id] = setTimeout(() => {
        handleSaveNote(row, latestDraftsRef.current[row.id], { trim: false });
      }, 650);
    },
    [handleSaveNote]
  );

  const handleToggleFlagManager = (row: ManagerSpreadsheetRow) => {
    const now = new Date().toISOString();
    const nextFlag = !row.techNeedsAttention;
    patchRow(row.id, {
      techNeedsAttention: nextFlag,
      techNotesUpdatedAt: now,
      techNotesUpdatedBy: currentUser.name
    });
  };

  const togglePartsExpand = (rowId: string) => {
    setExpandedPartsRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const toggleStoryExpand = (rowId: string) => {
    setExpandedStoryRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  };

  const isAssignedToMe = useCallback(
    (r: ManagerSpreadsheetRow) => {
      if (r.assignedTechId && r.assignedTechId === currentUser.id) return true;
      const rowTech = (r.assignedTechName || '').trim().toLowerCase();
      const myName = (currentUser.name || '').trim().toLowerCase();
      return Boolean(rowTech && myName && rowTech === myName);
    },
    [currentUser.id, currentUser.name]
  );

  const isCompletedStatus = (status: ManagerLogStatus | string) => {
    return (
      status === 'Finished' ||
      status === 'Waiting on Payment' ||
      status === 'Waiting for Payment'
    );
  };

  const myActiveCount = useMemo(
    () => rows.filter((r) => isAssignedToMe(r) && !isCompletedStatus(r.status)).length,
    [rows, isAssignedToMe]
  );

  const allActiveCount = useMemo(
    () => rows.filter((r) => !isCompletedStatus(r.status)).length,
    [rows]
  );

  const completedInScopeCount = useMemo(() => {
    return rows.filter((r) => {
      if (viewScope === 'MY' && !isAssignedToMe(r)) return false;
      return isCompletedStatus(r.status);
    }).length;
  }, [rows, viewScope, isAssignedToMe]);

  const displayedRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (viewScope === 'MY' && !isAssignedToMe(r)) return false;
      if (!showCompleted && isCompletedStatus(r.status)) return false;
      if (!q) return true;
      return (
        (r.roNumber || '').toLowerCase().includes(q) ||
        (r.customerName || '').toLowerCase().includes(q) ||
        (r.vin || '').toLowerCase().includes(q) ||
        (r.status || '').toLowerCase().includes(q) ||
        (r.techNotes || '').toLowerCase().includes(q) ||
        (r.assignedTechName || '').toLowerCase().includes(q)
      );
    });
  }, [rows, viewScope, isAssignedToMe, showCompleted, searchQuery]);

  // Quick status summary counts for the current scope (active rows)
  const scopeActiveRows = useMemo(() => {
    return rows.filter((r) => (viewScope === 'MY' ? isAssignedToMe(r) : true) && !isCompletedStatus(r.status));
  }, [rows, viewScope, isAssignedToMe]);

  const formatShortTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-sm overflow-hidden">
      {/* Board Header */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 py-4 border-b border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-xs shrink-0">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Shop Dispatch &amp; Quick Status Board
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Tap a stage button or save a quick update — syncs live straight to the Service Manager Master Log.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setViewScope('MY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer border ${
                viewScope === 'MY'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              My Vehicles ({myActiveCount})
            </button>
            <button
              type="button"
              onClick={() => setViewScope('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer border ${
                viewScope === 'ALL'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-xs'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              All Shop Vehicles ({allActiveCount})
            </button>
            <button
              type="button"
              onClick={() => setShowCompleted((v) => !v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                showCompleted
                  ? 'bg-emerald-700 text-white border-emerald-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {showCompleted ? 'Hiding' : 'Show'} Finished ({completedInScopeCount})
            </button>
          </div>
        </div>

        {/* Mini Live Counts Strip + Search */}
        <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap text-[11px] font-bold">
            <span className="px-2.5 py-1 rounded bg-purple-950/90 text-purple-200 border border-purple-700/60">
              Dispatched: {scopeActiveRows.filter((r) => r.status === 'Dispatched').length}
            </span>
            <span className="px-2.5 py-1 rounded bg-green-950/80 text-green-200 border border-green-700/60">
              In Diag: {scopeActiveRows.filter((r) => r.status === 'In Diag').length}
            </span>
            <span className="px-2.5 py-1 rounded bg-blue-950/80 text-blue-200 border border-blue-700/60">
              Pending Approval:{' '}
              {
                scopeActiveRows.filter(
                  (r) =>
                    r.status === 'Pending Customer Approval' ||
                    r.status === 'Pending Warranty Approval'
                ).length
              }
            </span>
            <span className="px-2.5 py-1 rounded bg-red-950/80 text-red-200 border border-red-700/60">
              Waiting on Parts: {scopeActiveRows.filter((r) => r.status === 'Waiting on Parts').length}
            </span>
            <span className="px-2.5 py-1 rounded bg-teal-950/80 text-teal-200 border border-teal-700/60">
              Parts In – Awaiting Tech: {scopeActiveRows.filter((r) => r.status === 'Parts In – Awaiting Tech').length}
            </span>
            <span className="px-2.5 py-1 rounded bg-sky-950/80 text-sky-200 border border-sky-700/60">
              In Repair: {scopeActiveRows.filter((r) => r.status === 'In Repair').length}
            </span>
          </div>

          <div className="relative w-full md:w-72 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search RO#, customer, VIN, note..."
              className="w-full pl-8 pr-7 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs font-medium text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Vehicle Cards List */}
      <div className="p-3 sm:p-4 bg-slate-50 space-y-2.5">
        {displayedRows.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <Car className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-black text-slate-800">
              {searchQuery
                ? 'No Matching Vehicles Found'
                : viewScope === 'MY'
                ? 'No Vehicles Currently Assigned to You'
                : 'No Vehicles in Master Shop Log'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              {searchQuery
                ? `Nothing matched "${searchQuery}".`
                : 'When the Service Manager assigns an RO# to you in the Master RO & Parts Log, it will show up here immediately.'}
            </p>
          </div>
        ) : (
          displayedRows.map((row) => {
            const partsList = row.parts || [];
            const partsInCount = partsList.filter((p) => p.isPartsIn).length;
            const isPartsExpanded = expandedPartsRowIds.has(row.id);
            const currentDraft = draftNotes[row.id] !== undefined ? draftNotes[row.id] : (row.techNotes || '');
            const isAutoSaving = savingNoteIds.has(row.id);
            const isJustSaved = savedIndicatorRowId === row.id;

            return (
              <div
                key={row.id}
                className={`bg-white rounded-xl border-2 p-3 shadow-2xs transition-all space-y-2 ${
                  row.techNeedsAttention
                    ? 'border-amber-500 ring-2 ring-amber-200 bg-amber-50/20'
                    : 'border-slate-200 hover:border-purple-300'
                }`}
              >
                {/* Row 1: RO#, Date, Customer, VIN, Current Stage & Parts Status */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-sm font-black px-2.5 py-1 rounded-lg bg-slate-900 text-white shadow-2xs">
                      RO #{row.roNumber || '—'}
                    </span>

                    {(row.roDate || row.createdAt) && (
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                        {formatEtaDisplayDate(row.roDate || row.createdAt.split('T')[0])}
                      </span>
                    )}

                    <span className="text-sm font-black text-slate-900">
                      {row.customerName || 'No Customer Name'}
                    </span>

                    {row.vin && (
                      <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        VIN: {row.vin}
                      </span>
                    )}

                    {viewScope === 'ALL' && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        <UserIcon className="w-3 h-3 text-purple-600" />
                        <span>{row.assignedTechName || 'Unassigned'}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Parts Readiness Pill */}
                    {partsList.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => togglePartsExpand(row.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black border cursor-pointer transition-colors ${
                          partsInCount === partsList.length
                            ? 'bg-emerald-100 text-emerald-950 border-emerald-400 hover:bg-emerald-200'
                            : partsInCount > 0
                            ? 'bg-amber-100 text-amber-950 border-amber-400 hover:bg-amber-200'
                            : 'bg-red-50 text-red-900 border-red-300 hover:bg-red-100'
                        }`}
                        title="Click to see ordered parts & ETA"
                      >
                        <Package className="w-3.5 h-3.5" />
                        <span>
                          Parts: {partsInCount}/{partsList.length} IN
                        </span>
                        {partsInCount < partsList.length && partsList[0]?.currentEta && (
                          <span className="font-mono text-[10px] opacity-85">
                            • ETA {formatEtaDisplayDate(partsList[0].currentEta)}
                          </span>
                        )}
                        {isPartsExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
                        <Package className="w-3.5 h-3.5 text-slate-400" />
                        <span>No Parts Logged</span>
                      </span>
                    )}

                    {/* Current Status Badge */}
                    <span
                      className={`px-3 py-1 rounded-lg text-xs border shadow-2xs ${getStatusBadgeStyle(row.status)}`}
                    >
                      Stage: {row.status === 'Waiting for Payment' ? 'Waiting on Payment' : row.status}
                    </span>

                    {isJustSaved && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-black animate-in fade-in">
                        <Check className="w-3 h-3" />
                        <span>Synced</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Expandable Read-Only Parts Details for Tech Convenience */}
                {isPartsExpanded && partsList.length > 0 && (
                  <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3 space-y-1.5">
                    <div className="text-[11px] font-black uppercase text-purple-900 tracking-wider">
                      Parts Logged on This RO ({partsList.length})
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {partsList.map((p, idx) => (
                        <div
                          key={p.id || idx}
                          className="bg-white rounded-lg border border-purple-200 px-3 py-2 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-mono font-black text-slate-900 truncate">
                              {p.partNumber || 'Part'} {p.quantity ? `×${p.quantity}` : ''}
                            </div>
                            {p.partDescription && (
                              <div className="text-[11px] text-slate-600 truncate">
                                {p.partDescription}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-black border ${
                                p.isPartsIn
                                  ? 'bg-emerald-600 text-white border-emerald-700'
                                  : 'bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            >
                              {p.isPartsIn ? '✓ IN' : 'Waiting'}
                            </span>
                            <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                              ETA: {formatEtaDisplayDate(p.currentEta)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Row 2: 1-Click Stage Buttons */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      1-Click Update Stage (Where Are You On This Vehicle?):
                    </span>
                    {row.techStatusUpdatedAt && (
                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Stage updated {formatShortTime(row.techStatusUpdatedAt)}</span>
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
                    {TECH_QUICK_STATUSES.map((btn) => {
                      const isActive = row.status === btn.status;
                      return (
                        <button
                          key={btn.status}
                          type="button"
                          onClick={() => handleSetStatus(row, btn.status)}
                          className={`px-2 py-1.5 rounded-lg text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center leading-tight active:scale-98 ${
                            isActive ? btn.activeClass : btn.idleClass
                          }`}
                        >
                          {isActive && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                          <span>{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 3: Quick Tech Update Note + Flag Manager */}
                <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mr-0.5">
                      Quick Note:
                    </span>
                    {QUICK_NOTE_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleSaveNote(row, chip)}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-colors cursor-pointer ${
                          (row.techNotes || '').trim() === chip
                            ? 'bg-purple-600 text-white border-purple-700'
                            : 'bg-slate-100 hover:bg-purple-100 text-slate-700 hover:text-purple-900 border-slate-300'
                        }`}
                      >
                        {chip}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
                    <div className="relative flex-1">
                      <MessageSquareText className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={currentDraft}
                        onFocus={() => {
                          focusedNoteRowIdsRef.current.add(row.id);
                        }}
                        onChange={(e) => handleNoteChange(row, e.target.value)}
                        onBlur={() => {
                          focusedNoteRowIdsRef.current.delete(row.id);
                          const hasUnsaved =
                            savingNoteIds.has(row.id) ||
                            Boolean(noteTimersRef.current[row.id]) ||
                            (latestDraftsRef.current[row.id] !== undefined &&
                              latestDraftsRef.current[row.id].trim() !== (row.techNotes || '').trim());
                          if (hasUnsaved) {
                            handleSaveNote(row, undefined, { trim: true });
                          } else {
                            delete latestDraftsRef.current[row.id];
                            setDraftNotes((prev) => {
                              if (prev[row.id] === undefined) return prev;
                              const copy = { ...prev };
                              delete copy[row.id];
                              return copy;
                            });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveNote(row, undefined, { trim: true });
                          }
                        }}
                        placeholder="Type note for Service Manager (auto-saves as you type)..."
                        className="w-full pl-9 pr-28 py-2 bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <span
                        className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black px-2 py-0.5 rounded pointer-events-none flex items-center gap-1 ${
                          isAutoSaving
                            ? 'bg-purple-100 text-purple-800'
                            : isJustSaved
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'text-slate-400'
                        }`}
                      >
                        {isAutoSaving ? (
                          <span>Saving...</span>
                        ) : isJustSaved ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Auto-saved</span>
                          </>
                        ) : (
                          <span>Auto-save on</span>
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleFlagManager(row)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-black transition-colors cursor-pointer flex items-center justify-center gap-1.5 border shrink-0 ${
                        row.techNeedsAttention
                          ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                      title="Alert the Service Manager that you need help, approval, or an answer on this vehicle"
                    >
                      {row.techNeedsAttention ? (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Manager Flagged (Click to Clear)</span>
                        </>
                      ) : (
                        <>
                          <Flag className="w-3.5 h-3.5 text-amber-600" />
                          <span>Flag Manager</span>
                        </>
                      )}
                    </button>
                  </div>

                  {row.techNotes && (
                    <div className="text-[11px] text-slate-600 flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-700">Current Manager-Visible Note:</span>
                      <span className="font-semibold text-purple-900 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                        {row.techNotes}
                      </span>
                      {row.techNotesUpdatedAt && (
                        <span className="text-slate-400 font-mono text-[10px]">
                          ({formatShortTime(row.techNotesUpdatedAt)})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Row 4: Cause & Correction Story (Editable + AI-Assisted) */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <button
                    type="button"
                    onClick={() => toggleStoryExpand(row.id)}
                    className={`w-full px-3 py-2 rounded-lg border text-xs font-black flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      expandedStoryRowIds.has(row.id)
                        ? 'bg-purple-100 border-purple-300 text-purple-950'
                        : 'bg-purple-50/70 hover:bg-purple-100 border-purple-200 text-purple-900'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>Cause &amp; Correction Story (Type Your Own or Write with AI)</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      {(row.techCause?.trim() || row.techCorrection?.trim()) && (
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-black">
                          ✓ Story Ready
                        </span>
                      )}
                      {expandedStoryRowIds.has(row.id) ? (
                        <ChevronUp className="w-4 h-4 text-purple-700" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-purple-700" />
                      )}
                    </span>
                  </button>

                  {expandedStoryRowIds.has(row.id) && (
                    <CauseCorrectionStoryBox
                      row={row}
                      authorName={currentUser.name}
                      onPatchRow={patchRow}
                      compact
                    />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
