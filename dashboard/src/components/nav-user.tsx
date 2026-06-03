import { useMemo, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { ChevronsUpDownIcon, LogOutIcon, GlobeIcon, CheckIcon } from 'lucide-react'
import { useTimezone, getTimezoneAbbr } from '@/lib/timezone'

export interface NavUserInfo {
  name: string
  email?: string
  avatar?: string
  role?: string
}

interface NavUserProps {
  user: NavUserInfo
  onLogout?: () => void
}

const ALL_TIMEZONES = (() => {
  try {
    return Intl.supportedValuesOf('timeZone')
  } catch {
    return ['UTC', 'Europe/Berlin', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Tokyo']
  }
})()

export function NavUser({ user, onLogout }: NavUserProps) {
  const { isMobile } = useSidebar()
  const { userTimezone, setUserTimezone } = useTimezone()
  const [tzSearch, setTzSearch] = useState('')

  const initials = (user.name?.charAt(0) ?? '?').toUpperCase()
  const subline = user.role || user.email || ''
  const tzAbbr = getTimezoneAbbr(userTimezone)

  const filteredZones = useMemo(() => {
    if (!tzSearch) return ALL_TIMEZONES.slice(0, 60)
    const q = tzSearch.toLowerCase()
    return ALL_TIMEZONES.filter((tz) => tz.toLowerCase().includes(q)).slice(0, 60)
  }, [tzSearch])

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                {subline && <span className="truncate text-xs">{subline}</span>}
              </div>
              <ChevronsUpDownIcon className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.name}</span>
                  {subline && <span className="truncate text-xs">{subline}</span>}
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <GlobeIcon />
                <span>Timezone</span>
                <span className="text-muted-foreground ml-auto pl-2 text-xs tabular-nums">{tzAbbr}</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="p-0">
                <Command shouldFilter={false} className="w-72">
                  <CommandInput placeholder="Search timezone…" value={tzSearch} onValueChange={setTzSearch} />
                  <CommandList className="max-h-72">
                    <CommandEmpty>No timezone matches.</CommandEmpty>
                    <CommandGroup>
                      {filteredZones.map((tz) => (
                        <CommandItem
                          key={tz}
                          value={tz}
                          onSelect={() => {
                            setUserTimezone(tz)
                            setTzSearch('')
                          }}
                        >
                          <CheckIcon className={tz === userTimezone ? 'opacity-100' : 'opacity-0'} />
                          {tz}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {onLogout && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={onLogout}>
                  <LogOutIcon />
                  Log out
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
