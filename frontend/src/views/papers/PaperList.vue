<template>
  <div class="paper-list-page">
    <div class="page-container">
      <div class="page-header">
        <h2 class="page-title">论文管理</h2>
        <div class="header-actions">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增论文
          </el-button>
          <el-button type="danger" :disabled="selectedIds.length === 0" @click="handleBatchDelete">
            <el-icon><Delete /></el-icon>批量删除
          </el-button>
        </div>
      </div>

      <div class="search-bar">
        <el-form :inline="true" :model="searchForm">
          <el-form-item label="关键词">
            <el-input
              v-model="searchForm.search"
              placeholder="标题/摘要/关键词"
              clearable
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-form-item>
          <el-form-item label="年份">
            <el-select v-model="searchForm.year" placeholder="全部年份" clearable>
              <el-option 
                v-for="year in yearOptions" 
                :key="year" 
                :label="year" 
                :value="year" 
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <el-table
        ref="tableRef"
        :data="papers"
        v-loading="loading"
        border
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="title" label="标题" min-width="250" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="paper-title" @click="handleView(row)">
              {{ row.title }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="authors" label="作者" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.authors?.length">{{ row.authors.join(', ') }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="journal" label="期刊" min-width="150" show-overflow-tooltip />
        <el-table-column prop="year" label="年份" width="80" align="center" />
        <el-table-column prop="citations" label="被引" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.citations > 50 ? 'danger' : row.citations > 10 ? 'warning' : 'info'" size="small">
              {{ row.citations }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleView(row)">查看</el-button>
            <el-button type="primary" link size="small" @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="700px">
      <el-form :model="paperForm" :rules="paperRules" ref="paperFormRef" label-width="80px">
        <el-form-item label="标题" prop="title">
          <el-input v-model="paperForm.title" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item label="作者">
          <el-select
            v-model="paperForm.authors"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入作者后按回车添加"
            style="width: 100%"
          >
          </el-select>
        </el-form-item>
        <el-form-item label="期刊">
          <el-input v-model="paperForm.journal" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-form-item label="年份">
              <el-input-number v-model="paperForm.year" :min="1900" :max="2100" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="卷号">
              <el-input v-model="paperForm.volume" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="期号">
              <el-input v-model="paperForm.issue" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="页码">
          <el-input v-model="paperForm.pages" />
        </el-form-item>
        <el-form-item label="DOI">
          <el-input v-model="paperForm.doi" />
        </el-form-item>
        <el-form-item label="摘要">
          <el-input v-model="paperForm.abstract" type="textarea" :rows="4" />
        </el-form-item>
        <el-form-item label="关键词">
          <el-select
            v-model="paperForm.keywords"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="输入关键词后按回车添加"
            style="width: 100%"
          >
          </el-select>
        </el-form-item>
        <el-form-item label="被引">
          <el-input-number v-model="paperForm.citations" :min="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="viewVisible" title="论文详情" width="700px">
      <div v-if="currentPaper" class="paper-detail">
        <h3 class="detail-title">{{ currentPaper.title }}</h3>
        <div class="detail-meta">
          <el-tag v-for="author in currentPaper.authors" :key="author" class="author-tag">
            {{ author }}
          </el-tag>
        </div>
        <div class="detail-info">
          <div class="info-row">
            <span class="label">期刊：</span>
            <span class="value">{{ currentPaper.journal || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">年份：</span>
            <span class="value">{{ currentPaper.year || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">卷期：</span>
            <span class="value">{{ currentPaper.volume || '-' }} {{ currentPaper.issue ? `(${currentPaper.issue})` : '' }}</span>
          </div>
          <div class="info-row">
            <span class="label">页码：</span>
            <span class="value">{{ currentPaper.pages || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">DOI：</span>
            <span class="value">{{ currentPaper.doi || '-' }}</span>
          </div>
          <div class="info-row">
            <span class="label">被引次数：</span>
            <el-tag type="warning">{{ currentPaper.citations || 0 }}</el-tag>
          </div>
        </div>
        <div class="detail-abstract" v-if="currentPaper.abstract">
          <div class="label">摘要：</div>
          <p>{{ currentPaper.abstract }}</p>
        </div>
        <div class="detail-keywords" v-if="currentPaper.keywords?.length">
          <div class="label">关键词：</div>
          <el-tag 
            v-for="kw in currentPaper.keywords" 
            :key="kw" 
            type="info"
            class="keyword-tag"
          >
            {{ kw }}
          </el-tag>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPapers, createPaper, updatePaper, deletePaper, batchDeletePapers } from '@/api/papers'
import { getPaperStats } from '@/api/papers'

const tableRef = ref(null)
const paperFormRef = ref(null)
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const viewVisible = ref(false)
const isEdit = ref(false)
const selectedIds = ref([])
const currentPaper = ref(null)
const yearOptions = ref([])

const papers = ref([])
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const searchForm = reactive({
  search: '',
  year: ''
})

const paperForm = reactive({
  title: '',
  authors: [],
  journal: '',
  year: 2024,
  volume: '',
  issue: '',
  pages: '',
  doi: '',
  abstract: '',
  keywords: [],
  citations: 0
})

const paperRules = {
  title: [{ required: true, message: '请输入论文标题', trigger: 'blur' }]
}

const dialogTitle = computed(() => isEdit.value ? '编辑论文' : '新增论文')

const loadPapers = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm
    }
    if (!params.year) delete params.year
    
    const res = await getPapers(params)
    papers.value = res.data
    pagination.total = res.pagination.total
  } catch (e) {
    console.error('加载论文失败:', e)
  } finally {
    loading.value = false
  }
}

const loadYears = async () => {
  try {
    const res = await getPaperStats()
    yearOptions.value = res.data.yearDistribution.map(d => d.year).sort((a, b) => b - a)
  } catch (e) {
    console.error('加载年份失败:', e)
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadPapers()
}

const handleReset = () => {
  searchForm.search = ''
  searchForm.year = ''
  pagination.page = 1
  loadPapers()
}

const handlePageChange = (page) => {
  pagination.page = page
  loadPapers()
}

const handleSizeChange = (size) => {
  pagination.limit = size
  pagination.page = 1
  loadPapers()
}

const handleSelectionChange = (selection) => {
  selectedIds.value = selection.map(item => item._id)
}

const handleAdd = () => {
  isEdit.value = false
  Object.assign(paperForm, {
    title: '',
    authors: [],
    journal: '',
    year: new Date().getFullYear(),
    volume: '',
    issue: '',
    pages: '',
    doi: '',
    abstract: '',
    keywords: [],
    citations: 0
  })
  dialogVisible.value = true
}

const handleEdit = (row) => {
  isEdit.value = true
  currentPaper.value = row
  Object.assign(paperForm, {
    title: row.title || '',
    authors: row.authors || [],
    journal: row.journal || '',
    year: row.year || new Date().getFullYear(),
    volume: row.volume || '',
    issue: row.issue || '',
    pages: row.pages || '',
    doi: row.doi || '',
    abstract: row.abstract || '',
    keywords: row.keywords || [],
    citations: row.citations || 0
  })
  dialogVisible.value = true
}

const handleView = (row) => {
  currentPaper.value = row
  viewVisible.value = true
}

const handleSubmit = async () => {
  if (!paperFormRef.value) return
  
  const valid = await paperFormRef.value.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    if (isEdit.value) {
      await updatePaper(currentPaper.value._id, paperForm)
      ElMessage.success('更新成功')
    } else {
      await createPaper(paperForm)
      ElMessage.success('添加成功')
    }
    dialogVisible.value = false
    loadPapers()
  } catch (e) {
    console.error('保存失败:', e)
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要删除这篇论文吗？', '提示', {
      type: 'warning'
    })
    await deletePaper(row._id)
    ElMessage.success('删除成功')
    loadPapers()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('删除失败:', e)
    }
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedIds.value.length} 篇论文吗？`, '提示', {
      type: 'warning'
    })
    await batchDeletePapers(selectedIds.value)
    ElMessage.success('批量删除成功')
    loadPapers()
  } catch (e) {
    if (e !== 'cancel') {
      console.error('批量删除失败:', e)
    }
  }
}

onMounted(() => {
  loadPapers()
  loadYears()
})
</script>

<style scoped lang="scss">
.paper-list-page {
  .page-container {
    padding: 20px;
    background: #fff;
    border-radius: 8px;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #ebeef5;

    .page-title {
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }
  }

  .search-bar {
    margin-bottom: 20px;
    background: #f5f7fa;
    padding: 15px;
    border-radius: 6px;
  }

  .paper-title {
    color: #409eff;
    cursor: pointer;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }

  .pagination {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}

.paper-detail {
  .detail-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 15px;
    color: #303133;
    line-height: 1.5;
  }

  .detail-meta {
    margin-bottom: 20px;
    
    .author-tag {
      margin-right: 8px;
      margin-bottom: 8px;
    }
  }

  .detail-info {
    background: #f5f7fa;
    padding: 15px;
    border-radius: 8px;
    margin-bottom: 20px;

    .info-row {
      display: flex;
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }

      .label {
        color: #909399;
        width: 70px;
        flex-shrink: 0;
      }

      .value {
        color: #606266;
      }
    }
  }

  .detail-abstract, .detail-keywords {
    margin-bottom: 15px;

    .label {
      font-weight: 600;
      color: #606266;
      margin-bottom: 8px;
    }

    p {
      color: #606266;
      line-height: 1.8;
      text-indent: 2em;
    }
  }

  .keyword-tag {
    margin-right: 8px;
    margin-bottom: 8px;
  }
}

@media screen and (max-width: 768px) {
  .paper-list-page .page-container {
    padding: 15px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .search-bar {
    :deep(.el-form-item) {
      display: block;
      margin-right: 0;
      margin-bottom: 10px;
    }
  }
}
</style>
