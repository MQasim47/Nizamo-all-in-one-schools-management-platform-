import { existsSync, readFileSync } from 'node:fs'

// Loads .env.local into process.env without overriding variables that are already set
// (so CI / the shell always win). Shared by the newer scripts.
export function loadEnvLocal() {
  const envUrl = new URL('../../.env.local', import.meta.url)
  if (!existsSync(envUrl)) return
  for (const line of readFileSync(envUrl, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]', 'host.docker.internal'])

export function isLocalHost(host) {
  return LOCAL_HOSTS.has(String(host || '').toLowerCase())
}
