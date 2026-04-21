/**
 * 物流解析器注册表
 * 用于管理所有物流解析器
 */

const BaseParser = require('./BaseParser')
const DesuParser = require('./DesuParser')

class ParserRegistry {
  constructor() {
    this.parsers = new Map()
    this.registerDefaultParsers()
  }

  /**
   * 注册默认解析器
   */
  registerDefaultParsers() {
    this.register(DesuParser)
  }

  /**
   * 注册解析器
   * @param {Class} ParserClass - 解析器类
   */
  register(ParserClass) {
    if (ParserClass && ParserClass.name) {
      this.parsers.set(ParserClass.name, ParserClass)
      console.log(`[ParserRegistry] 注册解析器: ${ParserClass.name} - ${ParserClass.description}`)
    }
  }

  /**
   * 获取所有注册的解析器
   * @returns {Array} 解析器列表
   */
  getAllParsers() {
    return Array.from(this.parsers.values()).map(p => ({
      name: p.name,
      description: p.description
    }))
  }

  /**
   * 根据名称获取解析器
   * @param {string} name - 解析器名称
   * @returns {Class|null}
   */
  getParser(name) {
    return this.parsers.get(name) || null
  }

  /**
   * 自动检测使用哪个解析器
   * @param {Object} parsedData - FileParser解析后的数据
   * @param {Object} rawData - 原始Excel数据
   * @returns {Class|null}
   */
  detectParser(parsedData, rawData) {
    for (const [name, ParserClass] of this.parsers) {
      if (ParserClass.detect && ParserClass.detect(parsedData, rawData)) {
        console.log(`[ParserRegistry] 检测到解析器: ${name}`)
        return ParserClass
      }
    }
    console.log('[ParserRegistry] 未检测到匹配的解析器')
    return null
  }

  /**
   * 解析文件
   * @param {string} parserName - 解析器名称，如果为null则自动检测
   * @param {Object} parsedData - FileParser解析后的数据
   * @param {Object} options - 解析选项
   * @returns {Array|null}
   */
  parse(parserName, parsedData, options) {
    let ParserClass

    if (parserName && parserName !== 'auto') {
      ParserClass = this.getParser(parserName)
      if (!ParserClass) {
        throw new Error(`未找到解析器: ${parserName}`)
      }
    } else {
      ParserClass = this.detectParser(parsedData, options.filePath ? this.getRawData(options.filePath) : null)
      if (!ParserClass) {
        // 如果没有匹配的解析器，尝试使用标准格式解析
        console.log('[ParserRegistry] 使用标准格式解析')
        return this.parseStandard(parsedData, options)
      }
    }

    return ParserClass.parse(parsedData, options)
  }

  /**
   * 获取Excel原始数据
   * @param {string} filePath - 文件路径
   */
  getRawData(filePath) {
    try {
      const xlsx = require('xlsx')
      const workbook = xlsx.readFile(filePath)
      const sheetName = workbook.SheetNames[0]
      return xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '' })
    } catch (e) {
      console.error('[ParserRegistry] 读取Excel失败:', e.message)
      return null
    }
  }

  /**
   * 标准格式解析（当没有匹配的解析器时使用）
   */
  parseStandard(parsedData, options) {
    const { shopId } = options

    return parsedData.data
      .filter(item => Object.values(item).some(v => v !== '' && v !== null && v !== undefined))
      .map(item => {
        const getVal = (key) => item[key] || ''
        const getNum = (key, defaultVal = 0) => {
          const val = getVal(key)
          const num = parseFloat(val)
          return isNaN(num) ? defaultVal : num
        }

        return {
          shop_id: shopId || null,
          logistics_company: 'unknown',
          fba_warehouse_number: getVal('FBA仓库编号') || getVal('fba_warehouse_number') || getVal('FBA入仓号'),
          sku_code: getVal('SKU编号') || getVal('sku_code'),
          sku_name: getVal('SKU名称') || getVal('sku_name') || getVal('商品名称'),
          tracking_number: getVal('运输编号') || getVal('tracking_number') || getVal('物流单号'),
          destination_country: getVal('目的地') || getVal('destination_country') || getVal('目的国家'),
          cargo_type: getVal('货物类型') || getVal('cargo_type'),
          shipping_method: getVal('运输方式') || getVal('shipping_method'),
          ship_date: null,
          ship_quantity: getNum('发货数量') || getNum('ship_quantity'),
          unit_price: getNum('单价'),
          total_price: getNum('总价'),
          carrier: getVal('承运人') || getVal('carrier'),
          forwarder_name: getVal('货运代理') || getVal('forwarder_name') || getVal('货代名称'),
          carton_count: getNum('箱数'),
          etd: null,
          eta: null,
          pickup_time: null,
          delivery_time: null,
          fba_start_receive_time: null,
          price_per_carton: getNum('箱均价格'),
          vat_amount: getNum('VAT税费'),
          tax_rebate: getNum('退税'),
          freight_cost: getNum('运费'),
          logistics_status: 'pending',
          remarks: getVal('备注') || getVal('remarks'),
          upload_batch: `LOG_${Date.now()}`
        }
      })
  }
}

// 导出单例
const registry = new ParserRegistry()
module.exports = registry
