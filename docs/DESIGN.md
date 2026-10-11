# Nizamo app design system

Preview every component at `/design` (development only; 404 in production). Tokens live in `app/globals.css` (`:root`) and are exposed to Tailwind in `tailwind.config.js`.

## Principles
- Warm neutrals derived from cream `#F5F0E8` and espresso `#2C1810`. Terracotta is the **only** accent. Success / warning / danger are muted and used only for meaning.
- Playfair Display: page titles and big numbers only (`font-serif`, with `lining-nums`). Inter for all other UI text.
- Hairline borders, almost no shadow. Radius 8px (controls) / 12px (cards). No gradients, glass, emoji or stock illustration.
- Colour is never the only signal (badges carry words, errors carry an icon and text).
- Every page needs an empty state, loading state and error state. Focus ring is always visible.

## Tokens
| Token | Value | Use |
|---|---|---|
| `bg` | #F5F0E8 | page |
| `surface` | #FBF8F3 | cards, inputs, menus |
| `sunken` / `sidebar` | #EDE6D9 / #EFE8DB | sidebar, wells |
| `line` / `line-strong` | #E4DACA / #CFC2AE | hairlines / input borders |
| `ink` / `ink-2` / `ink-3` | #2C1810 / #5B4A3D / #75634F | text |
| `accent` | #C4622D | indicators, icons (non-text) |
| `accent-strong` | #B5551F | button fill |
| `accent-text` | #A4491A | links, small accent text |
| `accent-soft` | #F2E1D3 | active nav, tints |
| `ok` / `warn` / `bad` (+ `-soft`) | #2F6B4F / #80570B / #9E3128 | semantic |

## Contrast (WCAG, computed)
| Pair | Ratio |
|---|---|
| ink on bg / surface | 14.9 / 15.9 |
| ink-2 on bg | 7.4 |
| ink-3 on bg / surface / sunken | 5.1 / 5.4 / 4.6 |
| accent-text on bg | 5.2 |
| white on accent-strong | 4.9 |
| ok / warn / bad on bg | 5.6 / 5.6 / 6.3 |
| ok / warn / bad on their soft tint | 5.2 / 5.2 / 5.5 |

Plain `accent` (#C4622D) is 3.9:1 on surface: only for non-text shapes. Never use it for small text.

## Type scale (Tailwind classes)
`text-caption` 12, `text-label` 13, `text-body` 14 (default), `text-lead` 16, `text-heading` 18, `text-title` 28 (serif), `text-stat` 32 (serif).

## Components (`components/ui`)
Logo (one-file swap for the real logo), Button, Input / PasswordInput / Select / Textarea, Card, Badge (Pill), Alert, Modal, Menu, DataTable, EmptyState, PageHeader, StatCard / GlanceList, Skeleton, Tabs, Toast (`notify`). Shell: `components/shell/AppShell`. Screens: `components/auth/LoginView`, `components/dashboard/PrincipalHome`.
