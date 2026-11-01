import { Bus, CalendarClock, ChartColumn, EllipsisVertical, House, Map as MapIcon, Settings, ShieldCheck, Users } from 'lucide-react'
import { navFor } from './lib/permissions'

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

// Pages outside the tab navigation.
export const paths = { signin: '/signin', signup: '/signup', join: '/join', setup: '/setup' }
export const pathOf = (key) => nav[key]?.to ?? paths[key]
export const routeKeyOf = (pathname) => pathname.split('/')[1] ?? ''

// Which items each role sees comes from lib/permissions.js.
const itemsOf = (keys) => keys.map((key) => nav[key])
export const tabsFor = (role) => itemsOf(navFor(role).tabs)
export const moreItemsFor = (role) => itemsOf(navFor(role).more)
export const sideItemsFor = (role) => itemsOf(navFor(role).side)
