"use client"

import { useState, useEffect } from "react"

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
        const { BOT_API_URL } = await import('@/lib/config')
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
  }, [])

  return branding
}
