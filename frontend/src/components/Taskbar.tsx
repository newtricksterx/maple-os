import { useEffect, useRef, useState } from 'react'
import type { WindowManager } from '../os/useWindowManager'
import { getApp } from '../apps/registry'
import './Taskbar.css'

interface TaskbarProps {
  wm: WindowManager
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for non-secure contexts where the Clipboard API is unavailable.
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      document.body.removeChild(ta)
      return ok
    } catch {
      return false
    }
  }
}

export function Taskbar({ wm }: TaskbarProps) {
  const now = useClock()
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  const [copied, setCopied] = useState<'copied' | 'failed' | null>(null)
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (copyTimeout.current) clearTimeout(copyTimeout.current)
  }, [])

  const handleCopyClock = async () => {
    const ok = await copyText(`${date} ${time}`)
    setCopied(ok ? 'copied' : 'failed')
    if (copyTimeout.current) clearTimeout(copyTimeout.current)
    copyTimeout.current = setTimeout(() => setCopied(null), 1500)
  }

  const handleClick = (id: string, minimized: boolean) => {
    if (minimized || id !== wm.activeId) wm.activateWindow(id)
    else wm.minimizeWindow(id)
  }

  return (
    <footer className="taskbar">
      <button className="taskbar__start" title="maple-os">
        🪟
      </button>
      <div className="taskbar__windows">
        {wm.windows.map((w) => {
          const app = getApp(w.appId)
          if (!app) return null
          return (
            <button
              key={w.id}
              className={
                'taskbar__win' +
                (w.id === wm.activeId && !w.minimized ? ' taskbar__win--active' : '') +
                (w.minimized ? ' taskbar__win--min' : '')
              }
              onClick={() => handleClick(w.id, w.minimized)}
            >
              <span className="taskbar__win-icon">{app.icon}</span>
              <span className="taskbar__win-title">{app.title}</span>
            </button>
          )
        })}
      </div>
      <button
        className="taskbar__clock"
        onClick={handleCopyClock}
        title="Copy date & time"
        aria-label={`Copy date and time: ${date} ${time}`}
      >
        {copied && (
          <span
            className={'taskbar__clock-toast' + (copied === 'failed' ? ' taskbar__clock-toast--err' : '')}
            role="status"
          >
            {copied === 'copied' ? 'Copied' : 'Copy failed'}
          </span>
        )}
        <span className="taskbar__time">{time}</span>
        <span className="taskbar__date">{date}</span>
      </button>
    </footer>
  )
}
