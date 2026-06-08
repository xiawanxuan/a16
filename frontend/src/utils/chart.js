import * as echarts from 'echarts'
import { nextTick, onUnmounted } from 'vue'

export function useChart(chartRef, optionFactory) {
  let chartInstance = null
  let resizeObserver = null
  let optionData = null

  const initChart = async (data = null) => {
    if (!chartRef.value) return

    if (chartInstance) {
      chartInstance.dispose()
      chartInstance = null
    }

    await nextTick()

    if (!chartRef.value) return

    chartInstance = echarts.init(chartRef.value, null, {
      renderer: 'canvas',
      useDirtyRect: false
    })

    if (data) {
      optionData = data
    }

    if (optionFactory && optionData) {
      const option = optionFactory(optionData)
      chartInstance.setOption(option, true)
    }

    setupResizeObserver()

    return chartInstance
  }

  const setOption = (option, opts = {}) => {
    if (!chartInstance) return
    chartInstance.setOption(option, opts.notMerge || false, opts.lazyUpdate || false)
  }

  const resize = () => {
    if (!chartInstance) return
    chartInstance.resize({
      animation: {
        duration: 300
      }
    })
  }

  const setupResizeObserver = () => {
    if (!chartRef.value || typeof ResizeObserver === 'undefined') {
      return
    }

    if (resizeObserver) {
      resizeObserver.disconnect()
    }

    resizeObserver = new ResizeObserver(() => {
      resize()
    })

    resizeObserver.observe(chartRef.value)
  }

  const destroy = () => {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    if (chartInstance) {
      chartInstance.dispose()
      chartInstance = null
    }
  }

  const getInstance = () => chartInstance

  onUnmounted(() => {
    destroy()
  })

  return {
    initChart,
    setOption,
    resize,
    destroy,
    getInstance
  }
}

export function safeInitChart(container, option) {
  if (!container) return null

  const chart = echarts.init(container, null, {
    renderer: 'canvas'
  })

  if (option) {
    chart.setOption(option)
  }

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      chart.resize()
    })
    observer.observe(container)
    chart.__resizeObserver = observer
  }

  return chart
}

export function disposeChart(chart) {
  if (!chart) return
  if (chart.__resizeObserver) {
    chart.__resizeObserver.disconnect()
    chart.__resizeObserver = null
  }
  chart.dispose()
}

export default echarts
