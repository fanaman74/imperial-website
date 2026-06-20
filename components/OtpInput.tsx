'use client';

import { useState, useRef, useCallback } from 'react';

interface OtpInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: string;
  /** Whether to auto-submit when all digits are entered */
  autoSubmit?: boolean;
  /** Width class for each input, e.g. 'w-11' or 'w-12' */
  inputClassName?: string;
}

/**
 * Reusable OTP input component with:
 * - Auto-advance on input
 * - Backspace to previous
 * - Paste support
 * - Auto-submit on completion
 * - Accessible ARIA labels
 */
export default function OtpInput({
  length = 6,
  onComplete,
  disabled = false,
  autoSubmit = true,
  inputClassName = 'w-11 h-14 text-center text-xl font-mono border border-border rounded focus:border-accent outline-none bg-transparent transition-colors',
}: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleInput = useCallback((index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste-like multi-digit input
      const pasted = value.replace(/\D/g, '').slice(0, length).split('');
      const next = [...digits];
      pasted.forEach((d, i) => {
        if (index + i < length) next[index + i] = d;
      });
      setDigits(next);
      const focusIdx = Math.min(index + pasted.length, length - 1);
      refs.current[focusIdx]?.focus();
      if (autoSubmit && next.every(d => d)) {
        onComplete(next.join(''));
      }
      return;
    }

    if (!/^\d?$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    if (value && index < length - 1) refs.current[index + 1]?.focus();
    if (autoSubmit && value && index === length - 1 && next.every(d => d)) {
      onComplete(next.join(''));
    }
  }, [digits, length, autoSubmit, onComplete]);

  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }, [digits]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted.length === length) {
      const arr = pasted.split('');
      setDigits(arr);
      refs.current[length - 1]?.focus();
      if (autoSubmit) onComplete(pasted);
    }
    e.preventDefault();
  }, [length, autoSubmit, onComplete]);

  /** Reset digits to empty — call via ref */
  const reset = useCallback(() => {
    setDigits(Array(length).fill(''));
  }, [length]);

  // Expose reset via ref-like pattern
  (OtpInput as any)._reset = reset;

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={length}
          value={digit}
          onChange={e => handleInput(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          disabled={disabled}
          aria-label={`OTP digit ${i + 1} of ${length}`}
          className={inputClassName}
        />
      ))}
    </div>
  );
}
