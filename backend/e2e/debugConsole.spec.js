const { test, expect } = require('@playwright/test');

/**
 * 捕获浏览器控制台错误
 */
test('捕获FBAReserved页面错误', async ({ page }) => {
  const consoleMessages = [];
  const errorMessages = [];

  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') {
      errorMessages.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    errorMessages.push(`PageError: ${error.message}`);
  });

  // 登录
  await page.goto('http://localhost:5173/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  await page.fill('input[type="text"]', 'admin');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button:has-text("登 录")');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  console.log('登录成功');

  // 导航到FBAReserved页面
  await page.goto('http://localhost:5173/fba/reserved');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  console.log('当前URL:', page.url());

  // 打印所有控制台消息
  console.log('\n=== 控制台消息 ===');
  for (const msg of consoleMessages) {
    console.log(`[${msg.type}] ${msg.text}`);
  }

  // 打印错误
  console.log('\n=== 错误消息 ===');
  for (const err of errorMessages) {
    console.log(err);
  }

  // 截图
  await page.screenshot({ path: 'error-screenshot.png' });
  console.log('\n截图已保存: error-screenshot.png');
});
