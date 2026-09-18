import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'rangify-theme'
const CHOICES = ['light', 'dark', 'system']

function readStored() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return CHOICES.includes(value) ? value : 'system'
  } catch {
    return 'system'
  }
}

let current = readStored()
const listeners = new Set()

function apply(choice) {
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
}

export function setTheme(choice) {
  if (!CHOICES.includes(choice) || choice === current) return
  current = choice
  apply(choice)
  try {
    localStorage.setItem(STORAGE_KEY, choice)
  } catch {
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => current)
  return { theme, setTheme }
}
