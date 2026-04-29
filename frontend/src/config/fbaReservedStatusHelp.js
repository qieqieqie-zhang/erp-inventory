/**
 * FBA预留库存状态标签说明配置
 */
export const reservedStatusHelpList = [
  {
    label: '客户订单预留',
    category: '客户订单',
    meaning: '库存被客户订单占用，通常处于等待付款、拣货、包装或发货完成的过程中。',
    condition: 'reserved_customerorders > 0',
    action: '这部分库存通常已经被订单占用，不建议作为未来可卖库存计算。正常情况下等待订单流程完成即可。'
  },
  {
    label: '仓间调拨中',
    category: '仓间调拨',
    meaning: '库存正在亚马逊运营中心之间转移，已经在FBA网络内，但暂时不属于可立即销售的available库存。',
    condition: 'reserved_fc_transfers > 0',
    action: '关注调拨释放时间。available偏低时，不要只看可售库存就立即补货，应结合仓间调拨数量判断是否可能释放。'
  },
  {
    label: '仓内处理中',
    category: '仓内处理',
    meaning: '库存正在亚马逊仓库内部处理中，可能涉及接收、测量、分拣、调查、移除或其他仓内流程。',
    condition: 'reserved_fc_processing > 0',
    action: '如果长期不释放，建议关注处理时间，必要时联系亚马逊支持或查看库存异常。'
  },
  {
    label: '高调拨占比',
    category: '结构占比',
    meaning: '该SKU的预留原因主要来自仓间调拨，说明库存大部分处于亚马逊仓库之间转移状态。',
    condition: 'reserved_detail_total > 0 && fc_transfer_ratio >= 0.7',
    action: '这类SKU通常不应立即重复补货，应先观察调拨释放情况，避免available低导致多补货。'
  },
  {
    label: '高处理占比',
    category: '结构占比',
    meaning: '该SKU的预留原因主要来自仓内处理，说明库存大部分处于仓库内部处理流程。',
    condition: 'reserved_detail_total > 0 && fc_processing_ratio >= 0.7',
    action: '重点关注处理时长。如果持续多天不释放，可进一步排查是否存在接收、调查、移除或仓库异常。'
  },
  {
    label: '高客户订单占比',
    category: '结构占比',
    meaning: '该SKU的预留原因主要来自客户订单，说明预留库存大部分已被订单占用。',
    condition: 'reserved_detail_total > 0 && customer_order_ratio >= 0.7',
    action: '一般不应作为未来可售库存计算。可结合订单和销量判断是否需要补货。'
  },
  {
    label: '报告口径差异',
    category: '数据校验',
    meaning: '报告预留总数reserved_qty与预留原因明细合计不相等。该差异可能来自亚马逊报告字段统计口径、报告生成时间差或预留库存跨流程流转，不代表系统计算错误。',
    condition: 'reserved_difference !== 0',
    action: '不要强行修正数据，也不要简单把明细合计当成总预留库存。请以亚马逊原始报告字段为准，并结合客户订单、仓间调拨、仓内处理明细分析原因。'
  },
  {
    label: '无明细原因',
    category: '数据校验',
    meaning: '报告显示存在预留总数，但客户订单、仓间调拨、仓内处理三个原因明细都为0。',
    condition: 'reserved_qty > 0 && reserved_detail_total == 0',
    action: '说明报告总数有值但原因字段没有拆分。建议查看亚马逊后台报告或等待下一次报告刷新。'
  },
  {
    label: '无预留',
    category: '其他',
    meaning: '该SKU当前没有预留库存。',
    condition: 'reserved_qty == 0 && reserved_detail_total == 0',
    action: '无需处理。'
  }
]

// 分类顺序
export const reservedCategoryOrder = [
  '客户订单',
  '仓间调拨',
  '仓内处理',
  '结构占比',
  '数据校验',
  '其他'
]

// 按分类分组
export const getGroupedReservedStatusHelp = () => {
  const grouped = {}
  reservedCategoryOrder.forEach(cat => {
    grouped[cat] = []
  })
  reservedStatusHelpList.forEach(item => {
    if (grouped[item.category]) {
      grouped[item.category].push(item)
    }
  })
  return grouped
}
