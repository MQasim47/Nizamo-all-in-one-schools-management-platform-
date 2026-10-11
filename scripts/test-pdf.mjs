// Proves @react-pdf/renderer renders a PDF (needed for SLC, marksheets, challans).
import React from 'react'
import { renderToBuffer, Document, Page, Text } from '@react-pdf/renderer'

const doc = React.createElement(
  Document,
  null,
  React.createElement(Page, { size: 'A4' }, React.createElement(Text, null, 'Nizamo test PDF'))
)
const buf = await renderToBuffer(doc)
if (buf.subarray(0, 5).toString() !== '%PDF-' || buf.length < 500) {
  console.error('FAIL: not a valid PDF', buf.length)
  process.exit(1)
}
console.log(`PASS: PDF rendered (${buf.length} bytes)`)
