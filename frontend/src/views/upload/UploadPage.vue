<template>
  <div class="upload-page">
    <el-row :gutter="20">
      <el-col :xs="24" :lg="16">
        <div class="page-container">
          <div class="page-header">
            <h2 class="page-title">文献批量导入</h2>
          </div>

          <div class="upload-area">
            <el-upload
              ref="uploadRef"
              class="upload-demo"
              drag
              :auto-upload="false"
              :on-change="handleFileChange"
              :file-list="fileList"
              :limit="1"
              accept=".bib,.bibtex,.csv,.txt"
            >
              <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
              <div class="el-upload__text">
                拖拽文件到此处，或<em>点击上传</em>
              </div>
              <template #tip>
                <div class="el-upload__tip">
                  支持 BibTeX (.bib, .bibtex) 和 CSV (.csv) 格式文件，单次最多上传50MB
                </div>
              </template>
            </el-upload>
          </div>

          <div class="upload-actions">
            <el-button type="primary" size="large" :loading="uploading" :disabled="!selectedFile" @click="handleUpload">
              <el-icon><Upload /></el-icon>开始导入
            </el-button>
            <el-button size="large" @click="handleClear">清空文件</el-button>
          </div>

          <div class="sample-data-section">
            <el-divider content-position="left">或者使用示例数据</el-divider>
            <div class="sample-info">
              <el-icon class="sample-icon"><DataLine /></el-icon>
              <div class="sample-desc">
                <h4>示例数据集</h4>
                <p>包含50篇模拟论文数据，涵盖深度学习、机器学习、自然语言处理等研究方向，可用于快速体验平台功能</p>
              </div>
              <el-button type="success" :loading="importing" @click="handleImportSample">
                <el-icon><MagicStick /></el-icon>导入示例数据
              </el-button>
            </div>
          </div>

          <div v-if="resultData" class="result-section">
            <el-result :icon="resultData.success ? 'success' : 'warning'" :title="resultData.title">
              <template #sub-title>{{ resultData.message }}</template>
              <template #extra>
                <el-row :gutter="20" class="result-stats">
                  <el-col :span="8">
                    <div class="stat-item">
                      <div class="stat-num">{{ resultData.total }}</div>
                      <div class="stat-label">解析总数</div>
                    </div>
                  </el-col>
                  <el-col :span="8">
                    <div class="stat-item success">
                      <div class="stat-num">{{ resultData.inserted }}</div>
                      <div class="stat-label">成功导入</div>
                    </div>
                  </el-col>
                  <el-col :span="8">
                    <div class="stat-item warning">
                      <div class="stat-num">{{ resultData.skipped }}</div>
                      <div class="stat-label">跳过/重复</div>
                    </div>
                  </el-col>
                </el-row>
                <el-button type="primary" @click="goToPapers">查看论文列表</el-button>
              </template>
            </el-result>
          </div>
        </div>
      </el-col>

      <el-col :xs="24" :lg="8">
        <div class="page-container">
          <h3 class="section-title">支持的文件格式</h3>
          
          <div class="format-card">
            <div class="format-header">
              <el-icon class="format-icon bib"><Document /></el-icon>
              <span class="format-name">BibTeX 格式</span>
            </div>
            <p class="format-desc">标准的BibTeX参考文献格式，可从Google Scholar、Web of Science、CNKI等数据库导出</p>
            <div class="format-sample">
              <code>
@article{smith2023,<br/>
&nbsp;&nbsp;title={论文标题},<br/>
&nbsp;&nbsp;author={作者名},<br/>
&nbsp;&nbsp;journal={期刊名},<br/>
&nbsp;&nbsp;year={2023},<br/>
&nbsp;&nbsp;volume={10},<br/>
&nbsp;&nbsp;pages={1-15}<br/>
}
              </code>
            </div>
          </div>

          <div class="format-card">
            <div class="format-header">
              <el-icon class="format-icon csv"><Grid /></el-icon>
              <span class="format-name">CSV 格式</span>
            </div>
            <p class="format-desc">逗号分隔的表格格式，支持多种常见字段名自动识别</p>
            <div class="format-fields">
              <div class="field-tag">title</div>
              <div class="field-tag">authors</div>
              <div class="field-tag">journal</div>
              <div class="field-tag">year</div>
              <div class="field-tag">abstract</div>
              <div class="field-tag">keywords</div>
              <div class="field-tag">doi</div>
              <div class="field-tag">citations</div>
            </div>
          </div>

          <div class="tips-section">
            <h4><el-icon><InfoFilled /></el-icon>导入提示</h4>
            <ul>
              <li>支持从 Web of Science、Scopus、CNKI、万方等数据库导出的文献数据</li>
              <li>系统会自动检测重复论文（基于DOI），避免重复导入</li>
              <li>大文件导入可能需要较长时间，请耐心等待</li>
              <li>导入完成后可在论文管理中查看和编辑已导入的论文</li>
            </ul>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { uploadPapers, importSampleData } from '@/api/upload'

const router = useRouter()
const uploadRef = ref(null)
const fileList = ref([])
const selectedFile = ref(null)
const uploading = ref(false)
const importing = ref(false)
const resultData = ref(null)

const handleFileChange = (file, files) => {
  selectedFile.value = file.raw
  resultData.value = null
}

const handleUpload = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请先选择文件')
    return
  }

  uploading.value = true
  resultData.value = null

  try {
    const res = await uploadPapers(selectedFile.value)
    resultData.value = {
      success: true,
      title: '导入成功',
      message: res.message,
      total: res.data.total,
      inserted: res.data.inserted,
      skipped: res.data.skipped
    }
    ElMessage.success(res.message)
  } catch (e) {
    resultData.value = {
      success: false,
      title: '导入失败',
      message: e.message || '文件导入失败，请检查文件格式',
      total: 0,
      inserted: 0,
      skipped: 0
    }
  } finally {
    uploading.value = false
  }
}

const handleClear = () => {
  fileList.value = []
  selectedFile.value = null
  resultData.value = null
}

const handleImportSample = async () => {
  importing.value = true
  try {
    const res = await importSampleData()
    resultData.value = {
      success: true,
      title: '导入成功',
      message: res.message,
      total: res.data.total,
      inserted: res.data.inserted,
      skipped: res.data.total - res.data.inserted
    }
    ElMessage.success(res.message)
  } catch (e) {
    ElMessage.error('示例数据导入失败')
  } finally {
    importing.value = false
  }
}

const goToPapers = () => {
  router.push('/papers')
}
</script>

<style scoped lang="scss">
.upload-page {
  .page-container {
    background: #fff;
    border-radius: 8px;
    padding: 25px;
  }

  .page-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0 0 20px 0;
  }

  .section-title {
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 20px 0;
    padding-bottom: 10px;
    border-bottom: 1px solid #ebeef5;
  }

  .upload-area {
    margin-bottom: 20px;

    :deep(.el-upload-dragger) {
      padding: 40px 20px;
      background: #fafcff;
    }
  }

  .upload-actions {
    display: flex;
    gap: 15px;
    margin-bottom: 20px;
  }

  .sample-data-section {
    margin-top: 30px;

    .sample-info {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 20px;
      background: #f0f9eb;
      border-radius: 8px;
      border: 1px solid #e1f3d8;

      .sample-icon {
        font-size: 36px;
        color: #67c23a;
        flex-shrink: 0;
      }

      .sample-desc {
        flex: 1;

        h4 {
          margin: 0 0 6px 0;
          font-size: 14px;
          font-weight: 600;
          color: #67c23a;
        }

        p {
          margin: 0;
          font-size: 13px;
          color: #606266;
          line-height: 1.5;
        }
      }
    }
  }

  .result-section {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #ebeef5;

    .result-stats {
      margin-bottom: 20px;

      .stat-item {
        text-align: center;
        padding: 15px;
        background: #f5f7fa;
        border-radius: 8px;

        .stat-num {
          font-size: 28px;
          font-weight: 700;
          color: #409eff;
          margin-bottom: 5px;
        }

        .stat-label {
          font-size: 13px;
          color: #909399;
        }

        &.success .stat-num {
          color: #67c23a;
        }

        &.warning .stat-num {
          color: #e6a23c;
        }
      }
    }
  }

  .format-card {
    background: #f5f7fa;
    border-radius: 8px;
    padding: 18px;
    margin-bottom: 15px;

    .format-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;

      .format-icon {
        font-size: 24px;
        padding: 8px;
        border-radius: 8px;
        color: #fff;

        &.bib {
          background: linear-gradient(135deg, #409eff, #66b1ff);
        }

        &.csv {
          background: linear-gradient(135deg, #67c23a, #85ce61);
        }
      }

      .format-name {
        font-size: 15px;
        font-weight: 600;
        color: #303133;
      }
    }

    .format-desc {
      font-size: 13px;
      color: #606266;
      line-height: 1.6;
      margin-bottom: 12px;
    }

    .format-sample {
      background: #fff;
      padding: 12px;
      border-radius: 6px;
      font-size: 11px;
      line-height: 1.5;

      code {
        color: #606266;
        font-family: 'Courier New', monospace;
      }
    }

    .format-fields {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;

      .field-tag {
        background: #ecf5ff;
        color: #409eff;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 12px;
      }
    }
  }

  .tips-section {
    margin-top: 20px;
    padding-top: 15px;
    border-top: 1px solid #ebeef5;

    h4 {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 600;
      color: #606266;
      margin-bottom: 12px;
    }

    ul {
      list-style: none;
      padding: 0;
      margin: 0;

      li {
        position: relative;
        padding-left: 16px;
        margin-bottom: 8px;
        font-size: 13px;
        color: #606266;
        line-height: 1.5;

        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 7px;
          width: 6px;
          height: 6px;
          background: #409eff;
          border-radius: 50%;
        }
      }
    }
  }
}

@media screen and (max-width: 768px) {
  .sample-info {
    flex-direction: column;
    text-align: center;
  }
}
</style>
