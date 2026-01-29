'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import React from 'react';
import { BOT_API_URL } from './config';

const STORAGE_KEY = 'user_timezone';
const DEFAULT_BOT_TIMEZONE = 'Europe/Berlin';

/**
 * Convert a single "HH:MM" time from one timezone to another.
 * Uses a reference date to account for DST.
 */
export function convertTime(time: string, fromTz: string, toTz: string): string {
  if (!time || fromTz === toTz) return time;
  if (!/^\d{2}:\d{2}$/.test(time)) return time;

  const [hours, minutes] = time.split(':').map(Number);
  // Use a fixed reference date (2024-06-15) to get a stable conversion
  // We create a date string in the source timezone and read it in the target timezone
  const refDate = new Date(2024, 5, 15, hours, minutes, 0);

  // Format in source timezone to get the UTC equivalent
  const sourceFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: fromTz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const sourceParts = sourceFormatter.formatToParts(refDate);
  const sourceHour = Number(sourceParts.find(p => p.type === 'hour')?.value ?? 0);
  const sourceMinute = Number(sourceParts.find(p => p.type === 'minute')?.value ?? 0);

  // Calculate the offset between what we wanted and what we got in source TZ
  const wantedMinutes = hours * 60 + minutes;
  const gotMinutes = sourceHour * 60 + sourceMinute;
  const diffMinutes = wantedMinutes - gotMinutes;

  // Adjust the reference date so that when formatted in source TZ, it shows our desired time
  const adjusted = new Date(refDate.getTime() + diffMinutes * 60 * 1000);

  // Now format in the target timezone
  const targetFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: toTz,
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const result = targetFormatter.format(adjusted);
  // en-GB with hour12:false can return "24:00" for midnight, normalize to "00:00"
  return result === '24:00' ? '00:00' : result;
}

/**
 * Convert a time range "HH:MM-HH:MM" between timezones.
 */
export function convertTimeRange(range: string, fromTz: string, toTz: string): string {
  if (!range || fromTz === toTz) return range;
  if (range === 'x' || range === 'X' || range === '') return range;

  const parts = range.split('-').map(s => s.trim());
  if (parts.length !== 2) return range;

  const start = convertTime(parts[0], fromTz, toTz);
  const end = convertTime(parts[1], fromTz, toTz);
  return `${start}-${end}`;
}

/**
 * Get abbreviated timezone name (e.g., "CET", "PST", "JST").
 */
export function getTimezoneAbbr(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(new Date());
    return parts.find(p => p.type === 'timeZoneName')?.value ?? timezone;
  } catch {
    return timezone;
  }
}

// --- React Context ---

interface TimezoneContextValue {
  userTimezone: string;
  botTimezone: string;
  setUserTimezone: (tz: string) => void;
  convertToLocal: (time: string) => string;
  convertToBot: (time: string) => string;
  convertRangeToLocal: (range: string) => string;
  convertRangeToBot: (range: string) => string;
  isConverting: boolean; // true when user TZ differs from bot TZ
  botTimezoneLoaded: boolean; // true once bot timezone has been fetched
  timezoneVersion: number; // increments on any timezone change, use as useEffect dependency to reload data
}

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [userTimezone, setUserTimezoneState] = useState<string>('');
  const [botTimezone, setBotTimezone] = useState<string>(DEFAULT_BOT_TIMEZONE);
  const [botTimezoneLoaded, setBotTimezoneLoaded] = useState(false);
  const [timezoneVersion, setTimezoneVersion] = useState(0);

  // Initialize user timezone from localStorage or browser detection
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setUserTimezoneState(stored);
    } else {
      try {
        const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
        setUserTimezoneState(detected);
      } catch {
        setUserTimezoneState(DEFAULT_BOT_TIMEZONE);
      }
    }
  }, []);

  // Fetch bot timezone from settings - and refetch periodically to pick up admin changes
  useEffect(() => {
    const fetchBotTimezone = () => {
      fetch(`${BOT_API_URL}/api/settings`)
        .then(res => res.json())
        .then(data => {
          const tz = data?.scheduling?.timezone;
          if (tz) setBotTimezone(tz);
        })
        .catch(() => {
          // keep current value
        })
        .finally(() => {
          setBotTimezoneLoaded(true);
        });
    };

    fetchBotTimezone();

    // Refetch every 5 minutes to pick up admin timezone changes without full reload
    const interval = setInterval(fetchBotTimezone, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const setUserTimezone = useCallback((tz: string) => {
    setUserTimezoneState(tz);
    localStorage.setItem(STORAGE_KEY, tz);
    setTimezoneVersion(v => v + 1);
  }, []);

  const isConverting = userTimezone !== '' && userTimezone !== botTimezone;

  const convertToLocal = useCallback(
    (time: string) => convertTime(time, botTimezone, userTimezone || botTimezone),
    [botTimezone, userTimezone]
  );

  const convertToBot = useCallback(
    (time: string) => convertTime(time, userTimezone || botTimezone, botTimezone),
    [botTimezone, userTimezone]
  );

  const convertRangeToLocal = useCallback(
    (range: string) => convertTimeRange(range, botTimezone, userTimezone || botTimezone),
    [botTimezone, userTimezone]
  );

  const convertRangeToBot = useCallback(
    (range: string) => convertTimeRange(range, userTimezone || botTimezone, botTimezone),
    [botTimezone, userTimezone]
  );

  const value = useMemo<TimezoneContextValue>(() => ({
    userTimezone: userTimezone || botTimezone,
    botTimezone,
    setUserTimezone,
    convertToLocal,
    convertToBot,
    convertRangeToLocal,
    convertRangeToBot,
    isConverting,
    botTimezoneLoaded,
    timezoneVersion,
  }), [userTimezone, botTimezone, setUserTimezone, convertToLocal, convertToBot, convertRangeToLocal, convertRangeToBot, isConverting, botTimezoneLoaded, timezoneVersion]);

  return React.createElement(TimezoneContext.Provider, { value }, children);
}

export function useTimezone(): TimezoneContextValue {
  const ctx = useContext(TimezoneContext);
  if (!ctx) {
    throw new Error('useTimezone must be used within a TimezoneProvider');
  }
  return ctx;
}
