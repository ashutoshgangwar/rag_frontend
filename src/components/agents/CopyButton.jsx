import { useEffect, useState } from 'react'
import AgentIcon from './AgentIcon.jsx'

/**
 * Clipboard API where it exists (secure contexts), a hidden textarea and
 * execCommand where it does not — plain http on a LAN IP is not secure, and
 * that is a real way this app gets opened.
 */
async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  if (!ok) throw new Error('Copy failed')
}

export default function CopyButton({ text, label = 'Copy', className = '' }) {
  const [state, setState] = useState('idle') // idle | copied | failed

  useEffect(() => {
    if (state === 'idle') return undefined
    const timer = setTimeout(() => setState('idle'), 1600)
    return () => clearTimeout(timer)
  }, [state])

  const onClick = async () => {
    try {
      await copyText(text)
      setState('copied')
    } catch {
      setState('failed')
    }
  }

  return (
    <button type="button" className={`btn btn-small btn-copy ${className}`} onClick={onClick}>
      <AgentIcon name={state === 'copied' ? 'check' : 'copy'} size={14} strokeWidth={state === 'copied' ? 2.6 : 1.8} />
      <span aria-live="polite">{state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}</span>
    </button>
  )
}
