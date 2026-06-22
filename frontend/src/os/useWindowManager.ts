import { useCallback, useRef, useState } from 'react'
import type { AppId, WindowInstance } from './types'
import { getApp } from '../apps/registry'

const DEFAULT_SIZE = { width: 480, height: 340 }
const TASKBAR_HEIGHT = 48

export interface WindowManager {
  windows: WindowInstance[]
  activeId: string | null
  openApp: (appId: AppId) => void
  closeWindow: (id: string) => void
  focusWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  toggleMaximize: (id: string) => void
  moveWindow: (id: string, x: number, y: number) => void
  resizeWindow: (id: string, width: number, height: number) => void
  /** Focus + restore from minimized (used by the taskbar). */
  activateWindow: (id: string) => void
}

export function useWindowManager(): WindowManager {
  const [windows, setWindows] = useState<WindowInstance[]>([])
  const zCounter = useRef(1)
  const idCounter = useRef(1)

  const nextZ = () => (zCounter.current += 1)

  const activeId =
    windows.length > 0
      ? windows.reduce((top, w) =>
          !w.minimized && w.zIndex > top.zIndex ? w : top,
        )?.id ?? null
      : null

  const openApp = useCallback((appId: AppId) => {
    const app = getApp(appId)
    if (!app) return
    const size = app.defaultSize ?? DEFAULT_SIZE
    // Always open centered on the desktop (area above the taskbar).
    const x = Math.max(0, Math.round((window.innerWidth - size.width) / 2))
    const y = Math.max(
      0,
      Math.round((window.innerHeight - TASKBAR_HEIGHT - size.height) / 2),
    )
    setWindows((prev) => {
      // Only one window per app: focus (and restore) the existing one if present.
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
    (id: string, width: number, height: number) => {
      setWindows((prev) =>
        prev.map((w) => (w.id === id ? { ...w, width, height } : w)),
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
