<template>
  <div class="citation-page">
    <div class="page-container">
      <div class="page-header">
        <h2 class="page-title">文献被引分析</h2>
      </div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #409eff, #66b1ff)">
            <el-icon><Document /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalPapers }}</div>
            <div class="stat-label">论文总数</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #67c23a, #85ce61)">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalCitations }}</div>
            <div class="stat-label">总被引频次</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #e6a23c, #ebb563)">
            <el-icon><DataLine /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.avgCitations }}</div>
            <div class="stat-label">篇均被引</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #f56c6c, #f78989)">
            <el-icon><Trophy /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.hIndex }}</div>
            <div class="stat-label">H指数</div>
          </div>
        </div>
      </div>

      <el-row :gutter="20" class="chart-row">
        <el-col :xs="24" :md="14">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">年度被引趋势</h3>
            </div>
            <div ref="yearTrendRef" class="chart-container"></div>
          </div>
        </el-col>
        <el-col :xs="24" :md="10">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">被引频次分布</h3>
            </div>
            <div ref="distributionRef" class="chart-container"></div>
          </div>
        </el-col>
      </el-row>

      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">高被引论文TOP20</h3>
          <span class="chart-subtitle">按被引频次降序排列</span>
        </div>
        <el-table :data="topCitedPapers" stripe border height="400">
          <el-table-column type="index" label="排名" width="70" align="center">
            <template #default="{ $index }">
              <span v-if="$index < 3" class="rank-badge" :class="'rank-' + ($index + 1)">
                {{ $index + 1 }}
              </span>
              <span v-else>{{ $index + 1 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="title" label="论文标题" min-width="250" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="paper-title">{{ row.title }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="authors" label="作者" min-width="150" show-overflow-tooltip>
            <template #default="{ row }">
              {{ row.authors?.join(', ') || '-' }}
            </template>
          </el-table-column>
          <el-table-column prop="journal" label="期刊" min-width="150" show-overflow-tooltip />
          <el-table-column prop="year" label="年份" width="80" align="center" />
          <el-table-column prop="citations" label="被引频次" width="100" align="center">
            <template #default="{ row }">
              <el-tag type="danger" size="small" effect="dark">{{ row.citations }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { getCitationAnalysis } from '@/api/analysis'
import * as echarts from 'echarts'

const yearTrendRef = ref(null)
const distributionRef = ref(null)
const loading = ref(false)

const stats = ref({
  totalPapers: 0,
  totalCitations: 0,
  avgCitations: 0,
  hIndex: 0
})

const yearTrend = ref([])
const distribution = ref([])
const topCitedPapers = ref([])

let yearChart = null
let distChart = null

const loadData = async () => {
  loading.value = true
  try {
    const res = await getCitationAnalysis({ limit: 50 })
    const data = res.data
    
    stats.value = {
      totalPapers: data.totalPapers,
      totalCitations: data.totalCitations,
      avgCitations: data.topCitedPapers.length > 0 
        ? (data.totalCitations / data.topCitedPapers.length).toFixed(2)
        : 0,
      hIndex: data.hIndex
    }
    
    yearTrend.value = data.yearTrend
    distribution.value = data.distribution
    topCitedPapers.value = data.topCitedPapers.slice(0, 20)

    await nextTick()
    initCharts()
  } catch (e) {
    console.error('加载被引分析数据失败:', e)
  } finally {
    loading.value = false
  }
}

const initYearTrendChart = () => {
  if (!yearTrendRef.value) return
  
  if (yearChart) yearChart.dispose()
  yearChart = echarts.init(yearTrendRef.value)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['论文数量', '总被引', '篇均被引'],
      top: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 50,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: yearTrend.value.map(d => d.year),
      axisLabel: { color: '#606266' }
    },
    yAxis: [
      {
        type: 'value',
        name: '数量',
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
        data: yearTrend.value.map(d => d.paperCount),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#409eff' },
            { offset: 1, color: '#79bbff' }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: 20
      },
      {
        name: '总被引',
        type: 'bar',
        data: yearTrend.value.map(d => d.totalCitations),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#67c23a' },
            { offset: 1, color: '#95d475' }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: 20
      },
      {
        name: '篇均被引',
        type: 'line',
        yAxisIndex: 1,
        data: yearTrend.value.map(d => d.avgCitations),
        smooth: true,
        itemStyle: { color: '#f56c6c' },
        lineStyle: { width: 3 },
        symbol: 'circle',
        symbolSize: 8
      }
    ]
  }

  yearChart.setOption(option)
}

const initDistributionChart = () => {
  if (!distributionRef.value) return
  
  if (distChart) distChart.dispose()
  distChart = echarts.init(distributionRef.value)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      textStyle: { fontSize: 11, color: '#606266' }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
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
      data: distribution.value.map(d => ({
        value: d.count,
        name: d.range + '次'
      })),
      color: [
        '#909399', '#67c23a', '#409eff', '#e6a23c',
        '#f56c6c', '#722ed1', '#13c2c2', '#fa8c16', '#eb2f96'
      ]
    }]
  }

  distChart.setOption(option)
}

const initCharts = () => {
  initYearTrendChart()
  initDistributionChart()
}

const handleResize = () => {
  yearChart?.resize()
  distChart?.resize()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (yearChart) yearChart.dispose()
  if (distChart) distChart.dispose()
})
</script>

<style scoped lang="scss">
.citation-page {
  .page-container {
    background: #fff;
    border-radius: 8px;
    padding: 20px;
  }

  .page-title {
    font-size: 20px;
    font-weight: 600;
    margin: 0;
  }

  .page-header {
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 1px solid #ebeef5;
  }

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
      font-size: 24px;
      flex-shrink: 0;
    }

    .stat-content {
      .stat-value {
        font-size: 28px;
        font-weight: 700;
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

      .chart-subtitle {
        font-size: 13px;
        color: #909399;
      }
    }

    .chart-container {
      width: 100%;
      height: 320px;
    }
  }

  .rank-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    font-size: 12px;
    font-weight: bold;
    color: #fff;

    &.rank-1 { background: #f56c6c; }
    &.rank-2 { background: #e6a23c; }
    &.rank-3 { background: #409eff; }
  }

  .paper-title {
    color: #409eff;
    font-weight: 500;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
}

@media screen and (max-width: 1200px) {
  .citation-page .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .citation-page .stats-row {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .stat-card {
    padding: 15px;
    
    .stat-icon {
      width: 44px;
      height: 44px;
      font-size: 18px;
    }

    .stat-value {
      font-size: 20px !important;
    }
  }
}
</style>
