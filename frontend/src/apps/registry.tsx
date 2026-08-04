import type { AppDefinition, AppId } from '../os/types'
import { Notes } from './Notes'
import { Calculator } from './Calculator'
import { GenerateArrival } from './GenerateArrival/GenerateArrival'
import { BoxIntersect } from './BoxIntersect/BoxIntersect'
import { CCN_Database } from './CCN_Database/CCN_Database';
import dbIcon from '../icons/database_icon.png'
import calculatorIcon from '../icons/calculator_icon.png'
import notesIcon from '../icons/notes_icon.png'
import arrivalDocIcon from '../icons/arrival_doc_icon.png'
import boxIntersectIcon from '../icons/box_intersect_icon.png'


// The single place to register apps. Adding an icon = one entry here + a component.
export const APPS: AppDefinition[] = [
  {
    id: 'notes', title: 'Notes', imgAlt: '📝', component: Notes, defaultSize: { width: 460, height: 360 },
    imgUrl: notesIcon
  },
  {
    id: 'calculator', title: 'Calculator', imgAlt: '📱', component: Calculator,
    defaultSize: { width: 280, height: 400 },
    imgUrl: calculatorIcon
  },
  {
    id: 'generate_arrival', title: 'Generate Arrival Document', imgAlt: '🛬', component: GenerateArrival,
    defaultSize: { width: 500, height: 490 },
    imgUrl: arrivalDocIcon
  },
  {
    id: 'box_intersect', title: 'Box Intersect', imgAlt: '📦', component: BoxIntersect,
    defaultSize: { width: 520, height: 560 },
    imgUrl: boxIntersectIcon
  },
  {
    id: 'ccn_database',
    title: 'CCN Database',
    imgAlt: '📚',
    component: CCN_Database,
    defaultSize: { width: 1300, height: 750 },
    imgUrl: dbIcon
  }
]

export function getApp(id: AppId): AppDefinition | undefined {
  return APPS.find((a) => a.id === id)
}
