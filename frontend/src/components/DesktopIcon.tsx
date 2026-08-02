import type { AppDefinition } from '../os/types'

interface DesktopIconProps {
  app: AppDefinition
  imgUrl?: string
  imgAlt: string
  onOpen: () => void
}

export function DesktopIcon({ app, imgUrl, imgAlt, onOpen }: DesktopIconProps) {
  return (
    <button className="desktop-icon" onDoubleClick={onOpen} title={`Open ${app.title}`}>
      <img className="desktop-icon__image" src={imgUrl} alt={imgAlt}></img>
      <span className="desktop-icon__label">{app.title}</span>
    </button>
  )
}

// <span className="desktop-icon__glyph">{app.icon}</span>