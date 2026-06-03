import { useState, useEffect } from 'react'
import { BOT_API_URL } from '@/lib/config'

interface Branding {
  teamName: string
  tagline: string
  logoUrl: string
}

export function useBranding(defaults?: Partial<Branding>) {
  const [branding, setBranding] = useState<Branding>({
    teamName: defaults?.teamName ?? 'Valorant Bot',
    tagline: defaults?.tagline ?? 'Schedule Manager',
    logoUrl: defaults?.logoUrl ?? '',
  })

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        const response = await fetch(`${BOT_API_URL}/api/settings`)
        if (response.ok) {
          const data = await response.json()
          if (data?.branding) {
            setBranding({
              teamName: data.branding.teamName || defaults?.teamName || 'Valorant Bot',
              tagline: data.branding.tagline || defaults?.tagline || 'Schedule Manager',
              logoUrl: data.branding.logoUrl || '',
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch branding:', error)
      }
    }

    fetchBranding()
  }, [defaults?.teamName, defaults?.tagline, defaults?.logoUrl])

  return branding
}
