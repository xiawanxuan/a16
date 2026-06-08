<template>
  <div class="dashboard">
    <div class="stats-row">
      <div class="stat-card" v-for="stat in stats" :key="stat.key">
        <div class="stat-icon" :style="{ background: stat.color }">
          <el-icon :size="28"><component :is="stat.icon" /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :md="16">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">年度论文发表趋势</h3>
          </div>
          <div ref="yearChartRef" class="chart-container"></div>
        </div>
      </el-col>
      <el-col :xs="24" :md="8">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">热门关键词</h3>
          </div>
          <div ref="keywordChartRef" class="chart-container keyword-chart"></div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :lg="12">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">高产作者TOP10</h3>
          </div>
          <el-table :data="topAuthors" size="small" height="350">
            <el-table-column type="index" label="排名" width="60" align="center">
              <template #default="{ $index }">
                <span v-if="$index < 3" class="rank-badge" :class="'rank-' + ($index + 1)">
                  {{ $index + 1 }}
                </span>
                <span v-else>{{ $index + 1 }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="author" label="作者" min-width="120" />
            <el-table-column prop="paperCount" label="论文数" width="80" align="center" />
            <el-table-column prop="totalCitations" label="总被引" width="90" align="center" />
          </el-table>
        </div>
      </el-col>
      <el-col :xs="24" :lg="12">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">来源期刊TOP10</h3>
          </div>
          <el-table :data="topJournals" size="small" height="350">
            <el-table-column type="index" label="排名" width="60" align="center" />
            <el-table-column prop="journal" label="期刊" min-width="150" show-overflow-tooltip />
            <el-table-column prop="paperCount" label="论文数" width="80" align="center" />
            <el-table-column prop="avgCitations" label="篇均被引" width="90" align="center" />
          </el-table>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :xs="24" :md="12">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">被引频次分布</h3>
          </div>
          <div ref="citationChartRef" class="chart-container"></div>
        </div>
      </el-col>
      <el-col :xs="24" :md="12">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">快速操作</h3>
          </div>
          <div class="quick-actions">
            <div class="action-item" @click="goToUpload">
              <el-icon class="action-icon upload"><Upload /></el-icon>
              <div class="action-info">
                <div class="action-title">导入文献</div>
                <div class="action-desc">支持BibTeX/CSV格式</div>
              </div>
            </div>
            <div class="action-item" @click="goToCooperation">
              <el-icon class="action-icon network"><Connection /></el-icon>
              <div class="action-info">
                <div class="action-title">合作网络</div>
                <div class="action-desc">查看作者合作图谱</div>
              </div>
            </div>
            <div class="action-item" @click="goToCitation">
              <el-icon class="action-icon citation"><TrendCharts /></el-icon>
              <div class="action-info">
                <div class="action-title">被引分析</div>
                <div class="action-desc">分析文献影响力</div>
              </div>
            </div>
            <div class="action-item" @click="goToTrends">
              <el-icon class="action-icon trend"><Histogram /></el-icon>
              <div class="action-info">
                <div class="action-title">热点趋势</div>
                <div class="action-desc">发现研究前沿</div>
              </div>
            </div>
            <div class="action-item" @click="handleExportReport">
              <el-icon class="action-icon report"><DocumentCopy /></el-icon>
              <div class="action-info">
                <div class="action-title">导出报告</div>
                <div class="action-desc">生成分析报告</div>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getPaperStats } from '@/api/papers'
import { getCitationAnalysis, exportReport } from '@/api/analysis'
import * as echarts from 'echarts'

const router = useRouter()
const exporting = ref(false)

const yearChartRef = ref(null)
const keywordChartRef = ref(null)
const citationChartRef = ref(null)

const stats = ref([
  { key: 'papers', label: '论文总数', value: 0, icon: 'Document', color: '#409eff' },
  { key: 'authors', label: '涉及作者', value: 0, icon: 'User', color: '#67c23a' },
  { key: 'citations', label: '总被引频次', value: 0, icon: 'TrendCharts', color: '#e6a23c' },
  { key: 'avgCitations', label: '篇均被引', value: 0, icon: 'DataLine', color: '#f56c6c' }
])

const yearDistribution = ref([])
const topKeywords = ref([])
const topAuthors = ref([])
const topJournals = ref([])
const citationDistribution = ref([])

let yearChart = null
let keywordChart = null
let citationChart = null

const loadData = async () => {
  try {
    const [statsRes, citationRes] = await Promise.all([
      getPaperStats(),
      getCitationAnalysis({ limit: 50 })
    ])

    const data = statsRes.data
    stats.value[0].value = data.totalPapers
    stats.value[2].value = data.totalCitations
    stats.value[3].value = data.avgCitations

    yearDistribution.value = data.yearDistribution
    topKeywords.value = data.topKeywords
    topAuthors.value = data.topAuthors
    topJournals.value = data.topJournals
    citationDistribution.value = citationRes.data.distribution

    const authorSet = new Set()
    data.topAuthors.forEach(a => authorSet.add(a.author))
    stats.value[1].value = data.topAuthors.length > 0 ? data.topAuthors.length * 3 : 0

    await nextTick()
    initCharts()
  } catch (e) {
    console.error('加载数据失败:', e)
  }
}

const initYearChart = () => {
  if (!yearChartRef.value) return
  
  if (yearChart) yearChart.dispose()
  yearChart = echarts.init(yearChartRef.value)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: ['论文数量', '篇均被引'],
      right: 20
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 40,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: yearDistribution.value.map(d => d.year),
      axisLabel: { color: '#606266' }
    },
    yAxis: [
      {
        type: 'value',
        name: '论文数',
        axisLabel: { color: '#606266' }
      },
      {
        type: 'value',
        name: '篇均被引',
        axisLabel: { color: '#606266' }
      }
    ],
    series: [
      {
        name: '论文数量',
        type: 'bar',
        data: yearDistribution.value.map(d => d.count),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#409eff' },
            { offset: 1, color: '#66b1ff' }
          ]),
          borderRadius: [4, 4, 0, 0]
        }
      },
      {
        name: '篇均被引',
        type: 'line',
        yAxisIndex: 1,
        data: yearDistribution.value.map(d => d.avgCitations),
        smooth: true,
        itemStyle: { color: '#67c23a' },
        lineStyle: { width: 3 }
      }
    ]
  }

  yearChart.setOption(option)
}

const initKeywordChart = () => {
  if (!keywordChartRef.value) return
  
  if (keywordChart) keywordChart.dispose()
  keywordChart = echarts.init(keywordChartRef.value)

  const data = topKeywords.value.slice(0, 15).map(k => ({
    name: k.keyword,
    value: k.count
  }))

  const option = {
    tooltip: {
      show: true
    },
    series: [{
      type: 'wordCloud',
      shape: 'circle',
      left: 'center',
      top: 'center',
      width: '90%',
      height: '90%',
      sizeRange: [12, 40],
      rotationRange: [-30, 30],
      rotationStep: 15,
      gridSize: 8,
      drawOutOfBound: false,
      textStyle: {
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        color: function() {
          const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#722ed1']
          return colors[Math.floor(Math.random() * colors.length)]
        }
      },
      data: data
    }]
  }

  keywordChart.setOption(option)
}

const initCitationChart = () => {
  if (!citationChartRef.value) return
  
  if (citationChart) citationChart.dispose()
  citationChart = echarts.init(citationChartRef.value)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: '#606266', fontSize: 12 }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
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
          fontSize: 14,
          fontWeight: 'bold'
        }
      },
      labelLine: {
        show: false
      },
      data: citationDistribution.value.map(d => ({
        value: d.count,
        name: d.range + '次'
      })),
      color: ['#909399', '#67c23a', '#409eff', '#e6a23c', '#f56c6c', '#722ed1', '#13c2c2', '#fa8c16', '#eb2f96']
    }]
  }

  citationChart.setOption(option)
}

const initCharts = () => {
  initYearChart()
  initKeywordChart()
  initCitationChart()
}

const goToUpload = () => router.push('/upload')
const goToCooperation = () => router.push('/cooperation')
const goToCitation = () => router.push('/citation')
const goToTrends = () => router.push('/trends')

const handleExportReport = () => {
  ElMessageBox.confirm('请选择报告导出格式', '导出分析报告', {
    confirmButtonText: '导出HTML',
    cancelButtonText: '导出PDF',
    distinguishCancelAndClose: true,
    type: 'info',
    customClass: 'export-report-dialog'
  }).then(() => {
    doExportReport('html')
  }).catch((action) => {
    if (action === 'cancel') {
      doExportReport('pdf')
    }
  })
}

const doExportReport = async (format) => {
  if (exporting.value) return
  exporting.value = true
  
  try {
    const blob = await exportReport({ format: 'html' })
    
    if (format === 'html') {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `文献计量分析报告-${Date.now()}.html`
      link.click()
      window.URL.revokeObjectURL(url)
      ElMessage.success('HTML报告导出成功')
    } else {
      const url = window.URL.createObjectURL(blob)
      const newWindow = window.open(url, '_blank')
      if (newWindow) {
        newWindow.onload = () => {
          setTimeout(() => {
            newWindow.print()
          }, 800)
        }
        ElMessage.success('PDF报告预览已打开，请使用浏览器打印功能保存为PDF')
      } else {
        ElMessage.warning('请允许弹出窗口以导出PDF报告')
      }
    }
  } catch (e) {
    console.error('导出报告失败:', e)
    ElMessage.error('导出报告失败，请稍后重试')
  } finally {
    exporting.value = false
  }
}

const handleResize = () => {
  yearChart?.resize()
  keywordChart?.resize()
  citationChart?.resize()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})
</script>

<style scoped lang="scss">
.dashboard {
  .stats-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
    margin-bottom: 20px;
  }

  .stat-card {
    background: #fff;
    border-radius: 10px;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
    transition: all 0.3s ease;

    &:hover {
      box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.1);
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
      flex-shrink: 0;
    }

    .stat-content {
      .stat-value {
        font-size: 28px;
        font-weight: 600;
        color: #303133;
        line-height: 1.2;
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 14px;
        color: #909399;
      }
    }
  }

  .chart-row {
    margin-bottom: 20px;
  }

  .chart-card {
    background: #fff;
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
    height: 100%;

    .chart-header {
      margin-bottom: 15px;
      padding-bottom: 12px;
      border-bottom: 1px solid #ebeef5;

      .chart-title {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
        margin: 0;
      }
    }

    .chart-container {
      width: 100%;
      height: 320px;
    }

    .keyword-chart {
      height: 320px;
    }
  }

  .rank-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    font-size: 12px;
    font-weight: bold;
    color: #fff;

    &.rank-1 { background: #f56c6c; }
    &.rank-2 { background: #e6a23c; }
    &.rank-3 { background: #409eff; }
  }

  .quick-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    padding: 10px 0;
  }

  .action-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-radius: 8px;
    background: #f5f7fa;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      background: #ecf5ff;
      transform: translateX(4px);
    }

    .action-icon {
      font-size: 28px;
      padding: 10px;
      border-radius: 10px;
      color: #fff;

      &.upload { background: linear-gradient(135deg, #409eff, #66b1ff); }
      &.network { background: linear-gradient(135deg, #67c23a, #85ce61); }
      &.citation { background: linear-gradient(135deg, #e6a23c, #ebb563); }
      &.trend { background: linear-gradient(135deg, #f56c6c, #f78989); }
      &.report { background: linear-gradient(135deg, #722ed1, #9254de); }
    }

    .action-info {
      .action-title {
        font-size: 14px;
        font-weight: 600;
        color: #303133;
        margin-bottom: 4px;
      }

      .action-desc {
        font-size: 12px;
        color: #909399;
      }
    }
  }
}

@media screen and (max-width: 1200px) {
  .dashboard .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .dashboard .stats-row {
    grid-template-columns: 1fr;
  }

  .dashboard .quick-actions {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 15px;
  }

  .chart-card {
    padding: 15px;
  }
}
</style>
