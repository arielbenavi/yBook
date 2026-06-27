import { useCallback, useEffect, useRef, useState } from 'react'

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

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>(null)
  const [visible, setVisible] = useState(false)
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    if (isStandalone()) return
    if (sessionStorage.getItem(DISMISS_KEY)) return

    const detected = detectPlatform()
    if (!detected) return

    if (detected === 'ios') {
      const timer = setTimeout(() => {
        setPlatform('ios')
        setVisible(true)
      }, 4000)
      return () => clearTimeout(timer)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt.current = e as BeforeInstallPromptEvent
      setPlatform('chromium')
      setTimeout(() => setVisible(true), 4000)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
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

  if (!visible || !platform) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4">
      <div className="flex w-full max-w-[600px] items-center gap-3 rounded-card bg-surface p-4 shadow-card">
        {platform === 'chromium' ? (
          <>
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
          </>
        ) : (
          <p className="flex-1 text-sm font-medium text-ink">
            להתקנה: לחצו על{' '}
            <span className="inline-block translate-y-px text-base text-brand" aria-label="כפתור שיתוף">
              ⬆
            </span>
            {' '}ואז ״הוסף למסך הבית״
          </p>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 p-1 text-ink-muted transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
          aria-label="סגור"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
