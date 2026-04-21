# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: syncProducts.spec.js >> 同步商品功能测试 >> 同步商品后验证amazon_products表数据
- Location: e2e\syncProducts.spec.js:24:3

# Error details

```
Error: expect(received).toBeTruthy()

Received: null
```

# Test source

```ts
  1   | const { test, expect } = require('@playwright/test');
  2   | 
  3   | /**
  4   |  * 同步商品功能浏览器自动化测试
  5   |  * 直接通过API调用验证功能
  6   |  */
  7   | test.describe('同步商品功能测试', () => {
  8   |   let authToken = '';
  9   | 
  10  |   test.beforeAll(async ({ request }) => {
  11  |     // 直接调用登录API获取token
  12  |     const loginResponse = await request.post('http://localhost:3000/api/auth/login', {
  13  |       data: { username: 'admin', password: 'admin123' }
  14  |     });
  15  |     const loginData = await loginResponse.json();
  16  |     authToken = loginData.data?.token;
  17  | 
  18  |     if (!authToken) {
  19  |       throw new Error('登录失败，无法获取token');
  20  |     }
  21  |     console.log('获取到token');
  22  |   });
  23  | 
  24  |   test('同步商品后验证amazon_products表数据', async ({ request }) => {
  25  |     // 1. 先检查物流记录144是否存在
  26  |     console.log('检查物流记录144...');
  27  |     const logisticsResponse = await request.get('http://localhost:3000/api/logistics/detail/144', {
  28  |       headers: { Authorization: `Bearer ${authToken}` }
  29  |     });
  30  |     const logisticsData = await logisticsResponse.json();
  31  | 
  32  |     if (logisticsData.code !== 200 || !logisticsData.data) {
  33  |       console.log('物流记录144不存在，跳过测试');
  34  |       test.skip();
  35  |       return;
  36  |     }
  37  | 
  38  |     console.log('物流记录存在，destination_country:', logisticsData.data.destination_country);
  39  | 
  40  |     // 2. 调用同步商品API
  41  |     console.log('调用同步商品API...');
  42  |     const syncResponse = await request.post('http://localhost:3000/api/logistics/sync-products/144', {
  43  |       headers: { Authorization: `Bearer ${authToken}` }
  44  |     });
  45  |     const syncResult = await syncResponse.json();
  46  |     console.log('同步结果:', JSON.stringify(syncResult, null, 2));
  47  | 
  48  |     // 验证同步成功
  49  |     expect(syncResponse.status()).toBe(200);
  50  |     expect(syncResult.code).toBe(200);
  51  | 
  52  |     // 3. 查询商品列表验证
  53  |     console.log('验证商品数据...');
  54  |     const productResponse = await request.get('http://localhost:3000/api/product/list', {
  55  |       headers: { Authorization: `Bearer ${authToken}` },
  56  |       params: { page: 1, pageSize: 50 }
  57  |     });
  58  |     const productData = await productResponse.json();
  59  | 
  60  |     const logisticsProducts = productData.data?.list?.filter(p =>
  61  |       p.upload_batch?.startsWith('logistics_')
  62  |     );
  63  | 
  64  |     console.log('物流同步商品数量:', logisticsProducts?.length || 0);
  65  | 
  66  |     if (logisticsProducts && logisticsProducts.length > 0) {
  67  |       logisticsProducts.forEach(p => {
  68  |         console.log(`\nSKU: ${p.seller_sku}`);
  69  |         console.log(`  quantity: ${p.quantity} (期望: 0)`);
  70  |         console.log(`  fulfillment_channel: ${p.fulfillment_channel} (期望: 有值)`);
  71  |         console.log(`  shop_id: ${p.shop_id} (期望: 有值)`);
  72  |         console.log(`  item_name: ${p.item_name}`);
  73  |       });
  74  | 
  75  |       // 验证quantity=0
  76  |       logisticsProducts.forEach(p => {
  77  |         expect(p.quantity).toBe(0), `SKU ${p.seller_sku} 的 quantity 应为 0，实际为 ${p.quantity}`;
  78  |       });
  79  | 
  80  |       // 验证fulfillment_channel不为空
  81  |       logisticsProducts.forEach(p => {
> 82  |         expect(p.fulfillment_channel).toBeTruthy(), `SKU ${p.seller_sku} 的 fulfillment_channel 不应为空`;
      |                                       ^ Error: expect(received).toBeTruthy()
  83  |       });
  84  | 
  85  |       // 验证shop_id不为空
  86  |       logisticsProducts.forEach(p => {
  87  |         expect(p.shop_id).toBeTruthy(), `SKU ${p.seller_sku} 的 shop_id 不应为空`;
  88  |       });
  89  |     } else {
  90  |       console.log('没有找到物流同步的商品');
  91  |     }
  92  | 
  93  |     console.log('\n测试通过!');
  94  |   });
  95  | 
  96  |   test('验证配送渠道映射是否正确', async ({ request }) => {
  97  |     // 登录
  98  |     const loginResponse = await request.post('http://localhost:3000/api/auth/login', {
  99  |       data: { username: 'admin', password: 'admin123' }
  100 |     });
  101 |     const token = loginResponse.json().data?.token;
  102 | 
  103 |     // 获取物流记录检查目的地
  104 |     const logisticsResponse = await request.get('http://localhost:3000/api/logistics/detail/144', {
  105 |       headers: { Authorization: `Bearer ${token}` }
  106 |     });
  107 |     const logisticsData = await logisticsResponse.json();
  108 |     const destinationCountry = logisticsData.data?.destination_country;
  109 |     console.log('目的地国家:', destinationCountry);
  110 | 
  111 |     // 同步
  112 |     await request.post('http://localhost:3000/api/logistics/sync-products/144', {
  113 |       headers: { Authorization: `Bearer ${token}` }
  114 |     });
  115 | 
  116 |     // 查询同步的商品
  117 |     const productResponse = await request.get('http://localhost:3000/api/product/list', {
  118 |       headers: { Authorization: `Bearer ${token}` },
  119 |       params: { page: 1, pageSize: 50, search: '' }
  120 |     });
  121 |     const productData = await productResponse.json();
  122 | 
  123 |     const logisticsProducts = productData.data?.list?.filter(p =>
  124 |       p.upload_batch?.startsWith('logistics_')
  125 |     );
  126 | 
  127 |     // 根据目的地验证配送渠道
  128 |     if (logisticsProducts && logisticsProducts.length > 0) {
  129 |       logisticsProducts.forEach(p => {
  130 |         console.log(`\nSKU: ${p.seller_sku}`);
  131 |         console.log(`  目的地: ${destinationCountry}`);
  132 |         console.log(`  配送渠道: ${p.fulfillment_channel}`);
  133 | 
  134 |         // 根据目的地验证渠道
  135 |         if (destinationCountry === 'US') {
  136 |           expect(p.fulfillment_channel).toBe('AMAZON_NA');
  137 |         } else if (destinationCountry === 'DE' || destinationCountry === 'UK') {
  138 |           expect(p.fulfillment_channel).toBe('AMAZON_EU');
  139 |         }
  140 |       });
  141 |     }
  142 |   });
  143 | });
  144 | 
  145 | // 运行命令：cd backend && npx playwright test e2e/syncProducts.spec.js --reporter=line
  146 | 
```