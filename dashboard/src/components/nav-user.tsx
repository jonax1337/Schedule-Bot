import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogOutIcon, UserIcon } from 'lucide-react'

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

export function NavUser({ user, onLogout }: NavUserProps) {
  const initials = (user.name?.charAt(0) ?? '?').toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Avatar className="size-8 cursor-pointer">
          <AvatarImage src={user.avatar || undefined} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem className="flex items-center justify-start gap-2">
          <DropdownMenuLabel className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage src={user.avatar || undefined} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div>
              <span className="text-foreground font-medium">{user.name}</span>
              <br />
              <div className="text-muted-foreground max-w-full overflow-hidden text-xs overflow-ellipsis whitespace-nowrap">
                {user.role || user.email || ''}
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <UserIcon />
            Profile
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {onLogout && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="w-full cursor-pointer"
                variant="destructive"
                onSelect={onLogout}
              >
                <LogOutIcon />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
