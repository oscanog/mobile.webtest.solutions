import { useEffect, useRef } from 'react'

export function LegacyHeroAnimation() {
  const catcherContainerRef = useRef<HTMLDivElement | null>(null)
  const bugRef = useRef<HTMLDivElement | null>(null)
  const caughtIndicatorRef = useRef<HTMLDivElement | null>(null)
  const speechBubbleRef = useRef<HTMLDivElement | null>(null)
  const animationContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const catcherContainerNode = catcherContainerRef.current
    const bugNode = bugRef.current
    const caughtIndicatorNode = caughtIndicatorRef.current
    const speechBubbleNode = speechBubbleRef.current
    const animationContainerNode = animationContainerRef.current

    if (
      !catcherContainerNode ||
      !bugNode ||
      !caughtIndicatorNode ||
      !speechBubbleNode ||
      !animationContainerNode
    ) {
      return
    }

    const catcherContainer = catcherContainerNode
    const bug = bugNode
    const caughtIndicator = caughtIndicatorNode
    const speechBubble = speechBubbleNode
    const animationContainer = animationContainerNode

    const timers: number[] = []

    function isCatcherFacingLeft() {
      const cycleStart = Date.now() % 8000
      return cycleStart >= 3520 && cycleStart <= 7360
    }

    function createSparkles() {
      const colors = ['#2da44e', '#3fb950', '#ffd700', '#ff6b6b', '#4ecdc4']

      for (let i = 0; i < 12; i += 1) {
        const sparkle = document.createElement('div')
        sparkle.style.cssText = `
          position: absolute;
          width: ${Math.random() * 8 + 4}px;
          height: ${Math.random() * 8 + 4}px;
          background: ${colors[Math.floor(Math.random() * colors.length)]};
          border-radius: 50%;
          left: ${parseFloat(bug.style.left || '450') + Math.random() * 40 - 20}px;
          bottom: 75px;
          pointer-events: none;
          z-index: 30;
        `

        animationContainer.appendChild(sparkle)

        const angle = (Math.PI * 2 * i) / 12
        const velocity = Math.random() * 60 + 40
        const vx = Math.cos(angle) * velocity
        const vy = Math.sin(angle) * velocity - 30
        const animation = sparkle.animate(
          [
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            { transform: `translate(${vx}px, ${vy}px) scale(0)`, opacity: 0 },
          ],
          {
            duration: 800,
            easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          },
        )
        animation.onfinish = () => sparkle.remove()
      }
    }

    function showSpeechBubble() {
      const catcherRect = catcherContainer.getBoundingClientRect()
      const containerRect = animationContainer.getBoundingClientRect()
      const catcherCenter = catcherRect.left - containerRect.left + catcherRect.width / 2
      const facingLeft = isCatcherFacingLeft()
      speechBubble.style.left = `${catcherCenter}px`
      speechBubble.style.transform = facingLeft
        ? 'translateX(-50%) scaleX(-1) scale(1)'
        : 'translateX(-50%) scale(1)'
      speechBubble.classList.add('show')
    }

    function resetScene() {
      bug.classList.remove('caught', 'panic')
      catcherContainer.classList.remove('victory')
      caughtIndicator.classList.remove('show')
      speechBubble.classList.remove('show')
      speechBubble.style.transform = 'translateX(-50%) scale(0)'
      bug.style.animationDuration = '8s'
      bug.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))'
    }

    function triggerCatchMoment() {
      timers.push(
        window.setTimeout(() => {
          bug.classList.add('panic')
        }, 3500),
      )

      timers.push(
        window.setTimeout(() => {
          bug.classList.remove('panic')
          bug.classList.add('caught')
          catcherContainer.classList.add('victory')
          caughtIndicator.classList.add('show')
          showSpeechBubble()
          animationContainer.classList.add('shake')
          timers.push(
            window.setTimeout(() => {
              animationContainer.classList.remove('shake')
            }, 400),
          )
          createSparkles()
        }, 4800),
      )

      timers.push(
        window.setTimeout(() => {
          resetScene()
        }, 7000),
      )
    }

    const handleMouseEnter = () => {
      bug.style.animationDuration = '1.5s'
      bug.classList.add('panic')
      bug.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.4)) brightness(1.2)'
    }

    const handleMouseLeave = () => {
      bug.style.animationDuration = '8s'
      bug.classList.remove('panic')
      bug.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))'
    }

    const handleBugClick = () => {
      bug.classList.add('caught')
      catcherContainer.classList.add('victory')
      caughtIndicator.classList.add('show')
      showSpeechBubble()
      createSparkles()

      timers.push(
        window.setTimeout(() => {
          resetScene()
        }, 2000),
      )
    }

    triggerCatchMoment()
    const intervalId = window.setInterval(triggerCatchMoment, 8000)

    bug.addEventListener('mouseenter', handleMouseEnter)
    bug.addEventListener('mouseleave', handleMouseLeave)
    bug.addEventListener('click', handleBugClick)

    return () => {
      window.clearInterval(intervalId)
      timers.forEach((timer) => window.clearTimeout(timer))
      bug.removeEventListener('mouseenter', handleMouseEnter)
      bug.removeEventListener('mouseleave', handleMouseLeave)
      bug.removeEventListener('click', handleBugClick)
    }
  }, [])

  return (
    <div className="animation-stage">
      <div className="animation-container" ref={animationContainerRef}>
        <div className="grass" />
        <div className="grass" />
        <div className="grass" />
        <div className="grass" />
        <div className="ground" />

        <div className="dust" />
        <div className="dust" />
        <div className="dust" />
        <div className="dust" />
        <div className="dust" />
        <div className="trail" />
        <div className="trail" />
        <div className="trail" />

        <div className="bug" ref={bugRef}>
          {'\u{1F41E}'}
          <div className="bug-shadow" />
          <div className="bug-sweat" />
          <div className="bug-panic">{'\u{1F4A8}'}</div>
        </div>

        <div className="speech-bubble" ref={speechBubbleRef}>
          Gotcha!
        </div>

        <div className="catcher-container" ref={catcherContainerRef}>
          <div className="net-container">
            <div className="net-rim" />
            <div className="net-handle" />
          </div>
          <div className="catcher-head">
            <div className="eye left" />
            <div className="eye right" />
            <div className="smile" />
          </div>
          <div className="catcher-body" />
          <div className="arm left" />
          <div className="arm right" />
          <div className="catcher-leg left" />
          <div className="catcher-leg right" />
        </div>

        <div className="caught-indicator" ref={caughtIndicatorRef}>
          Bug Caught!
        </div>
      </div>
    </div>
  )
}
