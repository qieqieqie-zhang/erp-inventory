const { test, expect } = require('@playwright/test');

/**
 * 诊断测试：检查登录页面结构
 */
test('诊断登录页面', async ({ page }) => {
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // 获取页面内容截图
  const bodyText = await page.locator('body').textContent();
  console.log('页面文本内容:', bodyText.substring(0, 500));

  // 尝试找到登录相关的按钮
  const buttons = await page.locator('button').all();
  console.log('页面上的按钮数量:', buttons.length);
  for (const btn of buttons.slice(0, 5)) {
    const text = await btn.textContent();
    console.log('按钮文本:', text);
  }

  // 尝试找到输入框
  const inputs = await page.locator('input').all();
  console.log('页面上的输入框数量:', inputs.length);

  // 检查当前URL
  console.log('当前URL:', page.url());
});
