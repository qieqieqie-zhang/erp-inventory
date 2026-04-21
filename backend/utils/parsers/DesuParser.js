const xlsx = require('xlsx')
const BaseParser = require('./BaseParser')

/**
 * 德速物流解析器
 * 适用于德速物流的Commercial Invoice格式Excel
 */
class DesuParser extends BaseParser {
  static name = 'desu'
  static description = '德速物流'

  /**
   * 检测文件是否适用于德速解析器
   * 检测逻辑：表头第一行是"Commercial Invoice"
   */
  static detect(parsedData, rawData) {
    if (parsedData && parsedData.headers && parsedData.headers.length > 0) {
      return parsedData.headers[0] === 'Commercial Invoice'
    }
    return false
  }

  /**
   * 解析德速物流Excel
   * @param {Object} parsedData - FileParser解析后的数据
   * @param {Object} options - 解析选项 { shopId, filePath }
   */
  static parse(parsedData, options) {
    const { shopId, filePath } = options

    // 重新读取Excel获取原始数据
    const workbook = xlsx.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

    console.log('[DesuParser] 检测到德速物流格式，共', rawData.length, '行')

    // 从表头行(0-18)中提取物流信息
    const headerInfo = {}
    for (let i = 0; i < 20; i++) {
      const row = rawData[i] || []
      for (let j = 0; j < row.length - 1; j += 2) {
        const key = row[j]
        const value = row[j + 1]
        if (key && value) {
          headerInfo[key] = value
        }
      }
    }
    console.log('[DesuParser] 表头信息:', JSON.stringify(headerInfo))

    // 行19是标题行
    const headerRow = rawData[19] || []
    // 行20+是数据
    const dataRows = rawData.slice(20)

    // 从表头提取常用信息
    const destinationCountry = headerInfo['收件人国家'] || ''
    const shippingMethod = headerInfo['渠道'] || ''
    const forwarderName = headerInfo['起运地'] || ''

    // 按FBA号分组，每组创建一个物流记录
    const groupedData = {}

    dataRows
      .filter(row => row.some(cell => cell && cell.toString().trim()))
      .forEach(row => {
        const fbaNumber = row[0] || '' // A列: Shipment ID
        if (!fbaNumber) return

        if (!groupedData[fbaNumber]) {
          groupedData[fbaNumber] = []
        }
        groupedData[fbaNumber].push(row)
      })

    // 转换为物流记录列表
    const result = Object.keys(groupedData).map(fbaNumber => {
      const rows = groupedData[fbaNumber]
      const firstRow = rows[0]

      // 构建SKU子列表
      const skuList = rows.map(row => ({
        sku_code: row[3] || '', // D列: SKU
        sku_name: row[5] || '', // F列: 中文品名
        sku_name_en: row[4] || '', // E列: 英文品名
        quantity: parseInt(row[13]) || 0, // N列: 每箱数量
        unit_price: parseFloat(row[17]) || 0, // R列: 申报单价
        total_price: parseFloat(row[17]) * (parseInt(row[13]) || 0) || 0,
        customs_code: row[6] || '', // G列: 海关编码
        brand: row[7] || '', // H列: Brand品牌
        model: row[12] || '', // M列: 型号
        unit: row[14] || '', // O列: 单位
      }))

      // 计算总数量和总价值
      const totalQuantity = skuList.reduce((sum, sku) => sum + sku.quantity, 0)
      const totalAmount = skuList.reduce((sum, sku) => sum + sku.total_price, 0)

      return {
        shop_id: shopId || null,
        logistics_company: 'desu',
        fba_warehouse_number: fbaNumber,
        reference_id: firstRow[1] || '', // B列: Reference ID
        carton_number_range: firstRow[2] ? `1-${rows.length}` : '', // 箱号段
        sku_code: skuList[0]?.sku_code || '', // 第一个SKU
        sku_name: skuList[0]?.sku_name || '', // 第一个SKU名称
        sku_name_en: skuList[0]?.sku_name_en || '',
        customs_code: skuList[0]?.customs_code || '',
        brand: skuList[0]?.brand || '',
        material: firstRow[8] || '', // I列: 材质
        purpose: firstRow[9] || '', // J列: 用途
        asin: firstRow[10] || '', // K列: ASIN/销售链接
        has_battery: firstRow[11] || '', // L列: 是否带电
        model: skuList[0]?.model || '',
        ship_quantity: totalQuantity,
        unit: skuList[0]?.unit || '',
        quantity_per_set: parseInt(firstRow[15]) || 0, // P列: 每套个数
        insurance_price: parseFloat(firstRow[16]) || 0, // Q列: 投保单价(RMB)
        unit_price: skuList[0]?.unit_price || 0,
        image_url: firstRow[18] || '', // S列: 图片
        carton_weight: parseFloat(firstRow[19]) || 0, // T列: 单箱重量(kg)
        carton_length: parseFloat(firstRow[20]) || 0, // U列: 单箱长(cm)
        carton_width: parseFloat(firstRow[21]) || 0, // V列: 单箱宽(cm)
        carton_height: parseFloat(firstRow[22]) || 0, // W列: 单箱高(cm)
        tracking_number: headerInfo['参考号'] || '',
        destination_country: destinationCountry,
        cargo_type: '',
        shipping_method: shippingMethod,
        ship_date: null,
        total_price: totalAmount,
        carrier: '',
        forwarder_name: forwarderName,
        carton_count: rows.length,
        etd: null,
        eta: headerInfo['预计到仓时间'] ? new Date(headerInfo['预计到仓时间']) : null,
        pickup_time: null,
        delivery_time: null,
        fba_start_receive_time: null,
        price_per_carton: 0,
        vat_amount: 0,
        tax_rebate: 0,
        freight_cost: 0,
        logistics_status: 'pending',
        remarks: headerInfo['备注'] || '',
        upload_batch: `LOG_${Date.now()}`,
        // SKU子列表JSON
        sku_list: JSON.stringify(skuList)
      }
    })

    console.log('[DesuParser] 生成', result.length, '条物流记录')
    return result
  }
}

module.exports = DesuParser
