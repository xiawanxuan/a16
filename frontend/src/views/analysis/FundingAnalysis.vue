<template>
  <div class="funding-page">
    <div class="page-container">
      <div class="page-header">
        <h2 class="page-title">基金项目统计</h2>
        <div class="header-controls">
          <span class="control-label">显示数量：</span>
          <el-select v-model="limit" size="default" style="width: 140px" @change="loadData">
            <el-option label="Top 10" :value="10" />
            <el-option label="Top 20" :value="20" />
            <el-option label="Top 30" :value="30" />
            <el-option label="Top 50" :value="50" />
          </el-select>
          <el-button type="primary" :icon="Refresh" @click="loadData">刷新</el-button>
        </div>
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
            <el-icon><Money /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalWithFunding }}</div>
            <div class="stat-label">有基金论文</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #e6a23c, #ebb563)">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.fundingRate }}%</div>
            <div class="stat-label">基金覆盖率</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #f56c6c, #f78989)">
            <el-icon><Collection /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalFundingProjects }}</div>
            <div class="stat-label">基金项目数</div>
          </div>
        </div>
      </div>

      <el-row :gutter="20" class="chart-row">
        <el-col :xs="24" :md="14">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">基金项目分布</h3>
            </div>
            <div ref="fundingBarRef" class="chart-container"></div>
          </div>
        </el-col>
        <el-col :xs="24" :md="10">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">基金占比</h3>
            </div>
            <div ref="fundingPieRef" class="chart-container"></div>
          </div>
        </el-col>
      </el-row>

      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">基金项目年度趋势</h3>
          <span class="chart-subtitle">TOP {{ trendTopN }} 基金项目</span>
        </div>
        <div ref="fundingTrendRef" class="chart-container trend-chart"></div>
      </div>

      <div class="chart-card">
        <div class="chart-header">
          <h3 class="chart-title">基金项目排行榜</h3>
          <span class="chart-subtitle">按资助论文数降序排列</span>
        </div>
        <el-table :data="fundingList" stripe border height="400">
          <el-table-column type="index" label="排名" width="70" align="center">
            <template #default="{ $index }">
              <span v-if="$index < 3" class="rank-badge" :class="'rank-' + ($index + 1)">
                {{ $index + 1 }}
              </span>
              <span v-else>{{ $index + 1 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="funding" label="基金项目名称" min-width="250" show-overflow-tooltip>
            <template #default="{ row }">
              <span class="funding-name">{{ row.funding }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="paperCount" label="论文数" width="100" align="center" />
          <el-table-column prop="totalCitations" label="总被引" width="100" align="center" />
          <el-table-column prop="avgCitations" label="篇均被引" width="100" align="center" />
        </el-table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { getFundingAnalysis } from '@/api/analysis'
import * as echarts from 'echarts'
import { Refresh, Document, Money, TrendCharts, Collection } from '@element-plus/icons-vue'

const fundingBarRef = ref(null)
const fundingPieRef = ref(null)
const fundingTrendRef = ref(null)
const loading = ref(false)
const limit = ref(20)
const trendTopN = ref(8)

const stats = ref({
  totalPapers: 0,
  totalWithFunding: 0,
  fundingRate: 0,
  totalFundingProjects: 0,
  avgFundingPerPaper: 0
})

const fundingList = ref([])
const fundingTrends = ref({ years: [], fundings: [] })

let barChart = null
let pieChart = null
let trendChart = null

const colors = [
  '#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399',
  '#722ed1', '#13c2c2', '#fa8c16', '#eb2f96', '#52c41a'
]

const loadData = async () => {
  loading.value = true
  try {
    const res = await getFundingAnalysis({ limit: limit.value, trendTopN: trendTopN.value })
    const data = res.data
    
    stats.value = data.stats
    fundingList.value = data.fundings
    fundingTrends.value = data.trends

    await nextTick()
    initCharts()
  } catch (e) {
    console.error('加载基金统计数据失败:', e)
  } finally {
    loading.value = false
  }
}

const initBarChart = () => {
  if (!fundingBarRef.value) return
  
  if (barChart) barChart.dispose()
  barChart = echarts.init(fundingBarRef.value)

  const top10 = fundingList.value.slice(0, 10)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 30,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLabel: { color: '#606266' }
    },
    yAxis: {
      type: 'category',
      data: top10.map(f => f.funding),
      axisLabel: {
        color: '#606266',
        interval: 0,
        fontSize: 11,
        formatter: function(value) {
          if (value.length > 15) {
            return value.substring(0, 15) + '...'
          }
          return value
        }
      }
    },
    series: [{
      type: 'bar',
      data: top10.map((f, i) => ({
        value: f.paperCount,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: colors[i % colors.length] },
            { offset: 1, color: colors[i % colors.length] + '99' }
          ]),
          borderRadius: [0, 4, 4, 0]
        }
      })),
      barWidth: 16,
      label: {
        show: true,
        position: 'right',
        fontSize: 11,
        color: '#606266'
      }
    }]
  }

  barChart.setOption(option)
}

const initPieChart = () => {
  if (!fundingPieRef.value) return
  
  if (pieChart) pieChart.dispose()
  pieChart = echarts.init(fundingPieRef.value)

  const top8 = fundingList.value.slice(0, 8)
  const otherCount = fundingList.value.slice(8).reduce((sum, f) => sum + f.paperCount, 0)

  const pieData = top8.map(f => ({
    value: f.paperCount,
    name: f.funding
  }))
  if (otherCount > 0) {
    pieData.push({ value: otherCount, name: '其他' })
  }

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}篇 ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      textStyle: { fontSize: 11, color: '#606266' },
      type: 'scroll'
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
      data: pieData,
      color: [...colors, '#c0c4cc']
    }]
  }

  pieChart.setOption(option)
}

const initTrendChart = () => {
  if (!fundingTrendRef.value) return
  
  if (trendChart) trendChart.dispose()
  trendChart = echarts.init(fundingTrendRef.value)

  const { years, fundings } = fundingTrends.value

  const series = fundings.map((f, i) => ({
    name: f.funding,
    type: 'line',
    data: f.data,
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    lineStyle: {
      width: 2
    },
    itemStyle: {
      color: colors[i % colors.length]
    }
  }))

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' }
    },
    legend: {
      data: fundings.map(f => f.funding),
      top: 10,
      type: 'scroll',
      textStyle: { fontSize: 11, color: '#606266' }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: 60,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: years,
      axisLabel: { color: '#606266' }
    },
    yAxis: {
      type: 'value',
      name: '论文数',
      axisLabel: { color: '#606266' }
    },
    series
  }

  trendChart.setOption(option)
}

const initCharts = () => {
  initBarChart()
  initPieChart()
  initTrendChart()
}

const handleResize = () => {
  barChart?.resize()
  pieChart?.resize()
  trendChart?.resize()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (barChart) barChart.dispose()
  if (pieChart) pieChart.dispose()
  if (trendChart) trendChart.dispose()
})
</script>

<style scoped lang="scss">
.funding-page {
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

    .trend-chart {
      height: 380px;
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

  .funding-name {
    color: #409eff;
    font-weight: 500;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }
}

@media screen and (max-width: 1200px) {
  .funding-page .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media screen and (max-width: 768px) {
  .funding-page .stats-row {
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

  .page-header {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 15px;
  }
}
</style>
