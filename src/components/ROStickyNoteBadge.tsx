import React from 'react';
import { 
  Pin, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  User as UserIcon, 
  Clock, 
  Plus
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
 * Full Sticky Note Banner rendered at the very top of Repair Order Details / Workflow views
 */
export const ROStickyNoteBanner: React.FC<ROStickyNoteBannerProps> = ({
  roId,
  stickyNote,
  className = '',
  allowAdd = true,
}) => {
  const { openStickyNoteModal, removeROStickyNote } = useApp();

  if (!stickyNote) {
    if (!allowAdd) return null;
    return (
      <div className={`flex items-center justify-end ${className}`}>
        <button
          type="button"
          onClick={() => openStickyNoteModal(roId)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 hover:border-amber-300 text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
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

      {/* Note Content */}
      <div className="p-3">
        <p className={`text-sm font-semibold leading-relaxed whitespace-pre-wrap ${style.text}`}>
          {stickyNote.text}
        </p>

        {/* Footer Meta */}
        <div className="mt-2.5 pt-2 border-t border-black/5 flex flex-wrap items-center justify-between text-[11px] opacity-75 gap-y-1">
          <div className="flex items-center gap-1.5">
            <UserIcon className="w-3 h-3" />
            <span>
              Pinned by <strong className="font-bold">{stickyNote.authorName}</strong>
              {stickyNote.authorRole && (
                <span className="ml-1 opacity-75">
                  ({stickyNote.authorRole.replace(/_/g, ' ')})
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>
              {new Date(stickyNote.updatedAt || stickyNote.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
              {new Date(stickyNote.updatedAt || stickyNote.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Compact Sticky Note Chip for Kanban and Workstation cards
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    } else {
      openStickyNoteModal(roId);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group/chip relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-left transition-all hover:scale-[1.02] shadow-2xs cursor-pointer ${style.badge} ${
        stickyNote.isUrgent ? 'ring-1.5 ring-rose-500 animate-pulse' : ''
      } ${className}`}
      title={`Sticky Note: "${stickyNote.text}" (Click to view/edit)`}
    >
      <Pin className={`w-3 h-3 shrink-0 ${style.pin} rotate-45 group-hover/chip:rotate-12 transition-transform`} />
      <span className="text-[11px] font-bold truncate max-w-[200px]">
        {stickyNote.isUrgent && <span className="text-rose-700 mr-1">[URGENT]</span>}
        {stickyNote.text}
      </span>
    </button>
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
