const { test, expect } = require('@playwright/test');

/**
 * 测试上传按钮点击功能
 */
test.describe('上传按钮点击测试', () => {

  test('FBA库存上传按钮点击测试', async ({ page }) => {
    // 登录
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("登 录")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('登录成功');

    // 访问FBA库存页面
    await page.goto('http://localhost:5173/fba/inventory');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 点击上传库存报告按钮
    const uploadBtn = page.locator('button:has-text("上传库存报告")');
    console.log('点击上传按钮...');
    await uploadBtn.click();
    await page.waitForTimeout(1000);

    // 检查上传对话框是否出现
    const dialog = page.locator('.el-dialog');
    const isDialogVisible = await dialog.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('上传对话框是否可见:', isDialogVisible);
    expect(isDialogVisible).toBe(true);

    // 检查对话框标题
    const dialogTitle = await page.locator('.el-dialog__title').textContent().catch(() => '');
    console.log('对话框标题:', dialogTitle);
    expect(dialogTitle).toContain('上传FBA库存报告');

    console.log('FBA库存上传按钮测试通过!');
  });

  test('FBA预留上传按钮点击测试', async ({ page }) => {
    // 登录
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button:has-text("登 录")');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    console.log('登录成功');

    // 访问FBA预留页面
    await page.goto('http://localhost:5173/fba/reserved');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // 点击上传预留库存报告按钮
    const uploadBtn = page.locator('button:has-text("上传预留库存报告")');
    console.log('点击上传按钮...');
    await uploadBtn.click();
    await page.waitForTimeout(1000);

    // 检查上传对话框是否出现
    const dialog = page.locator('.el-dialog');
    const isDialogVisible = await dialog.isVisible({ timeout: 5000 }).catch(() => false);
    console.log('上传对话框是否可见:', isDialogVisible);
    expect(isDialogVisible).toBe(true);

    // 检查对话框标题
    const dialogTitle = await page.locator('.el-dialog__title').textContent().catch(() => '');
    console.log('对话框标题:', dialogTitle);
    expect(dialogTitle).toContain('上传FBA预留库存报告');

    console.log('FBA预留上传按钮测试通过!');
  });
});
