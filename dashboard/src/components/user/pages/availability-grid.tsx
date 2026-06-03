import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Loader2, PlaneTakeoff, RefreshCw, Trash2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWeekdayName } from '@/lib/date-utils';

export const SLOT_COUNT = 48;
const SLOT_MINUTES = 30;
const VISIBLE_START_SLOT = 20; // 10:00
const VISIBLE_END_SLOT = SLOT_COUNT; // 24:00 (exclusive — last shown slot is 23:30)
const VISIBLE_SLOTS = VISIBLE_END_SLOT - VISIBLE_START_SLOT;

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

interface Props {
  entries: AvailabilityEntry[];
  onSaveSlots: (date: string, windows: TimeWindow[]) => void;
  onSetUnavailable: (date: string) => void;
  onClear: (date: string) => void;
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

interface DragState {
  startDateIdx: number;
  startSlot: number;
  endDateIdx: number;
  endSlot: number;
  mode: 'add' | 'remove';
}

function setsEqual(a: Set<number>, b: Set<number>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

export function AvailabilityGrid({ entries, onSaveSlots, onSetUnavailable, onClear }: Props) {
  const baseSlots = useMemo(() => entries.map(e => windowsToSlots(e.windows)), [entries]);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const entriesRef = useRef(entries);
  const baseSlotsRef = useRef(baseSlots);
  const onSaveSlotsRef = useRef(onSaveSlots);

  useEffect(() => { dragStateRef.current = dragState; }, [dragState]);
  useEffect(() => { entriesRef.current = entries; }, [entries]);
  useEffect(() => { baseSlotsRef.current = baseSlots; }, [baseSlots]);
  useEffect(() => { onSaveSlotsRef.current = onSaveSlots; }, [onSaveSlots]);

  useEffect(() => {
    function commit() {
      const ds = dragStateRef.current;
      if (!ds) return;
      const minDate = Math.min(ds.startDateIdx, ds.endDateIdx);
      const maxDate = Math.max(ds.startDateIdx, ds.endDateIdx);
      const minSlot = Math.min(ds.startSlot, ds.endSlot);
      const maxSlot = Math.max(ds.startSlot, ds.endSlot);

      const currentEntries = entriesRef.current;
      const currentBase = baseSlotsRef.current;

      for (let d = minDate; d <= maxDate; d++) {
        const entry = currentEntries[d];
        if (!entry || entry.isAbsent) continue;
        const next = new Set(currentBase[d]);
        for (let s = minSlot; s <= maxSlot; s++) {
          if (ds.mode === 'add') next.add(s);
          else next.delete(s);
        }
        const wasUnavailable = entry.value === 'x';
        const changed = !setsEqual(next, currentBase[d]) || (wasUnavailable && next.size > 0);
        if (changed) {
          onSaveSlotsRef.current(entry.date, slotsToWindows(next));
        }
      }
      setDragState(null);
    }
    function handleUp() { commit(); }
    function handleEsc(e: KeyboardEvent) { if (e.key === 'Escape') setDragState(null); }
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchend', handleUp);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchend', handleUp);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  function isInDragRect(dateIdx: number, slot: number, ds: DragState): boolean {
    const minD = Math.min(ds.startDateIdx, ds.endDateIdx);
    const maxD = Math.max(ds.startDateIdx, ds.endDateIdx);
    const minS = Math.min(ds.startSlot, ds.endSlot);
    const maxS = Math.max(ds.startSlot, ds.endSlot);
    return dateIdx >= minD && dateIdx <= maxD && slot >= minS && slot <= maxS;
  }

  function cellSelected(dateIdx: number, slot: number): boolean {
    const base = baseSlots[dateIdx]?.has(slot) ?? false;
    if (!dragState || !isInDragRect(dateIdx, slot, dragState)) return base;
    if (entries[dateIdx]?.isAbsent) return base;
    return dragState.mode === 'add';
  }

  function handleCellDown(dateIdx: number, slot: number, e: React.MouseEvent | React.TouchEvent) {
    const entry = entries[dateIdx];
    if (entry?.isAbsent) return;
    e.preventDefault();
    const base = baseSlots[dateIdx]?.has(slot) ?? false;
    setDragState({
      startDateIdx: dateIdx,
      startSlot: slot,
      endDateIdx: dateIdx,
      endSlot: slot,
      mode: base ? 'remove' : 'add',
    });
  }

  function handleCellEnter(dateIdx: number, slot: number) {
    if (!dragState) return;
    if (dragState.endDateIdx === dateIdx && dragState.endSlot === slot) return;
    setDragState({ ...dragState, endDateIdx: dateIdx, endSlot: slot });
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!dragState) return;
    const touch = e.touches[0];
    if (!touch) return;
    const el = document.elementFromPoint(touch.clientX, touch.clientY) as HTMLElement | null;
    if (!el) return;
    const cell = el.closest<HTMLElement>('[data-date-idx][data-slot]');
    if (!cell) return;
    const d = Number(cell.dataset.dateIdx);
    const s = Number(cell.dataset.slot);
    if (Number.isFinite(d) && Number.isFinite(s)) {
      handleCellEnter(d, s);
      e.preventDefault();
    }
  }

  const columns = `64px repeat(${entries.length}, minmax(56px, 1fr))`;
  const rows = `auto repeat(${VISIBLE_SLOTS}, minmax(0, 1fr))`;

  return (
    <div className="select-none flex flex-col h-full min-h-0">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3 text-xs text-muted-foreground shrink-0">
        <Legend swatch="bg-emerald-500/80" label="Available" />
        <Legend swatch="border border-border bg-background" label="Not set" />
        <Legend swatch="bg-red-500/20 border border-red-500/30" label="Unavailable" />
        <Legend swatch="bg-purple-500/15 border border-purple-500/30" label="Absent" />
        <span className="ml-auto">Drag to select • drag again to deselect • Esc to cancel</span>
      </div>

      <div className="flex-1 min-h-0 overflow-x-auto rounded-md border border-border bg-card">
        <div
          className="grid touch-none h-full min-h-[400px]"
          style={{ gridTemplateColumns: columns, gridTemplateRows: rows }}
          onTouchMove={handleTouchMove}
        >
          <div className="sticky left-0 top-0 z-30 bg-card border-b border-r border-border" />
          {entries.map((entry, dateIdx) => (
            <DayHeader
              key={entry.date}
              entry={entry}
              onSetUnavailable={() => onSetUnavailable(entry.date)}
              onClear={() => onClear(entry.date)}
              isLast={dateIdx === entries.length - 1}
            />
          ))}

          {Array.from({ length: VISIBLE_SLOTS }).map((_, i) => {
            const slot = VISIBLE_START_SLOT + i;
            const isHour = slot % 2 === 0;
            const label = isHour ? slotToTime(slot) : '';
            return (
              <SlotRow
                key={slot}
                slot={slot}
                label={label}
                isHour={isHour}
                entries={entries}
                cellSelected={cellSelected}
                onCellDown={handleCellDown}
                onCellEnter={handleCellEnter}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-3 h-3 rounded-sm', swatch)} />
      <span>{label}</span>
    </div>
  );
}

interface DayHeaderProps {
  entry: AvailabilityEntry;
  onSetUnavailable: () => void;
  onClear: () => void;
  isLast: boolean;
}

function DayHeader({ entry, onSetUnavailable, onClear, isLast }: DayHeaderProps) {
  let primary = entry.headerPrimary;
  let secondary = entry.headerSecondary;
  if (primary === undefined) {
    primary = getWeekdayName(entry.date).slice(0, 3);
  }
  if (secondary === undefined) {
    const [day, month] = entry.date.split('.');
    secondary = day && month ? `${day}.${month}` : '';
  }
  const isUnavailable = entry.value === 'x';
  const hasWindows = entry.value && !isUnavailable;

  return (
    <div
      className={cn(
        'sticky top-0 z-20 bg-card border-b border-border p-2 flex flex-col items-center gap-1',
        !isLast && 'border-r',
        entry.isAbsent && 'bg-purple-500/5',
      )}
    >
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{primary}</div>
      {secondary && <div className="text-sm font-semibold tabular-nums">{secondary}</div>}
      <div className="h-5 flex items-center gap-1">
        {entry.isSaving ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
        ) : entry.justSaved ? (
          <Check className="w-3.5 h-3.5 text-emerald-500 animate-fadeIn" />
        ) : entry.isAbsent ? (
          <span className="flex items-center gap-1 text-purple-500 text-[10px]">
            <PlaneTakeoff className="w-3 h-3" /> Absent
          </span>
        ) : isUnavailable ? (
          <span className="flex items-center gap-1 text-red-500 text-[10px]">
            <XCircle className="w-3 h-3" /> N/A
            {entry.isRecurring && <RefreshCw className="w-2.5 h-2.5 text-muted-foreground" />}
          </span>
        ) : hasWindows ? (
          entry.isRecurring ? <RefreshCw className="w-3 h-3 text-muted-foreground" /> : null
        ) : null}
      </div>
      {!entry.isAbsent && (
        <div className="flex gap-0.5">
          <Button
            size="sm"
            variant="ghost"
            onClick={onSetUnavailable}
            disabled={entry.isSaving || isUnavailable}
            title="Mark unavailable"
            className="h-6 w-6 p-0 text-red-500 hover:text-red-500 hover:bg-red-500/10"
          >
            <XCircle className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            disabled={entry.isSaving || (!entry.value)}
            title="Clear"
            className="h-6 w-6 p-0 text-muted-foreground hover:bg-muted"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

interface SlotRowProps {
  slot: number;
  label: string;
  isHour: boolean;
  entries: AvailabilityEntry[];
  cellSelected: (dateIdx: number, slot: number) => boolean;
  onCellDown: (dateIdx: number, slot: number, e: React.MouseEvent | React.TouchEvent) => void;
  onCellEnter: (dateIdx: number, slot: number) => void;
}

function SlotRow({ slot, label, isHour, entries, cellSelected, onCellDown, onCellEnter }: SlotRowProps) {
  return (
    <>
      <div
        className={cn(
          'sticky left-0 z-10 bg-card border-r border-border relative',
          isHour ? 'border-t border-border/70' : 'border-t border-border/15',
        )}
      >
        {label && (
          <span className="absolute right-2 top-0.5 text-[10px] leading-none text-muted-foreground tabular-nums">
            {label}
          </span>
        )}
      </div>
      {entries.map((entry, dateIdx) => {
        const selected = cellSelected(dateIdx, slot);
        const isAbsent = entry.isAbsent;
        const isUnavailable = entry.value === 'x' && !selected;
        return (
          <div
            key={entry.date}
            data-date-idx={dateIdx}
            data-slot={slot}
            onMouseDown={(e) => onCellDown(dateIdx, slot, e)}
            onMouseEnter={() => onCellEnter(dateIdx, slot)}
            onTouchStart={(e) => onCellDown(dateIdx, slot, e)}
            className={cn(
              'border-r border-border/40 cursor-pointer transition-colors',
              isHour ? 'border-t border-border/70' : 'border-t border-border/15',
              dateIdx === entries.length - 1 && 'border-r-0',
              isAbsent && 'bg-[repeating-linear-gradient(45deg,rgba(168,85,247,0.08)_0_6px,transparent_6px_12px)] cursor-not-allowed',
              !isAbsent && isUnavailable && 'bg-red-500/10',
              !isAbsent && selected && 'bg-emerald-500/80 hover:bg-emerald-500/90',
              !isAbsent && !selected && !isUnavailable && 'hover:bg-muted',
            )}
          />
        );
      })}
    </>
  );
}
