(() => {
'use strict';

const KEY = 'nam-myeon-personnel-v1';
const COLORS = { blue: '파랑', red: '빨강', black: '검정' };
const TITLES = ['분 소 장', '계 장', '현장지원직(해설)', '수익시설', '환경관리', '지킴이', '탐방운전', '분소 청사관리', '사회복무요원'];
const WORK = [
  { id: 'office', label: '사무실', color: 'blue' },
  { id: 'center', label: '체험학습관', color: 'blue' },
  { id: 'camp', label: '야 영 장', color: 'blue' },
  { id: 'maintenance', label: '환경 및 시설물 관리', color: 'blue' },
  { id: 'driving', label: '탐 방 운 전', color: 'blue' },
  { id: 'off', label: '휴 무', color: 'red' },
  { id: 'leave', label: '연 가', color: 'red' },
  { id: 'sick', label: '병 가', color: 'red' },
  { id: 'public', label: '공 가', color: 'red' },
];
const NOTES = [
  { id: 'none', label: '—', color: 'black' },
  { id: 'duty', label: '당 직', color: 'red' },
  { id: 'duty-off', label: '당 직 휴 무', color: 'red' },
];
const OPTIONS = { work: WORK, note: NOTES };
function initialState() {
  return { version: 1, roles: TITLES.map((title, i) => ({ id: `role-${i}`, title })), employees: [], logo: null };
}
function display(value, field) {
  return value.type === 'custom' ? value : OPTIONS[field].find(option => option.id === value.id);
}
function personnel(employees) {
  const count = { total: employees.length, working: 0, off: 0, other: 0 };
  for (const employee of employees) {
    if (employee.work.type === 'preset') {
      if (WORK.slice(0, 5).some(option => option.id === employee.work.id)) count.working++;
      if (employee.work.id === 'off') count.off++;
      if (['leave', 'sick', 'public'].includes(employee.work.id)) count.other++;
    }
    if (employee.note.type === 'preset' && ['duty', 'duty-off'].includes(employee.note.id)) count.other++;
  }
  return count;
}
function insertEmployee(state, employee) {
  const last = state.employees.findLastIndex(item => item.role === employee.role);
  if (last >= 0) state.employees.splice(last + 1, 0, employee);
  else {
    const social = state.roles.find(role => role.title === '사회복무요원');
    const index = social ? state.employees.findIndex(item => item.role === social.id) : -1;
    state.employees.splice(index < 0 ? state.employees.length : index, 0, employee);
  }
}
function changeRole(state, employee, role) {
  if (employee.role === role) return;
  state.employees = state.employees.filter(item => item.id !== employee.id);
  employee.role = role;
  insertEmployee(state, employee);
}
function koreaDate(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'long' }).formatToParts(now).map(part => [part.type, part.value]));
  return { text: `${parts.year}. ${parts.month}. ${parts.day}. ${parts.weekday}`, iso: `${parts.year}-${parts.month}-${parts.day}` };
}
function validateState(value) {
  const bad = () => { throw new Error('올바른 근무현황표 백업 파일이 아닙니다.'); };
  const text = (v, max) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  if (!value || value.version !== 1 || !Array.isArray(value.roles) || !Array.isArray(value.employees) || value.roles.length < 1 || value.roles.length > 50 || value.employees.length > 500) bad();
  const roles = new Set(), titles = new Set(), ids = new Set();
  for (const role of value.roles) {
    if (!role || !text(role.id, 100) || !text(role.title, 30) || roles.has(role.id) || titles.has(role.title.trim())) bad();
    roles.add(role.id); titles.add(role.title.trim());
  }
  for (const employee of value.employees) {
    if (!employee || !text(employee.id, 100) || ids.has(employee.id) || !roles.has(employee.role) || !text(employee.name, 30) || typeof employee.phone !== 'string' || employee.phone.length > 30) bad();
    ids.add(employee.id);
    for (const field of ['work', 'note']) {
      const item = employee[field];
      if (!item || !['preset', 'custom'].includes(item.type)) bad();
      if (item.type === 'preset' && !OPTIONS[field].some(option => option.id === item.id)) bad();
      if (item.type === 'custom' && (!text(item.label, 80) || !Object.hasOwn(COLORS, item.color))) bad();
    }
  }
  if (value.logo !== null && !(typeof value.logo === 'string' && value.logo.length <= 1500000 && /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value.logo))) bad();
  // Whitelist fields; never retain arbitrary imported properties.
  const state = { version: 1, roles: value.roles.map(({ id, title }) => ({ id, title: title.trim() })), employees: [], logo: value.logo };
  for (const item of value.employees) {
    const pick = field => item[field].type === 'custom' ? { type: 'custom', label: item[field].label.trim(), color: item[field].color } : { type: 'preset', id: item[field].id };
    insertEmployee(state, { id: item.id, role: item.role, name: item.name.trim(), phone: item.phone.trim(), work: pick('work'), note: pick('note') });
  }
  return state;
}

// Classic scripts can share this API when index.html is opened as a local file.
globalThis.Personnel = Object.freeze({ KEY, COLORS, TITLES, WORK, NOTES, OPTIONS, initialState, display, personnel, insertEmployee, changeRole, koreaDate, validateState });
})();
