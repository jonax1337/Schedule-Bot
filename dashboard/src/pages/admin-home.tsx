import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import {
  Settings,
  Actions,
  Logs,
  UserMappings,
  ScheduleEditor,
  Matches,
  Security,
  AdminDashboard,
  Statistics,
  Stratbook,
} from '@/components/admin/pages'

export function AdminHome() {
  const [searchParams] = useSearchParams()
  const currentTab = searchParams.get('tab') || 'dashboard'

  useEffect(() => {
    const titles: Record<string, string> = {
      dashboard: 'Dashboard',
      statistics: 'Statistics',
      settings: 'Settings',
      users: 'User Management',
      schedule: 'Schedule Editor',
      scrims: 'Match Management',
      stratbook: 'Stratbook',
      actions: 'Bot Actions',
      security: 'Security',
      logs: 'Logs',
    }
    document.title = `${titles[currentTab] || 'Dashboard'} - Admin Panel`
  }, [currentTab])

  return (
    <>
      {currentTab === 'dashboard' && <AdminDashboard />}
      {currentTab === 'statistics' && <Statistics />}
      {currentTab === 'settings' && <Settings />}
      {currentTab === 'users' && <UserMappings />}
      {currentTab === 'schedule' && <ScheduleEditor />}
      {currentTab === 'matches' && <Matches />}
      {currentTab === 'stratbook' && <Stratbook />}
      {currentTab === 'actions' && <Actions />}
      {currentTab === 'security' && <Security />}
      {currentTab === 'logs' && <Logs />}
    </>
  )
}
