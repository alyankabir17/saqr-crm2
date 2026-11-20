import { useEffect } from 'react'
import './truck-intro.css'

// Truck intro with curtain reveal. Pure CSS, transform/opacity only.
// Timeline:
//   0–2.2s  : Truck drives and uncovers "SAQR Transport · Fleet CRM"
//   2.05s   : Light seam flashes at center
//   2.2–3.05s: Curtains slide apart revealing login page (triggers onOpening)
//   3.1s    : Fully unmounted (triggers onDone)
export default function TruckIntro({ onOpening, onDone }) {
  useEffect(() => {
    const openTimer = setTimeout(() => {
      onOpening?.()
    }, 2200)

    const doneTimer = setTimeout(() => {
      onDone?.()
    }, 3150)

    return () => {
      clearTimeout(openTimer)
      clearTimeout(doneTimer)
    }
  }, [onOpening, onDone])

  const handleAnimationStart = (e) => {
    if (e.animationName === 'ti-open-l') {
      onOpening?.()
    }
  }

  const handleAnimationEnd = (e) => {
    if (e.animationName === 'ti-open-r') {
      onDone?.()
    }
  }

  const handleSkip = (e) => {
    e?.stopPropagation()
    onOpening?.()
    onDone?.()
  }

  return (
    <div className="ti" id="ti" onClick={handleSkip} role="presentation" aria-hidden="true">
      <div className="ti-p ti-l" onAnimationStart={handleAnimationStart} />
      <div className="ti-p ti-r" onAnimationEnd={handleAnimationEnd} />
      <div className="ti-seam" />
      <div className="ti-stage">
        <div className="ti-word">
          <b>SAQR Transport</b>
          <span>Fleet CRM</span>
        </div>
        <div className="ti-cover" />
        <div className="ti-lane">
          <div className="ti-road" />
          <div className="ti-truck">
            <div className="ti-trail" />
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
              <path d="M15 18H9" />
              <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
              <circle cx="17" cy="18" r="2" />
              <circle cx="7" cy="18" r="2" />
            </svg>
          </div>
        </div>
        <button className="ti-skip" onClick={handleSkip}>
          Skip
        </button>
      </div>
    </div>
  )
}
