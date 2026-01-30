"use client"

import { useState } from "react"
import {
  ChevronsUpDown,
  LogOut,
  Globe,
  Check,
} from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useTimezone, getTimezoneAbbr } from "@/lib/timezone"

export function NavUser({
  user,
  onLogout,
  role,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
  onLogout?: () => void
  role?: string
}) {
  const { isMobile } = useSidebar()
  const { userTimezone, setUserTimezone } = useTimezone()
  const [tzOpen, setTzOpen] = useState(false)
  const [tzSearch, setTzSearch] = useState("")

  const allTimezones = Intl.supportedValuesOf('timeZone')
  const filteredTimezones = tzSearch
    ? allTimezones.filter(tz => tz.toLowerCase().includes(tzSearch.toLowerCase()))
    : allTimezones

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

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
                <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  {user.email && (
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  )}
                  {role && (
                    <span className="truncate text-xs text-muted-foreground capitalize">{role}</span>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
                <Popover open={tzOpen} onOpenChange={setTzOpen}>
                  <PopoverTrigger asChild>
                    <button className="flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 text-left">Timezone</span>
                      <span className="text-xs text-muted-foreground">{getTimezoneAbbr(userTimezone)}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" side="right" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search timezone..."
                        value={tzSearch}
                        onValueChange={setTzSearch}
                      />
                      <CommandList>
                        <CommandEmpty>No timezone found.</CommandEmpty>
                        <CommandGroup>
                          {filteredTimezones.map((tz) => (
                            <CommandItem
                              key={tz}
                              value={tz}
                              onSelect={() => {
                                setUserTimezone(tz)
                                setTzOpen(false)
                                setTzSearch("")
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  userTimezone === tz ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {tz}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
