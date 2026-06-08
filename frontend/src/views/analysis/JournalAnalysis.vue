<template>
  <div class="journal-page">
    <div class="page-container">
      <div class="page-header">
        <h2 class="page-title">期刊分析</h2>
        <div class="header-controls">
          <span class="control-label">显示数量：</span>
          <el-select v-model="topN" size="default" style="width: 140px" @change="loadData">
            <el-option label="Top 10" :value="10" />
            <el-option label="Top 20" :value="20" />
            <el-option label="Top 30" :value="30" />
            <el-option label="Top 50" :value="50" />
          </el-select>
        </div>
      </div>

      <el-row :gutter="20">
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card stat-journal">
            <div class="stat-icon">
              <el-icon :size="28"><Reading /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalJournals }}</div>
              <div class="stat-label">期刊总数</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card stat-paper">
            <div class="stat-icon">
              <el-icon :size="28"><Document /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.avgPapersPerJournal }}</div>
              <div class="stat-label">平均发文量</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card stat-citation">
            <div class="stat-icon">
              <el-icon :size="28"><TrendCharts /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.avgCitations }}</div>
              <div class="stat-label">篇均被引</div>
            </div>
          </div>
        </el-col>
        <el-col :xs="24" :sm="12" :md="6">
          <div class="stat-card stat-hindex">
            <div class="stat-icon">
              <el-icon :size="28"><Trophy /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.topCitations }}</div>
              <div class="stat-label">最高被引</div>
            </div>
          </div>
        </el-col>
      </el-row>

      <el-row :gutter="20" class="mt-20">
        <el-col :xs="24" :lg="14">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">期刊发文量排行</h3>
              <span class="chart-tip">按论文数量排序</span>
            </div>
            <div ref="barChartRef" class="chart-container"></div>
          </div>
        </el-col>

        <el-col :xs="24" :lg="10">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">期刊分布</h3>
            </div>
            <div ref="pieChartRef" class="pie-chart-container"></div>
          </div>
        </el-col>
      </el-row>

      <div class="chart-card mt-20">
        <div class="chart-header">
          <h3 class="chart-title">期刊详情列表</h3>
          <span class="chart-tip">共 {{ journalList.length }} 个期刊</span>
        </div>
        <el-table :data="journalList" stripe style="width: 100%" v-loading="loading">
          <el-table-column type="index" label="排名" width="80" align="center">
            <template #default="{ $index }">
              <span class="rank-badge" :class="'rank-' + ($index + 1)">{{ $index + 1 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="journal" label="期刊名称" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="journal-name">{{ row.journal }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="paperCount" label="论文数" width="100" align="center" sortable>
            <template #default="{ row }">
              <el-tag type="primary" effect="light">{{ row.paperCount }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="totalCitations" label="总被引" width="100" align="center" sortable>
            <template #default="{ row }">
              <el-tag type="warning" effect="light">{{ row.totalCitations }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="avgCitations" label="篇均被引" width="100" align="center">
            <template #default="{ row }">
              {{ row.avgCitations?.toFixed(1) || 0 }}
            </template>
          </el-table-column>
          <el-table-column prop="firstYear" label="起始年份" width="100" align="center" />
          <el-table-column prop="lastYear" label="最近年份" width="100" align="center" />
        </el-table>
        <div class="pagination-wrap">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 30, 50]"
            :total="journalList.length"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { getJournalAnalysis } from '@/api/analysis'
import * as echarts from 'echarts'
import { Reading, Document, TrendCharts, Trophy } from '@element-plus/icons-vue'

const barChartRef = ref(null)
const pieChartRef = ref(null)
const topN = ref(20)
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)

const journalList = ref([])
const stats = ref({
  totalJournals: 0,
  avgPapersPerJournal: 0,
  avgCitations: 0,
  topCitations: 0
})

let barChart = null
let pieChart = null

const colors = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#409eff',
  '#67c23a', '#e6a23c', '#f56c6c', '#722ed1', '#13c2c2'
]

const paginatedJournals = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return journalList.value.slice(start, start + pageSize.value)
})

const loadData = async () => {
  loading.value = true
  try {
    const res = await getJournalAnalysis({ limit: topN.value })
    journalList.value = res.data || []
    
    const totalPapers = journalList.value.reduce((sum, j) => sum + j.paperCount, 0)
    const totalCitations = journalList.value.reduce((sum, j) => sum + j.totalCitations, 0)
    const maxCitations = journalList.value.length > 0 
      ? Math.max(...journalList.value.map(j => j.totalCitations)) 
      : 0

    stats.value = {
      totalJournals: journalList.value.length,
      avgPapersPerJournal: journalList.value.length > 0 
        ? Math.round(totalPapers / journalList.value.length * 10) / 10 
        : 0,
      avgCitations: totalPapers > 0 
        ? Math.round(totalCitations / totalPapers * 10) / 10 
        : 0,
      topCitations: maxCitations
    }

    await nextTick()
    initCharts()
  } catch (e) {
    console.error('加载期刊分析数据失败:', e)
  } finally {
    loading.value = false
  }
}

const initBarChart = () => {
  if (!barChartRef.value) return
  
  if (barChart) barChart.dispose()
  barChart = echarts.init(barChartRef.value)

  const topJournals = journalList.value.slice(0, 15).reverse()
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: function(params) {
        const data = params[0]
        const journal = topJournals.find(j => j.journal === data.name)
        return `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 6px;">${data.name}</div>
            <div>论文数量：${journal?.paperCount || 0} 篇</div>
            <div>总被引频次：${journal?.totalCitations || 0}</div>
            <div>篇均被引：${journal?.avgCitations || 0}</div>
          </div>
        `
      }
    },
    grid: {
      left: '3%',
      right: '8%',
      bottom: '3%',
      top: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#606266' }
    },
    yAxis: {
      type: 'category',
      data: topJournals.map(j => j.journal),
      axisLabel: { 
        color: '#606266',
        fontSize: 11,
        width: 150,
        overflow: 'truncate'
      }
    },
    series: [{
      type: 'bar',
      data: topJournals.map((j, i) => ({
        value: j.paperCount,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: colors[i % colors.length] + '60' },
            { offset: 1, color: colors[i % colors.length] }
          ]),
          borderRadius: [0, 4, 4, 0]
        }
      })),
      barWidth: 14,
      label: {
        show: true,
        position: 'right',
        formatter: '{c}',
        color: '#606266',
        fontSize: 11
      }
    }]
  }

  barChart.setOption(option)
}

const initPieChart = () => {
  if (!pieChartRef.value) return
  
  if (pieChart) pieChart.dispose()
  pieChart = echarts.init(pieChartRef.value)

  const topJournals = journalList.value.slice(0, 8)
  const othersCount = journalList.value.slice(8).reduce((sum, j) => sum + j.paperCount, 0)
  
  const data = topJournals.map(j => ({
    value: j.paperCount,
    name: j.journal
  }))
  
  if (othersCount > 0) {
    data.push({ value: othersCount, name: '其他期刊' })
  }

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}篇 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '3%',
      top: 'center',
      textStyle: { color: '#606266', fontSize: 11 }
    },
    series: [{
      name: '期刊分布',
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 6,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: false
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 12,
          fontWeight: 'bold'
        }
      },
      labelLine: {
        show: false
      },
      data,
      color: [...colors, '#c0c4cc']
    }]
  }

  pieChart.setOption(option)
}

const initCharts = () => {
  initBarChart()
  initPieChart()
}

const handleResize = () => {
  barChart?.resize()
  pieChart?.resize()
}

const handleSizeChange = () => {
  currentPage.value = 1
}

const handleCurrentChange = () => {
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (barChart) barChart.dispose()
  if (pieChart) pieChart.dispose()
})
</script>

<style scoped lang="scss">
.journal-page {
  .page-container {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
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

    .header-controls {
      display: flex;
      align-items: center;
      gap: 12px;

      .control-label {
        font-size: 14px;
        color: #606266;
      }
    }
  }

  .stat-card {
    background: #fff;
    border-radius: 10px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
    margin-bottom: 20px;
    transition: transform 0.3s;

    &:hover {
      transform: translateY(-2px);
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }

    .stat-content {
      .stat-value {
        font-size: 24px;
        font-weight: 700;
        color: #303133;
        line-height: 1.2;
      }

      .stat-label {
        font-size: 13px;
        color: #909399;
        margin-top: 4px;
      }
    }

    &.stat-journal .stat-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    &.stat-paper .stat-icon {
      background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
    }

    &.stat-citation .stat-icon {
      background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
    }

    &.stat-hindex .stat-icon {
      background: linear-gradient(135deg, #e6a23c 0%, #ebb563 100%);
    }
  }

  .chart-card {
    background: #fff;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
    margin-bottom: 20px;

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 12px;
      border-bottom: 1px solid #ebeef5;

      .chart-title {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
        margin: 0;
      }

      .chart-tip {
        font-size: 13px;
        color: #909399;
      }
    }

    .chart-container {
      width: 100%;
      height: 400px;
    }

    .pie-chart-container {
      width: 100%;
      height: 400px;
    }
  }

  .rank-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #909399;
    color: #fff;
    font-size: 12px;
    font-weight: bold;

    &.rank-1 { background: #f56c6c; }
    &.rank-2 { background: #e6a23c; }
    &.rank-3 { background: #409eff; }
  }

  .journal-name {
    font-weight: 500;
    color: #303133;
  }

  .pagination-wrap {
    display: flex;
    justify-content: flex-end;
    margin-top: 20px;
  }

  .mt-20 {
    margin-top: 20px;
  }
}

@media screen and (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 15px;
  }

  .chart-container,
  .pie-chart-container {
    height: 300px !important;
  }
}
</style>
