import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, GripVertical } from 'lucide-react';
import { ShopChatMessage } from '../types';

interface DraggableShopChatButtonProps {
  unreadShopCount: number;
  latestUnreadShopMessage: ShopChatMessage | null;
  onOpenChat: () => void;
  isChatBoxOpen: boolean;
}

interface Position {
  x: number;
  y: number;
}

const STORAGE_KEY = 'shop_chat_btn_position';

export const DraggableShopChatButton: React.FC<DraggableShopChatButtonProps> = ({
  unreadShopCount,
  latestUnreadShopMessage,
  onOpenChat,
  isChatBoxOpen,
}) => {
  const [position, setPosition] = useState<Position | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isDragging, setIsDragging] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  } | null>(null);

  // Keep button within screen bounds on resize
  const clampPosition = useCallback((x: number, y: number, elemWidth = 140, elemHeight = 48): Position => {
    const maxX = Math.max(0, window.innerWidth - elemWidth - 12);
    const maxY = Math.max(0, window.innerHeight - elemHeight - 12);
    return {
      x: Math.min(Math.max(12, x), maxX),
      y: Math.min(Math.max(12, y), maxY),
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setPosition(prev => {
        if (!prev) return null;
        const rect = buttonRef.current?.getBoundingClientRect();
        return clampPosition(prev.x, prev.y, rect?.width || 140, rect?.height || 48);
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPosition]);

  const handlePointerDown = (clientX: number, clientY: number, buttonIndex = 0) => {
    // Only respond to primary left mouse button (0)
    if (buttonIndex !== 0) return;

    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: rect.left,
      initialY: rect.top,
      hasMoved: false,
    };
  };

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!dragStartRef.current) return;

    const dx = clientX - dragStartRef.current.startX;
    const dy = clientY - dragStartRef.current.startY;

    // Movement threshold of 4px to distinguish between click and drag
    if (!dragStartRef.current.hasMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      dragStartRef.current.hasMoved = true;
      setIsDragging(true);
    }

    if (dragStartRef.current.hasMoved) {
      const rect = buttonRef.current?.getBoundingClientRect();
      const w = rect?.width || 140;
      const h = rect?.height || 48;
      const newX = dragStartRef.current.initialX + dx;
      const newY = dragStartRef.current.initialY + dy;
      const clamped = clampPosition(newX, newY, w, h);
      setPosition(clamped);
    }
  }, [clampPosition]);

  const handlePointerUp = useCallback(() => {
    if (!dragStartRef.current) return;

    const hadMoved = dragStartRef.current.hasMoved;
    dragStartRef.current = null;
    setIsDragging(false);

    if (hadMoved) {
      // Save position to localStorage
      setPosition(currentPos => {
        if (currentPos) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentPos));
          } catch {
            // ignore
          }
        }
        return currentPos;
      });
    } else {
      // Single click without dragging -> open chat drawer
      onOpenChat();
    }
  }, [onOpenChat]);

  // Global mouse movement / mouseup listeners during dragging
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      handlePointerUp();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // Global touch movement listeners for touch screens
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (dragStartRef.current && e.touches.length > 0) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = () => {
      handlePointerUp();
    };

    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [handlePointerMove, handlePointerUp]);

  if (isChatBoxOpen) return null;

  // Custom positioning or fallback default bottom-right
  const style: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none',
        zIndex: 50,
      }
    : {
        position: 'fixed',
        bottom: '4rem',
        right: '1.25rem',
        touchAction: 'none',
        zIndex: 50,
      };

  return (
    <button
      ref={buttonRef}
      id="floating-chat-launcher-btn"
      type="button"
      style={style}
      onMouseDown={e => {
        handlePointerDown(e.clientX, e.clientY, e.button);
      }}
      onTouchStart={e => {
        if (e.touches.length > 0) {
          handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, 0);
        }
      }}
      className={`text-white p-2.5 sm:px-4 sm:py-3 rounded-full shadow-2xl border-2 border-white flex items-center gap-2 select-none transition-transform ${
        isDragging
          ? 'cursor-grabbing scale-105 ring-4 ring-blue-400 shadow-blue-900/50'
          : 'cursor-grab hover:scale-105 active:scale-95'
      } ${
        unreadShopCount > 0
          ? 'bg-blue-700 ring-4 ring-amber-400/50 shadow-amber-500/20'
          : 'bg-blue-600 hover:bg-blue-700'
      }`}
      title={
        latestUnreadShopMessage
          ? `New message from ${latestUnreadShopMessage.senderName}: "${latestUnreadShopMessage.content}" - Click to open, hold left mouse button to drag`
          : 'Shop Chat (Click to open, hold left mouse button to drag anywhere)'
      }
    >
      <GripVertical className="w-3.5 h-3.5 text-blue-200/80 shrink-0 hidden sm:inline" />

      <div className="relative">
        <MessageSquare className={`w-5 h-5 text-white ${unreadShopCount > 0 ? 'animate-bounce' : ''}`} />
        {unreadShopCount > 0 && (
          <span className="absolute -top-2.5 -right-2.5 bg-red-600 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
            {unreadShopCount > 9 ? '9+' : unreadShopCount}
          </span>
        )}
      </div>

      <span className="hidden sm:inline text-xs font-bold truncate max-w-[200px]">
        {latestUnreadShopMessage ? `Chat from ${latestUnreadShopMessage.senderName}` : 'Shop Chat'}
      </span>

      {unreadShopCount > 0 && (
        <span className="hidden sm:inline-flex text-[10px] font-extrabold bg-red-600 text-white px-1.5 py-0.5 rounded-full shadow-xs">
          {unreadShopCount}
        </span>
      )}
    </button>
  );
};
