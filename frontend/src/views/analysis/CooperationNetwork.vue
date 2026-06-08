<template>
  <div class="cooperation-page">
    <div class="page-container">
      <div class="page-header">
        <h2 class="page-title">作者合作网络分析</h2>
        <div class="header-controls">
          <span class="control-label">显示节点数：</span>
          <el-select v-model="maxNodes" size="default" style="width: 140px" @change="loadData">
            <el-option label="Top 20" :value="20" />
            <el-option label="Top 30" :value="30" />
            <el-option label="Top 50" :value="50" />
            <el-option label="Top 100" :value="100" />
          </el-select>
          <el-button type="primary" :icon="Refresh" @click="loadData">刷新</el-button>
        </div>
      </div>

      <el-row :gutter="20">
        <el-col :xs="24" :lg="8">
          <div class="stats-card">
            <div class="stat-item">
              <div class="stat-icon nodes">
                <el-icon><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ networkStats.totalNodes }}</div>
                <div class="stat-label">节点数量</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon links">
                <el-icon><Connection /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ networkStats.totalLinks }}</div>
                <div class="stat-label">合作关系</div>
              </div>
            </div>
            <div class="stat-item">
              <div class="stat-icon max">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ networkStats.maxCollaborations }}</div>
                <div class="stat-label">最高合作次数</div>
              </div>
            </div>
          </div>

          <div class="legend-card">
            <h4 class="card-title">图例说明</h4>
            <div class="legend-item">
              <span class="legend-dot" style="background: #409eff"></span>
              <span>合作网络节点</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot" style="background: #909399"></span>
              <span>独立作者</span>
            </div>
            <el-divider />
            <p class="legend-tip">
              节点大小代表论文数量，连线粗细代表合作次数
            </p>
          </div>

          <div class="top-authors-card">
            <h4 class="card-title">高产作者TOP10</h4>
            <el-table :data="topAuthors" size="small" height="300">
              <el-table-column type="index" label="#" width="40" align="center" />
              <el-table-column prop="name" label="作者" min-width="100" show-overflow-tooltip />
              <el-table-column prop="value" label="论文数" width="60" align="center" />
            </el-table>
          </div>
        </el-col>

        <el-col :xs="24" :lg="16">
          <div class="chart-card">
            <div class="chart-header">
              <h3 class="chart-title">合作网络图谱</h3>
              <span class="chart-tip">可拖拽节点、滚轮缩放</span>
            </div>
            <div ref="networkChartRef" class="network-chart"></div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { getCooperationNetwork } from '@/api/analysis'
import * as echarts from 'echarts'

const networkChartRef = ref(null)
const maxNodes = ref(50)
const loading = ref(false)

const networkStats = ref({
  totalNodes: 0,
  totalLinks: 0,
  maxCollaborations: 0
})

const nodes = ref([])
const links = ref([])
const categories = ref([])
const topAuthors = ref([])

let chart = null

const loadData = async () => {
  loading.value = true
  try {
    const res = await getCooperationNetwork({ maxNodes: maxNodes.value })
    const data = res.data
    
    nodes.value = data.nodes
    links.value = data.links
    categories.value = data.categories
    networkStats.value = data.stats
    
    topAuthors.value = [...data.nodes]
      .sort((a, b) => b.paperCount - a.paperCount)
      .slice(0, 10)
      .map(n => ({ name: n.name, value: n.paperCount }))

    await nextTick()
    initChart()
  } catch (e) {
    console.error('加载合作网络数据失败:', e)
  } finally {
    loading.value = false
  }
}

const initChart = () => {
  if (!networkChartRef.value) return
  
  if (chart) chart.dispose()
  chart = echarts.init(networkChartRef.value)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: function(params) {
        if (params.dataType === 'node') {
          return `
            <div style="padding: 8px;">
              <div style="font-weight: bold; margin-bottom: 6px;">${params.data.name}</div>
              <div>论文数量：${params.data.paperCount || 0} 篇</div>
              <div>总被引频次：${params.data.totalCitations || 0}</div>
              <div>篇均被引：${params.data.avgCitations || 0}</div>
            </div>
          `
        } else {
          return `
            <div style="padding: 8px;">
              <div>合作次数：${params.data.value || 0} 次</div>
            </div>
          `
        }
      }
    },
    legend: [{
      data: categories.value.map(c => c.name),
      bottom: 10
    }],
    animationDuration: 1500,
    animationEasingUpdate: 'quinticInOut',
    series: [{
      name: '合作网络',
      type: 'graph',
      layout: 'force',
      data: nodes.value,
      links: links.value,
      categories: categories.value,
      roam: true,
      draggable: true,
      label: {
        show: true,
        position: 'right',
        formatter: '{b}',
        fontSize: 11,
        color: '#606266'
      },
      lineStyle: {
        color: 'source',
        curveness: 0.1,
        width: 1.5,
        opacity: 0.6
      },
      emphasis: {
        focus: 'adjacency',
        lineStyle: {
          width: 3,
          opacity: 1
        },
        label: {
          fontSize: 13,
          fontWeight: 'bold'
        }
      },
      force: {
        repulsion: 300,
        gravity: 0.1,
        edgeLength: [80, 200],
        layoutAnimation: true
      },
      symbolSize: function(value, params) {
        return params.data.symbolSize || 30
      },
      itemStyle: {
        borderColor: '#fff',
        borderWidth: 2
      }
    }]
  }

  chart.setOption(option)
}

const handleResize = () => {
  chart?.resize()
}

onMounted(() => {
  loadData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (chart) {
    chart.dispose()
    chart = null
  }
})
</script>

<style scoped lang="scss">
.cooperation-page {
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

  .stats-card {
    background: #f5f7fa;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 15px;

    .stat-item {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 18px;

      &:last-child {
        margin-bottom: 0;
      }

      .stat-icon {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 20px;

        &.nodes { background: linear-gradient(135deg, #409eff, #66b1ff); }
        &.links { background: linear-gradient(135deg, #67c23a, #85ce61); }
        &.max { background: linear-gradient(135deg, #e6a23c, #ebb563); }
      }

      .stat-info {
        .stat-value {
          font-size: 22px;
          font-weight: 700;
          color: #303133;
          line-height: 1.2;
        }

        .stat-label {
          font-size: 13px;
          color: #909399;
          margin-top: 2px;
        }
      }
    }
  }

  .legend-card, .top-authors-card {
    background: #f5f7fa;
    border-radius: 8px;
    padding: 18px;
    margin-bottom: 15px;

    .card-title {
      font-size: 14px;
      font-weight: 600;
      color: #303133;
      margin: 0 0 12px 0;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 8px;
      font-size: 13px;
      color: #606266;

      .legend-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
    }

    .legend-tip {
      font-size: 12px;
      color: #909399;
      line-height: 1.5;
      margin: 0;
    }
  }

  .chart-card {
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    height: 100%;
    min-height: 500px;

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 15px 20px;
      border-bottom: 1px solid #ebeef5;

      .chart-title {
        font-size: 15px;
        font-weight: 600;
        color: #303133;
        margin: 0;
      }

      .chart-tip {
        font-size: 12px;
        color: #909399;
      }
    }

    .network-chart {
      width: 100%;
      height: 600px;
    }
  }
}

@media screen and (max-width: 1200px) {
  .cooperation-page .chart-card .network-chart {
    height: 450px;
  }
}

@media screen and (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 15px;
  }

  .chart-card .network-chart {
    height: 350px;
  }
}
</style>
