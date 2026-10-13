import { test, expect } from '@playwright/test';

async function add(page, name, role = 'role-0', phone = '010-1234-5678') {
  await page.getByRole('button', { name: '직원 추가', exact: true }).click();
  await page.getByRole('dialog').getByLabel('직책', { exact: true }).selectOption(role);
  await page.getByLabel('이름', { exact: true }).fill(name);
  await page.getByLabel('전화번호', { exact: true }).fill(phone);
  await page.getByRole('button', { name: '완료', exact: true }).click();
}
test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('빈 화면과 한국 날짜, 960px / 모바일 화면', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-13T15:01:00Z') });
  await page.reload();
  await expect(page.locator('#date')).toHaveText('2026. 10. 14. 수요일');
  await expect(page.getByRole('heading', { name: '첫 번째 직원을 등록해 주세요' })).toBeVisible();
  for (const width of [960, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByRole('button', { name: '직원 추가', exact: true })).toBeVisible();
  }
});
test('직책 병합, 삽입 위치, 직책 및 상태 옵션, 색상과 자동 집계', async ({ page }) => {
  await add(page, '사회 직원', 'role-8'); await add(page, '김태안'); await add(page, '이남면'); await add(page, '박해안', 'role-1');
  await expect(page.locator('.name')).toHaveText(['김태안', '이남면', '박해안', '사회 직원']);
  await expect(page.locator('.role-cell').first()).toHaveAttribute('rowspan', '2');
  await expect(page.locator('.role-field').first().locator('option')).toHaveText(['분 소 장', '계 장', '현장지원직(해설)', '수익시설', '환경관리', '지킴이', '탐방운전', '분소 청사관리', '사회복무요원']);
  await expect(page.locator('#total')).toHaveText('4'); await expect(page.locator('#working')).toHaveText('4');
  for (const label of ['휴 무', '연 가', '병 가', '공 가']) {
    await page.getByLabel('김태안 근무', { exact: true }).selectOption({ label });
    await expect(page.getByLabel('김태안 근무', { exact: true })).toHaveCSS('color', 'rgb(197, 54, 60)');
  }
  await page.getByLabel('이남면 근무', { exact: true }).selectOption('off');
  await page.getByLabel('김태안 비고', { exact: true }).selectOption('duty');
  await page.getByLabel('박해안 비고', { exact: true }).selectOption('duty-off');
  await expect(page.locator('#working')).toHaveText('2'); await expect(page.locator('#off')).toHaveText('1'); await expect(page.locator('#other')).toHaveText('3');
  await expect(page.getByLabel('박해안 근무', { exact: true })).toHaveCSS('color', 'rgb(24, 91, 199)');
  await expect(page.getByLabel('김태안 비고', { exact: true })).toHaveCSS('color', 'rgb(197, 54, 60)');
});
test('직접 입력 팝업 색상, 완료 저장, 배경 및 Escape 닫기', async ({ page }) => {
  await add(page, '김태안');
  for (const field of ['근무', '비고']) {
    await page.getByLabel(`김태안 ${field}`, { exact: true }).selectOption('custom');
    await expect(page.getByPlaceholder('내용을 입력하세요.')).toBeVisible();
    await expect(page.locator('.swatch')).toHaveCount(3);
    await page.getByPlaceholder('내용을 입력하세요.').fill(`${field} 직접 입력`);
    await page.getByLabel('검정', { exact: true }).check();
    await page.getByRole('button', { name: '완료', exact: true }).click();
    await expect(page.getByLabel(`김태안 ${field}`, { exact: true }).locator('option:checked')).toHaveText(`${field} 직접 입력`);
    await expect(page.getByLabel(`김태안 ${field}`, { exact: true })).toHaveCSS('color', 'rgb(22, 28, 40)');
  }
  await expect(page.locator('#working')).toHaveText('0');
  await page.getByLabel('김태안 근무', { exact: true }).selectOption('custom');
  await page.getByPlaceholder('내용을 입력하세요.').fill('취소될 내용');
  await page.mouse.click(5, 5);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByLabel('김태안 근무', { exact: true }).locator('option:checked')).toHaveText('근무 직접 입력');
  await page.getByLabel('김태안 근무', { exact: true }).selectOption('custom'); await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('직원 수정과 삭제 확인·취소, 재시작 후 자동 저장', async ({ page }) => {
  await add(page, '김태안'); await add(page, '이남면', 'role-1');
  await page.getByLabel('김태안 자세히 보기').click(); await page.getByRole('menuitem', { name: '수정' }).click();
  await expect(page.getByRole('heading', { name: '직원 수정' })).toBeVisible();
  await page.getByLabel('이름', { exact: true }).fill('김수정');
  await page.getByRole('dialog').getByLabel('직책', { exact: true }).selectOption('role-1');
  await page.getByRole('button', { name: '완료', exact: true }).click();
  await expect(page.locator('.role-cell')).toHaveCount(1); await expect(page.locator('.name')).toHaveText(['이남면', '김수정']);
  await page.reload(); await expect(page.locator('#total')).toHaveText('2');
  await page.getByLabel('김수정 자세히 보기').click(); await page.getByRole('menuitem', { name: '삭제' }).click();
  await page.getByRole('button', { name: '취소', exact: true }).click(); await expect(page.locator('#total')).toHaveText('2');
  await page.getByLabel('김수정 자세히 보기').click(); await page.getByRole('menuitem', { name: '삭제' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '삭제', exact: true }).click();
  await expect(page.locator('#total')).toHaveText('1');
});
test('직책 추가·이름 수정·삭제 및 소속 직원 재배치', async ({ page }) => {
  await add(page, '사회 직원', 'role-8'); await add(page, '김태안');
  await page.getByRole('button', { name: '직책 수정' }).click();
  await page.getByLabel('새 직책 추가').fill('해안 순찰'); await page.getByRole('dialog').getByRole('button', { name: '추가', exact: true }).click();
  await page.getByLabel('분 소 장 직책 이름', { exact: true }).fill('분소장');
  await page.getByLabel('분 소 장 이름 저장', { exact: true }).click();
  await page.getByRole('button', { name: '완료', exact: true }).click();
  await expect(page.locator('.role-field').first().locator('option:checked')).toHaveText('분소장');
  const role = await page.locator('.role-field').first().locator('option').filter({ hasText: '해안 순찰' }).getAttribute('value');
  await add(page, '박순찰', role);
  await expect(page.locator('.name')).toHaveText(['김태안', '박순찰', '사회 직원']);
  await page.getByRole('button', { name: '직책 수정' }).click(); await page.getByLabel('해안 순찰 직책 삭제', { exact: true }).click();
  await page.getByLabel('옮길 직책').selectOption('role-0');
  await page.getByRole('dialog').getByRole('button', { name: '삭제', exact: true }).click();
  await page.getByRole('button', { name: '완료', exact: true }).click();
  await expect(page.locator('.name')).toHaveText(['김태안', '박순찰', '사회 직원']); await expect(page.locator('.role-cell').first()).toHaveAttribute('rowspan', '2');
});
test('병합된 직책 변경은 확인 후 그룹에 적용하고 기존 그룹과 합친다', async ({ page }) => {
  await add(page, '김태안'); await add(page, '이남면'); await add(page, '박해안', 'role-1');
  await page.locator('.role-field').first().selectOption('role-1');
  await page.getByRole('button', { name: '취소', exact: true }).click(); await expect(page.locator('.role-cell')).toHaveCount(2);
  await page.locator('.role-field').first().selectOption('role-1'); await page.getByRole('button', { name: '완료', exact: true }).click();
  await expect(page.locator('.role-cell')).toHaveCount(1); await expect(page.locator('.role-cell')).toHaveAttribute('rowspan', '3');
});
test('백업 다운로드, 불러오기 확인·취소와 잘못된 파일 보호', async ({ page }) => {
  await add(page, '김태안');
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: '백업', exact: true }).click();
  const download = await downloadEvent; expect(download.suggestedFilename()).toMatch(/남면분소-근무현황-.*\.json/);
  const path = await download.path();
  await add(page, '이남면');
  await page.locator('#backup-file').setInputFiles(path);
  await page.getByRole('button', { name: '취소', exact: true }).click(); await expect(page.locator('#total')).toHaveText('2');
  await page.locator('#backup-file').setInputFiles(path);
  await page.getByRole('dialog').getByRole('button', { name: '불러오기', exact: true }).click(); await expect(page.locator('#total')).toHaveText('1');
  await page.locator('#backup-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1,"employees":[]}') });
  await expect(page.locator('#toast')).toContainText('올바른 근무현황표 백업 파일이 아닙니다'); await expect(page.locator('#total')).toHaveText('1');
});
test('로고 등록과 자동 저장, 사용자 입력은 HTML로 해석하지 않는다', async ({ page }) => {
  await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 400; canvas.height = 400;
    const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, 400, 400); context.fillStyle = '#185bc7'; context.fillRect(50, 170, 300, 60);
    return new Promise(resolve => canvas.toBlob(blob => {
      const input = document.querySelector('#logo-file'); const transfer = new DataTransfer(); transfer.items.add(new File([blob], 'logo.png', { type: 'image/png' })); input.files = transfer.files; input.dispatchEvent(new Event('change')); resolve();
    }));
  });
  await expect(page.locator('#logo img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(page.locator('#logo img')).toBeVisible();
  expect(await page.locator('#logo img').evaluate(img => img.naturalWidth / img.naturalHeight)).toBeGreaterThan(3);
  await page.reload(); await expect(page.locator('#logo img')).toHaveAttribute('src', /^data:image\/png;base64,/); await expect(page.locator('#logo img')).toBeVisible();
  await add(page, '<img src=x onerror=alert(1)>');
  await expect(page.locator('.name')).toHaveText('<img src=x onerror=alert(1)>'); await expect(page.locator('.name img')).toHaveCount(0);
});
test('전화 링크, 인쇄 화면과 실제 데이터가 있는 모바일 표', async ({ page }) => {
  await add(page, '김태안'); await expect(page.locator('.phone')).toHaveAttribute('href', 'tel:01012345678');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.locator('.table-wrap').evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  await page.emulateMedia({ media: 'print' }); await expect(page.locator('.footer')).not.toBeVisible(); await expect(page.locator('.name')).toBeVisible();
});

test('저장 공간 오류는 사용자에게 알리고 현재 화면과 백업은 유지한다', async ({ page }) => {
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); }; });
  await add(page, '김태안');
  await expect(page.locator('#total')).toHaveText('1');
  await expect(page.locator('#save-text')).toHaveText('자동 저장 불가 · 백업 필요');
  await expect(page.locator('#toast')).toContainText('브라우저에 저장할 수 없습니다');
  const downloadEvent = page.waitForEvent('download'); await page.getByRole('button', { name: '백업', exact: true }).click();
  expect((await downloadEvent).suggestedFilename()).toContain('남면분소-근무현황');
});
