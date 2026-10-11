// CSV safe for Excel: quotes every cell and neutralises formula injection (a leading = + - @ or
// control character would otherwise be executed as a formula when the file is opened).
export function toCsv(columns, rows) {
  const cell = (v) => {
    let s = v == null ? '' : String(v)
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return [columns.join(','), ...rows.map((r) => columns.map((c) => cell(r[c])).join(','))].join('\r\n')
}
