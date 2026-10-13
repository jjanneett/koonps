import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, personnel, insertEmployee, changeRole, koreaDate, validateState } from '../js/data.js';

const employee = (id, role = 'role-0', work = 'office', note = 'none') => ({ id, role, name: id, phone: '010-1234-5678', work: { type: 'preset', id: work }, note: { type: 'preset', id: note } });
test('인원 집계는 요청한 상태 및 비고를 합산하고 직접 입력은 제외한다', () => {
  const rows = ['office', 'center', 'camp', 'maintenance', 'driving', 'off', 'leave', 'sick', 'public'].map((work, i) => employee(String(i), 'role-0', work));
  rows[0].note.id = 'duty'; rows[6].note.id = 'duty-off';
  rows.push({ ...employee('custom'), work: { type: 'custom', label: '사무실', color: 'blue' }, note: { type: 'custom', label: '당 직', color: 'red' } });
  assert.deepEqual(personnel(rows), { total: 10, working: 5, off: 1, other: 5 });
});
test('같은 직책은 마지막 직원 뒤, 새 그룹은 사회복무요원 위에 배치한다', () => {
  const state = initialState();
  for (const row of [employee('social', 'role-8'), employee('first'), employee('manager', 'role-1'), employee('second')]) insertEmployee(state, row);
  assert.deepEqual(state.employees.map(item => item.id), ['first', 'second', 'manager', 'social']);
  changeRole(state, state.employees[1], 'role-1');
  assert.deepEqual(state.employees.map(item => item.id), ['first', 'manager', 'second', 'social']);
});
test('대한민국 날짜와 요일은 UTC 자정과 관계없이 계산한다', () => {
  assert.deepEqual(koreaDate(new Date('2026-10-13T15:01:00Z')), { text: '2026. 10. 14. 수요일', iso: '2026-10-14' });
});
test('백업 검증은 잘못된 직책, 중복 ID, 상태, 색상과 이미지를 거부한다', () => {
  const state = initialState(); insertEmployee(state, employee('first'));
  assert.deepEqual(validateState(state), state);
  for (const mutate of [
    s => { s.employees[0].role = 'unknown'; },
    s => { s.employees.push(s.employees[0]); },
    s => { s.employees[0].work.id = 'unknown'; },
    s => { s.employees[0].work = { type: 'custom', label: '시험', color: '__proto__' }; },
    s => { s.logo = 'javascript:alert(1)'; },
    s => { s.roles[0].title = ' '; },
  ]) { const clone = structuredClone(state); mutate(clone); assert.throws(() => validateState(clone)); }
});
test('불러오기는 직책 그룹을 복원하고 임의 속성을 저장하지 않는다', () => {
  const state = initialState(); state.employees = [employee('a'), employee('b', 'role-1'), employee('c')];
  state.unwanted = 'anything'; state.employees[0].unwanted = 'anything';
  const restored = validateState(state);
  assert.deepEqual(restored.employees.map(item => item.id), ['a', 'c', 'b']);
  assert.equal(Object.hasOwn(restored, 'unwanted'), false);
  assert.equal(Object.hasOwn(restored.employees[0], 'unwanted'), false);
});
