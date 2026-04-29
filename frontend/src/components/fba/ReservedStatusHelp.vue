<template>
  <el-popover
    placement="right-start"
    :width="720"
    trigger="click"
    effect="light"
  >
    <template #reference>
      <el-icon class="reserved-status-help-icon">
        <QuestionFilled />
      </el-icon>
    </template>
    <div class="reserved-status-help-popover">
      <div class="reserved-status-help-title">预留状态标签说明</div>
      <el-scrollbar height="520px">
        <div
          v-for="category in reservedCategoryOrder"
          :key="category"
          class="reserved-status-help-category"
        >
          {{ category }}
          <div
            v-for="item in groupedStatusHelp[category]"
            :key="item.label"
            class="reserved-status-help-item"
          >
            <div class="reserved-status-help-label-row">
              <span class="reserved-status-help-label">{{ item.label }}</span>
            </div>
            <div class="reserved-status-help-row">
              <span class="reserved-status-help-field">含义：</span>
              <span>{{ item.meaning }}</span>
            </div>
            <div class="reserved-status-help-row">
              <span class="reserved-status-help-field">判断：</span>
              <code class="reserved-status-help-condition">{{ item.condition }}</code>
            </div>
            <div class="reserved-status-help-action">
              <span class="reserved-status-help-field">动作：</span>
              <span>{{ item.action }}</span>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
  </el-popover>
</template>

<script setup>
import { QuestionFilled } from '@element-plus/icons-vue'
import { reservedCategoryOrder, getGroupedReservedStatusHelp } from '../../config/fbaReservedStatusHelp'

const groupedStatusHelp = getGroupedReservedStatusHelp()
</script>

<style scoped>
.reserved-status-help-icon {
  margin-left: 4px;
  color: #909399;
  cursor: pointer;
  font-size: 14px;
  vertical-align: middle;
  transition: color 0.2s;
}

.reserved-status-help-icon:hover {
  color: #409EFF;
}

.reserved-status-help-popover {
  padding: 4px 0;
}

.reserved-status-help-title {
  font-weight: 600;
  font-size: 15px;
  color: #303133;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
  margin-bottom: 8px;
}

.reserved-status-help-category {
  font-weight: 600;
  margin: 14px 0 8px;
  color: #409EFF;
  font-size: 13px;
}

.reserved-status-help-item {
  padding: 10px 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-bottom: 10px;
  background: #fafafa;
}

.reserved-status-help-label-row {
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.reserved-status-help-label {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.reserved-status-help-row {
  font-size: 12px;
  color: #606266;
  margin-top: 5px;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
}

.reserved-status-help-field {
  color: #909399;
  min-width: 40px;
  flex-shrink: 0;
}

.reserved-status-help-condition {
  font-family: Consolas, Monaco, 'Courier New', monospace;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  color: #409EFF;
  font-size: 11px;
  word-break: break-all;
}

.reserved-status-help-action {
  margin-top: 6px;
  padding: 6px 8px;
  background: #fdf6ec;
  border-left: 3px solid #e6a23c;
  color: #606266;
  font-size: 12px;
  line-height: 1.5;
  display: flex;
  align-items: flex-start;
}

.reserved-status-help-action .reserved-status-help-field {
  color: #e6a23c;
}
</style>
