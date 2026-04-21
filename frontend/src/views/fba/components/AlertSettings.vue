<template>
  <div class="alert-settings">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="180px"
    >
      <!-- 低库存预警设置 -->
      <el-divider content-position="left">低库存预警设置</el-divider>
      
      <el-form-item label="紧急预警阈值" prop="criticalThreshold">
        <el-input-number
          v-model="formData.criticalThreshold"
          :min="0"
          :max="100"
          :step="1"
          controls-position="right"
          style="width: 120px;"
        />
        <span class="unit">% (库存低于安全水平的百分比)</span>
        <div class="form-tip">
          当库存低于安全水平的此百分比时，触发紧急预警（红色警报）
        </div>
      </el-form-item>
      
      <el-form-item label="一般预警阈值" prop="warningThreshold">
        <el-input-number
          v-model="formData.warningThreshold"
          :min="0"
          :max="100"
          :step="1"
          controls-position="right"
          style="width: 120px;"
        />
        <span class="unit">% (库存低于安全水平的百分比)</span>
        <div class="form-tip">
          当库存低于安全水平的此百分比时，触发一般预警（黄色警报）
        </div>
      </el-form-item>
      
      <el-form-item label="安全库存天数" prop="safetyStockDays">
        <el-input-number
          v-model="formData.safetyStockDays"
          :min="1"
          :max="90"
          :step="1"
          controls-position="right"
          style="width: 120px;"
        />
        <span class="unit">天</span>
        <div class="form-tip">
          基于历史销量计算的建议安全库存天数
        </div>
      </el-form-item>
      
      <el-form-item label="立即补货阈值" prop="immediateReplenishThreshold">
        <el-input-number
          v-model="formData.immediateReplenishThreshold"
          :min="1"
          :max="30"
          :step="1"
          controls-position="right"
          style="width: 120px;"
        />
        <span class="unit">天 (预计断货天数)</span>
        <div class="form-tip">
          当预计断货天数少于此时，建议立即创建补货单
        </div>
      </el-form-item>
      
      <!-- 积压预警设置 -->
      <el-divider content-position="left">积压预警设置</el-divider>
      
      <el-form-item label="积压库龄预警" prop="overstockAgeThreshold">
        <el-input-number
          v-model="formData.overstockAgeThreshold"
          :min="30"
          :max="365"
          :step="1"
          controls-position="right"
          style="width: 120px;"
        />
        <span class="unit">天</span>
        <div class="form-tip">
          当库龄超过此时长时，触发积压预警
        </div>
      </el-form-item>
      
      <el-form-item label="周转率预警阈值" prop="turnoverRateThreshold">
        <el-input-number
          v-model="formData.turnoverRateThreshold"
          :min="0.1"
          :max="10"
          :step="0.1"
          controls-position="right"
          style="width: 120px;"
        />
        <span class="unit">次/年</span>
        <div class="form-tip">
          当年周转率低于此值时，触发周转率预警
        </div>
      </el-form-item>
      
      <el-form-item label="高价值商品阈值" prop="highValueThreshold">
        <el-input-number
          v-model="formData.highValueThreshold"
          :min="100"
          :max="10000"
          :step="100"
          controls-position="right"
          style="width: 120px;"
        />
        <span class="unit">元</span>
        <div class="form-tip">
          单件商品价值超过此值的大额库存会特别关注
        </div>
      </el-form-item>
      
      <!-- 通知设置 -->
      <el-divider content-position="left">通知设置</el-divider>
      
      <el-form-item label="邮件通知" prop="emailNotifications">
        <el-switch v-model="formData.emailNotifications" />
        <div class="form-tip">
          启用后，系统会发送预警邮件到绑定的邮箱
        </div>
      </el-form-item>
      
      <el-form-item v-if="formData.emailNotifications" label="邮件接收人" prop="emailRecipients">
        <el-input
          v-model="formData.emailRecipients"
          placeholder="多个邮箱用逗号分隔"
          style="width: 300px;"
        />
        <div class="form-tip">
          请输入接收预警邮件的邮箱地址
        </div>
      </el-form-item>
      
      <el-form-item label="站内信通知" prop="internalNotifications">
        <el-switch v-model="formData.internalNotifications" />
        <div class="form-tip">
          启用后，系统会通过站内信发送预警通知
        </div>
      </el-form-item>
      
      <el-form-item label="预警检查频率" prop="checkFrequency">
        <el-select v-model="formData.checkFrequency" style="width: 150px;">
          <el-option label="每小时" value="hourly" />
          <el-option label="每4小时" value="4hourly" />
          <el-option label="每日" value="daily" />
          <el-option label="每周" value="weekly" />
        </el-select>
        <div class="form-tip">
          系统自动检查库存预警的频率
        </div>
      </el-form-item>
      
      <el-form-item label="忽略预警有效期" prop="ignoreExpireDays">
        <el-input-number
          v-model="formData.ignoreExpireDays"
          :min="1"
          :max="30"
          :step="1"
          controls-position="right"
          style="width: 120px;"
        />
        <span class="unit">天</span>
        <div class="form-tip">
          被忽略的预警在指定天数后会自动恢复
        </div>
      </el-form-item>
      
      <!-- 保存按钮 -->
      <div class="form-actions">
        <el-button @click="handleCancel">
          取消
        </el-button>
        <el-button type="primary" @click="handleSave">
          保存设置
        </el-button>
        <el-button @click="handleReset">
          恢复默认
        </el-button>
      </div>
    </el-form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const emit = defineEmits(['save'])

// 表单引用
const formRef = ref()

// 表单数据（默认值）
const defaultData = {
  // 低库存预警
  criticalThreshold: 20,      // 紧急预警阈值（%）
  warningThreshold: 50,       // 一般预警阈值（%）
  safetyStockDays: 30,        // 安全库存天数
  immediateReplenishThreshold: 7, // 立即补货阈值（天）
  
  // 积压预警
  overstockAgeThreshold: 90,  // 积压库龄预警（天）
  turnoverRateThreshold: 1.0, // 周转率预警阈值（次/年）
  highValueThreshold: 1000,   // 高价值商品阈值（元）
  
  // 通知设置
  emailNotifications: true,
  emailRecipients: '',
  internalNotifications: true,
  checkFrequency: 'daily',
  ignoreExpireDays: 7
}

// 表单数据
const formData = ref({ ...defaultData })

// 表单验证规则
const rules = {
  criticalThreshold: [
    { required: true, message: '请输入紧急预警阈值', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '阈值必须在0-100之间', trigger: 'blur' }
  ],
  warningThreshold: [
    { required: true, message: '请输入一般预警阈值', trigger: 'blur' },
    { type: 'number', min: 0, max: 100, message: '阈值必须在0-100之间', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value <= formData.value.criticalThreshold) {
          callback(new Error('一般预警阈值必须大于紧急预警阈值'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ],
  safetyStockDays: [
    { required: true, message: '请输入安全库存天数', trigger: 'blur' },
    { type: 'number', min: 1, max: 90, message: '安全库存天数必须在1-90之间', trigger: 'blur' }
  ],
  immediateReplenishThreshold: [
    { required: true, message: '请输入立即补货阈值', trigger: 'blur' },
    { type: 'number', min: 1, max: 30, message: '补货阈值必须在1-30之间', trigger: 'blur' }
  ],
  overstockAgeThreshold: [
    { required: true, message: '请输入积压库龄预警阈值', trigger: 'blur' },
    { type: 'number', min: 30, max: 365, message: '库龄阈值必须在30-365之间', trigger: 'blur' }
  ],
  turnoverRateThreshold: [
    { required: true, message: '请输入周转率预警阈值', trigger: 'blur' },
    { type: 'number', min: 0.1, max: 10, message: '周转率必须在0.1-10之间', trigger: 'blur' }
  ],
  highValueThreshold: [
    { required: true, message: '请输入高价值商品阈值', trigger: 'blur' },
    { type: 'number', min: 100, max: 10000, message: '价值阈值必须在100-10000之间', trigger: 'blur' }
  ],
  emailRecipients: [
    {
      validator: (rule, value, callback) => {
        if (formData.value.emailNotifications && !value.trim()) {
          callback(new Error('请填写邮件接收人'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 初始化加载保存的设置
onMounted(() => {
  loadSavedSettings()
})

// 加载保存的设置
const loadSavedSettings = () => {
  try {
    const savedSettings = localStorage.getItem('fba_alert_settings')
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings)
      formData.value = { ...defaultData, ...parsed }
    }
  } catch (error) {
    console.error('加载设置失败:', error)
    ElMessage.warning('加载保存的设置失败，使用默认设置')
  }
}

// 保存设置
const handleSave = async () => {
  try {
    // 验证表单
    await formRef.value.validate()
    
    // 保存到本地存储
    localStorage.setItem('fba_alert_settings', JSON.stringify(formData.value))
    
    // 通知父组件
    emit('save', formData.value)
    
    ElMessage.success('设置保存成功')
  } catch (error) {
    if (error instanceof Error) {
      ElMessage.error('表单验证失败: ' + error.message)
    }
  }
}

// 取消
const handleCancel = () => {
  // 恢复到之前保存的设置
  loadSavedSettings()
  ElMessage.info('已取消更改')
}

// 恢复默认设置
const handleReset = () => {
  ElMessageBox.confirm(
    '确定要恢复默认设置吗？这将清除所有自定义设置。',
    '恢复默认设置',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    formData.value = { ...defaultData }
    localStorage.removeItem('fba_alert_settings')
    ElMessage.success('已恢复默认设置')
  }).catch(() => {
    // 用户取消
  })
}
</script>

<style scoped>
.alert-settings {
  padding: 20px;
}

.unit {
  margin-left: 10px;
  color: #606266;
  font-size: 14px;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.5;
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #EBEEF5;
}

:deep(.el-divider__text) {
  background-color: #ffffff;
  padding: 0 20px;
  font-weight: 500;
  color: #303133;
}

@media (max-width: 768px) {
  :deep(.el-form-item) {
    flex-direction: column;
    align-items: flex-start;
  }
  
  :deep(.el-form-item__label) {
    text-align: left;
    margin-bottom: 8px;
  }
  
  .form-actions {
    flex-direction: column;
    gap: 10px;
  }
  
  .form-actions .el-button {
    width: 100%;
  }
}
</style>