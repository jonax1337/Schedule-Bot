import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight, X, CheckCircle2, MinusCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { apiGet } from '@/lib/api'
import { getUser } from '@/lib/auth'
import { formatDateToDDMMYYYY, parseDDMMYYYY, getReasonBadgeClasses } from '@/lib/date-utils'

interface PlayerEntry {
  displayName: string
  availability: string
  role: string
  sortOrder: number
}
interface ScheduleDay {
  date: string
  reason: string
  focus: string
  players: PlayerEntry[]
}

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getAvailabilityKind(av: string): 'available' | 'unavailable' | 'none' {
  if (!av) return 'none'
  if (av === 'x' || av === 'X') return 'unavailable'
  return 'available'
}

export function UserSchedule() {
  const [viewMonth, setViewMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string>(formatDateToDDMMYYYY(new Date()))
  const currentUser = getUser()?.username ?? localStorage.getItem('selectedUser') ?? undefined

  const { data, isLoading } = useQuery({
    queryKey: ['schedule', 'next14'],
    queryFn: () => apiGet<ScheduleDay[] | { days: ScheduleDay[] }>('/api/schedule/next14'),
  })

  const schedulesByDate = useMemo(() => {
    const list: ScheduleDay[] = Array.isArray(data) ? data : data?.days ?? []
    const m = new Map<string, ScheduleDay>()
    list.forEach((s) => m.set(s.date, s))
    return m
  }, [data])

  const monthStart = startOfMonth(viewMonth)
  const monthEnd = endOfMonth(viewMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const selected = schedulesByDate.get(selectedDate) ?? null
  const selectedDateObj = parseDDMMYYYY(selectedDate)

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => setViewMonth(subMonths(viewMonth, 1))}>
            <ChevronLeft />
          </Button>
          <h2 className="text-lg font-semibold tabular-nums">{format(viewMonth, 'MMMM yyyy')}</h2>
          <Button variant="outline" size="icon-sm" onClick={() => setViewMonth(addMonths(viewMonth, 1))}>
            <ChevronRight />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const t = new Date()
              setViewMonth(t)
              setSelectedDate(formatDateToDDMMYYYY(t))
            }}
            className="ml-2"
          >
            Today
          </Button>
        </div>
        {isLoading && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />}
      </header>

      <div className="bg-border grid grid-cols-7 gap-px overflow-hidden rounded-lg border">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="bg-muted text-muted-foreground px-2 py-1.5 text-xs font-medium">
            {d}
          </div>
        ))}
        {days.map((day) => {
          const key = formatDateToDDMMYYYY(day)
          const schedule = schedulesByDate.get(key)
          const myEntry = schedule?.players.find((p) => p.displayName === currentUser)
          const myKind = myEntry ? getAvailabilityKind(myEntry.availability) : 'none'
          const available = schedule?.players.filter((p) => getAvailabilityKind(p.availability) === 'available').length ?? 0
          const total = schedule?.players.length ?? 0
          const inMonth = isSameMonth(day, viewMonth)
          const today = isToday(day)
          const isSel = isSameDay(day, selectedDateObj)

          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDate(key)}
              className={cn(
                'group/cell bg-background relative flex min-h-28 flex-col gap-1.5 p-2 text-left text-xs transition-colors hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                !inMonth && 'text-muted-foreground/60 bg-muted/20',
                isSel && 'bg-accent ring-2 ring-ring ring-inset',
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                    today && 'bg-primary text-primary-foreground',
                  )}
                >
                  {format(day, 'd')}
                </span>
                {myEntry && (
                  <span className="text-muted-foreground" aria-label={`Your status: ${myKind}`}>
                    {myKind === 'available' && <CheckCircle2 className="text-emerald-500 h-3.5 w-3.5" />}
                    {myKind === 'unavailable' && <X className="text-red-500 h-3.5 w-3.5" />}
                    {myKind === 'none' && <MinusCircle className="text-muted-foreground/50 h-3.5 w-3.5" />}
                  </span>
                )}
              </div>
              {schedule?.reason && (
                <Badge
                  variant="secondary"
                  className={cn('w-fit text-[10px] font-medium', getReasonBadgeClasses(schedule.reason))}
                >
                  {schedule.reason}
                </Badge>
              )}
              {schedule && total > 0 && (
                <div className="text-muted-foreground mt-auto text-[11px] tabular-nums">
                  {available}/{total} available
                </div>
              )}
            </button>
          )
        })}
      </div>

      <DayDetailPanel
        date={selectedDateObj}
        schedule={selected}
        currentUser={currentUser}
      />
    </div>
  )
}

function DayDetailPanel({
  date,
  schedule,
  currentUser,
}: {
  date: Date
  schedule: ScheduleDay | null
  currentUser?: string
}) {
  return (
    <section className="rounded-lg border p-4">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <h3 className="text-base font-semibold">{format(date, 'EEEE, MMMM d')}</h3>
          {schedule?.reason && (
            <Badge variant="secondary" className={cn('text-xs', getReasonBadgeClasses(schedule.reason))}>
              {schedule.reason}
            </Badge>
          )}
        </div>
        {schedule?.focus && <span className="text-muted-foreground text-sm">{schedule.focus}</span>}
      </header>

      {!schedule || schedule.players.length === 0 ? (
        <p className="text-muted-foreground mt-3 text-sm">No schedule data for this day.</p>
      ) : (
        <>
          <Separator className="my-3" />
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {schedule.players
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((p) => {
                const kind = getAvailabilityKind(p.availability)
                const isMe = p.displayName === currentUser
                return (
                  <li
                    key={p.displayName}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-sm',
                      isMe && 'bg-accent',
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-[10px]">
                          {p.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn('font-medium', isMe && 'text-foreground')}>{p.displayName}</span>
                      {isMe && <Badge variant="outline" className="h-5 text-[10px]">You</Badge>}
                      <span className="text-muted-foreground text-[11px] uppercase">{p.role}</span>
                    </div>
                    <span
                      className={cn(
                        'tabular-nums text-xs',
                        kind === 'available' && 'text-emerald-600 dark:text-emerald-400',
                        kind === 'unavailable' && 'text-red-600 dark:text-red-400',
                        kind === 'none' && 'text-muted-foreground',
                      )}
                    >
                      {kind === 'available' ? p.availability : kind === 'unavailable' ? 'unavailable' : 'no response'}
                    </span>
                  </li>
                )
              })}
          </ul>
        </>
      )}
    </section>
  )
}
