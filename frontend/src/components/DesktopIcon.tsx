import type { AppDefinition } from '../os/types'

interface DesktopIconProps {
  app: AppDefinition
  onOpen: () => void
}

export function DesktopIcon({ app, onOpen }: DesktopIconProps) {
  return (
    <button className="desktop-icon" onDoubleClick={onOpen} title={`Open ${app.title}`}>
      <span className="desktop-icon__glyph">{app.icon}</span>
      <span className="desktop-icon__label">{app.title}</span>
    </button>
  )
}
