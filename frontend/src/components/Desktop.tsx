import type { AppId } from '../os/types'
import { APPS } from '../apps/registry'
import { DesktopIcon } from './DesktopIcon'
import './Desktop.css'

interface DesktopProps {
  onOpen: (appId: AppId) => void
}

export function Desktop({ onOpen }: DesktopProps) {
  return (
    <div className="desktop">
      <div className="desktop__icons">
        {APPS.map((app) => (
          <DesktopIcon key={app.id} app={app} onOpen={() => onOpen(app.id)} />
        ))}
      </div>
    </div>
  )
}
