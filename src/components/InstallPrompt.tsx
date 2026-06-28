import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

type Platform = 'chromium' | 'ios' | null

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|Chrome/.test(ua)
  if (isIos && isSafari) return 'ios'
  if ('BeforeInstallPromptEvent' in window) return 'chromium'
  return null
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone)
}

const DISMISS_KEY = 'ybook-install-dismissed'

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M10 2v11M10 2l3.5 3.5M10 2L6.5 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 9v7a2 2 0 002 2h8a2 2 0 002-2V9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [visible, setVisible] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)
  const hasScrolled = useRef(false)
  const timerFired = useRef(false)

  useEffect(() => {
    if (isStandalone()) return
    if (sessionStorage.getItem(DISMISS_KEY)) return

    const detected = detectPlatform()
    if (!detected) return

    if (detected === 'chromium') {
      const handler = (e: Event) => {
        e.preventDefault()
        deferredPrompt.current = e as BeforeInstallPromptEvent
        setPlatform('chromium')
        setTimeout(() => setVisible(true), 4000)
      }
      window.addEventListener('beforeinstallprompt', handler)
      return () => window.removeEventListener('beforeinstallprompt', handler)
    }

    const maybeShow = () => {
      if (hasScrolled.current && timerFired.current) {
        setPlatform('ios')
        setVisible(true)
      }
    }

    const timer = setTimeout(() => {
      timerFired.current = true
      maybeShow()
    }, 30000)

    const onScroll = () => {
      hasScrolled.current = true
      maybeShow()
      window.removeEventListener('scroll', onScroll)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const dismiss = useCallback(() => {
    setVisible(false)
    sessionStorage.setItem(DISMISS_KEY, '1')
  }, [])

  const install = useCallback(async () => {
    const prompt = deferredPrompt.current
    if (!prompt) return
    await prompt.prompt()
    await prompt.userChoice
    deferredPrompt.current = null
    setVisible(false)
  }, [])

  return (
    <AnimatePresence>
      {visible && platform && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4"
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        >
          {platform === 'chromium' ? (
            <div className="flex w-full max-w-[600px] items-center gap-3 rounded-card bg-surface p-4 shadow-card">
              <p className="flex-1 text-sm font-medium text-ink">
                התקינו את yBook למסך הבית
              </p>
              <button
                type="button"
                onClick={install}
                className="shrink-0 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                התקן
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="shrink-0 p-1 text-ink-muted transition-colors hover:text-ink"
                aria-label="סגור"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="flex w-full max-w-[600px] flex-col gap-4 rounded-t-2xl rounded-b-card bg-surface p-5 shadow-card">
              <div className="flex items-start justify-between">
                <p className="text-base font-bold text-ink">התקינו את yBook</p>
                <button
                  type="button"
                  onClick={dismiss}
                  className="shrink-0 p-1 text-ink-muted transition-colors hover:text-ink"
                  aria-label="סגור"
                >
                  ✕
                </button>
              </div>
              <ol className="flex flex-col gap-3 text-sm text-ink">
                <li className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">1</span>
                  <span>לחצו על <ShareIcon className="inline-block align-text-bottom text-brand" /> בתחתית המסך</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">2</span>
                  <span>גללו למטה ובחרו ״הוסף למסך הבית״</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">3</span>
                  <span>לחצו ״הוסף״</span>
                </li>
              </ol>
              <button
                type="button"
                onClick={dismiss}
                className="w-full rounded-full bg-brand py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                הבנתי
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
