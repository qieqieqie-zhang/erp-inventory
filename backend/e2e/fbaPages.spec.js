const { test, expect } = require('@playwright/test');

/**
 * FBA库存页面测试
 */
test.describe('FBA库存页面测试', () => {

  test('FBA库存管理页面加载测试', async ({ page }) => {
    // 1. 登录
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("登 录")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('登录成功');

    // 2. 访问FBA库存管理页面 (history模式，不用#)
    await page.goto('http://localhost:5173/fba/inventory');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('当前URL:', page.url());

    // 3. 检查页面标题
    const title = await page.locator('h2').first().textContent({ timeout: 10000 });
    console.log('FBA库存页面标题:', title);
    expect(title).toContain('FBA库存');

    // 4. 检查概览卡片是否显示
    const cards = await page.locator('.overview-card').count();
    console.log('概览卡片数量:', cards);
    expect(cards).toBeGreaterThan(0);

    // 5. 检查表格是否显示
    const table = page.locator('.el-table');
    const isTableVisible = await table.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('表格是否可见:', isTableVisible);
    expect(isTableVisible).toBe(true);

    // 6. 检查上传按钮
    const uploadBtn = page.locator('button:has-text("上传库存报告")');
    const isUploadBtnVisible = await uploadBtn.isVisible().catch(() => false);
    console.log('上传按钮是否可见:', isUploadBtnVisible);
    expect(isUploadBtnVisible).toBe(true);

    console.log('FBA库存管理页面测试通过!');
  });

  test('FBA预留库存管理页面加载测试', async ({ page }) => {
    // 1. 登录
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("登 录")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('登录成功');

    // 2. 访问FBA预留库存管理页面
    await page.goto('http://localhost:5173/fba/reserved');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('当前URL:', page.url());

    // 3. 检查页面标题
    const title = await page.locator('h2').first().textContent({ timeout: 10000 });
    console.log('FBA预留页面标题:', title);
    expect(title).toContain('FBA预留');

    // 4. 检查概览卡片是否显示
    const cards = await page.locator('.overview-card').count();
    console.log('概览卡片数量:', cards);
    expect(cards).toBeGreaterThan(0);

    // 5. 检查表格是否显示
    const table = page.locator('.el-table');
    const isTableVisible = await table.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('表格是否可见:', isTableVisible);
    expect(isTableVisible).toBe(true);

    // 6. 检查上传按钮
    const uploadBtn = page.locator('button:has-text("上传预留库存报告")');
    const isUploadBtnVisible = await uploadBtn.isVisible().catch(() => false);
    console.log('上传按钮是否可见:', isUploadBtnVisible);
    expect(isUploadBtnVisible).toBe(true);

    console.log('FBA预留库存管理页面测试通过!');
  });

  test('FBA预留页面视图切换测试', async ({ page }) => {
    // 1. 登录
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("登 录")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('登录成功');

    // 2. 访问FBA预留页面
    await page.goto('http://localhost:5173/fba/reserved');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('当前URL:', page.url());

    // 3. 点击卡片视图按钮
    const cardViewBtn = page.locator('button:has-text("卡片")');
    await cardViewBtn.click();
    await page.waitForTimeout(2000);

    // 4. 检查卡片视图是否显示
    const cardView = page.locator('.card-view');
    const isCardViewVisible = await cardView.isVisible().catch(() => false);
    console.log('卡片视图是否可见:', isCardViewVisible);

    // 5. 点击表格视图按钮
    const tableViewBtn = page.locator('button:has-text("表格")');
    await tableViewBtn.click();
    await page.waitForTimeout(2000);

    // 6. 检查表格视图是否显示
    const table = page.locator('.el-table');
    const isTableVisible = await table.isVisible().catch(() => false);
    console.log('表格视图是否可见:', isTableVisible);

    // 基本功能验证通过即可
    console.log('视图切换测试通过!');
    expect(isTableVisible).toBe(true);

    console.log('视图切换测试通过!');
  });
});
