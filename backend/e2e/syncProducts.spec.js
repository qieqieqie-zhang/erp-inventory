const { test, expect } = require('@playwright/test');

/**
 * 同步商品功能浏览器自动化测试
 * 直接通过API调用验证功能
 */
test.describe('同步商品功能测试', () => {
  let authToken = '';

  test.beforeAll(async ({ request }) => {
    // 直接调用登录API获取token
    const loginResponse = await request.post('http://localhost:3000/api/auth/login', {
      data: { username: 'admin', password: 'admin123' }
    });
    const loginData = await loginResponse.json();
    authToken = loginData.data?.token;

    if (!authToken) {
      throw new Error('登录失败，无法获取token');
    }
    console.log('获取到token');
  });

  test('同步商品后验证amazon_products表数据', async ({ request }) => {
    // 1. 先检查物流记录144是否存在
    console.log('检查物流记录144...');
    const logisticsResponse = await request.get('http://localhost:3000/api/logistics/detail/144', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const logisticsData = await logisticsResponse.json();

    if (logisticsData.code !== 200 || !logisticsData.data) {
      console.log('物流记录144不存在，跳过测试');
      test.skip();
      return;
    }

    console.log('物流记录存在，destination_country:', logisticsData.data.destination_country);

    // 2. 调用同步商品API
    console.log('调用同步商品API...');
    const syncResponse = await request.post('http://localhost:3000/api/logistics/sync-products/144', {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    const syncResult = await syncResponse.json();
    console.log('同步结果:', JSON.stringify(syncResult, null, 2));

    // 验证同步成功
    expect(syncResponse.status()).toBe(200);
    expect(syncResult.code).toBe(200);

    // 3. 查询商品列表验证
    console.log('验证商品数据...');
    const productResponse = await request.get('http://localhost:3000/api/product/list', {
      headers: { Authorization: `Bearer ${authToken}` },
      params: { page: 1, pageSize: 50 }
    });
    const productData = await productResponse.json();

    const logisticsProducts = productData.data?.list?.filter(p =>
      p.upload_batch?.startsWith('logistics_')
    );

    console.log('物流同步商品数量:', logisticsProducts?.length || 0);

    if (logisticsProducts && logisticsProducts.length > 0) {
      logisticsProducts.forEach(p => {
        console.log(`\nSKU: ${p.seller_sku}`);
        console.log(`  quantity: ${p.quantity} (期望: 0)`);
        console.log(`  fulfillment_channel: ${p.fulfillment_channel} (期望: 有值)`);
        console.log(`  shop_id: ${p.shop_id} (期望: 有值)`);
        console.log(`  item_name: ${p.item_name}`);
      });

      // 验证quantity=0
      logisticsProducts.forEach(p => {
        expect(p.quantity).toBe(0), `SKU ${p.seller_sku} 的 quantity 应为 0，实际为 ${p.quantity}`;
      });

      // 验证fulfillment_channel不为空
      logisticsProducts.forEach(p => {
        expect(p.fulfillment_channel).toBeTruthy(), `SKU ${p.seller_sku} 的 fulfillment_channel 不应为空`;
      });

      // 验证shop_id不为空
      logisticsProducts.forEach(p => {
        expect(p.shop_id).toBeTruthy(), `SKU ${p.seller_sku} 的 shop_id 不应为空`;
      });
    } else {
      console.log('没有找到物流同步的商品');
    }

    console.log('\n测试通过!');
  });

  test('验证配送渠道映射是否正确', async ({ request }) => {
    // 登录
    const loginResponse = await request.post('http://localhost:3000/api/auth/login', {
      data: { username: 'admin', password: 'admin123' }
    });
    const token = loginResponse.json().data?.token;

    // 获取物流记录检查目的地
    const logisticsResponse = await request.get('http://localhost:3000/api/logistics/detail/144', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const logisticsData = await logisticsResponse.json();
    const destinationCountry = logisticsData.data?.destination_country;
    console.log('目的地国家:', destinationCountry);

    // 同步
    await request.post('http://localhost:3000/api/logistics/sync-products/144', {
      headers: { Authorization: `Bearer ${token}` }
    });

    // 查询同步的商品
    const productResponse = await request.get('http://localhost:3000/api/product/list', {
      headers: { Authorization: `Bearer ${token}` },
      params: { page: 1, pageSize: 50, search: '' }
    });
    const productData = await productResponse.json();

    const logisticsProducts = productData.data?.list?.filter(p =>
      p.upload_batch?.startsWith('logistics_')
    );

    // 根据目的地验证配送渠道
    if (logisticsProducts && logisticsProducts.length > 0) {
      logisticsProducts.forEach(p => {
        console.log(`\nSKU: ${p.seller_sku}`);
        console.log(`  目的地: ${destinationCountry}`);
        console.log(`  配送渠道: ${p.fulfillment_channel}`);

        // 根据目的地验证渠道
        if (destinationCountry === 'US') {
          expect(p.fulfillment_channel).toBe('AMAZON_NA');
        } else if (destinationCountry === 'DE' || destinationCountry === 'UK') {
          expect(p.fulfillment_channel).toBe('AMAZON_EU');
        }
      });
    }
  });
});

// 运行命令：cd backend && npx playwright test e2e/syncProducts.spec.js --reporter=line
