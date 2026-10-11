import nextVitals from 'eslint-config-next/core-web-vitals'

const config = [
  ...nextVitals,
  // New React 19 lint rule; existing forms set state in effects on purpose. Revisit per module.
  { rules: { 'react-hooks/set-state-in-effect': 'warn' } },
  { ignores: ['.next/**', 'node_modules/**'] },
]

export default config
