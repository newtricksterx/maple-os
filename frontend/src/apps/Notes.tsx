import { useEffect, useState } from 'react'

const STORAGE_KEY = 'maple-os:notes'

export function Notes() {
  const [text, setText] = useState(() => localStorage.getItem(STORAGE_KEY) ?? '')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, text)
  }, [text])

  return (
    <div className="app-notes">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type something…"
        spellCheck={false}
      />
      <div className="app-notes__status">{text.length} characters
      </div>
    </div>
  )
}
