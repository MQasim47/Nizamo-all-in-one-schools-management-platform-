import nextVitals from 'eslint-config-next/core-web-vitals'

const config = [
  ...nextVitals,
  // New React 19 lint rule; existing forms set state in effects on purpose. Revisit per module.
  { rules: { 'react-hooks/set-state-in-effect': 'warn' } },
  // School dates are Pakistan dates (lib/utils/dates.mjs: todayPk, toPkDate). Slicing an ISO string
  // gives the UTC date, which is yesterday between 00:00 and 05:00 in Pakistan.
  {
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "CallExpression[callee.property.name=/^(split|slice|substring|substr)$/][callee.object.callee.property.name='toISOString']",
          message: 'UTC date from toISOString(): use todayPk() / toPkDate() from lib/utils/dates.mjs.',
        },
      ],
    },
  },
  { ignores: ['.next/**', 'node_modules/**'] },
]

export default config
