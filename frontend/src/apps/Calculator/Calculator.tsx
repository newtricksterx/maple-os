import { useState } from 'react'

const KEYS = [
  ['C', '±', '%', '÷'],
  ['7', '8', '9', '×'],
  ['4', '5', '6', '−'],
  ['1', '2', '3', '+'],
  ['0', '.', '='],
]

const OPS = ['÷', '×', '−', '+']
const FUNCS = ['C', '±', '%']

// Round away binary-float noise: 0.1 + 0.2 -> 0.3
const clean = (n: number): number => {
  if (!isFinite(n)) return n
  return parseFloat(n.toPrecision(12))
}

// Group the integer part and keep the decimals exactly as typed (incl. a trailing '.').
const formatForDisplay = (value: string): string => {
  if (value === 'NaN' || value === 'Infinity' || value === '-Infinity') return 'Error'
  const neg = value.startsWith('-')
  const raw = neg ? value.slice(1) : value
  const dot = raw.indexOf('.')
  const intPart = dot === -1 ? raw : raw.slice(0, dot)
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const rest = dot === -1 ? '' : raw.slice(dot)
  return (neg ? '-' : '') + grouped + rest
}

export function Calculator() {
  const [display, setDisplay] = useState('0')
  const [prev, setPrev] = useState<number | null>(null)
  const [op, setOp] = useState<string | null>(null)
  const [fresh, setFresh] = useState(true) // next digit starts a new number

  const apply = (a: number, b: number, operator: string): number => {
    switch (operator) {
      case '+': return a + b
      case '−': return a - b
      case '×': return a * b
      case '÷': return b === 0 ? NaN : a / b
      default: return b
    }
  }

  const inputDigit = (d: string) => {
    if (d === '.' && display.includes('.') && !fresh) return
    if (fresh) {
      setDisplay(d === '.' ? '0.' : d)
      setFresh(false)
    } else {
      setDisplay(display === '0' && d !== '.' ? d : display + d)
    }
  }

  const del = () => {
    if (fresh) return
    const next = display.slice(0, -1)
    setDisplay(next === '' || next === '-' ? '0' : next)
  }

  const chooseOp = (next: string) => {
    const current = parseFloat(display)
    if (prev !== null && op && !fresh) {
      const result = clean(apply(prev, current, op))
      setDisplay(String(result))
      setPrev(result)
    } else {
      setPrev(current)
    }
    setOp(next)
    setFresh(true)
  }

  const equals = () => {
    if (prev === null || !op) return
    const result = clean(apply(prev, parseFloat(display), op))
    setDisplay(String(result))
    setPrev(null)
    setOp(null)
    setFresh(true)
  }

  const press = (key: string) => {
    if (key >= '0' && key <= '9') return inputDigit(key)
    switch (key) {
      case '.': return inputDigit('.')
      case 'C': setDisplay('0'); setPrev(null); setOp(null); setFresh(true); return
      case '±': setDisplay(String(clean(parseFloat(display) * -1))); return
      case '%': setDisplay(String(clean(parseFloat(display) / 100))); return
      case '=': return equals()
      default: return chooseOp(key)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const k = e.key
    if (k >= '0' && k <= '9') return press(k)
    switch (k) {
      case '.': return press('.')
      case '+': return press('+')
      case '-': return press('−')
      case '*': return press('×')
      case '/': e.preventDefault(); return press('÷')
      case '%': return press('%')
      case '=':
      case 'Enter': e.preventDefault(); return press('=')
      case 'Backspace': return del()
      case 'Escape': return press('C')
      default: return
    }
  }

  // C becomes AC when there's nothing entered to clear.
  const clearLabel = display === '0' && prev === null && op === null ? 'AC' : 'C'

  return (
    <div className="app-calc" tabIndex={0} onKeyDown={onKeyDown}>
      <div className="app-calc__screen">
        <div className="app-calc__history">
          {prev !== null && op ? `${formatForDisplay(String(prev))} ${op}` : ' '}
        </div>
        <div
          className="app-calc__display"
          style={formatForDisplay(display).length > 9
            ? { fontSize: `${Math.max(16, 30 - (formatForDisplay(display).length - 9) * 1.6)}px` }
            : undefined}
        >
          {formatForDisplay(display)}
        </div>
      </div>
      <div className="app-calc__keys">
        {KEYS.flat().map((key) => {
          const isOp = OPS.includes(key)
          return (
            <button
              key={key}
              onClick={() => press(key)}
              className={
                'app-calc__key' +
                (isOp || key === '=' ? ' app-calc__key--op' : '') +
                (FUNCS.includes(key) ? ' app-calc__key--fn' : '') +
                (key === '0' ? ' app-calc__key--wide' : '') +
                (isOp && op === key && fresh ? ' app-calc__key--active' : '')
              }
            >
              {key === 'C' ? clearLabel : key}
            </button>
          )
        })}
      </div>
    </div>
  )
}
