<template>
  <div class="product-upload-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">商品上传</h1>
        <el-breadcrumb separator="/">
          <el-breadcrumb-item>
            <el-link @click="$router.push('/products/list')">商品管理</el-link>
          </el-breadcrumb-item>
          <el-breadcrumb-item>商品上传</el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      
      <div class="header-right">
        <el-button 
          :icon="Back" 
          @click="$router.push('/products/list')"
        >
          返回列表
        </el-button>
      </div>
    </div>

    <!-- 上传区域 -->
    <div class="upload-section">
      <el-card shadow="never">
        <template #header>
          <div class="upload-header">
            <span class="upload-title">上传商品库存文件</span>
            <el-link 
              :icon="Download" 
              @click="downloadTemplate"
              type="primary"
            >
              下载模板
            </el-link>
          </div>
        </template>
        
        <div class="upload-content">
          <!-- 上传说明 -->
          <el-alert
            title="上传说明"
            type="info"
            description="请上传包含商品库存信息的Excel或CSV文件。文件应包含以下列：seller-sku（必填）、item-name、quantity、price、asin1、fulfillment_channel、status等。"
            show-icon
            :closable="false"
            style="margin-bottom: 30px;"
          />

          <!-- 店铺选择 -->
          <div class="shop-select-section">
            <el-form-item label="选择店铺" required>
              <el-select 
                v-model="selectedShopId" 
                placeholder="请选择要上传到的店铺" 
                filterable
                style="width: 300px;"
              >
                <el-option
                  v-for="shop in shopList"
                  :key="shop.id"
                  :label="shop.shop_name"
                  :value="shop.id"
                />
              </el-select>
              <span class="shop-tip">上传的商品将关联到选中的店铺</span>
            </el-form-item>
          </div>
          
          <!-- 上传组件 -->
          <el-upload
            ref="uploadRef"
            class="upload-demo"
            drag
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :file-list="fileList"
            accept=".csv,.xlsx,.xls,.txt"
            :limit="1"
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">将文件拖到此处，或<em>点击选择</em></div>
            <template #tip>
              <div class="el-upload__tip">
                支持 CSV、Excel、TXT 格式文件，文件大小不超过10MB。建议使用模板文件以确保数据格式正确。
              </div>
            </template>
          </el-upload>
          
          <!-- 文件预览区域 -->
          <div v-if="previewData" class="preview-section">
            <el-card shadow="never" class="preview-card">
              <div class="file-info" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px;">
                <div><strong>文件名：</strong>{{ previewData.fileName }}</div>
                <div><strong>文件大小：</strong>{{ formatFileSize(previewData.fileSize) }}</div>
                <div><strong>文件类型：</strong>{{ previewData.fileType }}</div>
                <div v-if="previewData.totalRows"><strong>总行数：</strong>{{ previewData.totalRows }} 行</div>
              </div>
              <div v-if="previewData.rows && previewData.rows.length" class="preview-content">
                <div class="preview-title" style="font-weight: bold; margin-bottom: 8px;">内容预览（前{{ previewData.previewRows }}行）：</div>
                <el-scrollbar max-height="300px">
                  <el-table 
                    :data="previewData.rows" 
                    border 
                    stripe 
                    size="small"
                    style="width: 100%; font-size: 12px;"
                  >
                    <el-table-column 
                      v-for="header in previewData.headers" 
                      :key="header" 
                      :prop="header" 
                      :label="header" 
                      :min-width="Math.max(header.length * 10 + 50, 100)"
                      show-overflow-tooltip
                    />
                  </el-table>
                </el-scrollbar>
              </div>
              <div v-else-if="previewData.content" class="preview-content">
                <div class="preview-title" style="font-weight: bold; margin-bottom: 8px;">内容预览（前{{ previewData.previewRows }}行）：</div>
                <pre class="content-text" style="background: #f5f7fa; padding: 12px; border-radius: 4px; max-height: 200px; overflow: auto; font-size: 12px; line-height: 1.4; margin: 0;">{{ previewData.content }}</pre>
              </div>
              <div v-else-if="previewData.isExcel" class="preview-notice">
                <el-alert
                  title="Excel文件预览"
                  type="info"
                  description="Excel文件内容预览需要额外支持，请确认文件内容后上传。"
                  show-icon
                  :closable="false"
                />
              </div>
              <div v-else class="preview-notice">
                <el-alert
                  title="无法预览"
                  type="warning"
                  description="文件格式不支持预览，请确认文件内容后上传。"
                  show-icon
                  :closable="false"
                />
              </div>
            </el-card>
          </div>
          
          <!-- 上传状态 -->
          <div v-if="uploadResult" class="upload-result">
            <el-alert
              :title="uploadResult.title"
              :type="uploadResult.type"
              :description="uploadResult.description"
              show-icon
              :closable="true"
              @close="clearUploadResult"
            />
            
            <div v-if="uploadResult.data" class="upload-details">
              <el-descriptions :column="2" border style="margin-top: 20px;">
                <el-descriptions-item label="总记录数">
                  {{ uploadResult.data.total }}
                </el-descriptions-item>
                <el-descriptions-item label="成功数">
                  {{ uploadResult.data.success }}
                </el-descriptions-item>
                <el-descriptions-item label="失败数">
                  {{ uploadResult.data.fail }}
                </el-descriptions-item>
                <el-descriptions-item label="上传批次">
                  {{ uploadResult.data.batch }}
                </el-descriptions-item>
              </el-descriptions>
              
              <!-- 错误文件下载 -->
              <div v-if="uploadResult.data.errorFile" class="error-file-section">
                <el-alert
                  title="部分数据上传失败"
                  type="warning"
                  description="系统已生成包含错误数据的文件，您可以下载查看具体错误信息。"
                  show-icon
                  style="margin-top: 20px;"
                />
                <el-button 
                  type="warning" 
                  :icon="Download" 
                  @click="downloadErrorFile"
                  style="margin-top: 10px;"
                >
                  下载错误文件
                </el-button>
              </div>
            </div>
          </div>
          
          <!-- 上传按钮 -->
          <div class="upload-actions">
            <el-button 
              type="primary" 
              :icon="UploadFilled" 
              @click="handleUpload"
              :loading="uploadLoading"
              :disabled="!currentFile"
            >
              开始上传
            </el-button>
            <el-button @click="resetUpload">重置</el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 历史记录 -->
    <div class="history-section" v-if="false">
      <el-card shadow="never">
        <template #header>
          <span class="history-title">最近上传记录</span>
        </template>
        
        <el-table :data="uploadHistory" style="width: 100%">
          <el-table-column prop="filename" label="文件名" width="200" />
          <el-table-column prop="upload_time" label="上传时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.upload_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="total_records" label="总记录数" width="100" />
          <el-table-column prop="success_count" label="成功数" width="100" />
          <el-table-column prop="fail_count" label="失败数" width="100" />
          <el-table-column prop="upload_by" label="操作人" width="120" />
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button 
                size="small" 
                :icon="Download" 
                @click="downloadHistoryFile(row)"
                v-if="row.error_file"
              >
                错误文件
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Back, Download, UploadFilled 
} from '@element-plus/icons-vue'
import { apiService } from '@/utils/api.js'
import * as XLSX from 'xlsx'

// 引用
const uploadRef = ref()

// 状态
const uploadLoading = ref(false)
const currentFile = ref(null)
const fileList = ref([])
const uploadResult = ref(null)
const uploadHistory = ref([])
const shopList = ref([])
const selectedShopId = ref('')
const previewData = ref(null)

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 生成文件预览
const generatePreview = (file) => {
  const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()
  const isTextFile = ['.csv', '.txt'].includes(fileExt)
  const isExcelFile = ['.xlsx', '.xls'].includes(fileExt)
  
  // 基础文件信息
  const preview = {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type || '未知',
    isExcel: isExcelFile,
    totalRows: 0,
    previewRows: 10,
    headers: [],
    rows: [],
    content: null
  }
  
  // 文本文件读取内容预览
  if (isTextFile) {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target.result
        // 处理不同换行符：\r\n, \n, \r
        const lines = text.split(/\r\n|\n|\r/).filter(line => line.trim() !== '')
        preview.totalRows = lines.length
        
        if (lines.length > 0) {
          // 自动检测分隔符
          const firstLine = lines[0]
          let delimiter = ','
          // 如果是txt或者第一行包含制表符，使用制表符
          if (fileExt === '.txt' || firstLine.includes('\t')) {
            delimiter = '\t'
          } else if (!firstLine.includes(',') && firstLine.includes(' ')) {
            // 如果既没有逗号也没有制表符，但有空格，尝试使用空格（处理某些复制粘贴的情况）
            delimiter = / +/
          }
          
          // 解析表头
          const headers = firstLine.split(delimiter).map(h => h.trim().replace(/^["']+|["']$/g, ''))
          preview.headers = headers.filter(h => h !== '') // 过滤掉空表头
          
          // 解析数据行（最多10行）
          const dataRows = []
          const maxRows = Math.min(10, lines.length - 1)
          for (let i = 1; i <= maxRows; i++) {
            const rowData = lines[i].split(delimiter).map(v => v.trim().replace(/^["']+|["']$/g, ''))
            const rowObj = {}
            preview.headers.forEach((header, index) => {
              rowObj[header] = rowData[index] || ''
            })
            dataRows.push(rowObj)
          }
          preview.rows = dataRows
        }
        
        preview.content = lines.slice(0, 10).join('\n')
        previewData.value = { ...preview }
      } catch (error) {
        console.error('解析文件失败:', error)
        preview.content = '无法解析文件内容，请检查文件格式'
        previewData.value = { ...preview }
      }
    }
    reader.onerror = () => {
      previewData.value = preview
    }
    // 尝试不同编码
    try {
      reader.readAsText(file.raw, 'UTF-8')
    } catch (e) {
      reader.readAsText(file.raw)
    }
  } else {
    // Excel 文件：用 xlsx 库解析内容
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

        if (jsonData.length > 0) {
          const headerRow = jsonData[0]
          const dataRows = jsonData.slice(1, 11)

          preview.headers = headerRow.map((h, i) => (h !== '' ? String(h) : `列${i + 1}`))
          preview.totalRows = jsonData.length - 1
          preview.previewRows = dataRows.length

          preview.rows = dataRows.map(row => {
            const obj = {}
            preview.headers.forEach((header, i) => {
              obj[header] = row[i] !== undefined && row[i] !== '' ? String(row[i]) : ''
            })
            return obj
          })
        }

        previewData.value = { ...preview }
      } catch (error) {
        console.error('解析Excel失败:', error)
        previewData.value = { ...preview }
      }
    }
    reader.onerror = () => {
      previewData.value = preview
    }
    reader.readAsArrayBuffer(file.raw)
  }
}

// 处理文件变化
const handleFileChange = (file) => {
  // 验证文件类型
  const allowedTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'application/csv'
  ]
  
  const fileExt = file.name.split('.').pop().toLowerCase()
  const isValidType = allowedTypes.includes(file.type) || ['csv', 'xlsx', 'xls', 'txt'].includes(fileExt)
  
  if (!isValidType) {
    ElMessage.error('文件格式不正确，请上传 CSV、Excel 或 TXT 文件')
    return false
  }
  
  // 验证文件大小（10MB）
  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过10MB')
    return false
  }
  
  currentFile.value = file.raw
  // 生成预览
  generatePreview(file)
  return true
}

// 处理文件移除
const handleFileRemove = () => {
  currentFile.value = null
  fileList.value = []
}

// 处理上传
const handleUpload = async () => {
  if (!currentFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  if (!selectedShopId.value) {
    ElMessage.warning('请先选择要上传到的店铺')
    return
  }
  
  uploadLoading.value = true
  
  // 创建FormData
  const formData = new FormData()
  formData.append('file', currentFile.value)
  formData.append('shop_id', selectedShopId.value)
  
  try {
    const result = await apiService.products.upload(formData)
    
    uploadResult.value = {
      title: '上传成功',
      type: 'success',
      description: result.message || '文件上传并处理完成',
      data: result
    }
    
    // 清空文件列表
    fileList.value = []
    currentFile.value = null
    
    // 刷新历史记录
    // loadUploadHistory()
    
  } catch (error) {
    uploadResult.value = {
      title: '上传失败',
      type: 'error',
      description: error.message || '文件上传失败，请检查文件格式和内容'
    }
  } finally {
    uploadLoading.value = false
  }
}

// 重置上传
const resetUpload = () => {
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
  currentFile.value = null
  fileList.value = []
  uploadResult.value = null
}

// 清除上传结果
const clearUploadResult = () => {
  uploadResult.value = null
}

// 下载模板
const downloadTemplate = () => {
  // 创建模板数据
  const headers = ['seller-sku', 'item-name', 'quantity', 'price', 'asin1', 'fulfillment_channel', 'status']
  const exampleRow = ['SKU123456', '示例商品', '100', '99.99', 'B07XXXXXXX', 'AMAZON_NA', 'active']
  
  const csvContent = [
    headers.join(','),
    exampleRow.join(','),
    '# 说明：',
    '# 1. seller-sku: 商品SKU（必填）',
    '# 2. item-name: 商品名称',
    '# 3. quantity: 可售库存数量',
    '# 4. price: 商品价格',
    '# 5. asin1: 商品ASIN',
    '# 6. fulfillment_channel: 配送渠道（AMAZON_NA/AMAZON_EU/AMAZON_JP/MERCHANT）',
    '# 7. status: 商品状态（active/out_of_stock/inactive）'
  ].join('\n')
  
  // 创建下载链接
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '商品库存模板.csv'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)
  
  ElMessage.success('模板下载成功')
}

// 下载错误文件
const downloadErrorFile = () => {
  if (!uploadResult.value?.data?.errorFile) return
  
  const errorFilePath = uploadResult.value.data.errorFile
  const errorFileName = errorFilePath.split('/').pop()
  
  // 创建下载链接
  const url = `http://localhost:3000${errorFilePath}`
  const a = document.createElement('a')
  a.href = url
  a.download = errorFileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// 格式化日期时间
const formatDateTime = (dateTimeStr) => {
  if (!dateTimeStr) return '-'
  return new Date(dateTimeStr).toLocaleString('zh-CN')
}

// 加载上传历史
const loadUploadHistory = async () => {
  try {
    // 这里可以调用API获取上传历史记录
    // uploadHistory.value = await apiService.uploads.getHistory('product')
  } catch (error) {
    console.error('加载上传历史失败:', error)
  }
}

// 下载历史文件
const downloadHistoryFile = (record) => {
  if (!record.error_file) return
  
  const errorFilePath = record.error_file
  const errorFileName = errorFilePath.split('/').pop()
  
  const url = `http://localhost:3000${errorFilePath}`
  const a = document.createElement('a')
  a.href = url
  a.download = errorFileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// 获取店铺列表
const loadShops = async () => {
  try {
    const shops = await apiService.shops.getAllShops()
    shopList.value = shops || []
  } catch (error) {
    console.error('获取店铺列表失败:', error)
    ElMessage.error('获取店铺列表失败')
  }
}

// 初始化
onMounted(() => {
  loadShops()
})
</script>

<style scoped>
.product-upload-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 120px);
}

/* 页面标题 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left .page-title {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 上传区域 */
.upload-section {
  margin-bottom: 30px;
}

.upload-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upload-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.upload-content {
  padding: 20px;
}

/* 店铺选择 */
.shop-select-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.shop-select-section .el-form-item {
  margin-bottom: 0;
}

.shop-tip {
  margin-left: 12px;
  color: #909399;
  font-size: 12px;
}

/* 上传组件 */
.upload-demo {
  margin-bottom: 30px;
}

:deep(.upload-demo .el-upload) {
  width: 100%;
}

:deep(.upload-demo .el-upload-dragger) {
  width: 100%;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 2px dashed #dcdfe6;
  background-color: #fafafa;
  transition: border-color 0.3s;
}

:deep(.upload-demo .el-upload-dragger:hover) {
  border-color: #409eff;
}

:deep(.el-icon--upload) {
  font-size: 60px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

:deep(.el-upload__text) {
  font-size: 16px;
  color: #606266;
  margin-bottom: 8px;
}

:deep(.el-upload__text em) {
  color: #409eff;
  font-style: normal;
  font-weight: 500;
}

:deep(.el-upload__tip) {
  font-size: 14px;
  color: #909399;
  text-align: center;
  margin-top: 12px;
}

/* 上传结果 */
.upload-result {
  margin: 30px 0;
}

.upload-details {
  margin-top: 20px;
}

.error-file-section {
  margin-top: 20px;
}

/* 上传按钮 */
.upload-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
}

/* 历史记录 */
.history-section {
  margin-top: 30px;
}

.history-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .upload-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .upload-actions {
    flex-direction: column;
    gap: 10px;
  }
}
</style>