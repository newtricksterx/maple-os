import { useRef } from 'react'
import type { WindowInstance } from '../os/types'
import type { WindowManager } from '../os/useWindowManager'
import { getApp } from '../apps/registry'
import './Window.css'

const TASKBAR_HEIGHT = 56
const MIN_WIDTH = 240
const MIN_HEIGHT = 160
const RESIZE_DIRECTIONS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const

type ResizeDirection = (typeof RESIZE_DIRECTIONS)[number]

interface WindowProps {
  win: WindowInstance
  active: boolean
  wm: WindowManager
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function Window({ win, active, wm }: WindowProps) {
  const app = getApp(win.appId)
  const dragRef = useRef<{ dx: number; dy: number } | null>(null)
  const resizeRef = useRef<{
    direction: ResizeDirection
    startX: number
    startY: number
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

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

  const startResize = (direction: ResizeDirection) => (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    wm.focusWindow(win.id)
    resizeRef.current = {
      direction,
      startX: e.clientX,
      startY: e.clientY,
      x: win.x,
      y: win.y,
      width: win.width,
      height: win.height,
    }

    const onMove = (ev: MouseEvent) => {
      if (!resizeRef.current) return
      const current = resizeRef.current
      const dx = ev.clientX - current.startX
      const dy = ev.clientY - current.startY
      const desktopWidth = window.innerWidth
      const desktopHeight = window.innerHeight - TASKBAR_HEIGHT
      const movesNorth = current.direction.includes('n')
      const movesEast = current.direction.includes('e')
      const movesSouth = current.direction.includes('s')
      const movesWest = current.direction.includes('w')
      let x = current.x
      let y = current.y
      let width = current.width
      let height = current.height

      if (movesEast) {
        width = clamp(current.width + dx, MIN_WIDTH, Math.max(MIN_WIDTH, desktopWidth - current.x))
      }

      if (movesSouth) {
        height = clamp(current.height + dy, MIN_HEIGHT, Math.max(MIN_HEIGHT, desktopHeight - current.y))
      }

      if (movesWest) {
        const nextX = clamp(current.x + dx, 0, current.x + current.width - MIN_WIDTH)
        x = nextX
        width = current.width + current.x - nextX
      }

      if (movesNorth) {
        const nextY = clamp(current.y + dy, 0, current.y + current.height - MIN_HEIGHT)
        y = nextY
        height = current.height + current.y - nextY
      }

      wm.resizeWindow(win.id, { x, y, width, height })
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
        <span className="window__title-spacer" aria-hidden="true" />
      </div>
      <div className="window__body">
        <Body />
      </div>
      {!win.maximized
        ? RESIZE_DIRECTIONS.map((direction) => (
          <div
            key={direction}
            className={`window__resize-handle window__resize-handle--${direction}`}
            onMouseDown={startResize(direction)}
          />
        ))
        : null}
    </div>
  )
}
