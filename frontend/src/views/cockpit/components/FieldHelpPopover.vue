<template>
  <el-popover placement="top" :width="280" trigger="hover">
    <template #reference>
      <el-icon class="field-help-icon" color="#909399"><QuestionFilled /></el-icon>
    </template>
    <div class="field-help-content">
      <div class="field-help-item">
        <span class="field-help-label">原始字段：</span>
        <span class="field-help-value">{{ helpData.originalField }}</span>
      </div>
      <div class="field-help-item">
        <span class="field-help-label">计算方式：</span>
        <span class="field-help-value">{{ helpData.calculation }}</span>
      </div>
      <div class="field-help-item">
        <span class="field-help-label">字段含义：</span>
        <span class="field-help-value">{{ helpData.meaning }}</span>
      </div>
      <div class="field-help-item">
        <span class="field-help-label">运营用途：</span>
        <span class="field-help-value">{{ helpData.usage }}</span>
      </div>
    </div>
  </el-popover>
</template>

<script setup>
import { computed } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'

const props = defineProps({
  fieldKey: {
    type: String,
    required: true
  }
})

const cockpitFieldHelp = {
  sales_1day: {
    originalField: '近1天销量',
    calculation: '直接取近1天销量',
    meaning: '最近1天内的销量总和',
    usage: '用于观察最近1天是否有成交、是否突然断单或起量'
  },
  sales_3days: {
    originalField: '近3天销量',
    calculation: '直接取近3天销量',
    meaning: '最近3天内的销量总和',
    usage: '用于观察最近3天短期销售表现'
  },
  avg_daily_sales_3d: {
    originalField: '近3天销量',
    calculation: '近3天销量 / 3',
    meaning: '最近3天平均每天销量',
    usage: '用于判断当前短期销售节奏'
  },
  trend_3d_vs_7d: {
    originalField: '近3天销量、近7天销量',
    calculation: '近3天销量 / 3 - 近7天销量 / 7',
    meaning: '最近3天日均销量与最近7天日均销量的差值',
    usage: '用于判断短期销量是在加速还是减速'
  },
  sales_7days: {
    originalField: '近7天销量',
    calculation: '直接取近7天销量',
    meaning: '最近7天内的销量总和',
    usage: '用于观察一周销售表现'
  },
  avg_daily_sales_7d: {
    originalField: '近7天销量',
    calculation: '近7天销量 / 7',
    meaning: '最近7天平均每天销量',
    usage: '用于判断一周销售节奏'
  },
  trend_7d_vs_30d: {
    originalField: '近7天销量、近30天销量',
    calculation: '近7天销量 / 7 - 近30天销量 / 30',
    meaning: '最近7天日均销量与最近30天日均销量的差值',
    usage: '用于判断最近一周销量相对月度基线是在增强还是减弱'
  },
  sales_14days: {
    originalField: '近14天销量',
    calculation: '直接取近14天销量',
    meaning: '最近14天内的销量总和',
    usage: '用于观察半个月销售表现'
  },
  sales_30days: {
    originalField: '近30天销量',
    calculation: '直接取近30天销量',
    meaning: '最近30天内的销量总和',
    usage: '用于作为中期销售基线参考'
  }
}

const helpData = computed(() => {
  return cockpitFieldHelp[props.fieldKey] || {
    originalField: '-',
    calculation: '-',
    meaning: '-',
    usage: '-'
  }
})
</script>

<style scoped>
.field-help-content {
  font-size: 12px;
  line-height: 1.6;
}

.field-help-item {
  margin-bottom: 6px;
}

.field-help-item:last-child {
  margin-bottom: 0;
}

.field-help-label {
  color: #606266;
  font-weight: 500;
}

.field-help-value {
  color: #303133;
}
</style>
