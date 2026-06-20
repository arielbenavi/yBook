import type { ReactNode } from 'react'

type AppShellProps = {
  children: ReactNode
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-rule bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-[600px] items-center px-4 py-3">
          <span className="text-xl font-extrabold tracking-tight text-brand">
            yBook
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-[600px] px-4 py-6">{children}</main>
    </div>
  )
}
