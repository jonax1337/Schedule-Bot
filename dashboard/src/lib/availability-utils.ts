// Pure helpers and types for the availability grid (slot math, window parsing).
// Kept out of the grid component file so React Fast Refresh stays happy and so
// non-component consumers (user-availability, user-recurring) can import them
// without pulling in the component.

export const SLOT_COUNT = 48;
export const SLOT_MINUTES = 30;
export const VISIBLE_START_SLOT = 20; // 10:00
export const VISIBLE_END_SLOT = SLOT_COUNT; // 24:00 (exclusive — last shown slot is 23:30)
export const VISIBLE_SLOTS = VISIBLE_END_SLOT - VISIBLE_START_SLOT;

export interface TimeWindow {
  from: string;
  to: string;
}

export interface AvailabilityEntry {
  // Stable identifier passed back to callbacks. For dated views this is the
  // DD.MM.YYYY string; for weekly views (recurring) it's a synthetic key.
  date: string;
  value: string;
  windows: TimeWindow[];
  isSaving?: boolean;
  justSaved?: boolean;
  isRecurring?: boolean;
  isAbsent?: boolean;
  // Optional overrides for the column header. If omitted, the grid parses
  // `date` as DD.MM.YYYY and renders weekday + day.month.
  headerPrimary?: string;
  headerSecondary?: string;
}

export function slotToTime(slot: number): string {
  if (slot >= SLOT_COUNT) return '23:59';
  const h = Math.floor(slot / 2);
  const m = (slot % 2) * 30;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function timeToSlotFloor(time: string): number {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 2 + (m >= 30 ? 1 : 0);
}

function timeToSlotCeil(time: string): number {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  if (h === 23 && m === 59) return SLOT_COUNT;
  return Math.ceil((h * 60 + m) / SLOT_MINUTES);
}

export function windowsToSlots(windows: TimeWindow[]): Set<number> {
  const set = new Set<number>();
  for (const w of windows) {
    if (!w.from || !w.to) continue;
    const start = timeToSlotFloor(w.from);
    const end = timeToSlotCeil(w.to);
    for (let i = start; i < end && i < SLOT_COUNT; i++) set.add(i);
  }
  return set;
}

export function slotsToWindows(slots: Set<number>): TimeWindow[] {
  const sorted = Array.from(slots).sort((a, b) => a - b);
  const windows: TimeWindow[] = [];
  let runStart = -1;
  let runEnd = -1;
  for (const s of sorted) {
    if (runStart < 0) {
      runStart = s;
      runEnd = s;
    } else if (s === runEnd + 1) {
      runEnd = s;
    } else {
      windows.push({ from: slotToTime(runStart), to: slotToTime(runEnd + 1) });
      runStart = s;
      runEnd = s;
    }
  }
  if (runStart >= 0) {
    windows.push({ from: slotToTime(runStart), to: slotToTime(runEnd + 1) });
  }
  return windows;
}

export function parseWindows(availability: string, convertRangeToLocal: (s: string) => string): TimeWindow[] {
  if (!availability || availability === 'x' || availability === 'X') return [];
  if (!availability.includes('-')) return [];
  const local = convertRangeToLocal(availability);
  const out: TimeWindow[] = [];
  for (const seg of local.split(',')) {
    const parts = seg.trim().split('-');
    if (parts.length === 2 && parts[0] && parts[1]) {
      out.push({ from: parts[0].trim(), to: parts[1].trim() });
    }
  }
  return out;
}
