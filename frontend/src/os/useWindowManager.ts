import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppId, WindowInstance } from './types'
import { getApp } from '../apps/registry'

const DEFAULT_SIZE = { width: 480, height: 340 }
const TASKBAR_HEIGHT = 48
const WINDOW_GUTTER = 24
const MIN_WINDOW_WIDTH = 240
const MIN_WINDOW_HEIGHT = 160

export interface WindowManager {
  windows: WindowInstance[]
  activeId: string | null
  openApp: (appId: AppId) => void
  closeWindow: (id: string) => void
  focusWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  toggleMaximize: (id: string) => void
  moveWindow: (id: string, x: number, y: number) => void
  resizeWindow: (
    id: string,
    bounds: Pick<WindowInstance, 'x' | 'y' | 'width' | 'height'>,
  ) => void
  /** Focus + restore from minimized (used by the taskbar). */
  activateWindow: (id: string) => void
}

function getFittedWindowSize(size: { width: number; height: number }) {
  const availableWidth = Math.max(
    MIN_WINDOW_WIDTH,
    Math.floor(window.innerWidth * 0.92),
  )
  const availableHeight = Math.max(
    MIN_WINDOW_HEIGHT,
    Math.floor((window.innerHeight - TASKBAR_HEIGHT) * 0.9),
  )

  return {
    width: Math.min(size.width, availableWidth),
    height: Math.min(size.height, availableHeight),
  }
}

function getCenteredPosition(width: number, height: number) {
  return {
    x: Math.max(WINDOW_GUTTER, Math.round((window.innerWidth - width) / 2)),
    y: Math.max(
      WINDOW_GUTTER,
      Math.round((window.innerHeight - TASKBAR_HEIGHT - height) / 2),
    ),
  }
}

export function useWindowManager(): WindowManager {
  const [windows, setWindows] = useState<WindowInstance[]>([])
  const zCounter = useRef(1)
  const idCounter = useRef(1)

  const nextZ = () => (zCounter.current += 1)

  useEffect(() => {
    const keepWindowsInView = () => {
      setWindows((prev) =>
        prev.map((win) => {
          if (win.maximized) return win

          const size = getFittedWindowSize(win)
          const maxX = Math.max(0, window.innerWidth - size.width)
          const maxY = Math.max(
            0,
            window.innerHeight - TASKBAR_HEIGHT - size.height,
          )
          const x = Math.min(Math.max(0, win.x), maxX)
          const y = Math.min(Math.max(0, win.y), maxY)

          return { ...win, ...size, x, y }
        }),
      )
    }

    window.addEventListener('resize', keepWindowsInView)
    return () => window.removeEventListener('resize', keepWindowsInView)
  }, [])

  const activeId =
    windows.length > 0
      ? windows.reduce((top, w) =>
          !w.minimized && w.zIndex > top.zIndex ? w : top,
        )?.id ?? null
      : null

  const openApp = useCallback((appId: AppId) => {
    const app = getApp(appId)
    if (!app) return
    const size = getFittedWindowSize(app.defaultSize ?? DEFAULT_SIZE)
    // Always open centered on the desktop (area above the taskbar).
    const { x, y } = getCenteredPosition(size.width, size.height)

    setWindows((prev) => {
      const existing = prev.find((w) => w.appId === appId)
      if (existing) {
        return prev.map((w) =>
          w.id === existing.id
            ? { ...w, minimized: false, zIndex: nextZ() }
            : w,
        )
      }

      const id = `win-${idCounter.current++}`
      return [
        ...prev,
        {
          id,
          appId,
          x,
          y,
          width: size.width,
          height: size.height,
          zIndex: nextZ(),
          minimized: false,
          maximized: false,
        },
      ]
    })
  }, [])

  const closeWindow = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id))
  }, [])

  const focusWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, zIndex: nextZ() } : w)),
    )
  }, [])

  const minimizeWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: true } : w)),
    )
  }, [])

  const toggleMaximize = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id
          ? { ...w, maximized: !w.maximized, zIndex: nextZ() }
          : w,
      ),
    )
  }, [])

  const moveWindow = useCallback((id: string, x: number, y: number) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, x, y } : w)),
    )
  }, [])

  const resizeWindow = useCallback(
    (
      id: string,
      bounds: Pick<WindowInstance, 'x' | 'y' | 'width' | 'height'>,
    ) => {
      setWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, ...bounds } : w)),
      )
    },
    [],
  )

  const activateWindow = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) =>
        w.id === id ? { ...w, minimized: false, zIndex: nextZ() } : w,
      ),
    )
  }, [])

  return {
    windows,
    activeId,
    openApp,
    closeWindow,
    focusWindow,
    minimizeWindow,
    toggleMaximize,
    moveWindow,
    resizeWindow,
    activateWindow,
  }
}
