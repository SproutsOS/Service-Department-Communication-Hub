import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  RotateCcw,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { ManagerSpreadsheetRow } from '../types/managerSpreadsheet';

interface CauseCorrectionStoryBoxProps {
  row: ManagerSpreadsheetRow;
  authorName: string;
  onPatchRow: (rowId: string, patch: Partial<ManagerSpreadsheetRow>) => void | Promise<void>;
  compact?: boolean;
}

export const CauseCorrectionStoryBox: React.FC<CauseCorrectionStoryBoxProps> = ({
  row,
  authorName,
  onPatchRow,
  compact = false
}) => {
  const [causeDraft, setCauseDraft] = useState<string>(row.techCause || '');
  const [correctionDraft, setCorrectionDraft] = useState<string>(row.techCorrection || '');
  const [styleMode, setStyleMode] = useState<'CONCISE' | 'DETAILED'>('CONCISE');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [undoSnapshot, setUndoSnapshot] = useState<{ cause: string; correction: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<'cause' | 'correction' | 'both' | null>(null);

  const isEditingCauseRef = useRef(false);
  const isEditingCorrectionRef = useRef(false);
  const lastCommittedAtRef = useRef<number>(0);
  const latestValuesRef = useRef({
    cause: row.techCause || '',
    correction: row.techCorrection || ''
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync incoming Firestore changes unless the user is actively typing, saving, or recently committed
  useEffect(() => {
    const recentlyCommitted = Date.now() - lastCommittedAtRef.current < 2500;
    if (!isEditingCauseRef.current && !timerRef.current && saveState !== 'saving' && !recentlyCommitted) {
      const incoming = row.techCause || '';
      setCauseDraft(incoming);
      latestValuesRef.current.cause = incoming;
    }
  }, [row.techCause, row.id, saveState]);

  useEffect(() => {
    const recentlyCommitted = Date.now() - lastCommittedAtRef.current < 2500;
    if (!isEditingCorrectionRef.current && !timerRef.current && saveState !== 'saving' && !recentlyCommitted) {
      const incoming = row.techCorrection || '';
      setCorrectionDraft(incoming);
      latestValuesRef.current.correction = incoming;
    }
  }, [row.techCorrection, row.id, saveState]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const commitStory = useCallback(
    async (causeText: string, correctionText: string) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const now = new Date().toISOString();
      lastCommittedAtRef.current = Date.now();
      setSaveState('saving');
      await onPatchRow(row.id, {
        techCause: causeText,
        techCorrection: correctionText,
        techStoryUpdatedAt: now,
        techStoryUpdatedBy: authorName
      });
      lastCommittedAtRef.current = Date.now();
      setSaveState('saved');
      setTimeout(() => {
        setSaveState((prev) => (prev === 'saved' ? 'idle' : prev));
      }, 2000);
    },
    [row.id, authorName, onPatchRow]
  );

  const scheduleAutoSave = useCallback(
    (nextCause: string, nextCorrection: string) => {
      latestValuesRef.current = { cause: nextCause, correction: nextCorrection };
      setSaveState('saving');

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        commitStory(latestValuesRef.current.cause, latestValuesRef.current.correction);
      }, 650);
    },
    [commitStory]
  );

  const handleCauseChange = (val: string) => {
    setCauseDraft(val);
    scheduleAutoSave(val, latestValuesRef.current.correction);
  };

  const handleCorrectionChange = (val: string) => {
    setCorrectionDraft(val);
    scheduleAutoSave(latestValuesRef.current.cause, val);
  };

  const handleGenerateWithAI = async () => {
    setAiError(null);
    setIsGenerating(true);

    const previousSnapshot = {
      cause: latestValuesRef.current.cause,
      correction: latestValuesRef.current.correction
    };

    const partsPayload =
      Array.isArray(row.parts) && row.parts.length > 0
        ? row.parts.map((p) => ({
            partNumber: p.partNumber,
            partDescription: p.partDescription,
            quantity: p.quantity
          }))
        : row.partNumber
        ? [
            {
              partNumber: row.partNumber,
              partDescription: row.partDescription
            }
          ]
        : [];

    try {
      const response = await fetch('/api/generate-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roNumber: row.roNumber,
          vin: row.vin,
          customerName: row.customerName,
          techNotes: row.techNotes || '',
          existingCause: previousSnapshot.cause,
          existingCorrection: previousSnapshot.correction,
          style: styleMode,
          parts: partsPayload
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 404 && !data.error) {
          const host = typeof window !== 'undefined' ? window.location.host : 'this host';
          const isSharedHost = host.startsWith('ais-pre-');
          const isVercelHost = host.endsWith('.vercel.app');
          let healthStatus: number | null = null;
          try {
            const healthRes = await fetch('/api/health');
            healthStatus = healthRes.status;
          } catch {
            healthStatus = null;
          }

          if (isSharedHost) {
            throw new Error(
              `The Shared App link (${host}) returned 404 because its backend AI server is not active yet (health: ${healthStatus ?? 'unreachable'}). Please click Share / Republish after this update — or open the AI Studio Preview link to use the AI writer right away.`
            );
          }

          if (isVercelHost) {
            throw new Error(
              `The Vercel deployment (${host}) returned 404 for /api/generate-story (health: ${healthStatus ?? 'unreachable'}). Please redeploy from the latest code so the /api serverless functions are included, and ensure GEMINI_API_KEY is set in Vercel Environment Variables.`
            );
          }

          throw new Error(
            `AI story endpoint (/api/generate-story) returned 404 on ${host} (health: ${healthStatus ?? 'unreachable'}). Please hard-refresh the page (Ctrl+Shift+R / Cmd+Shift+R) and try again.`
          );
        }
        throw new Error(data.error || `Failed to generate story (${response.status})`);
      }

      const nextCause = (data.cause || '').trim();
      const nextCorrection = (data.correction || '').trim();

      if (previousSnapshot.cause.trim() || previousSnapshot.correction.trim()) {
        setUndoSnapshot(previousSnapshot);
      } else {
        setUndoSnapshot(null);
      }

      latestValuesRef.current = { cause: nextCause, correction: nextCorrection };
      setCauseDraft(nextCause);
      setCorrectionDraft(nextCorrection);
      await commitStory(nextCause, nextCorrection);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Unable to generate Cause & Correction.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUndoAI = async () => {
    if (!undoSnapshot) return;
    const restored = undoSnapshot;
    setUndoSnapshot(null);
    latestValuesRef.current = restored;
    setCauseDraft(restored.cause);
    setCorrectionDraft(restored.correction);
    await commitStory(restored.cause, restored.correction);
  };

  const handleCopy = async (mode: 'cause' | 'correction' | 'both') => {
    const c = causeDraft.trim();
    const corr = correctionDraft.trim();
    const textToCopy =
      mode === 'cause'
        ? c
        : mode === 'correction'
        ? corr
        : `CAUSE:\n${c}\n\nCORRECTION:\n${corr}`;

    if (!textToCopy.trim()) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedKey(mode);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === mode ? null : prev));
      }, 2000);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const hasExistingStory = Boolean(causeDraft.trim() || correctionDraft.trim());

  return (
    <div className={`bg-slate-50 border border-slate-200 rounded-xl ${compact ? 'p-2.5' : 'p-3'} space-y-2`}>
      {/* Header Row: Title, Style Selector, AI Generate, Undo, Save Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <FileText className="w-4 h-4 text-purple-600 shrink-0" />
          <span className="text-xs font-black uppercase tracking-wider text-slate-800">
            Cause &amp; Correction Story
          </span>
          <span
            className={`text-[10px] font-black px-2 py-0.5 rounded flex items-center gap-1 ${
              saveState === 'saving'
                ? 'bg-purple-100 text-purple-800'
                : saveState === 'saved'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-slate-200/70 text-slate-600'
            }`}
          >
            {saveState === 'saving' ? (
              <span>Auto-saving...</span>
            ) : saveState === 'saved' ? (
              <>
                <Check className="w-3 h-3" />
                <span>Auto-saved</span>
              </>
            ) : (
              <span>Auto-saves as you type</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setStyleMode('CONCISE')}
              className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                styleMode === 'CONCISE'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Customer Pay
            </button>
            <button
              type="button"
              onClick={() => setStyleMode('DETAILED')}
              className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                styleMode === 'DETAILED'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Warranty (3C)
            </button>
          </div>

          <button
            type="button"
            onClick={handleGenerateWithAI}
            disabled={isGenerating}
            className="px-3 py-1.5 rounded-lg text-xs font-black bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white border border-purple-700 shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
            title="Use logged part numbers and your notes to write or polish Cause & Correction"
          >
            {isGenerating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>
              {isGenerating
                ? 'Writing...'
                : hasExistingStory
                ? 'Polish with AI'
                : 'Write Cause & Correction'}
            </span>
          </button>

          {undoSnapshot && (
            <button
              type="button"
              onClick={handleUndoAI}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 transition-colors cursor-pointer flex items-center gap-1"
              title="Restore what you had before AI wrote the story"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Undo AI</span>
            </button>
          )}
        </div>
      </div>

      {aiError && (
        <div className="p-2.5 rounded-lg bg-red-50 border border-red-300 text-red-900 text-xs font-semibold flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{aiError}</span>
        </div>
      )}

      {/* Editable Cause & Correction Boxes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
              Cause
            </label>
            <button
              type="button"
              onClick={() => handleCopy('cause')}
              disabled={!causeDraft.trim()}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-purple-700 disabled:opacity-40 cursor-pointer"
            >
              {copiedKey === 'cause' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Cause</span>
                </>
              )}
            </button>
          </div>
          <textarea
            rows={compact ? 3 : 4}
            value={causeDraft}
            onFocus={() => {
              isEditingCauseRef.current = true;
            }}
            onBlur={() => {
              isEditingCauseRef.current = false;
              if (
                timerRef.current ||
                latestValuesRef.current.cause !== (row.techCause || '')
              ) {
                commitStory(latestValuesRef.current.cause, latestValuesRef.current.correction);
              }
            }}
            onChange={(e) => handleCauseChange(e.target.value)}
            placeholder="Type your Cause here, or click Write Cause & Correction to draft it from your parts & notes..."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
          />
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-black uppercase tracking-wider text-slate-700">
              Correction
            </label>
            <button
              type="button"
              onClick={() => handleCopy('correction')}
              disabled={!correctionDraft.trim()}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-purple-700 disabled:opacity-40 cursor-pointer"
            >
              {copiedKey === 'correction' ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy Correction</span>
                </>
              )}
            </button>
          </div>
          <textarea
            rows={compact ? 3 : 4}
            value={correctionDraft}
            onFocus={() => {
              isEditingCorrectionRef.current = true;
            }}
            onBlur={() => {
              isEditingCorrectionRef.current = false;
              if (
                timerRef.current ||
                latestValuesRef.current.correction !== (row.techCorrection || '')
              ) {
                commitStory(latestValuesRef.current.cause, latestValuesRef.current.correction);
              }
            }}
            onChange={(e) => handleCorrectionChange(e.target.value)}
            placeholder="Type your Correction here, or click Write Cause & Correction to draft it with part numbers..."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
          />
        </div>
      </div>

      {/* Footer: Copy Both & Last Updated */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
        <div className="text-[11px] text-slate-500 font-mono">
          {row.techStoryUpdatedAt ? (
            <span>
              Story updated{' '}
              {new Date(row.techStoryUpdatedAt).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit'
              })}
              {row.techStoryUpdatedBy ? ` by ${row.techStoryUpdatedBy}` : ''}
            </span>
          ) : (
            <span>Editable anytime — click AI button above or type directly</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => handleCopy('both')}
          disabled={!hasExistingStory}
          className="px-3 py-1 rounded-lg text-xs font-black bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white transition-colors cursor-pointer flex items-center gap-1.5"
        >
          {copiedKey === 'both' ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Copied Cause &amp; Correction</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Both for DMS</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
