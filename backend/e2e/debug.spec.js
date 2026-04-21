const { test, expect } = require('@playwright/test');

/**
 * 诊断FBA页面加载问题
 */
test('诊断FBA库存页面', async ({ page }) => {
  // 登录
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("登 录")');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  console.log('登录成功');

  // 导航到FBA库存页面
  await page.goto('http://localhost:5173/#/fba/inventory');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  console.log('当前URL:', page.url());

  // 获取页面内容
  const bodyText = await page.locator('body').textContent();
  console.log('页面内容:', bodyText.substring(0, 1000));

  // 检查所有h2元素
  const h2s = await page.locator('h2').all();
  console.log('h2元素数量:', h2s.length);
  for (const h2 of h2s) {
    const text = await h2.textContent();
    console.log('h2文本:', text);
  }

  // 检查页面是否有错误
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      pageErrors.push(msg.text());
    }
  });

  // 截图
  await page.screenshot({ path: 'fba-inventory.png' });
  console.log('截图已保存: fba-inventory.png');
});
