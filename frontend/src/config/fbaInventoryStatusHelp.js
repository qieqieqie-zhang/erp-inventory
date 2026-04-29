/**
 * FBA库存状态标签说明配置
 * 按分类组织，每项包含：标签名、含义、判断条件、运营动作
 */
export const inventoryStatusHelpList = [
  {
    label: '已断货',
    category: '断货/补货',
    meaning: '当前可售库存为0，且近30天仍有销量，属于明确断货风险。',
    condition: 'available = 0 && units_shipped_t30 > 0',
    action: '检查是否有在途库存、仓间调拨或仓内处理中库存；如果都没有，应尽快补货。'
  },
  {
    label: '无可售库存',
    category: '断货/补货',
    meaning: '当前可售库存为0，但近30天无销量，不一定代表需要立即补货。',
    condition: 'available = 0 && units_shipped_t30 = 0',
    action: '先确认该SKU是否继续销售，再决定是否补货。'
  },
  {
    label: '亚马逊缺货',
    category: '断货/补货',
    meaning: '亚马逊库存健康状态显示为Out of stock，表示亚马逊认定该SKU已断货。',
    condition: 'fba_inventory_level_health_status = Out of stock',
    action: '结合available、inbound_quantity、reserved_fc_transfer判断是否需要补货。'
  },
  {
    label: '断货风险',
    category: '断货/补货',
    meaning: '当前库存覆盖天数很低，存在短期断货风险。',
    condition: 'days_of_supply > 0 && days_of_supply < 20 && units_shipped_t30 > 0',
    action: '结合入库中库存、仓间调拨库存和采购周期，优先安排补货或控制广告消耗。'
  },
  {
    label: '低库存',
    category: '断货/补货',
    meaning: '库存覆盖天数偏低，但还不一定马上断货。',
    condition: 'days_of_supply >= 20 && days_of_supply < 45 && units_shipped_t30 > 0',
    action: '准备补货，关注入仓时效。'
  },
  {
    label: '低于FBA最低库存',
    category: '断货/补货',
    meaning: '当前可售库存低于亚马逊建议的FBA最低库存水平。',
    condition: 'fba_minimum_inventory_level > 0 && available < fba_minimum_inventory_level',
    action: '结合销量、在途库存和保留库存判断是否补货。'
  },
  {
    label: '库存健康',
    category: '库存健康',
    meaning: '库存覆盖天数、销量和过剩风险处于相对正常范围。',
    condition: '45 <= days_of_supply <= 90 && units_shipped_t30 > 0 && estimated_excess_quantity <= 0',
    action: '保持观察，按正常节奏补货。'
  },
  {
    label: '库存偏多',
    category: '库存健康',
    meaning: '库存覆盖天数偏长，但暂未触发明显过剩库存。',
    condition: 'days_of_supply > 90 && units_shipped_t30 > 0 && estimated_excess_quantity <= 0',
    action: '控制补货，观察销量趋势。'
  },
  {
    label: '库存过剩',
    category: '过剩/清货',
    meaning: '亚马逊判断库存超过合理水平，或预计过剩库存大于0。',
    condition: 'estimated_excess_quantity > 0，或 fba_inventory_level_health_status = Excess',
    action: '减少补货，结合优惠券、降价、广告清货或Outlet。'
  },
  {
    label: '无销量',
    category: '销售表现',
    meaning: '当前有可售库存，但近30天没有销量。',
    condition: 'available > 0 && units_shipped_t30 = 0',
    action: '检查Listing、价格、广告、评价、关键词和变体位置，补货前先确认是否继续销售。'
  },
  {
    label: '有在途',
    category: '补货与在途',
    meaning: '存在正在发往亚马逊或等待接收的库存。',
    condition: 'inbound_quantity > 0',
    action: '跟进入仓进度，避免重复补货。'
  },
  {
    label: '仓间调拨中',
    category: '保留库存',
    meaning: '库存正在亚马逊运营中心之间调拨，已在FBA网络内，但暂时不是可售库存。',
    condition: 'reserved_fc_transfer > 0',
    action: '关注调拨释放时间。available偏低时，不要只看可售库存就直接补货。'
  },
  {
    label: '有可恢复保留',
    category: '保留库存',
    meaning: '存在仓间调拨或仓内处理中库存，未来可能释放回可售或履约网络。',
    condition: 'reserved_fc_transfer + reserved_fc_processing > 0',
    action: '补货判断时可以作为参考库存，但不能当成立即可售库存。'
  },
  {
    label: '保留库存偏高',
    category: '保留库存',
    meaning: '总保留库存相对可售库存比例较高。',
    condition: 'total_reserved_quantity > available * 0.5 && total_reserved_quantity > 10',
    action: '拆分查看仓间调拨、仓内处理和客户订单保留，判断是否只是亚马逊调仓。'
  },
  {
    label: '不可售',
    category: '异常库存',
    meaning: '存在无法销售的FBA库存，可能来自退货、损坏、仓库异常等。',
    condition: 'unfulfillable_quantity > 0',
    action: '检查不可售原因，决定移除、弃置、申诉或重新上架。'
  },
  {
    label: '库龄风险',
    category: '库龄/费用',
    meaning: '存在181天以上库存，且当前仍有FBA相关库存。',
    condition: 'aged_inventory_181_plus > 0 && fba_related_inventory > 0',
    action: '检查老库存处于可售、保留、不可售还是移除中，并考虑优惠券、降价、Outlet或移除。'
  },
  {
    label: '高库龄风险',
    category: '库龄/费用',
    meaning: '存在366天以上库存，且当前仍有FBA相关库存。',
    condition: 'aged_inventory_366_plus > 0 && fba_related_inventory > 0',
    action: '优先清仓、移除或弃置，避免继续产生高额费用。'
  },
  {
    label: '待确认',
    category: '其他',
    meaning: '当前无可售库存，且近30天无销量，状态待确认。',
    condition: 'available = 0 && units_shipped_t30 = 0',
    action: '确认该SKU是否继续销售，如继续则安排补货。'
  },
  {
    label: '暂无状态',
    category: '其他',
    meaning: '当前SKU未触发任何库存状态规则。',
    condition: '没有命中任何标签规则',
    action: '正常查看详情即可。'
  }
]

// 分类顺序
export const categoryOrder = [
  '断货/补货',
  '库存健康',
  '过剩/清货',
  '销售表现',
  '补货与在途',
  '保留库存',
  '异常库存',
  '库龄/费用',
  '其他'
]

// 暂未启用的标签（系统当前不会生成，但保留配置以便后续扩展）
export const unusedStatusLabels = [
  {
    label: '建议移除',
    category: '暂未启用',
    meaning: '亚马逊建议移除一定数量的库存。',
    condition: 'recommended_removal_quantity > 0',
    action: '结合销量、利润、仓储费判断是否创建移除订单。',
    note: '当前系统未启用此标签判定'
  },
  {
    label: '调查中',
    category: '暂未启用',
    meaning: '存在亚马逊正在调查的库存。',
    condition: 'researching_quantity > 0',
    action: '跟进调查结果，必要时联系亚马逊支持。',
    note: '当前系统未启用此标签判定'
  }
]

// 按分类分组（延迟计算，避免模块加载时 groupedStatusHelp 未定义）
export const getGroupedStatusHelp = () => {
  const grouped = {}
  categoryOrder.forEach(cat => {
    grouped[cat] = []
  })
  inventoryStatusHelpList.forEach(item => {
    if (grouped[item.category]) {
      grouped[item.category].push(item)
    }
  })
  return grouped
}
