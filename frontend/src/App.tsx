import { useWindowManager } from './os/useWindowManager'
import { Desktop } from './components/Desktop'
import { Taskbar } from './components/Taskbar'
import { Window } from './components/Window'
import './App.css'

function App() {
  const wm = useWindowManager()

  return (
    <div className="os">
      <Desktop onOpen={wm.openApp} />
      {wm.windows.map((win) => (
        <Window key={win.id} win={win} active={win.id === wm.activeId} wm={wm} />
      ))}
      <Taskbar wm={wm} />
    </div>
  )
}

export default App
