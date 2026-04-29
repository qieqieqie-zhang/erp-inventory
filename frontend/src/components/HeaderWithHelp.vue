<template>
  <span class="header-with-help">
    {{ label }}
    <el-popover
      placement="top"
      trigger="hover"
      :width="340"
      effect="light"
    >
      <template #reference>
        <el-icon class="field-help-icon"><QuestionFilled /></el-icon>
      </template>
      <div class="field-help-popover">
        <div class="field-help-title">{{ helpConfig.label }}</div>
        <div class="field-help-row">
          <span class="field-help-label">CSV字段：</span>
          <code class="field-help-code">{{ helpConfig.csv }}</code>
        </div>
        <div class="field-help-row">
          <span class="field-help-label">系统字段：</span>
          <code class="field-help-code">{{ helpConfig.field }}</code>
        </div>
        <div class="field-help-row">
          <span class="field-help-label">数据库字段：</span>
          <code class="field-help-code">{{ helpConfig.db }}</code>
        </div>
        <div class="field-help-section">
          <b>含义：</b>{{ helpConfig.meaning }}
        </div>
        <div class="field-help-section">
          <b>用途：</b>{{ helpConfig.usage }}
        </div>
        <div class="field-help-note" v-if="helpConfig.note">
          <el-icon><Warning /></el-icon>
          <span>{{ helpConfig.note }}</span>
        </div>
      </div>
    </el-popover>
  </span>
</template>

<script setup>
import { QuestionFilled, Warning } from '@element-plus/icons-vue'

const props = defineProps({
  field: {
    type: String,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  helpConfig: {
    type: Object,
    required: true
  }
})
</script>

<style scoped>
.header-with-help {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.field-help-icon {
  font-size: 14px;
  color: #909399;
  cursor: pointer;
  transition: color 0.2s;
}

.field-help-icon:hover {
  color: #409EFF;
}

.field-help-popover {
  font-size: 13px;
  line-height: 1.6;
  color: #303133;
}

.field-help-title {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
}

.field-help-row {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.field-help-label {
  color: #606266;
  min-width: 80px;
}

.field-help-code {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  color: #409EFF;
  font-family: Consolas, Monaco, 'Courier New', monospace;
  font-size: 12px;
}

.field-help-section {
  margin-top: 10px;
  color: #303133;
}

.field-help-section b {
  color: #303133;
}

.field-help-note {
  margin-top: 10px;
  padding: 8px 10px;
  background: #fdf6ec;
  border-left: 3px solid #e6a23c;
  border-radius: 0 4px 4px 0;
  color: #865a0e;
  font-size: 12px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}

.field-help-note .el-icon {
  color: #e6a23c;
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
