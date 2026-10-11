'use client'

import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ArrowDown, ArrowUp, ArrowUpDown, Ellipsis } from 'lucide-react'
import Menu from './Menu'

// columns: [{ key, header, sortable?, sortValue?(row), render?(row), align?: 'right', mobile?: false, primary?: true }]
// rowActions: (row) => [{ label, onClick, href, danger }]   (a quiet "..." menu per row)
// empty: <EmptyState .../>   caption: screen-reader table name
// Wide screens: a real <table> with sortable headers. Phones (< md): each row becomes a small card,
// the `primary` column (default: first) as its title, the rest as "label: value" lines.
export default function DataTable({ columns, rows, rowKey = 'id', rowActions, empty, caption, initialSort, className }) {
  const [sort, setSort] = useState(initialSort || null)

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

  if (!rows.length) {
    return <div className={clsx('rounded-card border border-line bg-surface', className)}>{empty}</div>
  }

  const primary = columns.find((c) => c.primary) || columns[0]
  const cell = (c, r) => (c.render ? c.render(r) : r[c.key])

  return (
    <div className={clsx('rounded-card border border-line bg-surface shadow-xs', className)}>
      {/* wide screens */}
      <table className="hidden w-full text-body md:table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-line bg-bg text-left">
            {columns.map((c) => {
              const active = sort?.key === c.key
              const Icon = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
              return (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : c.sortable ? 'none' : undefined}
                  className={clsx('px-4 py-2.5 text-caption font-semibold uppercase tracking-wide text-ink-3 first:rounded-tl-card last:rounded-tr-card', c.align === 'right' && 'text-right')}
                >
                  {c.sortable ? (
                    <button type="button" onClick={() => toggleSort(c.key)} className={clsx('-mx-1.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 uppercase tracking-wide hover:text-ink', active && 'text-ink')}>
                      {c.header}
                      <Icon size={13} strokeWidth={1.75} aria-hidden="true" className={clsx(!active && 'opacity-60')} />
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              )
            })}
            {rowActions && <th scope="col" className="w-12 px-2"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sorted.map((r) => (
            <tr key={r[rowKey]} className="hover:bg-bg">
              {columns.map((c) => (
                <td key={c.key} className={clsx('px-4 py-3 align-middle text-ink-2', c === primary && 'font-medium text-ink', c.align === 'right' && 'text-right tabular-nums')}>
                  {cell(c, r)}
                </td>
              ))}
              {rowActions && (
                <td className="px-2 text-right">
                  <Menu
                    label={`Actions for ${String(r[primary.key] ?? 'row')}`}
                    trigger={<Ellipsis size={18} strokeWidth={1.75} aria-hidden="true" />}
                    items={rowActions(r)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink"
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
                      <dd className="min-w-0 text-ink-2">{cell(c, r)}</dd>
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
  )
}
