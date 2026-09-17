import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  MessageSquare, 
  Send, 
  X, 
  AlertTriangle, 
  User, 
  ExternalLink, 
  Volume2, 
  VolumeX,
  Minimize2,
  Maximize2,
  Users,
  Paperclip
} from 'lucide-react';
import { UserRole, User as UserType } from '../types';

interface ShopChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_BADGE_STYLES: Record<UserRole, { label: string; badgeClass: string; avatarBg: string }> = {
  SERVICE_MANAGER: { 
    label: 'MANAGER', 
    badgeClass: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    avatarBg: 'bg-indigo-600 text-white'
  },
  SERVICE_ADVISOR: { 
    label: 'ADVISOR', 
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
    avatarBg: 'bg-blue-600 text-white'
  },
  TECHNICIAN: { 
    label: 'TECH', 
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    avatarBg: 'bg-emerald-600 text-white'
  },
  PARTS_SPECIALIST: { 
    label: 'PARTS', 
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-300',
    avatarBg: 'bg-amber-600 text-white'
  },
  SALES: { 
    label: 'SALES', 
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-300',
    avatarBg: 'bg-purple-600 text-white'
  },
};

const DIRECT_PRESETS = [
  'Got it, working on it!',
  'Can you stop by my bay/desk?',
  'Parts are ready for pickup',
  'Waiting on customer approval',
  'All done, vehicle ready'
];

export const ShopChatDrawer: React.FC<ShopChatDrawerProps> = ({ isOpen, onClose }) => {
  const { 
    currentUser, 
    users, 
    shopMessages, 
    sendShopChatMessage, 
    repairOrders, 
    setSelectedRO,
    isSoundEnabled,
    toggleSound,
    selectedChatRecipientId,
    setSelectedChatRecipientId
  } = useApp();

  const [inputText, setInputText] = useState('');
  const [selectedRoTag, setSelectedRoTag] = useState<string>('');
  const [showRoSelector, setShowRoSelector] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Recipient User details
  const activeRecipient: UserType | undefined = useMemo(() => {
    if (!selectedChatRecipientId || selectedChatRecipientId === 'ALL') return undefined;
    return users.find(u => u.id === selectedChatRecipientId);
  }, [selectedChatRecipientId, users]);

  const isGeneralChannel = !selectedChatRecipientId || selectedChatRecipientId === 'ALL';

  // Filter messages for current view
  // 1-on-1: messages between currentUser and activeRecipient
  // General: messages where recipientId is undefined or 'ALL'
  const visibleMessages = useMemo(() => {
    if (isGeneralChannel) {
      return shopMessages.filter(m => !m.recipientId || m.recipientId === 'ALL');
    }
    if (!activeRecipient) return [];
    
    return shopMessages.filter(m => 
      (m.senderId === currentUser.id && m.recipientId === activeRecipient.id) ||
      (m.senderId === activeRecipient.id && m.recipientId === currentUser.id)
    );
  }, [shopMessages, isGeneralChannel, activeRecipient, currentUser.id]);

  // List of colleagues (excluding currentUser)
  const colleagues = useMemo(() => {
    return users.filter(u => u.id !== currentUser.id && !u.isDeactivated);
  }, [users, currentUser.id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized, visibleMessages.length, selectedChatRecipientId]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendShopChatMessage(
      inputText.trim(),
      isGeneralChannel ? 'ALL' : activeRecipient?.id,
      selectedRoTag || undefined,
      isUrgent
    );

    setInputText('');
    setSelectedRoTag('');
    setShowRoSelector(false);
    setIsUrgent(false);
  };

  const handlePresetClick = (preset: string) => {
    setInputText(prev => (prev ? `${prev} ${preset}` : preset));
    inputRef.current?.focus();
  };

  const handleOpenRO = (roId: string) => {
    const target = repairOrders.find(r => r.id === roId);
    if (target) {
      setSelectedRO(target);
    }
  };

  // Active ROs for optional tag selector
  const activeROs = repairOrders.slice(0, 20);

  return (
    <div 
      id="shop-chat-drawer-container"
      className={`fixed bottom-0 right-0 z-50 transition-all duration-200 ${
        isMinimized 
          ? 'w-80 h-14' 
          : 'w-full sm:w-[480px] md:w-[520px] h-[92vh] sm:h-[660px] max-h-[88vh]'
      } bg-white shadow-2xl rounded-t-2xl sm:rounded-tl-2xl border-t-2 sm:border-l-2 sm:border-t-2 border-slate-300 flex flex-col overflow-hidden`}
    >
      {/* Header Bar */}
      <div 
        className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shrink-0 cursor-pointer select-none border-b border-slate-800"
        onClick={() => isMinimized && setIsMinimized(false)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            {isGeneralChannel ? (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                <Users className="w-4 h-4" />
              </div>
            ) : (
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shadow-sm ${
                ROLE_BADGE_STYLES[activeRecipient?.role || 'TECHNICIAN'].avatarBg
              }`}>
                {activeRecipient?.name.slice(0, 2).toUpperCase() || <User className="w-4 h-4" />}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-slate-900" />
          </div>

          <div className="truncate">
            <div className="text-sm font-bold flex items-center gap-2 truncate">
              {isGeneralChannel ? (
                <span>Shop Floor (All Team)</span>
              ) : (
                <span className="truncate">{activeRecipient?.name || 'Direct Message'}</span>
              )}
              
              {!isGeneralChannel && activeRecipient && (
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0 ${
                  ROLE_BADGE_STYLES[activeRecipient.role].badgeClass
                }`}>
                  {ROLE_BADGE_STYLES[activeRecipient.role].label}
                </span>
              )}
            </div>

            {!isMinimized && (
              <div className="text-[11px] text-slate-400 truncate">
                {isGeneralChannel ? (
                  <span>Broadcast channel • {users.length} team members</span>
                ) : (
                  <span>{activeRecipient?.title || activeRecipient?.role.replace(/_/g, ' ')} • Direct 1-on-1 Chat</span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-2">
          {/* Mute/Unmute sound */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleSound();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
            title={isSoundEnabled ? 'Audio chime active' : 'Audio chime muted'}
          >
            {isSoundEnabled ? <Volume2 className="w-4 h-4 text-blue-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Minimize / Maximize */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors"
            title={isMinimized ? 'Expand Chat' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors ml-1"
            title="Close Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex-1 flex flex-col bg-white overflow-hidden">
          {/* Conversation Sub-header with the single roster dropdown */}
          <div className="px-3.5 py-2.5 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs truncate min-w-0">
              <span className="text-slate-500 font-semibold shrink-0">Conversation:</span>
              <span className="font-bold text-slate-900 truncate">
                {isGeneralChannel ? 'Shop Floor (Everyone)' : activeRecipient?.name}
              </span>
              {!isGeneralChannel && activeRecipient?.employeeNumber && (
                <span className="text-xs font-mono font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-800 border border-blue-200 shrink-0">
                  {activeRecipient.employeeNumber}
                </span>
              )}
              {!isGeneralChannel && activeRecipient && (
                <span className="text-[11px] text-slate-500 hidden sm:inline shrink-0">
                  • {activeRecipient.title || activeRecipient.role.replace(/_/g, ' ')}
                </span>
              )}
            </div>

            {/* Colleague Roster Dropdown (to the right of conversation) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <label htmlFor="chat-roster-select" className="sr-only">Select Colleague</label>
              <select
                id="chat-roster-select"
                value={selectedChatRecipientId}
                onChange={(e) => setSelectedChatRecipientId(e.target.value)}
                className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer max-w-[200px] truncate text-slate-800"
                title="Select Person or Channel to Chat With"
              >
                <option value="ALL">📢 Shop Floor (Everyone)</option>
                {colleagues.map(c => (
                  <option key={c.id} value={c.id}>
                    👤 {c.name}{c.employeeNumber ? ` ${c.employeeNumber}` : ''} ({ROLE_BADGE_STYLES[c.role]?.label || c.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {visibleMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  {isGeneralChannel 
                    ? 'No shop floor messages yet' 
                    : `No message history with ${activeRecipient?.name}`}
                </p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[280px]">
                  {isGeneralChannel
                    ? 'Send an announcement to technicians, advisors, and parts staff.'
                    : `Send a direct 1-on-1 message to ${activeRecipient?.name}.`}
                </p>
              </div>
            ) : (
              visibleMessages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                const senderUser = users.find(u => u.id === msg.senderId);
                const senderEmpNum = senderUser?.employeeNumber;
                const roleConfig = ROLE_BADGE_STYLES[msg.senderRole] || {
                  label: msg.senderRole,
                  badgeClass: 'bg-slate-100 text-slate-800 border-slate-300',
                };
                const msgTime = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    {/* Sender details & role badge */}
                    <div className="flex items-center gap-1.5 px-1">
                      <span className="text-[11px] font-bold text-slate-700">
                        {isMe ? 'You' : msg.senderName}
                      </span>
                      {senderEmpNum && (
                        <span className="text-[11px] font-mono font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                          {senderEmpNum}
                        </span>
                      )}
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${roleConfig.badgeClass}`}>
                        {roleConfig.label}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {msgTime}
                      </span>
                    </div>

                    {/* Message Bubble */}
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
                        msg.isUrgent
                          ? 'bg-red-50 border-2 border-red-500 text-red-950 ring-2 ring-red-400/20'
                          : isMe
                          ? 'bg-blue-600 text-white rounded-tr-xs'
                          : 'bg-white border-2 border-slate-200 text-slate-900 rounded-tl-xs'
                      }`}
                    >
                      {msg.isUrgent && (
                        <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase text-red-600 mb-1">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          <span>URGENT DIRECT MESSAGE</span>
                        </div>
                      )}

                      <div className="break-words whitespace-pre-wrap font-medium">
                        {msg.content}
                      </div>

                      {/* Optional Tagged RO Pill */}
                      {msg.roId && (
                        <div className="mt-2 pt-1.5 border-t border-black/10">
                          <button
                            type="button"
                            onClick={() => handleOpenRO(msg.roId!)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors ${
                              isMe && !msg.isUrgent
                                ? 'bg-blue-700/80 hover:bg-blue-800 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 text-blue-700'
                            }`}
                          >
                            <span>Ref: RO #{msg.roId}</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Presets Bar */}
          <div className="px-3 py-1.5 bg-slate-100 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0 no-scrollbar">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 shrink-0">
              Quick:
            </span>
            {DIRECT_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className="bg-white hover:bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded-md border border-slate-300 shrink-0 text-[10px] transition-colors cursor-pointer"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Optional Tag RO Accordion (collapsed by default, not required) */}
          {showRoSelector && (
            <div className="px-3 py-2 bg-blue-50 border-t border-blue-200 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-[11px] font-bold text-blue-900 shrink-0">Optional RO Reference:</span>
                <select
                  value={selectedRoTag}
                  onChange={(e) => setSelectedRoTag(e.target.value)}
                  className="w-full text-xs font-medium px-2 py-1 bg-white border border-blue-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 truncate"
                >
                  <option value="">No RO (General Discussion)</option>
                  {activeROs.map(ro => (
                    <option key={ro.id} value={ro.id}>
                      #{ro.id} - {ro.customerName} ({ro.vehicle.year} {ro.vehicle.make} {ro.vehicle.model})
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRoTag('');
                  setShowRoSelector(false);
                }}
                className="text-blue-700 hover:text-blue-900 p-1 cursor-pointer"
                title="Cancel RO reference"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Input & Form Bar */}
          <form 
            onSubmit={handleSend}
            className="p-3 bg-white border-t border-slate-200 space-y-2 shrink-0"
          >
            <div className="flex items-center gap-2">
              {/* Optional Tag RO button */}
              <button
                type="button"
                onClick={() => setShowRoSelector(!showRoSelector)}
                className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0 ${
                  selectedRoTag || showRoSelector
                    ? 'bg-blue-100 border-blue-400 text-blue-800'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100'
                }`}
                title="Optionally reference a Repair Order"
              >
                <Paperclip className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">
                  {selectedRoTag ? `RO #${selectedRoTag}` : '+RO'}
                </span>
              </button>

              {/* Urgent Checkbox */}
              <label className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                isUrgent 
                  ? 'bg-red-100 text-red-700 border border-red-300' 
                  : 'text-slate-600 hover:bg-slate-100 border border-slate-300'
              }`}>
                <input
                  type="checkbox"
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="rounded text-red-600 focus:ring-red-500 w-3.5 h-3.5"
                />
                <span className="flex items-center gap-0.5 text-[11px]">
                  <AlertTriangle className="w-3 h-3 text-red-600" />
                  Urgent
                </span>
              </label>

              {/* Message Input */}
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={isGeneralChannel ? "Message all staff..." : `Message ${activeRecipient?.name || 'colleague'}...`}
                className="flex-1 text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shrink-0 shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
