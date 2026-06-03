import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { getAuthHeaders } from '@/lib/auth'
import { BOT_API_URL } from '@/lib/config'

interface UserInfo {
  userName: string
  discordId: string
}

export function useUserDiscordId(): { user: UserInfo | null; isLoading: boolean } {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const resolve = async () => {
      const savedUser = localStorage.getItem('selectedUser')
      if (!savedUser) {
        navigate('/login', { replace: true })
        return
      }

      try {
        const res = await fetch(`${BOT_API_URL}/api/user-mappings`, {
          headers: getAuthHeaders(),
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        const mapping = data.mappings?.find((m: { displayName: string; discordId: string }) => m.displayName === savedUser)
        if (mapping) {
          setUser({ userName: savedUser, discordId: mapping.discordId })
        }
      } catch {
        // silent
      } finally {
        setIsLoading(false)
      }
    }
    resolve()
  }, [navigate])

  return { user, isLoading }
}
