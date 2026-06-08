<template>
  <div class="trends-page">
    <div class="page-container">
      <div class="page-header">
        <h2 class="page-title">研究热点趋势分析</h2>
        <div class="header-controls">
          <span class="control-label">关键词数量：</span>
          <el-select v-model="topN" size="default" style="width: 140px" @change="loadData">
            <el-option label="Top 5" :value="5" />
            <el-option label="Top 10" :value="10" />
            <el-option label="Top 15" :value="15" />
            <el-option label="Top 20" :value="20" />
          </el-select>
        </div>
      </div>

      <el-row :gutter="20">
        <el-col :xs="24" :md="16">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">关键词年度变化趋势</h3>
              <span class="chart-tip">展示高频关键词随年份的变化趋势</span>
            </div>
            <div ref="trendChartRef" class="chart-container"></div>
          </div>
        </el-col>

        <el-col :xs="24" :md="8">
          <div class="chart-card word-cloud-card">
            <div class="chart-header">
              <h3 class="chart-title">关键词词云</h3>
            </div>
            <div ref="cloudChartRef" class="cloud-chart"></div>
          </div>

          <div class="hot-keywords-card">
            <h4 class="card-title">热门关键词排名</h4>
            <div class="keyword-list">
              <div 
                v-for="(keyword, index) in hotKeywords" 
                :key="keyword.keyword"
                class="keyword-item"
              >
                <span class="keyword-rank" :class="'rank-' + (index + 1)">{{ index + 1 }}</span>
                <span class="keyword-name">{{ keyword.keyword }}</span>
                <div class="keyword-bar-wrap">
                  <div 
                    class="keyword-bar" 
                    :style="{ width: (keyword.count / maxCount * 100) + '%' }"
                  ></div>
                </div>
                <span class="keyword-count">{{ keyword.count }}</span>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>

      <div class="chart-card mt-20">
        <div class="chart-header">
          <h3 class="chart-title">研究领域分布</h3>
        </div>
        <div ref="pieChartRef" class="pie-chart-container"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { getKeywordTrends, getOverviewStats } from '@/api/analysis'
import * as echarts from 'echarts'

const trendChartRef = ref(null)
const cloudChartRef = ref(null)
const pieChartRef = ref(null)
const topN = ref(10)
const loading = ref(false)

const years = ref([])
const keywords = ref([])
const hotKeywords = ref([])

let trendChart = null
let cloudChart = null
let pieChart = null

const maxCount = computed(() => {
  if (hotKeywords.value.length === 0) return 1
  return Math.max(...hotKeywords.value.map(k => k.count))
})

const colors = [
  '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
  '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#409eff',
  '#67c23a', '#e6a23c', '#f56c6c', '#722ed1', '#13c2c2'
]

const loadData = async () => {
  loading.value = true
  try {
    const [trendRes, overviewRes] = await Promise.all([
      getKeywordTrends({ topN: topN.value }),
      getOverviewStats()
    ])

    const trendData = trendRes.data
    years.value = trendData.years
    keywords.value = trendData.keywords

    hotKeywords.value = overviewRes.data.topKeywords.slice(0, 15)

    await nextTick()
    initCharts()
  } catch (e) {
    console.error('加载热点趋势数据失败:', e)
  } finally {
    loading.value = false
  }
}

const initTrendChart = () => {
  if (!trendChartRef.value) return
  
  if (trendChart) trendChart.dispose()
  trendChart = echarts.init(trendChartRef.value)

  const series = keywords.value.map((kw, index) => ({
    name: kw.keyword,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 8,
    data: kw.data,
    lineStyle: {
      width: 2
    },
    itemStyle: {
      color: colors[index % colors.length]
    }
  }))

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985'
        }
      }
    },
    legend: {
      data: keywords.value.map(k => k.keyword),
      top: 10,
      type: 'scroll'
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
      boundaryGap: false,
      data: years.value,
      axisLabel: { color: '#606266' }
    },
    yAxis: {
      type: 'value',
      name: '论文数量',
      axisLabel: { color: '#606266' }
    },
    series
  }

  trendChart.setOption(option)
}

const initCloudChart = () => {
  if (!cloudChartRef.value) return
  
  if (cloudChart) cloudChart.dispose()
  cloudChart = echarts.init(cloudChartRef.value)

  const data = hotKeywords.value.slice(0, 15).map((k, i) => ({
    name: k.keyword,
    value: k.count,
    textStyle: {
      color: colors[i % colors.length]
    }
  }))

  const option = {
    tooltip: {
      show: true,
      formatter: '{b}: {c}篇'
    },
    series: [{
      type: 'wordCloud',
      shape: 'circle',
      left: 'center',
      top: 'center',
      width: '100%',
      height: '100%',
      sizeRange: [14, 36],
      rotationRange: [-30, 30],
      rotationStep: 15,
      gridSize: 8,
      drawOutOfBound: false,
      textStyle: {
        fontFamily: 'sans-serif',
        fontWeight: 'bold'
      },
      emphasis: {
        textStyle: {
          textShadowBlur: 10,
          textShadowColor: 'rgba(0, 0, 0, 0.3)'
        }
      },
      data
    }]
  }

  cloudChart.setOption(option)
}

const initPieChart = () => {
  if (!pieChartRef.value) return
  
  if (pieChart) pieChart.dispose()
  pieChart = echarts.init(pieChartRef.value)

  const data = hotKeywords.value.slice(0, 10).map(k => ({
    value: k.count,
    name: k.keyword
  }))

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}篇 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '5%',
      top: 'center',
      textStyle: { color: '#606266' }
    },
    series: [{
      name: '研究领域',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 8,
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
      data,
      color: colors
    }]
  }

  pieChart.setOption(option)
}

const initCharts = () => {
  initTrendChart()
  initCloudChart()
  initPieChart()
}

const handleResize = () => {
  trendChart?.resize()
  cloudChart?.resize()
  pieChart?.resize()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (trendChart) trendChart.dispose()
  if (cloudChart) cloudChart.dispose()
  if (pieChart) pieChart.dispose()
})
</script>

<style scoped lang="scss">
.trends-page {
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

    .cloud-chart {
      width: 100%;
      height: 280px;
    }

    .pie-chart-container {
      width: 100%;
      height: 350px;
    }
  }

  .word-cloud-card {
    margin-bottom: 20px;
  }

  .hot-keywords-card {
    background: #f5f7fa;
    border-radius: 10px;
    padding: 18px;

    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      margin: 0 0 15px 0;
    }

    .keyword-list {
      .keyword-item {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;

        &:last-child {
          margin-bottom: 0;
        }

        .keyword-rank {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #909399;
          color: #fff;
          font-size: 11px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;

          &.rank-1 { background: #f56c6c; }
          &.rank-2 { background: #e6a23c; }
          &.rank-3 { background: #409eff; }
        }

        .keyword-name {
          font-size: 13px;
          color: #606266;
          width: 80px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .keyword-bar-wrap {
          flex: 1;
          height: 8px;
          background: #e4e7ed;
          border-radius: 4px;
          overflow: hidden;

          .keyword-bar {
            height: 100%;
            background: linear-gradient(90deg, #409eff, #66b1ff);
            border-radius: 4px;
            transition: width 0.5s ease;
          }
        }

        .keyword-count {
          font-size: 12px;
          color: #909399;
          width: 30px;
          text-align: right;
          flex-shrink: 0;
        }
      }
    }
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

  .chart-container {
    height: 300px !important;
  }
}
</style>
