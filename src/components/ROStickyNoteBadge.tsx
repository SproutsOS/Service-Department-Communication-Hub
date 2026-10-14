import React, { useState } from 'react';
import { 
  Pin, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  User as UserIcon, 
  Clock, 
  Plus,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ROStickyNote, StickyNoteColor } from '../types';

interface ROStickyNoteBannerProps {
  roId: string;
  stickyNote?: ROStickyNote | null;
  className?: string;
  allowAdd?: boolean;
}

const COLOR_STYLES: Record<StickyNoteColor, {
  container: string;
  header: string;
  text: string;
  pin: string;
  badge: string;
  border: string;
}> = {
  yellow: {
    container: 'bg-amber-50/95 border-amber-300 shadow-amber-900/10',
    header: 'bg-amber-100/90 border-amber-300/80 text-amber-900',
    text: 'text-amber-950',
    pin: 'text-amber-600 fill-amber-500',
    badge: 'bg-amber-200/90 text-amber-900 border-amber-300',
    border: 'border-amber-300',
  },
  red: {
    container: 'bg-rose-50/95 border-rose-300 shadow-rose-900/10',
    header: 'bg-rose-100/90 border-rose-300/80 text-rose-900',
    text: 'text-rose-950',
    pin: 'text-rose-600 fill-rose-500',
    badge: 'bg-rose-200/90 text-rose-900 border-rose-300',
    border: 'border-rose-300',
  },
  blue: {
    container: 'bg-sky-50/95 border-sky-300 shadow-sky-900/10',
    header: 'bg-sky-100/90 border-sky-300/80 text-sky-900',
    text: 'text-sky-950',
    pin: 'text-sky-600 fill-sky-500',
    badge: 'bg-sky-200/90 text-sky-900 border-sky-300',
    border: 'border-sky-300',
  },
  green: {
    container: 'bg-emerald-50/95 border-emerald-300 shadow-emerald-900/10',
    header: 'bg-emerald-100/90 border-emerald-300/80 text-emerald-900',
    text: 'text-emerald-950',
    pin: 'text-emerald-600 fill-emerald-500',
    badge: 'bg-emerald-200/90 text-emerald-900 border-emerald-300',
    border: 'border-emerald-300',
  },
  purple: {
    container: 'bg-purple-50/95 border-purple-300 shadow-purple-900/10',
    header: 'bg-purple-100/90 border-purple-300/80 text-purple-900',
    text: 'text-purple-950',
    pin: 'text-purple-600 fill-purple-500',
    badge: 'bg-purple-200/90 text-purple-900 border-purple-300',
    border: 'border-purple-300',
  },
  orange: {
    container: 'bg-orange-50/95 border-orange-300 shadow-orange-900/10',
    header: 'bg-orange-100/90 border-orange-300/80 text-orange-900',
    text: 'text-orange-950',
    pin: 'text-orange-600 fill-orange-500',
    badge: 'bg-orange-200/90 text-orange-900 border-orange-300',
    border: 'border-orange-300',
  },
};

/**
 * Cleanly format ISO timestamp into date and time
 */
export const formatStickyDateTime = (isoString?: string): string => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} at ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
};

/**
 * Full Sticky Note Banner rendered at the very top of Repair Order Details / Workflow views
 */
export const ROStickyNoteBanner: React.FC<ROStickyNoteBannerProps> = ({
  roId,
  stickyNote,
  className = '',
  allowAdd = true,
}) => {
  const { openStickyNoteModal, removeROStickyNote } = useApp();
  const [showHistory, setShowHistory] = useState(false);

  if (!stickyNote) {
    if (!allowAdd) return null;
    return (
      <div className={`flex items-center justify-end ${className}`}>
        <button
          type="button"
          onClick={() => openStickyNoteModal(roId)}
          className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs text-xs font-bold transition-all cursor-pointer hover:shadow-xs active:scale-98"
          title="Pin a digital sticky note to this Repair Order"
        >
          <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-500 rotate-45 group-hover:scale-110 transition-transform" />
          <span>+ Add Sticky Note</span>
        </button>
      </div>
    );
  }

  const colorKey = stickyNote.color || 'yellow';
  const style = COLOR_STYLES[colorKey] || COLOR_STYLES.yellow;

  const isEdited = Boolean(
    stickyNote.lastEditedAt || 
    (stickyNote.editHistory && stickyNote.editHistory.length > 0) ||
    (stickyNote.updatedAt && stickyNote.updatedAt !== stickyNote.createdAt)
  );

  const editTimestamp = stickyNote.lastEditedAt || stickyNote.updatedAt;
  const editorName = stickyNote.lastEditedByName || stickyNote.authorName;
  const editCount = stickyNote.editHistory?.length || (isEdited ? 1 : 0);

  return (
    <div 
      className={`relative rounded-xl border-2 shadow-md transition-all overflow-hidden ${style.container} ${
        stickyNote.isUrgent ? 'ring-2 ring-rose-500 ring-offset-1' : ''
      } ${className}`}
    >
      {/* Top Tape / Header Bar */}
      <div className={`px-3 py-1.5 border-b flex items-center justify-between text-xs font-bold ${style.header}`}>
        <div className="flex items-center gap-2">
          <Pin className={`w-4 h-4 ${style.pin} rotate-45`} />
          <span className="tracking-wide">STICKY NOTE</span>
          {stickyNote.isUrgent && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse">
              <AlertTriangle className="w-2.5 h-2.5" />
              URGENT
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => openStickyNoteModal(roId)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded hover:bg-black/10 text-slate-700 hover:text-slate-900 text-[11px] font-semibold transition-colors cursor-pointer"
            title="Edit sticky note"
          >
            <Edit3 className="w-3 h-3" />
            <span>Edit</span>
          </button>
          <button
            type="button"
            onClick={() => removeROStickyNote(roId)}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-rose-100 text-rose-700 hover:text-rose-900 text-[11px] font-semibold transition-colors cursor-pointer"
            title="Peel off / remove sticky note"
          >
            <Trash2 className="w-3 h-3" />
            <span>Peel Off</span>
          </button>
        </div>
      </div>

      {/* Note Content - Full text without truncation */}
      <div className="p-3">
        <p className={`text-sm font-semibold leading-relaxed whitespace-pre-wrap break-words ${style.text}`}>
          {stickyNote.text}
        </p>

        {/* Footer Meta: Original Timestamp + Edit Timestamp */}
        <div className="mt-2.5 pt-2 border-t border-black/10 space-y-1.5 text-[11px]">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 opacity-80">
            {/* Created Timestamp */}
            <div className="flex items-center gap-1.5">
              <UserIcon className="w-3 h-3 text-slate-700 shrink-0" />
              <span>
                Pinned by <strong className="font-bold text-slate-900">{stickyNote.authorName}</strong>
                {stickyNote.authorRole && (
                  <span className="ml-1 opacity-75">
                    ({stickyNote.authorRole.replace(/_/g, ' ')})
                  </span>
                )}
              </span>
              <span className="opacity-40">•</span>
              <span className="flex items-center gap-1 text-slate-700">
                <Clock className="w-3 h-3 shrink-0" />
                <span>{formatStickyDateTime(stickyNote.createdAt)}</span>
              </span>
            </div>

            {/* Edited Badge & Timestamp */}
            {isEdited && editTimestamp && (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-black/10 text-slate-900 font-extrabold text-[10px] tracking-wide">
                  <Edit3 className="w-2.5 h-2.5 text-slate-700" />
                  <span>Edited {formatStickyDateTime(editTimestamp)}</span>
                  {editorName && (
                    <span className="font-normal opacity-85">by {editorName}</span>
                  )}
                  {editCount > 1 && (
                    <span className="ml-0.5 px-1 rounded-full bg-slate-800 text-white text-[9px] font-black">
                      {editCount}
                    </span>
                  )}
                </span>

                {stickyNote.editHistory && stickyNote.editHistory.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setShowHistory(prev => !prev)}
                    className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline flex items-center gap-0.5 cursor-pointer ml-1"
                  >
                    <History className="w-2.5 h-2.5" />
                    <span>{showHistory ? 'Hide edits' : `View ${stickyNote.editHistory.length} edits`}</span>
                    {showHistory ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Expanded Edit History Log */}
          {showHistory && stickyNote.editHistory && stickyNote.editHistory.length > 0 && (
            <div className="mt-2 p-2 rounded-lg bg-black/5 border border-black/10 space-y-1.5 animate-in fade-in duration-150">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1">
                <History className="w-3 h-3" />
                <span>Sticky Note Edit History</span>
              </div>
              <div className="space-y-1 divide-y divide-black/5">
                <div className="text-[10px] text-slate-600 pt-0.5">
                  <span className="font-bold text-slate-800">Original Pin:</span> {formatStickyDateTime(stickyNote.createdAt)} by {stickyNote.authorName}
                </div>
                {stickyNote.editHistory.map((item, idx) => (
                  <div key={idx} className="text-[10px] text-slate-700 pt-1 flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900">Edit #{idx + 1}:</span> {formatStickyDateTime(item.editedAt)} by <span className="font-semibold">{item.editedByName}</span>
                      {item.previousText && (
                        <div className="text-[9px] text-slate-500 italic mt-0.5 line-clamp-1">
                          Previous: "{item.previousText}"
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Sticky Note Component for Small Cards (Kanban, Workstations, Tech & Parts lists)
 * Fully displays the whole note without truncation, with original timestamp + edit timestamp
 */
export const ROStickyNoteChip: React.FC<{
  roId: string;
  stickyNote?: ROStickyNote | null;
  className?: string;
  onClick?: () => void;
}> = ({ roId, stickyNote, className = '', onClick }) => {
  const { openStickyNoteModal } = useApp();

  if (!stickyNote) return null;

  const colorKey = stickyNote.color || 'yellow';
  const style = COLOR_STYLES[colorKey] || COLOR_STYLES.yellow;

  const isEdited = Boolean(
    stickyNote.lastEditedAt || 
    (stickyNote.editHistory && stickyNote.editHistory.length > 0) ||
    (stickyNote.updatedAt && stickyNote.updatedAt !== stickyNote.createdAt)
  );

  const editTimestamp = stickyNote.lastEditedAt || stickyNote.updatedAt;
  const editorName = stickyNote.lastEditedByName || stickyNote.authorName;
  const editCount = stickyNote.editHistory?.length || (isEdited ? 1 : 0);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      openStickyNoteModal(roId);
    }
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e as any);
        }
      }}
      className={`group/chip relative w-full text-left rounded-lg border-2 p-2.5 transition-all hover:scale-[1.01] hover:shadow-xs shadow-2xs cursor-pointer ${style.badge} ${
        stickyNote.isUrgent ? 'ring-2 ring-rose-500 animate-pulse' : ''
      } ${className}`}
      title={`Sticky Note (Click to view/edit)`}
    >
      {/* Header bar of sticky note on small card */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5 pb-1 border-b border-black/10">
        <div className="flex items-center gap-1.5 min-w-0">
          <Pin className={`w-3.5 h-3.5 shrink-0 ${style.pin} rotate-45 group-hover/chip:rotate-12 transition-transform`} />
          <span className="text-[10px] font-black uppercase tracking-wider opacity-90 truncate">
            {stickyNote.authorName ? `Note • ${stickyNote.authorName}` : 'STICKY NOTE'}
          </span>
          {stickyNote.isUrgent && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-black uppercase tracking-wider">
              <AlertTriangle className="w-2.5 h-2.5" />
              URGENT
            </span>
          )}
        </div>
        <span className="text-[9px] opacity-75 font-bold group-hover/chip:opacity-100 flex items-center gap-0.5 shrink-0 text-slate-800">
          <Edit3 className="w-2.5 h-2.5" />
          <span>Edit</span>
        </span>
      </div>

      {/* WHOLE NOTE ON SMALL CARD: Display the entire note without any line-clamp or truncation */}
      <p className={`text-xs font-bold leading-snug whitespace-pre-wrap break-words ${style.text}`}>
        {stickyNote.text}
      </p>

      {/* FOOTER TIMESTAMPS: Created timestamp AND edit timestamp when note has been edited */}
      <div className="mt-2 pt-1.5 border-t border-black/10 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px] opacity-80">
        {/* Original Pinned Timestamp */}
        <span className="flex items-center gap-1 font-medium text-slate-800">
          <Clock className="w-2.5 h-2.5 shrink-0 text-slate-600" />
          <span>Pinned: {formatStickyDateTime(stickyNote.createdAt)}</span>
        </span>

        {/* Edit Timestamp (Added as an edit when edited) */}
        {isEdited && editTimestamp && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/10 text-slate-900 font-bold text-[9px]">
            <Edit3 className="w-2.5 h-2.5 text-slate-700 shrink-0" />
            <span>
              Edited: {formatStickyDateTime(editTimestamp)}
              {editorName ? ` by ${editorName.split(' ')[0]}` : ''}
              {editCount > 1 ? ` (${editCount})` : ''}
            </span>
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Quick Pin Button to attach a sticky note to any RO card
 */
export const AddStickyNoteButton: React.FC<{
  roId: string;
  hasNote?: boolean;
  className?: string;
}> = ({ roId, hasNote, className = '' }) => {
  const { openStickyNoteModal } = useApp();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        openStickyNoteModal(roId);
      }}
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
        hasNote 
          ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300' 
          : 'bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-800 hover:border-amber-300 border border-transparent'
      } ${className}`}
      title={hasNote ? 'Edit Sticky Note' : 'Pin Sticky Note to RO'}
    >
      <Pin className={`w-3 h-3 rotate-45 ${hasNote ? 'text-amber-600 fill-amber-500' : 'text-slate-400'}`} />
      <span>{hasNote ? 'Sticky Note' : '+ Note'}</span>
    </button>
  );
};
