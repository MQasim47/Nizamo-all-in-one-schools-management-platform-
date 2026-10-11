'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import clsx from 'clsx'
import { ArrowDown, ArrowUp, ArrowUpDown, Ellipsis } from 'lucide-react'
import Menu from './Menu'
import ErrorState from './ErrorState'
import { SkeletonRows } from './Skeleton'

// columns: [{ key, header, sortable?, sortValue?(row), render?(row), align?: 'right', mobile?: false, primary?: true }]
// rowActions: (row) => [{ label, onClick, href, danger }]   (a quiet "..." menu per row)
// empty: <EmptyState .../>   caption: screen-reader table name   toolbar: left-hand slot above the table
// loading: skeleton rows.   error: calm message with "Try again" (onRetry, or a page refresh).
// Wide screens: a real <table>: sticky header, row hover, tabular numerals, sortable headings, a
// comfortable/compact density switch remembered per user. Phones (< md): each row becomes a small card.
const DENSITY = {
  comfortable: 'py-3',
  compact: 'py-1.5',
}

function useDensity() {
  const { data } = useSession()
  const key = `nz-density:${data?.user?.id || 'guest'}`
  const [density, setDensity] = useState('comfortable')
  useEffect(() => {
    try {
      const v = localStorage.getItem(key)
      if (v === 'compact' || v === 'comfortable') setDensity(v)
    } catch {}
  }, [key])
  const set = (v) => {
    setDensity(v)
    try { localStorage.setItem(key, v) } catch {}
  }
  return [density, set]
}

export default function DataTable({ columns, rows, rowKey = 'id', rowActions, empty, caption, initialSort, toolbar, loading = false, error = false, onRetry, className }) {
  const [sort, setSort] = useState(initialSort || null)
  const [density, setDensity] = useDensity()

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col) return rows
    const val = (r) => (col.sortValue ? col.sortValue(r) : r[col.key])
    const dir = sort.dir === 'desc' ? -1 : 1
    return [...rows].sort((a, b) => {
      const x = val(a), y = val(b)
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'en', { numeric: true, sensitivity: 'base' })) * dir
    })
  }, [rows, columns, sort])

  function toggleSort(key) {
    setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }))
  }

  const shell = 'rounded-card border border-line bg-surface shadow-xs'
  if (loading) return <div className={clsx(shell, className)}><SkeletonRows rows={5} /></div>
  if (error) return <div className={clsx(shell, className)}><ErrorState onRetry={onRetry} /></div>
  if (!rows.length) return <div className={clsx(shell, className)}>{empty}</div>

  const primary = columns.find((c) => c.primary) || columns[0]
  const cell = (c, r) => (c.render ? c.render(r) : r[c.key])
  const pad = DENSITY[density]

  return (
    <div className={className}>
      <div className="mb-2 hidden items-center justify-between gap-3 md:flex">
        <div className="min-w-0">{toolbar}</div>
        <div role="group" aria-label="Row spacing" className="inline-flex rounded-ctl border border-line-strong bg-surface p-0.5">
          {[['comfortable', 'Comfortable'], ['compact', 'Compact']].map(([v, text]) => (
            <button
              key={v}
              type="button"
              aria-pressed={density === v}
              onClick={() => setDensity(v)}
              className={clsx('rounded-md px-2.5 py-1 text-caption font-medium transition-colors duration-150 ease-out', density === v ? 'bg-espresso text-cream' : 'text-ink-2 hover:bg-sunken')}
            >
              {text}
            </button>
          ))}
        </div>
      </div>

      <div className={shell}>
        {/* wide screens */}
        <table className="hidden w-full border-separate border-spacing-0 text-body tabular-nums md:table">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="text-left">
              {columns.map((c, i) => {
                const active = sort?.key === c.key
                const Icon = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : c.sortable ? 'none' : undefined}
                    className={clsx(
                      'sticky top-[var(--sticky-top,56px)] z-10 bg-bg px-4 py-2.5 text-caption font-semibold uppercase tracking-wide text-ink-3 shadow-[inset_0_-1px_0_var(--line)]',
                      i === 0 && 'rounded-tl-card',
                      !rowActions && i === columns.length - 1 && 'rounded-tr-card',
                      c.align === 'right' && 'text-right'
                    )}
                  >
                    {c.sortable ? (
                      <button type="button" onClick={() => toggleSort(c.key)} className={clsx('-mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 uppercase tracking-wide transition-colors duration-150 ease-out hover:text-ink', active && 'text-ink')}>
                        {c.header}
                        <Icon size={13} strokeWidth={1.75} aria-hidden="true" className={clsx(!active && 'opacity-60')} />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                )
              })}
              {rowActions && (
                <th scope="col" className="sticky top-[var(--sticky-top,56px)] z-10 w-12 rounded-tr-card bg-bg px-2 shadow-[inset_0_-1px_0_var(--line)]">
                  <span className="sr-only">Actions</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r[rowKey]} className="group transition-colors duration-150 ease-out hover:bg-bg">
                {columns.map((c) => (
                  <td key={c.key} className={clsx('border-b border-line px-4 align-middle text-ink-2 group-last:border-b-0', pad, c === primary && 'font-medium text-ink', c.align === 'right' && 'text-right')}>
                    {cell(c, r)}
                  </td>
                ))}
                {rowActions && (
                  <td className={clsx('border-b border-line px-2 text-right group-last:border-b-0', pad)}>
                    <Menu
                      label={`Actions for ${String(r[primary.key] ?? 'row')}`}
                      trigger={<Ellipsis size={18} strokeWidth={1.75} aria-hidden="true" />}
                      items={rowActions(r)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 transition-colors duration-150 ease-out hover:bg-sunken hover:text-ink"
                    />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* phones */}
        <ul className="divide-y divide-line md:hidden">
          {sorted.map((r) => (
            <li key={r[rowKey]} className="flex items-start gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{cell(primary, r)}</p>
                <dl className="mt-1.5 space-y-1">
                  {columns
                    .filter((c) => c !== primary && c.mobile !== false)
                    .map((c) => (
                      <div key={c.key} className="flex items-baseline gap-2 text-label">
                        <dt className="w-24 shrink-0 text-ink-3">{c.header}</dt>
                        <dd className="min-w-0 text-ink-2 tabular-nums">{cell(c, r)}</dd>
                      </div>
                    ))}
                </dl>
              </div>
              {rowActions && (
                <Menu
                  label={`Actions for ${String(r[primary.key] ?? 'row')}`}
                  trigger={<Ellipsis size={18} strokeWidth={1.75} aria-hidden="true" />}
                  items={rowActions(r)}
                  className="-mr-2 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink"
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
