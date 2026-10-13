import { KEY, COLORS, OPTIONS, initialState, display, personnel, insertEmployee, changeRole, koreaDate, validateState } from './data.js';

const $ = id => document.getElementById(id);
const popup = $('popup');
const content = $('popup-content');
let state = initialState();
let storageError = false;
let toastTimer;
let returnFocus;
let pendingImport;
let menuButton;
let startupError = '';

try {
  const stored = localStorage.getItem(KEY);
  if (stored) state = validateState(JSON.parse(stored));
} catch {
  storageError = true;
  startupError = '저장된 정보를 읽을 수 없습니다. 백업을 불러오거나 새로 등록해 주세요.';
}

function el(tag, attrs = {}, text = '') {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'class') element.className = value;
    else element.setAttribute(key, value);
  }
  if (text) element.textContent = text;
  return element;
}
function button(text, className, action) {
  const item = el('button', { type: 'button', class: className }, text);
  item.addEventListener('click', action);
  return item;
}
function toast(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
}
function save(message) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    storageError = false;
    $('save-text').textContent = `자동 저장됨 · ${new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())}`;
  } catch {
    storageError = true;
    $('save-text').textContent = '자동 저장 불가 · 백업 필요';
    toast('브라우저에 저장할 수 없습니다. 백업으로 변경 내용을 보관해 주세요.');
  }
  $('save').classList.toggle('error', storageError);
  render();
  if (message && !storageError) toast(message);
}
function updateDate() {
  const date = koreaDate();
  $('date').textContent = date.text;
  $('date').dateTime = date.iso;
}
function roleSelect(value, label) {
  const select = el('select', { 'aria-label': label });
  for (const role of state.roles) select.append(el('option', { value: role.id }, role.title));
  select.value = value;
  return select;
}
function statusSelect(employee, field) {
  const current = display(employee[field], field);
  const select = el('select', { class: `field ${current.color}`, 'aria-label': `${employee.name} ${field === 'work' ? '근무' : '비고'}` });
  for (const option of OPTIONS[field]) select.append(el('option', { value: option.id, class: option.color }, option.label));
  if (employee[field].type === 'custom') select.append(el('option', { value: 'current', class: current.color }, current.label));
  select.append(el('option', { value: 'custom' }, '직접 입력'));
  select.value = employee[field].type === 'custom' ? 'current' : employee[field].id;
  select.title = current.label;
  select.addEventListener('change', () => {
    if (select.value === 'custom') {
      select.value = employee[field].type === 'custom' ? 'current' : employee[field].id;
      customPopup(employee, field);
    } else if (select.value !== 'current') {
      employee[field] = { type: 'preset', id: select.value };
      save();
      document.querySelector(`[data-id="${CSS.escape(employee.id)}"] select[aria-label="${CSS.escape(select.getAttribute('aria-label'))}"]`)?.focus();
    }
  });
  return select;
}
function render() {
  closeMenu();
  const count = personnel(state.employees);
  for (const key of Object.keys(count)) $(key).textContent = count[key];
  $('rows').replaceChildren();
  const groups = [];
  for (const employee of state.employees) {
    const previous = groups.at(-1);
    if (previous?.role === employee.role) previous.employees.push(employee);
    else groups.push({ role: employee.role, employees: [employee] });
  }
  for (const group of groups) {
    group.employees.forEach((employee, index) => {
      const row = el('tr', { 'data-id': employee.id, class: index === 0 ? 'group-start' : '' });
      if (index === 0) {
        const cell = el('td', { rowspan: group.employees.length, class: 'role-cell' });
        const select = roleSelect(employee.role, `${state.roles.find(role => role.id === employee.role).title} 직책 변경`);
        select.className = 'field role-field';
        select.addEventListener('change', () => groupRolePopup(group, select.value));
        cell.append(select); row.append(cell);
      }
      row.append(el('td', { class: 'name' }, employee.name));
      const phone = el('td');
      if (employee.phone) phone.append(el('a', { class: 'phone', href: `tel:${employee.phone.replace(/[^\d+]/g, '')}` }, employee.phone));
      else phone.textContent = '—';
      row.append(phone);
      for (const field of ['work', 'note']) { const cell = el('td'); cell.append(statusSelect(employee, field)); row.append(cell); }
      const menu = el('td');
      const more = button('⋮', 'more', event => openMenu(employee, event.currentTarget));
      more.setAttribute('aria-label', `${employee.name} 자세히 보기`);
      more.setAttribute('aria-haspopup', 'menu'); more.setAttribute('aria-expanded', 'false');
      menu.append(more); row.append(menu); $('rows').append(row);
    });
  }
  $('empty').hidden = state.employees.length > 0;
  const image = $('logo').querySelector('img');
  const logo = image || el('img', { alt: '태안해안국립공원사무소 로고' });
  const source = state.logo || 'assets/logo.png';
  if (logo.getAttribute('src') !== source) logo.src = source;
  if (!image) $('logo').replaceChildren(logo);
  updateDate();
}
function openPopup(title, description = '') {
  closeMenu();
  if (!popup.open) returnFocus = document.activeElement;
  content.replaceChildren();
  const head = el('div', { class: 'popup-head' });
  head.append(el('h2', { id: 'popup-title' }, title), button('×', 'close', closePopup));
  head.lastChild.setAttribute('aria-label', '팝업 닫기');
  content.append(head);
  if (description) content.append(el('p', { class: 'popup-desc' }, description));
  if (!popup.open) popup.showModal();
  return content;
}
function closePopup() { popup.close(); }
function field(form, title, input) {
  const label = el('label', { class: 'form-field' }, title);
  input.classList.add('input');
  label.append(input); form.append(label); return input;
}
function actions(form, actionLabel = '완료', danger = false, cancelAction = closePopup) {
  const container = el('div', { class: 'popup-actions' });
  container.append(button('취소', 'button', cancelAction));
  container.append(el('button', { class: `button ${danger ? 'danger' : 'primary'}`, type: 'submit' }, actionLabel));
  form.append(container);
}
function error(form, message) {
  let item = form.querySelector('.form-error');
  if (!item) { item = el('p', { class: 'form-error', role: 'alert' }); form.append(item); }
  item.textContent = message;
}
function employeePopup(employee) {
  openPopup(employee ? '직원 수정' : '직원 추가', '직원 정보를 입력해 주세요. 근무 상태는 표에서 변경할 수 있습니다.');
  const form = el('form');
  const role = field(form, '직책', roleSelect(employee?.role || state.roles[0].id, '직책'));
  const name = field(form, '이름', el('input', { name: 'name', placeholder: '이름을 입력하세요', maxlength: '30', required: '', autocomplete: 'off' }));
  const phone = field(form, '전화번호', el('input', { name: 'phone', type: 'tel', placeholder: '010-0000-0000', maxlength: '30', autocomplete: 'off' }));
  if (employee) { name.value = employee.name; phone.value = employee.phone; }
  actions(form);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!name.value.trim()) { error(form, '이름을 입력해 주세요.'); name.focus(); return; }
    if (employee) { employee.name = name.value.trim(); employee.phone = phone.value.trim(); changeRole(state, employee, role.value); }
    else {
      if (state.employees.length >= 500) { error(form, '직원은 최대 500명까지 등록할 수 있습니다.'); return; }
      insertEmployee(state, { id: crypto.randomUUID(), role: role.value, name: name.value.trim(), phone: phone.value.trim(), work: { type: 'preset', id: 'office' }, note: { type: 'preset', id: 'none' } });
    }
    closePopup(); save(employee ? '직원 정보를 수정했습니다.' : '직원을 추가했습니다.');
  });
  content.append(form); name.focus();
}
function customPopup(employee, key) {
  openPopup(`${key === 'work' ? '근무' : '비고'} 직접 입력`, '내용과 표시할 글자 색을 선택해 주세요.');
  const form = el('form');
  const input = field(form, '내용', el('input', { placeholder: '내용을 입력하세요.', maxlength: '80', required: '' }));
  const colors = el('fieldset', { class: 'colors' });
  colors.append(el('legend', {}, '텍스트 색상'));
  const choices = el('div', { class: 'color-options' });
  const current = employee[key].type === 'custom' ? employee[key] : { label: '', color: 'blue' };
  input.value = current.label;
  for (const [color, title] of Object.entries(COLORS)) {
    const label = el('label', { class: 'color-label' });
    const radio = el('input', { type: 'radio', name: 'color', value: color });
    radio.checked = color === current.color;
    label.append(radio, el('span', { class: `swatch ${color}`, 'aria-hidden': 'true' }), el('span', {}, title));
    choices.append(label);
  }
  colors.append(choices); form.append(colors); actions(form);
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!input.value.trim()) { error(form, '내용을 입력해 주세요.'); input.focus(); return; }
    employee[key] = { type: 'custom', label: input.value.trim(), color: new FormData(form).get('color') };
    closePopup(); save('직접 입력한 내용을 적용했습니다.');
  });
  content.append(form); input.focus();
}
function groupRolePopup(group, target) {
  // A merged role cell represents the whole group; individual changes use 직원 수정.
  const role = state.roles.find(role => role.id === target);
  render();
  openPopup('직책 변경', `이 그룹의 직원 ${group.employees.length}명을 ‘${role.title}’ 직책으로 변경할까요? 개별 직책은 직원 수정에서 변경할 수 있습니다.`);
  const form = el('form'); actions(form);
  form.addEventListener('submit', event => {
    event.preventDefault();
    for (const employee of group.employees) changeRole(state, employee, target);
    closePopup(); save('직책을 변경했습니다.');
  });
  content.append(form);
}
function deleteEmployee(employee) {
  openPopup('직원 삭제', '아래 직원을 근무현황표에서 삭제할까요?');
  content.append(el('p', { class: 'confirm-name' }, `${state.roles.find(role => role.id === employee.role).title} · ${employee.name}`));
  const form = el('form'); actions(form, '삭제', true);
  form.addEventListener('submit', event => {
    event.preventDefault(); state.employees = state.employees.filter(item => item.id !== employee.id);
    closePopup(); save('직원을 삭제했습니다.');
  }); content.append(form);
}
function rolesPopup() {
  openPopup('직책 수정', '직책 이름을 수정하거나 새 직책을 추가할 수 있습니다. 변경은 즉시 저장됩니다.');
  const list = el('div', { class: 'role-list' });
  for (const role of state.roles) {
    const row = el('form', { class: 'role-item' });
    const input = el('input', { class: 'input', maxlength: '30', required: '', 'aria-label': `${role.title} 직책 이름` });
    input.value = role.title;
    const submit = el('button', { type: 'submit', 'aria-label': `${role.title} 이름 저장` }, '저장');
    const remove = button('삭제', 'delete-role', () => deleteRole(role)); remove.setAttribute('aria-label', `${role.title} 직책 삭제`);
    row.append(input, submit, remove);
    row.addEventListener('submit', event => {
      event.preventDefault(); const title = input.value.trim();
      if (!title) { toast('직책 이름을 입력해 주세요.'); input.focus(); return; }
      if (state.roles.some(item => item.id !== role.id && item.title === title)) { toast('이미 존재하는 직책입니다.'); return; }
      role.title = title; save('직책 이름을 변경했습니다.'); rolesPopup();
    }); list.append(row);
  }
  content.append(list);
  const form = el('form', { class: 'new-role' });
  form.append(el('label', { for: 'new-role' }, '새 직책 추가'));
  const row = el('div');
  const input = el('input', { id: 'new-role', class: 'input', placeholder: '새 직책 이름', maxlength: '30', required: '' });
  row.append(input, el('button', { type: 'submit', class: 'button primary' }, '추가')); form.append(row);
  form.addEventListener('submit', event => {
    event.preventDefault(); const title = input.value.trim();
    if (!title) { error(form, '직책 이름을 입력해 주세요.'); return; }
    if (state.roles.some(role => role.title === title)) { error(form, '이미 존재하는 직책입니다.'); return; }
    if (state.roles.length >= 50) { error(form, '직책은 최대 50개까지 등록할 수 있습니다.'); return; }
    const social = state.roles.findIndex(role => role.title === '사회복무요원');
    state.roles.splice(social < 0 ? state.roles.length : social, 0, { id: crypto.randomUUID(), title });
    save('새 직책을 추가했습니다.'); rolesPopup(); $('new-role').focus();
  }); content.append(form);
  const done = el('div', { class: 'popup-actions' }); done.append(button('완료', 'button primary', closePopup)); content.append(done);
}
function deleteRole(role) {
  if (state.roles.length === 1) { toast('최소 한 개의 직책은 남겨 두어야 합니다.'); return; }
  const employees = state.employees.filter(item => item.role === role.id);
  openPopup('직책 삭제', employees.length ? `‘${role.title}’에 등록된 직원 ${employees.length}명을 옮길 직책을 선택해 주세요. 직원 정보는 유지됩니다.` : `‘${role.title}’ 직책을 삭제할까요?`);
  const form = el('form'); let target;
  if (employees.length) {
    target = roleSelect(state.roles.find(item => item.id !== role.id).id, '옮길 직책');
    target.querySelector(`option[value="${CSS.escape(role.id)}"]`).remove();
    field(form, '옮길 직책', target);
  }
  actions(form, '삭제', true, rolesPopup);
  form.addEventListener('submit', event => {
    event.preventDefault();
    for (const employee of employees) changeRole(state, employee, target.value);
    state.roles = state.roles.filter(item => item.id !== role.id);
    save('직책을 삭제했습니다.'); rolesPopup();
  }); content.append(form);
}
function closeMenu() {
  $('menu').hidden = true;
  menuButton?.setAttribute('aria-expanded', 'false'); menuButton = null;
}
function openMenu(employee, target) {
  const same = menuButton === target && !$('menu').hidden;
  closeMenu(); if (same) return;
  const menu = $('menu'); menu.replaceChildren(); menu.setAttribute('role', 'menu');
  menu.append(button('수정', '', () => employeePopup(employee)), button('삭제', 'delete', () => deleteEmployee(employee)));
  for (const item of menu.children) item.setAttribute('role', 'menuitem');
  menu.hidden = false; menuButton = target; target.setAttribute('aria-expanded', 'true');
  const rect = target.getBoundingClientRect();
  menu.style.left = `${Math.max(8, Math.min(innerWidth - 133, rect.right - 125))}px`;
  menu.style.top = `${rect.bottom + menu.offsetHeight + 8 > innerHeight ? Math.max(8, rect.top - menu.offsetHeight - 4) : rect.bottom + 4}px`;
  menu.firstChild.focus();
}

async function uploadLogo(file) {
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { toast('5MB 이하의 PNG, JPG, WEBP 이미지를 선택해 주세요.'); return; }
  try {
    const image = await createImageBitmap(file);
    // Trim white padding so a square wordmark remains readable in the header.
    const source = document.createElement('canvas');
    const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
    source.width = Math.max(1, Math.round(image.width * scale)); source.height = Math.max(1, Math.round(image.height * scale));
    const context = source.getContext('2d', { willReadFrequently: true }); context.drawImage(image, 0, 0, source.width, source.height); image.close();
    const pixels = context.getImageData(0, 0, source.width, source.height).data;
    let left = source.width, top = source.height, right = -1, bottom = -1;
    for (let y = 0; y < source.height; y++) for (let x = 0; x < source.width; x++) {
      const i = (y * source.width + x) * 4;
      if (pixels[i + 3] > 20 && (pixels[i] < 242 || pixels[i + 1] < 242 || pixels[i + 2] < 242)) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
    }
    if (right < 0) { left = 0; top = 0; right = source.width - 1; bottom = source.height - 1; }
    const margin = 8;
    left = Math.max(0, left - margin); top = Math.max(0, top - margin); right = Math.min(source.width - 1, right + margin); bottom = Math.min(source.height - 1, bottom + margin);
    const width = right - left + 1, height = bottom - top + 1;
    const ratio = Math.min(1, 600 / width, 200 / height);
    const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
    canvas.getContext('2d').drawImage(source, left, top, width, height, 0, 0, canvas.width, canvas.height);
    state.logo = canvas.toDataURL('image/png'); save('로고 이미지를 등록했습니다.');
  } catch { toast('이미지를 읽을 수 없습니다. 다른 이미지 파일을 선택해 주세요.'); }
}
function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const link = el('a', { href: url, download: `남면분소-근무현황-${koreaDate().iso}.json` });
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); toast('근무현황 백업 파일을 다운로드했습니다.');
}
async function importData(file) {
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { toast('백업 파일은 2MB 이하만 불러올 수 있습니다.'); return; }
  try { pendingImport = validateState(JSON.parse(await file.text())); }
  catch { toast('올바른 근무현황표 백업 파일이 아닙니다. 현재 정보는 유지됩니다.'); return; }
  openPopup('백업 불러오기', `직원 ${pendingImport.employees.length}명의 백업을 불러올까요? 현재 정보가 백업 내용으로 교체됩니다. 필요하면 먼저 현재 정보를 백업해 주세요.`);
  const form = el('form'); actions(form, '불러오기');
  form.addEventListener('submit', event => { event.preventDefault(); state = pendingImport; pendingImport = null; closePopup(); save('백업을 불러왔습니다.'); }); content.append(form);
}

$('add').addEventListener('click', () => employeePopup());
$('first-add').addEventListener('click', () => employeePopup());
$('roles').addEventListener('click', rolesPopup);
$('info').addEventListener('click', () => {
  openPopup('인원 집계 기준', '전체: 등록된 직원 수\n근무: 사무실·체험학습관·야영장·환경 및 시설물 관리·탐방운전\n휴무: 휴무를 선택한 직원 수\n기타: 연가·병가·공가 인원 + 비고의 당직·당직휴무 인원');
  content.querySelector('.popup-desc').style.whiteSpace = 'pre-line';
  content.append(el('p', { class: 'popup-desc' }, '기타는 두 항목을 합산하므로 한 직원이 두 조건에 해당하면 각각 집계됩니다. 근무와 기타에도 동시에 포함될 수 있습니다. 직접 입력한 근무·비고는 자동 집계에 포함하지 않습니다.'));
  const done = el('div', { class: 'popup-actions' }); done.append(button('완료', 'button primary', closePopup)); content.append(done);
});
$('logo').addEventListener('click', () => $('logo-file').click());
$('logo-file').addEventListener('change', event => { uploadLogo(event.target.files[0]); event.target.value = ''; });
$('print').addEventListener('click', () => window.print());
$('export').addEventListener('click', exportData);
$('import').addEventListener('click', () => $('backup-file').click());
$('backup-file').addEventListener('change', event => { importData(event.target.files[0]); event.target.value = ''; });
popup.addEventListener('click', event => { if (event.target === popup) closePopup(); });
popup.addEventListener('close', () => {
  pendingImport = null;
  if (returnFocus?.isConnected) returnFocus.focus(); else $('add').focus();
});
document.addEventListener('click', event => { if (!$('menu').contains(event.target) && !event.target.closest('.more')) closeMenu(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('menu').hidden) { const target = menuButton; closeMenu(); target?.focus(); }
  if (['ArrowDown', 'ArrowUp'].includes(event.key) && !$('menu').hidden && $('menu').contains(document.activeElement)) {
    event.preventDefault(); const items = [...$('menu').children]; const index = items.indexOf(document.activeElement); items[(index + (event.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
  }
});
window.addEventListener('resize', closeMenu);
window.addEventListener('scroll', closeMenu, true);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateDate(); });
window.addEventListener('storage', event => {
  if (event.key !== KEY) return;
  if (popup.open) { toast('다른 탭의 변경을 확인하려면 입력을 마치고 새로고침해 주세요.'); return; }
  try { state = event.newValue ? validateState(JSON.parse(event.newValue)) : initialState(); render(); toast('다른 탭의 변경 내용을 반영했습니다.'); } catch { toast('다른 탭의 데이터를 읽을 수 없습니다.'); }
});
setInterval(updateDate, 30000);
render();
if (storageError) { $('save').classList.add('error'); $('save-text').textContent = '자동 저장 확인 필요'; toast(startupError); }
