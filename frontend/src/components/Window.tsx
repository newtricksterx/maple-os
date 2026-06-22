import { useRef } from 'react'
import type { WindowInstance } from '../os/types'
import type { WindowManager } from '../os/useWindowManager'
import { getApp } from '../apps/registry'
import './Window.css'

const TASKBAR_HEIGHT = 56
const MIN_WIDTH = 240
const MIN_HEIGHT = 160

interface WindowProps {
  win: WindowInstance
  active: boolean
  wm: WindowManager
}

export function Window({ win, active, wm }: WindowProps) {
  const app = getApp(win.appId)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; w: number; h: number } | null>(null)

  if (!app || win.minimized) return null
  const Body = app.component

  const startDrag = (e: React.MouseEvent) => {
    if (win.maximized) return
    wm.focusWindow(win.id)
    dragRef.current = { dx: e.clientX - win.x, dy: e.clientY - win.y }

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const x = Math.max(0, ev.clientX - dragRef.current.dx)
      const maxY = window.innerHeight - TASKBAR_HEIGHT - 40
      const y = Math.min(Math.max(0, ev.clientY - dragRef.current.dy), maxY)
      wm.moveWindow(win.id, x, y)
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const startResize = (e: React.MouseEvent) => {
    e.stopPropagation()
    wm.focusWindow(win.id)
    resizeRef.current = { startX: e.clientX, startY: e.clientY, w: win.width, h: win.height }

    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return
      const w = Math.max(MIN_WIDTH, resizeRef.current.w + (ev.clientX - resizeRef.current.startX))
      const h = Math.max(MIN_HEIGHT, resizeRef.current.h + (ev.clientY - resizeRef.current.startY))
      wm.resizeWindow(win.id, w, h)
    }
    const onUp = () => {
      resizeRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const style: React.CSSProperties = win.maximized
    ? { left: 0, top: 0, width: '100vw', height: `calc(100vh - ${TASKBAR_HEIGHT}px)`, zIndex: win.zIndex }
    : { left: win.x, top: win.y, width: win.width, height: win.height, zIndex: win.zIndex }

  return (
    <div
      className={'window' + (active ? ' window--active' : '')}
      style={style}
      onMouseDown={() => wm.focusWindow(win.id)}
    >
      <div
        className="window__titlebar"
        onMouseDown={startDrag}
        onDoubleClick={() => wm.toggleMaximize(win.id)}
      >
        <span className="window__controls">
          <button
            className="window__btn window__btn--close"
            title="Close"
            onClick={(e) => { e.stopPropagation(); wm.closeWindow(win.id) }}
          >
            <span className="window__btn-glyph">&#215;</span>
          </button>
          <button
            className="window__btn window__btn--min"
            title="Minimize"
            onClick={(e) => { e.stopPropagation(); wm.minimizeWindow(win.id) }}
          >
            <span className="window__btn-glyph">&#8211;</span>
          </button>
          <button
            className="window__btn window__btn--max"
            title="Maximize"
            onClick={(e) => { e.stopPropagation(); wm.toggleMaximize(win.id) }}
          >
            <span className="window__btn-glyph">+</span>
          </button>
        </span>
        <span className="window__title">
          {app.title}
        </span>
      </div>
      <div className="window__body">
        <Body />
      </div>
      {!win.maximized && (
        <div className="window__resize" onMouseDown={startResize} />
      )}
    </div>
  )
}
