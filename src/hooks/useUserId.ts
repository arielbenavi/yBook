import { useMemo } from 'react'

const STORAGE_KEY = 'ybook-user-id'

function getOrCreateId(): string {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored) return stored
  const id = crypto.randomUUID()
  localStorage.setItem(STORAGE_KEY, id)
  return id
}

export function useUserId(): string {
  return useMemo(() => getOrCreateId(), [])
}
