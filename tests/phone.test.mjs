import test from 'node:test'
import assert from 'node:assert/strict'
import { normalisePkMobile } from '../lib/utils/phone.mjs'

const GOOD = '+923268914320'

test('normalises common Pakistani mobile formats to +923XXXXXXXXX', () => {
  for (const input of ['03268914320', '0326 8914320', '0326-8914320', '+92 326-8914320', '+923268914320',
    '923268914320', '00923268914320', '3268914320', '(0326) 891 4320']) {
    assert.equal(normalisePkMobile(input), GOOD, input)
  }
})

test('rejects numbers that are not Pakistani mobiles', () => {
  for (const input of ['', '   ', 'abc', '0300123456', '030012345678', '04211234567', '+14155550123', '0226 8914320',
    '12345', null, undefined, 3268914320]) {
    assert.equal(normalisePkMobile(input), null, String(input))
  }
})
