<template>
  <div class="status-help-popover">
    <div class="status-help-title">库存状态标签说明</div>
    <el-scrollbar height="520px">
      <div
        v-for="category in categoryOrder"
        :key="category"
        class="status-help-category"
      >
        {{ category }}
        <div
          v-for="item in groupedStatusHelp[category]"
          :key="item.label"
          class="status-help-item"
        >
          <div class="status-help-label-row">
            <span class="status-help-label">{{ item.label }}</span>
          </div>
          <div class="status-help-row">
            <span class="status-help-field">含义：</span>
            <span>{{ item.meaning }}</span>
          </div>
          <div class="status-help-row">
            <span class="status-help-field">判断：</span>
            <code class="status-help-condition">{{ item.condition }}</code>
          </div>
          <div class="status-help-row">
            <span class="status-help-field">动作：</span>
            <span>{{ item.action }}</span>
          </div>
        </div>
      </div>
      <!-- 暂未启用状态 -->
      <div v-if="unusedStatusLabels.length > 0" class="status-help-category status-help-unused">
        暂未启用
      </div>
      <div
        v-for="item in unusedStatusLabels"
        :key="item.label"
        class="status-help-item status-help-item-unused"
      >
        <div class="status-help-label-row">
          <span class="status-help-label">{{ item.label }}</span>
          <span class="status-help-note">({{ item.note }})</span>
        </div>
        <div class="status-help-row">
          <span class="status-help-field">含义：</span>
          <span>{{ item.meaning }}</span>
        </div>
        <div class="status-help-row">
          <span class="status-help-field">判断：</span>
          <code class="status-help-condition">{{ item.condition }}</code>
        </div>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import { categoryOrder, getGroupedStatusHelp, unusedStatusLabels } from '../../config/fbaInventoryStatusHelp'

const groupedStatusHelp = getGroupedStatusHelp()
</script>

<style scoped>
.status-help-popover {
  padding: 4px 0;
}

.status-help-title {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 8px;
}

.status-help-category {
  font-weight: 600;
  margin: 14px 0 8px;
  color: #409EFF;
  font-size: 13px;
}

.status-help-unused {
  color: #909399;
  border-top: 1px dashed #e0e0e0;
  padding-top: 12px;
  margin-top: 16px;
}

.status-help-item {
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-bottom: 10px;
  background: #fafafa;
}

.status-help-item-unused {
  opacity: 0.7;
  background: #f5f5f5;
}

.status-help-label-row {
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-help-label {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.status-help-note {
  font-size: 11px;
  color: #909399;
  font-weight: normal;
}

.status-help-row {
  font-size: 12px;
  color: #606266;
  margin-top: 5px;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
}

.status-help-field {
  color: #909399;
  min-width: 40px;
  flex-shrink: 0;
}

.status-help-condition {
  font-family: Consolas, Monaco, 'Courier New', monospace;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  color: #409EFF;
  font-size: 11px;
  word-break: break-all;
}
</style>