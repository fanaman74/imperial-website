'use client';
import { useState, useMemo, useRef } from 'react';

type ReservationDict = {
  title: string;
  guests: string;
  date: string;
  time: string;
  continue: string;
  contactTitle: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests: string;
  confirm: string;
  otpSentTo: string;
  otpLabel: string;
  verify: string;
  verifying: string;
  otpError: string;
  resendCode: string;
  back: string;
  confirmedTitle: string;
  confirmedGuests: string;
  confirmedEmail: string;
  backHome: string;
};

interface ReservationProps {
  dict: ReservationDict;
  locale: string;
}

const timeSlots = [
  '11:30', '12:00', '12:30', '13:00', '13:30', '14:00',
  '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
];

const monthNamesByLocale: Record<string, string[]> = {
  fr: ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'],
  nl: ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

const dayNamesByLocale: Record<string, string[]> = {
  fr: ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'],
  nl: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export default function Reservation({ dict, locale }: ReservationProps) {
  const [step, setStep] = useState(1);
  const [guests, setGuests] = useState(2);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState('');
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const monthNames = monthNamesByLocale[locale] || monthNamesByLocale.fr;
  const dayNames = dayNamesByLocale[locale] || dayNamesByLocale.fr;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfWeek(calYear, calMonth);

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  function selectDay(day: number) {
    const d = new Date(calYear, calMonth, day);
    if (d < today) return;
    if (d.getDay() === 2) return; // Tuesday closed
    setSelectedDate(d);
  }

  function canContinue() {
    return selectedDate && selectedTime;
  }

  function canConfirm() {
    return firstName.trim() && lastName.trim() && email.trim();
  }

  async function sendOtp() {
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), name: `${firstName.trim()} ${lastName.trim()}` }),
    });
    return res.ok;
  }

  async function handleConfirm() {
    if (!canConfirm() || submitting) return;
    setSubmitting(true);
    const ok = await sendOtp();
    setSubmitting(false);
    if (!ok) {
      setError(dict.otpError || 'Failed to send code. Please try again.');
      return;
    }
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    setStep(3);
    setTimeout(() => otpRefs.current[0]?.focus(), 100);
  }

  function handleOtpInput(index: number, value: string) {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const next = [...otpDigits];
      digits.forEach((d, i) => { if (index + i < 6) next[index + i] = d; });
      setOtpDigits(next);
      const focusIdx = Math.min(index + digits.length, 5);
      otpRefs.current[focusIdx]?.focus();
      if (digits.length === 6 - index || index + digits.length >= 6) {
        const full = next.join('');
        if (full.length === 6) submitOtp(full);
      }
      return;
    }
    if (!/^\d?$/.test(value)) return;
    const next = [...otpDigits];
    next[index] = value;
    setOtpDigits(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (value && index === 5) {
      const full = next.join('');
      if (full.length === 6) submitOtp(full);
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  async function submitOtp(code: string) {
    if (verifying || !selectedDate) return;
    setVerifying(true);
    setOtpError('');

    const payload = {
      guests,
      date: selectedDate.toISOString().split('T')[0],
      time: selectedTime,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      specialRequests: specialRequests.trim(),
      locale,
      code,
    };

    try {
      const res = await fetch('/api/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setOtpError(dict.otpError);
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => otpRefs.current[0]?.focus(), 50);
      } else {
        setStep(4);
      }
    } catch {
      setOtpError(dict.otpError);
    }
    setVerifying(false);
  }

  async function handleResend() {
    setResending(true);
    await sendOtp();
    setOtpDigits(['', '', '', '', '', '']);
    setOtpError('');
    setResending(false);
    setTimeout(() => otpRefs.current[0]?.focus(), 50);
  }

  const formattedDate = selectedDate
    ? `${selectedDate.getDate()} ${monthNames[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
    : '';

  return (
    <section id="contact" className="py-24 px-6 bg-bg-alt">
      <div className="max-w-[600px] mx-auto">
        <h2 className="font-chango text-3xl md:text-4xl text-center mb-10">
          {dict.title}
        </h2>

        {step === 1 && (
          <div className="space-y-8">
            <div>
              <label className="block text-sm uppercase tracking-wider text-text-muted mb-3 text-center">{dict.guests}</label>
              <div className="flex items-center gap-4 justify-center">
                <button onClick={() => setGuests(g => Math.max(1, g - 1))} className="w-10 h-10 rounded-full border border-border text-text-muted hover:border-accent hover:text-accent transition-colors flex items-center justify-center text-lg">&minus;</button>
                <span className="font-display text-2xl w-8 text-center">{guests}</span>
                <button onClick={() => setGuests(g => Math.min(20, g + 1))} className="w-10 h-10 rounded-full border border-border text-text-muted hover:border-accent hover:text-accent transition-colors flex items-center justify-center text-lg">+</button>
              </div>
            </div>

            <div>
              <label className="block text-sm uppercase tracking-wider text-text-muted mb-3">{dict.date}</label>
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <button onClick={prevMonth} className="text-text-muted hover:text-text transition-colors p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="text-sm font-medium">{monthNames[calMonth]} {calYear}</span>
                  <button onClick={nextMonth} className="text-text-muted hover:text-text transition-colors p-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNames.map(d => (
                    <div key={d} className="text-center text-xs text-text-muted py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const date = new Date(calYear, calMonth, day);
                    const isPast = date < today;
                    const isTuesday = date.getDay() === 2;
                    const isDisabled = isPast || isTuesday;
                    const isSelected = selectedDate && selectedDate.getTime() === date.getTime();
                    return (
                      <button
                        key={day}
                        onClick={() => selectDay(day)}
                        disabled={isDisabled}
                        aria-pressed={!!isSelected}
                        aria-disabled={isDisabled}
                        className={`aspect-square flex items-center justify-center text-sm rounded transition-colors ${
                          isSelected
                            ? 'bg-accent text-bg font-medium'
                            : isDisabled
                            ? 'text-text-muted/30 cursor-not-allowed'
                            : 'hover:bg-accent/10 text-text'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm uppercase tracking-wider text-text-muted mb-3">{dict.time}</label>
              <div className="flex flex-wrap gap-2">
                {timeSlots.map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedTime(t)}
                    className={`px-3 py-1.5 text-sm border rounded transition-colors ${
                      selectedTime === t
                        ? 'border-accent bg-accent text-bg font-medium'
                        : 'border-border text-text-muted hover:border-text hover:text-text'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => canContinue() && setStep(2)}
              disabled={!canContinue()}
              className="w-full py-3 text-sm uppercase tracking-wider border border-accent text-accent hover:bg-accent hover:text-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {dict.continue}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h3 className="font-display text-xl italic mb-2">{dict.contactTitle}</h3>
            <p className="text-text-muted text-sm mb-4">{formattedDate} &middot; {selectedTime} &middot; {guests} {dict.guests.toLowerCase()}</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-muted mb-1">{dict.firstName}</label>
                <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-transparent border-b border-border py-2 text-sm focus:border-accent outline-none transition-colors" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-text-muted mb-1">{dict.lastName}</label>
                <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-transparent border-b border-border py-2 text-sm focus:border-accent outline-none transition-colors" />
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-text-muted mb-1">{dict.email}</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-transparent border-b border-border py-2 text-sm focus:border-accent outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-text-muted mb-1">{dict.phone}</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-transparent border-b border-border py-2 text-sm focus:border-accent outline-none transition-colors" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-text-muted mb-1">{dict.specialRequests}</label>
              <textarea value={specialRequests} onChange={e => setSpecialRequests(e.target.value)} rows={3} className="w-full bg-transparent border-b border-border py-2 text-sm focus:border-accent outline-none transition-colors resize-none" />
            </div>

            {error && <div className="bg-red-900/30 border border-red-500/40 text-red-300 px-4 py-3 rounded-sm text-sm">{error}</div>}

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="px-6 py-3 text-sm uppercase tracking-wider text-text-muted hover:text-text transition-colors">
                &larr;
              </button>
              <button
                onClick={handleConfirm}
                disabled={!canConfirm() || submitting}
                className="flex-1 py-3 text-sm uppercase tracking-wider border border-accent text-accent hover:bg-accent hover:text-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {submitting ? '…' : dict.confirm}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <p className="text-text-muted text-sm text-center">
              {dict.otpSentTo} <span className="text-accent">{email}</span>
            </p>

            <div>
              <label className="block text-xs uppercase tracking-wider text-text-muted mb-4 text-center">{dict.otpLabel}</label>
              <div className="flex gap-2 justify-center">
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={digit}
                    onChange={e => handleOtpInput(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    aria-label={`OTP digit ${i + 1} of 6`}
                    className="w-11 h-14 text-center text-xl font-mono border border-border rounded focus:border-accent outline-none bg-transparent transition-colors"
                  />
                ))}
              </div>
              {otpError && (
                <p className="text-red-400 text-sm text-center mt-3">{otpError}</p>
              )}
            </div>

            <button
              onClick={() => submitOtp(otpDigits.join(''))}
              disabled={otpDigits.join('').length < 6 || verifying}
              className="w-full py-3 text-sm uppercase tracking-wider border border-accent text-accent hover:bg-accent hover:text-bg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {verifying ? dict.verifying : dict.verify}
            </button>

            <div className="flex items-center justify-between pt-2">
              <button onClick={() => setStep(2)} className="text-sm text-text-muted hover:text-text transition-colors">
                &larr; {dict.back}
              </button>
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-accent hover:underline disabled:opacity-50"
              >
                {resending ? '…' : dict.resendCode}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-accent/20 text-accent mx-auto flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 className="font-display text-2xl italic">{dict.confirmedTitle}</h3>
            <p className="text-text-muted">
              {formattedDate} &middot; {selectedTime}
            </p>
            <p className="text-text-muted">
              {dict.confirmedGuests.replace('{{count}}', String(guests))}
            </p>
            <p className="text-text-muted text-sm">
              {dict.confirmedEmail} <span className="text-accent">{email}</span>
            </p>
            <a href="#accueil" className="inline-block mt-6 border border-accent text-accent px-8 py-3 text-sm uppercase tracking-wider hover:bg-accent hover:text-bg transition-colors">
              {dict.backHome}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
