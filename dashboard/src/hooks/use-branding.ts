import { useState, useEffect } from 'react'
import { BOT_API_URL } from '@/lib/config'

/**
 * The team's display name, used as content in match/VOD views
 * (e.g. "Phoenix vs Sentinels"). This is NOT app branding — the app
 * identity (Synqed) is fixed.
 */
export function useTeamName(fallback = 'Our Team') {
  const [teamName, setTeamName] = useState(fallback)

  useEffect(() => {
    const fetchTeamName = async () => {
      try {
        const response = await fetch(`${BOT_API_URL}/api/settings`)
        if (response.ok) {
          const data = await response.json()
          if (data?.branding?.teamName) setTeamName(data.branding.teamName)
        }
      } catch (error) {
        console.error('Failed to fetch team name:', error)
      }
    }
    fetchTeamName()
  }, [])

  return teamName
}
