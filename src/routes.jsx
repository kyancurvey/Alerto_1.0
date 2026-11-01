import { Bus, CalendarClock, ChartColumn, EllipsisVertical, House, Map as MapIcon, Settings, ShieldCheck, Users } from 'lucide-react'

// Single source for navigation. `key` is the label under common:nav.*.
export const nav = {
  home: { to: '/home', key: 'home', icon: House },
  events: { to: '/events', key: 'events', icon: CalendarClock },
  map: { to: '/map', key: 'map', icon: MapIcon },
  vehicles: { to: '/vehicles', key: 'vehicles', icon: Bus },
  more: { to: '/more', key: 'more', icon: EllipsisVertical },
  people: { to: '/people', key: 'people', icon: Users },
  reports: { to: '/reports', key: 'reports', icon: ChartColumn },
  settings: { to: '/settings', key: 'settings', icon: Settings },
  admin: { to: '/admin', key: 'admin', icon: ShieldCheck },
}

// Phone bottom bar. More stays highlighted on the pages it holds.
export const tabs = [nav.home, nav.events, nav.map, nav.vehicles, nav.more]
export const moreItems = [nav.people, nav.reports, nav.settings]
export const moreSection = moreItems.map((item) => item.to)

// Large-screen side navigation.
export const sideItems = [nav.home, nav.events, nav.map, nav.vehicles, nav.people, nav.reports, nav.settings]
