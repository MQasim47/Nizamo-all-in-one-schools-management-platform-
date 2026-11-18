import test from 'node:test'
import assert from 'node:assert/strict'
import { attendanceGlance } from '../lib/dashboard/attendance-glance.mjs'

// School with 5 classes; the teacher teaches 2 of them (one with two subjects, so a duplicate row).
const classIds = ['c1', 'c2', 'c3', 'c4', 'c5']
const rows = (...pairs) => pairs.map(([class_id, status]) => ({ class_id, status }))

const cases = [
  {
    name: 'principal: whole school, nothing marked',
    input: { classIds, assignedClassIds: null, attendance: [] },
    want: { total: 5, marked: 0, left: 5, present: 0, recorded: 0 },
  },
  {
    name: 'teacher: only own classes, nothing marked ("2 classes not marked")',
    input: { classIds, assignedClassIds: ['c1', 'c2', 'c1'], attendance: [] },
    want: { total: 2, marked: 0, left: 2, present: 0, recorded: 0 },
  },
  {
    name: 'teacher: other classes being marked does not change the teacher\'s numbers',
    input: { classIds, assignedClassIds: ['c1', 'c2'], attendance: rows(['c3', 'present'], ['c4', 'absent'], ['c5', 'present']) },
    want: { total: 2, marked: 0, left: 2, present: 0, recorded: 0 },
  },
  {
    name: 'teacher: one own class marked',
    input: { classIds, assignedClassIds: ['c1', 'c2'], attendance: rows(['c1', 'present'], ['c1', 'late'], ['c1', 'absent'], ['c3', 'present']) },
    want: { total: 2, marked: 1, left: 1, present: 2, recorded: 3 },
  },
  {
    name: 'teacher with no assignments sees no attendance block (total 0)',
    input: { classIds, assignedClassIds: [], attendance: rows(['c1', 'present']) },
    want: { total: 0, marked: 0, left: 0, present: 0, recorded: 0 },
  },
  {
    name: 'assignment to a class the user cannot read is ignored',
    input: { classIds, assignedClassIds: ['c1', 'gone'], attendance: [] },
    want: { total: 1, marked: 0, left: 1, present: 0, recorded: 0 },
  },
  {
    name: 'principal: all classes marked',
    input: { classIds: ['c1', 'c2'], assignedClassIds: null, attendance: rows(['c1', 'present'], ['c2', 'leave']) },
    want: { total: 2, marked: 2, left: 0, present: 1, recorded: 2 },
  },
  {
    name: 'empty / missing input',
    input: {},
    want: { total: 0, marked: 0, left: 0, present: 0, recorded: 0 },
  },
]

for (const c of cases) {
  test(`attendanceGlance: ${c.name}`, () => assert.deepEqual(attendanceGlance(c.input), c.want))
}
