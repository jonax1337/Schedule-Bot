import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { UserSchedule, UserAvailability, UserAbsences, UserRecurring } from '@/components/user'
import { Matches, Statistics, Stratbook } from '@/components/admin/pages'

export function UserHome() {
  const [searchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'schedule'

  useEffect(() => {
    const titles: Record<string, string> = {
      schedule: 'Team Calendar',
      availability: 'Availability',
      recurring: 'Recurring Schedule',
      absences: 'Absences',
      matches: 'Matches',
      stratbook: 'Stratbook',
      statistics: 'Statistics',
    }
    document.title = `${titles[currentTab] || 'Team Calendar'} - Synqed`
  }, [currentTab])

  return (
    <>
      {currentTab === 'schedule' && <UserSchedule />}
      {currentTab === 'availability' && <UserAvailability />}
      {currentTab === 'recurring' && <UserRecurring />}
      {currentTab === 'absences' && <UserAbsences />}
      {currentTab === 'matches' && <Matches />}
      {currentTab === 'stratbook' && <Stratbook />}
      {currentTab === 'statistics' && <Statistics />}
    </>
  )
}
