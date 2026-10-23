import React, { useState, useEffect } from 'react';

interface PriceFieldProps {
  value: number | string | undefined | null;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
  prefix?: string;
  title?: string;
  disabled?: boolean;
}

export const PriceField: React.FC<PriceFieldProps> = ({
  value,
  onChange,
  placeholder = '0.00',
  className = '',
  prefix = '$',
  title,
  disabled = false,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  
  // Format numeric value to 2 decimal places, or blank if 0 / unset
  const formatForDisplay = (val: number | string | undefined | null): string => {
    if (val === undefined || val === null || val === '') return '';
    const num = Number(val);
    if (isNaN(num) || num === 0) return '';
    return num.toFixed(2);
  };

  const [text, setText] = useState<string>(() => formatForDisplay(value));

  // Sync external value when not actively typing
  useEffect(() => {
    if (!isFocused) {
      setText(formatForDisplay(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Keep only numbers and at most 1 decimal point
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    const clean = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : raw;
    setText(clean);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // If it's 0 or 0.00, make it completely blank so user never has to backspace a 0
    if (text === '0' || text === '0.00' || text === '0.0') {
      setText('');
    } else {
      // Select all so user can immediately type a replacement number
      e.target.select();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const trimmed = text.trim();
    if (trimmed === '' || isNaN(Number(trimmed)) || Number(trimmed) === 0) {
      setText('');
      onChange(0);
    } else {
      const num = parseFloat(trimmed);
      const formatted = num.toFixed(2);
      setText(formatted);
      onChange(parseFloat(formatted));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <div className="relative w-full">
      {prefix && (
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-xs pointer-events-none select-none">
          {prefix}
        </span>
      )}
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        title={title}
        disabled={disabled}
      />
    </div>
  );
};
