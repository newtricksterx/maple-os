import type { AppDefinition, AppId } from '../os/types'
import { Notes } from './Notes'
import { Calculator } from './Calculator'
import { GenerateArrival } from './GenerateArrival/GenerateArrival'
import { BoxIntersect } from './BoxIntersect/BoxIntersect'
import { CCN_Database } from './CCN_Database/CCN_Database';

// The single place to register apps. Adding an icon = one entry here + a component.
export const APPS: AppDefinition[] = [
  { id: 'notes', title: 'Notes', icon: '📝', component: Notes, defaultSize: { width: 460, height: 360 } },
  { id: 'calculator', title: 'Calculator', icon: '📱', component: Calculator, 
    defaultSize: { width: 280, height: 400 } },
  { id: 'generate_arrival', title: 'Generate Arrival Document', icon: '🛬', component: GenerateArrival,
    defaultSize: { width: 500, height: 490}
  },
  { id: 'box_intersect', title: 'Box Intersect', icon: '📦', component: BoxIntersect,
    defaultSize: { width: 520, height: 560}
  },
  {
    id: 'ccn_database',
    title: 'CCN Database',
    icon: '📚',
    component: CCN_Database,
    defaultSize: { width: 1200, height: 750 }
  }
]

export function getApp(id: AppId): AppDefinition | undefined {
  return APPS.find((a) => a.id === id)
}
