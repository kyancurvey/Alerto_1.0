// The only place where roles map to capabilities, navigation and landing screens.
// Rules follow spec Section 4.2 (roles) and 4.3 (tabs). Nothing else in the app checks a role name.
// Route keys are the keys of `nav` in routes.jsx; this file knows no paths.

export const ROLES = ['driver', 'family', 'admin']

const CAPABILITIES = {
  driver: [
    'addVehicle', 'claimUnit', 'changeVehicleSettings', 'manageContacts', 'manageFamily', 'manageNotifications',
    'testAlarm', 'testSms', 'reviewEvents', 'exportEvents', 'viewReports', 'runScenarios',
  ],
  family: ['acknowledgeEvents', 'addNotes', 'callContacts', 'viewReports', 'runScenarios'],
  admin: ['viewAllUnits', 'viewLogs', 'editThresholds', 'exportResearchData', 'viewReports'],
}

export const can = (role, capability) => Boolean(CAPABILITIES[role]?.includes(capability))

// Phone bottom bar, the pages under More, and the large-screen side navigation.
const NAVIGATION = {
  driver: {
    tabs: ['home', 'events', 'map', 'vehicles', 'more'],
    more: ['people', 'reports', 'settings'],
    side: ['home', 'events', 'map', 'vehicles', 'people', 'reports', 'settings'],
  },
  admin: {
    tabs: ['admin', 'events', 'map', 'more'],
    more: ['reports', 'settings'],
    side: ['admin', 'events', 'map', 'reports', 'settings'],
  },
}
// A family member sees the same tabs as a driver; what they can change differs (see CAPABILITIES).
NAVIGATION.family = NAVIGATION.driver

export const navFor = (role) => NAVIGATION[role] ?? { tabs: [], more: [], side: [] }

export function canOpen(role, routeKey) {
  const { tabs, more, side } = navFor(role)
  return [...tabs, ...more, ...side].includes(routeKey)
}

// A driver without a vehicle has not finished first-time setup.
export const needsSetup = (role, hasVehicle) => role === 'driver' && !hasVehicle

// Where a signed-in person starts. 'setup' is not a tab, so routes.jsx resolves it separately.
export function landingFor(role, { hasVehicle }) {
  if (needsSetup(role, hasVehicle)) return 'setup'
  return role === 'admin' ? 'admin' : 'home'
}
