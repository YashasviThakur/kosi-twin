// A map panel that can be collapsed to its header strip. Open/closed is remembered per panel in
// this browser (best effort: storage can be unavailable, e.g. in private windows).
import { useId, useState } from 'react'
import type { ReactNode } from 'react'

interface Props {
  id: string                 // storage key, e.g. "gauge"
  title: ReactNode
  summary?: ReactNode        // shown in the header only while collapsed
  className?: string
  collapseLabel: string
  expandLabel: string
  children: ReactNode
}

const KEY = (id: string) => `kosi.panel.${id}.collapsed`

function load(id: string) {
  try {
    return localStorage.getItem(KEY(id)) === '1'
  } catch {
    return false
  }
}

function save(id: string, collapsed: boolean) {
  try {
    localStorage.setItem(KEY(id), collapsed ? '1' : '0')
  } catch {
    // storage unavailable: the panel still works, it just won't remember
  }
}

export function Panel({ id, title, summary, className = '', collapseLabel, expandLabel, children }: Props) {
  const [collapsed, setCollapsed] = useState(() => load(id))
  const bodyId = useId()
  const toggle = () => {
    save(id, !collapsed)
    setCollapsed(!collapsed)
  }

  return (
    <section className={`panel ${className}${collapsed ? ' is-collapsed' : ''}`}>
      <header className="panel-head">
        <div className="panel-title">
          {title}
          {collapsed && summary && <div className="panel-summary num">{summary}</div>}
        </div>
        <button className="panel-toggle" onClick={toggle} aria-expanded={!collapsed} aria-controls={bodyId}
          aria-label={collapsed ? expandLabel : collapseLabel} title={collapsed ? expandLabel : collapseLabel}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4" /></svg>
        </button>
      </header>
      <div id={bodyId} className="panel-body" hidden={collapsed}>{children}</div>
    </section>
  )
}
