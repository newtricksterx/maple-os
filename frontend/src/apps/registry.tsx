import type { AppDefinition, AppId } from '../os/types'
import { Notes } from './Notes'
import { Calculator } from './Calculator'
import { GenerateArrival } from './GenerateArrival/GenerateArrival'

// The single place to register apps. Adding an icon = one entry here + a component.
export const APPS: AppDefinition[] = [
  { id: 'notes', title: 'Notes', icon: '📝', component: Notes, defaultSize: { width: 460, height: 360 } },
  { id: 'calculator', title: 'Calculator', icon: '📱', component: Calculator, 
    defaultSize: { width: 280, height: 400 } },
  { id: 'generate_arrival', title: 'Generate Arrival Document', icon: '🛬', component: GenerateArrival,
    defaultSize: { width: 500, height: 490}
  },

]

export function getApp(id: AppId): AppDefinition | undefined {
  return APPS.find((a) => a.id === id)
}
