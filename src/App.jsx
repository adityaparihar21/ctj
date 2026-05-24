import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Camera,
  Moon,
  Music2,
  Save,
  Sparkles,
  Sun,
  Volume2,
} from 'lucide-react'
import './App.css'

const inkOptions = [
  { name: 'Black', value: '#26231f' },
  { name: 'Deep blue', value: '#243b6b' },
  { name: 'Crimson red', value: '#9a3432' },
  { name: 'Forest green', value: '#31573f' },
  { name: 'Sepia brown', value: '#76543b' },
  { name: 'Purple ink', value: '#60406f' },
]

const seedLines = [
  'i left the porch light on for a version of me who never came home',
  'someone kept a receipt from a train station and called it evidence',
  'the moon looked typed, uneven and silver at the edges',
  'my hands remember rooms my name has forgotten',
  'every quiet house is full of almost-sent letters',
  'leave something small enough for a stranger to carry',
]

const initialEntries = [
  {
    id: 'seed-1',
    text: 'wrote: the kettle clicked off and the whole room forgave me.',
    time: '2 minutes ago',
  },
  {
    id: 'seed-2',
    text: 'left a note about rain on library windows.',
    time: '11 minutes ago',
  },
  {
    id: 'seed-3',
    text: 'saved one sentence and closed the lid softly.',
    time: '27 minutes ago',
  },
]

const keyRows = ['1234567890', 'QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
const typewriterKeySound = '/sounds/typewriter-key.mp3'
const typewriterBellSound = '/sounds/typewriter-bell.mp3'

function App() {
  const [chars, setChars] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('communal-typewriter-draft')) || []
    } catch {
      return []
    }
  })
  const [entries, setEntries] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('communal-typewriter-entries')) || initialEntries
    } catch {
      return initialEntries
    }
  })
  const [ink, setInk] = useState(inkOptions[0])
  const [night, setNight] = useState(true)
  const [muted, setMuted] = useState(false)
  const [ambient, setAmbient] = useState(false)
  const [flash, setFlash] = useState(false)
  const [snapshotNotice, setSnapshotNotice] = useState('')
  const [typedPulse, setTypedPulse] = useState(0)
  const [poeticLine, setPoeticLine] = useState(seedLines[0])
  const [paperInserted, setPaperInserted] = useState(false)
  const paperRef = useRef(null)
  const writingRef = useRef(null)
  const audioRef = useRef(null)
  const droneRef = useRef(null)
  const noiseBufferRef = useRef(null)

  const plainText = useMemo(() => chars.map((char) => char.value).join(''), [chars])
  const carriageOffset = Math.min(88, (plainText.length % 34) * 3)
  const inkLife = Math.max(18, 100 - Math.floor(chars.length / 8))

  useEffect(() => {
    const timer = setTimeout(() => setPaperInserted(true), 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    localStorage.setItem('communal-typewriter-draft', JSON.stringify(chars))
    requestAnimationFrame(() => {
      if (writingRef.current) {
        writingRef.current.scrollTop = writingRef.current.scrollHeight
      }
    })
  }, [chars])

  useEffect(() => {
    localStorage.setItem('communal-typewriter-entries', JSON.stringify(entries))
  }, [entries])

  useEffect(() => {
    const interval = setInterval(() => {
      setPoeticLine(seedLines[Math.floor(Math.random() * seedLines.length)])
    }, 9000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!ambient) {
      if (droneRef.current) {
        droneRef.current.osc.stop()
        droneRef.current.gain.disconnect()
        droneRef.current = null
      }
      return
    }

    const ctx = getAudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 82
    gain.gain.value = muted ? 0 : 0.018
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    droneRef.current = { osc, gain }

    return () => {
      osc.stop()
      gain.disconnect()
      droneRef.current = null
    }
  }, [ambient, muted])

  function getAudioContext() {
    if (!audioRef.current) {
      audioRef.current = new AudioContext()
    }
    return audioRef.current
  }

  function getNoiseBuffer(ctx) {
    if (noiseBufferRef.current) return noiseBufferRef.current

    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.28, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1
    }
    noiseBufferRef.current = buffer
    return buffer
  }

  function playFilteredNoise(ctx, start, duration, frequency, volume) {
    const source = ctx.createBufferSource()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    source.buffer = getNoiseBuffer(ctx)
    filter.type = 'bandpass'
    filter.frequency.value = frequency
    filter.Q.value = 7 + Math.random() * 5
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    source.start(start)
    source.stop(start + duration)
  }

  function playTone(ctx, start, duration, frequency, volume, type = 'triangle') {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(frequency, start)
    osc.frequency.exponentialRampToValueAtTime(Math.max(28, frequency * 0.56), start + duration)
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(start)
    osc.stop(start + duration)
  }

  function playRecording(src, volume = 0.42, playbackRate = 1) {
    const audio = new Audio(src)
    audio.volume = volume
    audio.playbackRate = playbackRate
    audio.play().catch(() => {})
  }

  function playTypeSound(kind = 'type') {
    if (muted) return
    const ctx = getAudioContext()
    const now = ctx.currentTime

    if (kind === 'delete') {
      playFilteredNoise(ctx, now, 0.16, 580, 0.13)
      playFilteredNoise(ctx, now + 0.025, 0.2, 170, 0.08)
      playTone(ctx, now, 0.12, 88, 0.045, 'sawtooth')
      return
    }

    if (kind === 'return') {
      playRecording(typewriterBellSound, 0.34)
      playFilteredNoise(ctx, now, 0.18, 320, 0.1)
      playFilteredNoise(ctx, now + 0.1, 0.16, 1250, 0.055)
      return
    }

    if (kind === 'ribbon') {
      playFilteredNoise(ctx, now, 0.08, 740, 0.06)
      playTone(ctx, now, 0.08, 210, 0.025, 'triangle')
      return
    }

    playRecording(typewriterKeySound, 0.4, 0.96 + Math.random() * 0.08)
    playFilteredNoise(ctx, now, 0.035, 1800 + Math.random() * 900, 0.09)
    playFilteredNoise(ctx, now + 0.012, 0.06, 480 + Math.random() * 260, 0.08)
    playTone(ctx, now, 0.045, 115 + Math.random() * 38, 0.032, 'square')
  }

  function handleKeyDown(event) {
    if (event.metaKey || event.ctrlKey || event.altKey) return

    if (event.key === 'Backspace') {
      event.preventDefault()
      setChars((current) => current.slice(0, -1))
      setTypedPulse((tick) => tick + 1)
      playTypeSound('delete')
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      appendText('\n')
      playTypeSound('return')
      return
    }

    if (event.key === 'Tab') {
      event.preventDefault()
      appendText('    ')
      return
    }

    if (event.key.length === 1) {
      event.preventDefault()
      appendText(event.key)
    }
  }

  function handlePaste(event) {
    event.preventDefault()
    appendText(event.clipboardData.getData('text'))
  }

  function appendText(text) {
    const opacity = Math.max(0.48, inkLife / 100)
    const newChars = [...text].map((value) => ({
      id: crypto.randomUUID(),
      value,
      color: ink.value,
      opacity: value === '\n' ? 1 : opacity - Math.random() * 0.08,
      blur: Math.random() > 0.9 ? 0.25 : 0,
      x: Math.random() * 0.7 - 0.35,
      y: Math.random() * 0.5 - 0.25,
    }))
    setChars((current) => [...current, ...newChars])
    setTypedPulse((tick) => tick + 1)
    if (text !== '\n') {
      playTypeSound('type')
    }
  }

  function saveEntry() {
    const text = plainText.trim()
    if (!text) return

    setEntries((current) => [
      {
        id: crypto.randomUUID(),
        text: text.length > 118 ? `${text.slice(0, 118)}...` : text,
        time: 'just now',
      },
      ...current.slice(0, 7),
    ])
  }

  function clearPaper() {
    setChars([])
    playTypeSound('delete')
  }

  function changeInk(option) {
    setInk(option)
    playTypeSound('ribbon')
  }

  function takeSnapshot() {
    const scale = 2
    const width = 860
    const height = 1100
    const canvas = document.createElement('canvas')
    canvas.width = width * scale
    canvas.height = height * scale
    const ctx = canvas.getContext('2d')
    ctx.scale(scale, scale)

    ctx.fillStyle = '#efe2ca'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#f8f0df'
    ctx.shadowColor = 'rgba(31, 17, 8, .28)'
    ctx.shadowBlur = 34
    ctx.shadowOffsetY = 16
    ctx.fillRect(54, 44, width - 108, height - 148)
    ctx.shadowColor = 'transparent'

    ctx.fillStyle = 'rgba(96, 67, 42, .08)'
    for (let i = 0; i < 1200; i += 1) {
      ctx.fillRect(Math.random() * width, Math.random() * height, Math.random() * 1.5, Math.random() * 1.5)
    }

    ctx.fillStyle = 'rgba(70, 49, 30, .42)'
    ctx.font = '26px "Special Elite", "Courier New", monospace'
    ctx.fillText('Communal Typewriter Journal', 90, 96)
    ctx.font = '22px "Courier New", monospace'

    let x = 112
    let y = 168
    const lineHeight = 35
    const maxX = width - 120
    chars.forEach((char) => {
      if (char.value === '\n' || x > maxX) {
        x = 112
        y += lineHeight
      }
      if (char.value !== '\n' && y < height - 155) {
        ctx.globalAlpha = char.opacity
        ctx.fillStyle = char.color
        ctx.fillText(char.value, x + char.x, y + char.y)
        x += ctx.measureText(char.value).width + 1
      }
    })
    ctx.globalAlpha = 1

    ctx.fillStyle = 'rgba(74, 44, 28, .6)'
    ctx.font = '20px "Cormorant Garamond", Georgia, serif'
    ctx.fillText(new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }), 90, height - 92)
    ctx.fillText('Leave something for the next stranger.', width - 392, height - 92)

    setFlash(true)
    setTimeout(() => setFlash(false), 320)
    canvas.toBlob((blob) => {
      if (!blob) return

      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.download = `communal-typewriter-journal-${Date.now()}.png`
      link.href = url
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setSnapshotNotice('Snapshot saved to your browser Downloads folder.')
      setTimeout(() => setSnapshotNotice(''), 2800)
    }, 'image/png')
  }

  return (
    <main className={`app-shell ${night ? 'night' : 'day'}`}>
      <div className="sunset" />
      <div className="grain" />
      <div className="film-flicker" />
      <div className="dust" aria-hidden="true">
        {Array.from({ length: 28 }).map((_, index) => (
          <i key={index} style={{ '--i': index }} />
        ))}
      </div>

      <AnimatePresence>
        {flash && <motion.div className="flash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}
      </AnimatePresence>
      <AnimatePresence>
        {snapshotNotice && (
          <motion.div
            className="snapshot-notice"
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
          >
            {snapshotNotice}
          </motion.div>
        )}
      </AnimatePresence>

      <section className="journal-stage">
        <aside className="communal-feed" aria-label="Community journal feed">
          <p className="feed-kicker">Someone wrote here 2 minutes ago...</p>
          <AnimatePresence mode="popLayout">
            {entries.map((entry) => (
              <motion.article
                className="feed-entry"
                key={entry.id}
                layout
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <span>{entry.time}</span>
                <p>{entry.text}</p>
              </motion.article>
            ))}
          </AnimatePresence>
        </aside>

        <section className="typewriter-wrap" aria-label="Communal Typewriter Journal">
          <motion.header className="masthead" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
            <p>late night communal room</p>
            <h1>Communal Typewriter Journal</h1>
          </motion.header>

          <div className="floating-controls">
            <button type="button" onClick={takeSnapshot} title="Take a Snapshot">
              <Camera size={17} />
              Take a Snapshot
            </button>
            <button type="button" onClick={saveEntry} title="Save entry locally">
              <Save size={16} />
              Leave it
            </button>
            <button type="button" onClick={() => setNight((value) => !value)} title="Toggle night mode">
              {night ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button type="button" onClick={() => setMuted((value) => !value)} title="Toggle typing sounds">
              <Volume2 size={16} />
            </button>
            <button type="button" onClick={() => setAmbient((value) => !value)} title="Toggle ambient audio">
              <Music2 size={16} />
            </button>
          </div>

          <div className="ribbon-panel" aria-label="Ink Ribbon">
            <span>ink ribbon:</span>
            <div className="ribbon-selector">
              {inkOptions.map((option) => (
                <button
                  type="button"
                  className={option.value === ink.value ? 'active' : ''}
                  key={option.name}
                  onClick={() => changeInk(option)}
                  title={option.name}
                  aria-label={`Use ${option.name}`}
                  style={{ '--ink-color': option.value }}
                />
              ))}
            </div>
            <meter min="0" max="100" value={inkLife} title="Ink remaining" />
          </div>

          <motion.div
            className="paper"
            ref={paperRef}
            initial={{ y: 220, rotate: -1.5, opacity: 0 }}
            animate={paperInserted ? { y: 0, rotate: [-0.5, 0.4, -0.15], opacity: 1 } : {}}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            onClick={() => paperRef.current?.focus()}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            tabIndex={0}
          >
            <div className="paper-shadow" />
            <div className="paper-header">
              <span>{new Date().toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span>anonymous page</span>
            </div>
            <div className="writing-area" ref={writingRef}>
              {chars.length === 0 && (
                <p className="placeholder">Leave something for the next stranger.</p>
              )}
              <div className="typed-lines" aria-live="polite">
                {chars.map((char) =>
                  char.value === '\n' ? (
                    <br key={char.id} />
                  ) : (
                    <span
                      key={char.id}
                      style={{
                        color: char.color,
                        opacity: char.opacity,
                        filter: `blur(${char.blur}px)`,
                        transform: `translate(${char.x}px, ${char.y}px)`,
                      }}
                    >
                      {char.value === ' ' ? '\u00a0' : char.value}
                    </span>
                  ),
                )}
                <motion.span
                  className="caret"
                  key={typedPulse}
                  initial={{ scaleY: 0.55 }}
                  animate={{ scaleY: 1 }}
                />
              </div>
            </div>
            <button className="clear-paper" type="button" onClick={clearPaper}>
              new sheet
            </button>
          </motion.div>

          <motion.div className="typewriter" animate={{ x: typedPulse % 2 ? 1 : -1 }}>
            <motion.div className="lever" animate={{ rotate: typedPulse % 3 === 0 ? -9 : -2 }} />
            <motion.div className="carriage" animate={{ x: carriageOffset }}>
              <div className="rail" />
              <div className="left-knob" />
              <div className="right-knob" />
            </motion.div>
            <div className="ribbon-housing">
              <motion.div className="reel left" animate={{ rotate: typedPulse * 20 }} style={{ '--ink-color': ink.value }} />
              <div className="ribbon-strip" style={{ backgroundColor: ink.value }} />
              <motion.div className="reel right" animate={{ rotate: -typedPulse * 18 }} style={{ '--ink-color': ink.value }} />
            </div>
            <div className="brand">REMINGTON NOCTURNE</div>
            <div className="key-bed">
              {keyRows.map((row, rowIndex) => (
                <div className="key-row" key={row}>
                  {[...row].map((letter, index) => (
                    <motion.span
                      className="key"
                      key={letter}
                      animate={{ y: typedPulse % (index + rowIndex + 2) === 0 ? 2 : 0 }}
                    >
                      {letter}
                    </motion.span>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <aside className="poetry-orbit" aria-label="Anonymous drifting lines">
          <Sparkles size={18} />
          <AnimatePresence mode="wait">
            <motion.p
              key={poeticLine}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
            >
              {poeticLine}
            </motion.p>
          </AnimatePresence>
        </aside>
      </section>
    </main>
  )
}

export default App
