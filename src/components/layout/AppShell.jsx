import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopBar from './TopBar'
import BottomTabs from './BottomTabs'
import SideNav from './SideNav'
import './layout.css'

export default function AppShell() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="shell">
      <TopBar />
      <SideNav />
      <main className="shell__main">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  )
}
