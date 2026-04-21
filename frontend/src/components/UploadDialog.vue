<template>
  <el-dialog
    v-model="dialogVisible"
    :title="title"
    width="1000px"
    :close-on-click-modal="false"
    :destroy-on-close="true"
    @closed="handleDialogClosed"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item
        v-if="showShopSelect"
        label="选择店铺"
        prop="shopId"
      >
        <el-select
          v-model="formData.shopId"
          placeholder="请选择店铺"
          filterable
          style="width: 100%;"
        >
          <el-option
            v-for="shop in shopList"
            :key="shop.id"
            :label="shop.shop_name"
            :value="shop.id"
          />
        </el-select>
      </el-form-item>

      <el-form-item
        v-if="showDimensionSelect"
        label="时间维度"
        prop="dimension"
      >
        <el-select
          v-model="formData.dimension"
          placeholder="请选择时间维度"
          style="width: 100%;"
        >
          <el-option label="昨日" value="1day" />
          <el-option label="近3天" value="3days" />
          <el-option label="近7天" value="7days" />
          <el-option label="近14天" value="14days" />
          <el-option label="近30天" value="30days" />
        </el-select>
      </el-form-item>

      <el-form-item label="数据文件" prop="file" required>
        <el-upload
          ref="uploadRef"
          class="upload-area"
          drag
          :auto-upload="false"
          :limit="1"
          :accept="accept"
          :on-exceed="handleExceed"
          :on-change="handleFileChange"
          :on-remove="handleFileRemove"
          :file-list="fileList"
        >
          <el-icon class="upload-icon"><upload-filled /></el-icon>
          <div class="upload-text">
            将文件拖到此处，或 <em>点击上传</em>
          </div>
          <template #tip>
            <div class="upload-tip">
              <div>支持 {{ accept }} 格式</div>
              <div>最大文件大小: {{ maxSize }}MB</div>
              <div v-if="uploadTip" class="custom-tip">{{ uploadTip }}</div>
            </div>
          </template>
        </el-upload>
      </el-form-item>

      <!-- 文件预览区域 -->
      <el-form-item v-if="previewData || previewing" label="文件预览">
        <el-card v-loading="previewing" shadow="never" class="preview-card">
          <div class="file-info" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px;">
            <div><strong>文件名：</strong>{{ previewData.fileName }}</div>
            <div><strong>文件大小：</strong>{{ formatFileSize(previewData.fileSize) }}</div>
            <div><strong>文件类型：</strong>{{ previewData.fileType }}</div>
            <div v-if="previewData.totalRows"><strong>总行数：</strong>{{ previewData.totalRows }} 行</div>
          </div>
          <div v-if="previewData.rows && previewData.rows.length" class="preview-content">
            <div class="preview-title" style="font-weight: bold; margin-bottom: 8px;">内容预览（前{{ previewData.previewRows }}行）：</div>
            <el-scrollbar max-height="300px">
              <div style="min-width: 1000px;">
                <el-table 
                  :data="previewData.rows" 
                  border 
                  stripe 
                  size="small"
                  style="width: 100%; font-size: 12px;"
                >
                  <el-table-column 
                    v-for="(header, index) in previewData.headers" 
                    :key="index" 
                    :prop="header" 
                    :label="header || ('列 ' + (index + 1))" 
                    :min-width="150"
                    show-overflow-tooltip
                  />
                </el-table>
              </div>
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
      </el-form-item>

      <el-form-item
        v-if="showOverwriteOption"
        label="上传模式"
      >
        <el-radio-group v-model="formData.overwriteMode">
          <el-radio label="overwrite">覆盖现有数据</el-radio>
          <el-radio label="append">追加数据</el-radio>
        </el-radio-group>
      </el-form-item>

      <el-form-item v-if="showErrorFileOption" label="错误处理">
        <el-checkbox v-model="formData.generateErrorFile">
          生成错误文件
        </el-checkbox>
        <div class="option-description">
          如果数据验证失败，会生成包含错误信息的CSV文件
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button
          :disabled="uploading"
          @click="dialogVisible = false"
        >
          取消
        </el-button>
        <el-button
          v-if="previewData"
          @click="clearPreview"
          :disabled="uploading"
        >
          重新选择
        </el-button>
        <el-button
          type="primary"
          :loading="uploading"
          @click="submitUpload"
          :disabled="!formData.file"
        >
          {{ uploading ? '上传中...' : '确定上传' }}
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { apiService } from '../utils/api.js'
import * as XLSX from 'xlsx'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: '上传文件'
  },
  accept: {
    type: String,
    default: '.xlsx,.xls,.csv'
  },
  maxSize: {
    type: Number,
    default: 10
  },
  showShopSelect: {
    type: Boolean,
    default: false
  },
  showDimensionSelect: {
    type: Boolean,
    default: false
  },
  showOverwriteOption: {
    type: Boolean,
    default: false
  },
  showErrorFileOption: {
    type: Boolean,
    default: true
  },
  uploadTip: {
    type: String,
    default: ''
  },
  defaultDimension: {
    type: String,
    default: '7days'
  },
  // When provided, the component handles FormData building and API call internally.
  // Signature: (formData: FormData) => Promise<any>
  uploadFn: {
    type: Function,
    default: null
  },
  // Extra key-value pairs to append to FormData when uploadFn is used.
  extraFields: {
    type: Object,
    default: () => ({})
  },
  // 后端预览函数，文件选中后调用，返回 { headers, rows, totalRows }
  // Signature: (file: File) => Promise<{ headers: string[], rows: object[], totalRows: number }>
  previewFn: {
    type: Function,
    default: null
  }
})

const emit = defineEmits([
  'update:modelValue',
  'submit',
  'success',
  'closed'
])

// 对话框状态
const dialogVisible = ref(props.modelValue)

// 表单引用
const formRef = ref()
const uploadRef = ref()

// 表单数据
const formData = ref({
  shopId: '',
  dimension: props.defaultDimension,
  file: null,
  overwriteMode: 'overwrite',
  generateErrorFile: true
})

// 店铺列表
const shopList = ref([])

// 加载店铺列表
const loadShops = async () => {
  try {
    const shops = await apiService.shops.getAllShops()
    shopList.value = shops || []
  } catch (error) {
    console.error('获取店铺列表失败:', error)
  }
}

// 文件列表
const fileList = ref([])

// 上传状态
const uploading = ref(false)

// 后端预览加载状态
const previewing = ref(false)

// 预览数据
const previewData = ref(null)

// 表单验证规则
const rules = ref({
  shopId: [
    { required: true, message: '请选择店铺', trigger: 'change' }
  ],
  dimension: [
    { required: true, message: '请选择时间维度', trigger: 'change' }
  ],
  file: [
    { required: true, message: '请选择要上传的文件', trigger: 'change' }
  ]
})

// 监听props变化
watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val && props.showShopSelect) {
    loadShops()
  }
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 文件超出限制
const handleExceed = () => {
  ElMessage.warning('每次只能上传一个文件')
}

// 文件变化
const handleFileChange = async (file) => {
  // 检查文件大小
  const maxSize = props.maxSize * 1024 * 1024 // 转换为字节
  if (file.size > maxSize) {
    ElMessage.warning(`文件大小不能超过${props.maxSize}MB`)
    uploadRef.value.handleRemove(file)
    return
  }

  // 检查文件格式
  const fileName = file.name
  const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
  const acceptExts = props.accept.split(',').map(ext => ext.trim().toLowerCase())

  if (!acceptExts.includes(fileExt) && !acceptExts.includes(fileExt + ',') && !acceptExts.includes('.' + fileExt)) {
    ElMessage.warning(`不支持的文件格式，请上传${props.accept}格式的文件`)
    uploadRef.value.handleRemove(file)
    return
  }

  const rawFile = file.raw
  formData.value.file = rawFile

  if (props.previewFn) {
    // 后端预览：调用 previewFn 获取解析结果
    previewData.value = null
    previewing.value = true
    try {
      const result = await props.previewFn(rawFile)
      previewData.value = {
        fileName: rawFile.name,
        fileSize: rawFile.size,
        fileType: rawFile.type,
        isExcel: false,
        totalRows: result.totalRows ?? result.rows?.length ?? 0,
        previewRows: result.rows?.length ?? 0,
        headers: result.headers || [],
        rows: result.rows || [],
        content: null
      }
    } catch (error) {
      console.error('[UploadDialog] previewFn error:', error)
      ElMessage.error(error.message || '预览失败')
      previewData.value = null
    } finally {
      previewing.value = false
    }
  } else {
    // 前端预览：本地解析 CSV/TXT
    generatePreview(file)
  }
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
    } else if (isExcelFile) {
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
    } else {
      // 其他格式只显示文件信息
      previewData.value = preview
    }
}

// 清除预览
const clearPreview = () => {
  previewData.value = null
  formData.value.file = null
  if (uploadRef.value) {
    uploadRef.value.clearFiles()
  }
}

// 文件移除
const handleFileRemove = () => {
  formData.value.file = null
  previewData.value = null
}

// 提交上传
const submitUpload = async () => {
  if (!formData.value.file) {
    ElMessage.warning('请选择要上传的文件')
    return
  }

  if (props.showDimensionSelect && !formData.value.dimension) {
    ElMessage.warning('请选择时间维度')
    return
  }

  uploading.value = true

  if (props.uploadFn) {
    // Internal mode: build FormData and call uploadFn directly
    try {
      const fd = new FormData()
      fd.append('file', formData.value.file)
      if (props.showShopSelect && formData.value.shopId) {
        fd.append('shop_id', formData.value.shopId)
      }
      if (props.showDimensionSelect && formData.value.dimension) {
        fd.append('dimension', formData.value.dimension)
      }
      if (props.showOverwriteOption) {
        fd.append('overwrite_mode', formData.value.overwriteMode)
      }
      Object.entries(props.extraFields).forEach(([key, val]) => {
        if (val !== null && val !== undefined) fd.append(key, val)
      })

      const result = await props.uploadFn(fd)
      ElMessage.success('上传成功')
      emit('success', result)
      dialogVisible.value = false
    } catch (error) {
      ElMessage.error(error.message || '上传失败')
    } finally {
      uploading.value = false
    }
  } else {
    // Legacy mode: emit to parent
    emit('submit', formData.value.file, {
      shopId: formData.value.shopId,
      dimension: formData.value.dimension,
      overwriteMode: formData.value.overwriteMode,
      generateErrorFile: formData.value.generateErrorFile
    })
  }
}

// 对话框关闭
const handleDialogClosed = () => {
  // 重置表单
  formRef.value?.resetFields()
  formData.value = {
    shopId: '',
    dimension: props.defaultDimension,
    file: null,
    overwriteMode: 'overwrite',
    generateErrorFile: true
  }
  fileList.value = []
  uploading.value = false
  previewing.value = false
  previewData.value = null

  emit('closed')
}

// 暴露方法给父组件
defineExpose({
  closeDialog: () => {
    dialogVisible.value = false
  },
  setUploading: (value) => {
    uploading.value = value
  }
})
</script>

<style scoped>
.upload-area {
  width: 100%;
}

.upload-icon {
  font-size: 48px;
  color: #409EFF;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.upload-text em {
  color: #409EFF;
  font-style: normal;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  margin-top: 8px;
}

.custom-tip {
  color: #E6A23C;
  margin-top: 4px;
}

.option-description {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 预览区域样式 */
.preview-card {
  margin-top: 10px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.file-info {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 6px;
}

.file-info div {
  font-size: 14px;
  color: #606266;
}

.file-info strong {
  color: #303133;
  margin-right: 8px;
}

.preview-content {
  margin-top: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.content-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 12px;
  line-height: 1.5;
  color: #333;
  background: #fff;
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.preview-notice {
  margin-top: 16px;
}
</style>