import { useState, useEffect } from 'react';

/**
 * Indian Standard Time (IST) Utility
 * Time zone: Asia/Kolkata (UTC+5:30)
 * All dates and times across the Cinema Damage Control system
 * synchronize strictly with IST.
 */

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current Date object
 */
export function getISTNow(): Date {
  return new Date();
}

/**
 * Formats a given date to IST time string, e.g. "15:06:18 IST"
 */
export function formatISTTime(
  date: Date | string | number = new Date(),
  includeSeconds = true
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '--:-- IST';

  const timeStr = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: false,
    timeZone: IST_TIMEZONE,
  });

  return `${timeStr} IST`;
}

/**
 * Formats a given date to IST date string, e.g. "11 Sep 2026"
 */
export function formatISTDate(
  date: Date | string | number = new Date(),
  options: { day?: 'numeric' | '2-digit'; month?: 'short' | 'long' | 'numeric'; year?: 'numeric' } = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }
): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';

  return d.toLocaleDateString('en-IN', {
    day: options.day ?? '2-digit',
    month: options.month ?? 'short',
    year: options.year ?? 'numeric',
    timeZone: IST_TIMEZONE,
  });
}

/**
 * Formats combined date and time in IST, e.g. "11 Sep 2026 · 15:06:18 IST"
 */
export function formatISTFull(date: Date | string | number = new Date()): string {
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Invalid Date';

  const dateStr = formatISTDate(d);
  const timeStr = formatISTTime(d);
  return `${dateStr} · ${timeStr}`;
}

/**
 * Checks if a movie release date is within the latest 30 days relative to today in IST
 * or currently running in theatres.
 */
export function isWithinLatest30Days(releaseDateStr: string, baseDate: Date = new Date()): boolean {
  const relDate = new Date(releaseDateStr);
  if (isNaN(relDate.getTime())) return true; // default include if parse fails

  const diffMs = baseDate.getTime() - relDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Released in last 30 days (0 to 30 days ago) or opening within the immediate 3-day weekend window
  return diffDays >= -3 && diffDays <= 30;
}

/**
 * Calculates days in theatres or days until release based on IST date
 */
export function getTheatricalPaceText(releaseDateStr: string, baseDate: Date = new Date()): {
  days: number;
  label: string;
  isReleased: boolean;
  statusBadge: string;
} {
  const relDate = new Date(releaseDateStr);
  if (isNaN(relDate.getTime())) {
    return { days: 0, label: 'In Theatres', isReleased: true, statusBadge: 'Active Run' };
  }

  const diffMs = baseDate.getTime() - relDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { days: 0, label: 'Released Today', isReleased: true, statusBadge: 'Day 1 Opening' };
  }
  if (diffDays > 0) {
    return { days: diffDays, label: `Day ${diffDays} in Theatres`, isReleased: true, statusBadge: `Day ${diffDays}` };
  }
  return {
    days: Math.abs(diffDays),
    label: `Releasing in ${Math.abs(diffDays)} days`,
    isReleased: false,
    statusBadge: `Advance Open (-${Math.abs(diffDays)}d)`,
  };
}

/**
 * Live ticking IST clock hook
 */
export function useISTClock(refreshIntervalMs = 1000) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, refreshIntervalMs);
    return () => clearInterval(timer);
  }, [refreshIntervalMs]);

  return {
    date: now,
    dateStr: formatISTDate(now),
    timeStr: formatISTTime(now),
    fullStr: formatISTFull(now),
    isoIST: now.toISOString(),
  };
}
