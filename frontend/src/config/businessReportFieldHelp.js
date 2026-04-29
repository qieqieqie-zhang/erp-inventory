/**
 * 业务报告字段说明配置
 * 用于主表表头问号 tooltip 显示
 */
export const businessReportFieldHelp = {
  sessions: {
    originalField: 'sessions - 总计',
    meaning: '买家进入商品详情页的会话/访问次数。一个会话可能包含多次页面浏览。',
    usage: '衡量流量规模。会话数高说明曝光多，但不代表转化好。需要结合转化率一起看。'
  },
  page_views: {
    originalField: '页面浏览量 - 总计',
    meaning: '买家浏览商品详情页的总次数，包括同一会话内的多次浏览。',
    usage: '反映页面热度。如果页面浏览量远高于会话数，说明买家会反复查看页面。'
  },
  page_views_percentage: {
    originalField: '页面浏览量百分比 - 总计',
    meaning: '该商品页面浏览量占所有商品页面浏览总量的比例。',
    usage: '判断商品在品类中的曝光占比。占比高说明是流量主力商品。'
  },
  product_session_percentage: {
    originalField: '商品会话百分比',
    meaning: '购买该商品的买家占总访客的比例（订单商品数量转化率）。',
    usage: '核心转化指标。值越高说明每100个访客中购买的人数越多。此字段优先于模糊的"转化率"。'
  },
  avg_unit_price: {
    originalField: '系统计算字段',
    meaning: '系统根据已有数据计算：已订购商品销售额 / 已订购商品数量',
    usage: '衡量平均每件商品的售价。用于参考定价策略，避免定价过低或过高。'
  },
  ordered_quantity: {
    originalField: '已订购商品数量',
    meaning: '买家实际下单购买的商品件数总和。',
    usage: '衡量实际销售量。与会话数结合可以判断流量是否有效转化为订单。'
  },
  sales_amount: {
    originalField: '已订购商品销售额',
    meaning: '买家实际支付的总金额（不含退款）。',
    usage: '衡量GMV，是运营的核心KPI之一。用于评估商品带来的实际收入。'
  },
  parent_asin: {
    originalField: '（父）ASIN',
    meaning: '父ASIN是该商品在亚马逊目录中的顶级商品标识，子ASIN是具体尺寸/颜色变体。',
    usage: '用于分析同一父商品下不同子变体的表现差异，帮助选品决策。'
  },
  child_asin: {
    originalField: '（子）ASIN',
    meaning: '子ASIN是具体商品变体（如特定颜色、尺寸）的唯一标识。',
    usage: '用于区分同款商品的不同规格，分析哪个规格卖得更好。'
  },
  sku: {
    originalField: 'SKU / seller_sku',
    meaning: '卖家自己设置的商品编码，用于内部管理。',
    usage: '在ERP系统中关联商品信息，区分不同店铺或供应链渠道的商品。'
  },
  title: {
    originalField: 'item_title / 标题',
    meaning: '商品在亚马逊前台展示的标题名称。',
    usage: '用于确认商品身份，排查是否为同款商品重复上传。'
  },
  performance_tag: {
    originalField: '系统计算标签',
    meaning: '根据会话数和转化率与均值对比自动计算的商品表现分类。',
    usage: '快速识别问题商品或潜力商品：高流量低转化=流量浪费，高转化高销量=爆款。'
  },
  sessions_b2b: {
    originalField: '会话 - 总计 - B2B',
    meaning: '企业买家进入商品详情页的会话次数。',
    usage: '分析B2B企业客户的流量情况，与B2C数据对比判断是否需要开拓企业市场。'
  },
  page_views_b2b: {
    originalField: '页面浏览量 - 总计 - B2B',
    meaning: '企业买家浏览商品详情页的总次数。',
    usage: '分析企业客户的页面热度，B2B客户决策周期长，页面浏览通常更多。'
  },
  recommended_offer_percentage: {
    originalField: '推荐报价（推荐报价展示位）百分比',
    meaning: '商品获得亚马逊推荐展示位的比例。100%意味着一直是推荐商品。',
    usage: '判断商品是否被亚马逊推荐。高推荐率有助于提升销量。'
  },
  product_session_percentage_b2b: {
    originalField: '商品会话百分比 - B2B',
    meaning: '企业买家的订单商品数量转化率。',
    usage: '分析B2B客户的转化效率。值越高说明企业客户购买意愿越强。'
  },
  ordered_quantity_b2b: {
    originalField: '已订购商品数量 - B2B',
    meaning: '企业买家下单购买的商品件数。',
    usage: '统计B2B渠道的实际销售量，用于B2B业务分析。'
  },
  sales_amount_b2b: {
    originalField: '已订购商品销售额 - B2B',
    meaning: '企业买家支付的总金额。',
    usage: '计算B2B渠道带来的GMV，评估企业客户的贡献度。'
  },
  total_order_items: {
    originalField: '订单商品总数',
    meaning: '包含该商品的所有订单中的商品项总数（含取消和退款）。',
    usage: '用于与已订购商品数量对比，排查取消/退款订单比例。'
  }
}