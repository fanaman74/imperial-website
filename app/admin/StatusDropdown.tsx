'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-900/30 text-yellow-300 border-yellow-500/50',
  confirmed: 'bg-blue-900/30 text-blue-300 border-blue-500/50',
  preparing: 'bg-orange-900/30 text-orange-300 border-orange-500/50',
  ready: 'bg-green-900/30 text-green-300 border-green-500/50',
  completed: 'bg-green-900/30 text-green-300 border-green-500/50',
  cancelled: 'bg-red-900/30 text-red-300 border-red-500/50',
};

export default function StatusDropdown({
  id, currentStatus, endpoint, options,
}: {
  id: string;
  currentStatus: string;
  endpoint: string;
  options: string[];
}) {
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleChange(newStatus: string) {
    setSaving(true);
    setStatus(newStatus);
    try {
      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) {
        setStatus(currentStatus);
      } else {
        router.refresh();
      }
    } catch {
      setStatus(currentStatus);
    } finally {
      setSaving(false);
    }
  }

  const colorClass = statusColors[status] || 'bg-surface text-text-muted border-border';

  return (
    <select
      value={status}
      onChange={(e) => handleChange(e.target.value)}
      disabled={saving}
      aria-label={`Status: ${status}`}
      className={`text-xs px-2 py-1 rounded border ${colorClass} bg-transparent cursor-pointer focus:outline-none disabled:opacity-50`}
    >
      {options.map((opt) => (
        <option key={opt} value={opt} className="bg-surface text-text">
          {opt}
        </option>
      ))}
    </select>
  );
}
