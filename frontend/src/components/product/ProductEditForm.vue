<template>
  <div class="product-edit-form">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
      size="large"
    >
      <!-- SKU显示 -->
      <el-form-item label="SKU">
        <el-input v-model="formData.seller_sku" disabled />
      </el-form-item>

      <!-- 商品名称 -->
      <el-form-item label="商品名称" prop="item_name">
        <el-input
          v-model="formData.item_name"
          placeholder="请输入商品名称"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <!-- 价格 -->
      <el-form-item label="售价" prop="price">
        <el-input-number
          v-model="formData.price"
          :min="0"
          :precision="2"
          controls-position="right"
          style="width: 100%"
        />
      </el-form-item>

      <!-- 库存信息 -->
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="可售库存" prop="quantity">
            <el-input-number
              v-model="formData.quantity"
              :min="0"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
        
        <el-col :span="12">
          <el-form-item label="待处理库存" prop="pending_quantity">
            <el-input-number
              v-model="formData.pending_quantity"
              :min="0"
              controls-position="right"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <!-- ASIN -->
      <el-form-item label="ASIN" prop="asin1">
        <el-input
          v-model="formData.asin1"
          placeholder="请输入ASIN"
          maxlength="20"
        />
      </el-form-item>

      <!-- 配送渠道 -->
      <el-form-item label="配送渠道" prop="fulfillment_channel">
        <el-select
          v-model="formData.fulfillment_channel"
          placeholder="请选择配送渠道"
          style="width: 100%"
        >
          <el-option label="亚马逊北美" value="AMAZON_NA" />
          <el-option label="亚马逊欧洲" value="AMAZON_EU" />
          <el-option label="亚马逊日本" value="AMAZON_JP" />
          <el-option label="卖家自配送" value="MERCHANT" />
        </el-select>
      </el-form-item>

      <!-- 商品状态 -->
      <el-form-item label="商品状态" prop="status">
        <el-select
          v-model="formData.status"
          placeholder="请选择商品状态"
          style="width: 100%"
        >
          <el-option label="在售" value="active" />
          <el-option label="缺货" value="out_of_stock" />
          <el-option label="停售" value="inactive" />
        </el-select>
      </el-form-item>

      <!-- 图片链接 -->
      <el-form-item label="图片链接" prop="image_url">
        <el-input
          v-model="formData.image_url"
          placeholder="请输入商品图片URL"
          type="text"
        />
        <div class="image-preview" v-if="formData.image_url">
          <img :src="formData.image_url" alt="图片预览" />
        </div>
      </el-form-item>

      <!-- 商品上架时间 -->
      <el-form-item label="上架时间" prop="open_date">
        <el-date-picker
          v-model="formData.open_date"
          type="datetime"
          placeholder="选择上架时间"
          format="YYYY-MM-DD HH:mm:ss"
          value-format="YYYY-MM-DD HH:mm:ss"
          style="width: 100%"
        />
      </el-form-item>

      <!-- 表单操作按钮 -->
      <el-form-item>
        <div class="form-actions">
          <el-button @click="handleCancel">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitting">
            {{ submitting ? '保存中...' : '保存' }}
          </el-button>
        </div>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'

// 定义props
const props = defineProps({
  product: {
    type: Object,
    required: true
  }
})

// 定义events
const emit = defineEmits(['cancel', 'save'])

// 表单引用
const formRef = ref()
const submitting = ref(false)

// 表单数据
const formData = reactive({
  seller_sku: '',
  item_name: '',
  price: 0,
  quantity: 0,
  pending_quantity: 0,
  asin1: '',
  fulfillment_channel: '',
  status: '',
  image_url: '',
  open_date: null
})

// 更新表单数据
watch(
  () => props.product,
  (newProduct) => {
    if (newProduct) {
      Object.keys(formData).forEach(key => {
        if (key in newProduct) {
          formData[key] = newProduct[key]
        }
      })
    }
  },
  { immediate: true, deep: true }
)

// 表单验证规则
const rules = {
  item_name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' }
  ],
  quantity: [
    { required: true, message: '请输入可售库存', trigger: 'blur' }
  ],
  price: [
    { type: 'number', message: '价格必须为数字', trigger: 'blur' }
  ],
  pending_quantity: [
    { type: 'number', message: '待处理库存必须为数字', trigger: 'blur' }
  ],
  asin1: [
    { max: 20, message: 'ASIN长度不能超过20个字符', trigger: 'blur' }
  ],
  image_url: [
    { type: 'url', message: '请输入有效的图片URL', trigger: 'blur' }
  ],
  open_date: [
    { type: 'date', message: '请选择有效的日期时间', trigger: 'blur' }
  ]
}

// 取消编辑
const handleCancel = () => {
  emit('cancel')
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    // 验证表单
    await formRef.value.validate()
    
    submitting.value = true
    
    // 准备提交数据（过滤掉不需要的字段）
    const submitData = {
      item_name: formData.item_name,
      price: formData.price,
      quantity: formData.quantity,
      pending_quantity: formData.pending_quantity,
      asin1: formData.asin1,
      fulfillment_channel: formData.fulfillment_channel,
      status: formData.status,
      image_url: formData.image_url,
      open_date: formData.open_date
    }
    
    // 清除空的字段
    Object.keys(submitData).forEach(key => {
      if (submitData[key] === null || submitData[key] === undefined || submitData[key] === '') {
        delete submitData[key]
      }
    })
    
    // 触发保存事件
    emit('save', submitData)
  } catch (error) {
    if (error.errors) {
      ElMessage.warning('请检查表单填写是否正确')
    } else {
      ElMessage.error('表单验证失败: ' + error.message)
    }
  } finally {
    submitting.value = false
  }
}

// 暴露方法供父组件调用
defineExpose({
  validate: () => formRef.value?.validate(),
  resetFields: () => formRef.value?.resetFields()
})
</script>

<style scoped>
.product-edit-form {
  padding: 0;
}

/* 表单操作按钮 */
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}

/* 图片预览 */
.image-preview {
  margin-top: 10px;
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 6px;
  text-align: center;
}

.image-preview img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .el-row {
    flex-direction: column;
  }
  
  .el-col {
    width: 100%;
    margin-bottom: 10px;
  }
}
</style>