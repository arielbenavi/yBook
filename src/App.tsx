import AppShell from './components/AppShell'

function App() {
  return (
    <AppShell>
      <section
        aria-label="feed placeholder"
        className="min-h-[60vh] rounded-card border-2 border-dashed border-rule bg-surface/40 p-10 text-center text-ink-subtle"
      >
        <p className="text-sm">פה ירוצו ה־Posts בשלב הבא</p>
        <p className="mt-1 text-xs uppercase tracking-wider">feed placeholder</p>
      </section>
    </AppShell>
  )
}

export default App
