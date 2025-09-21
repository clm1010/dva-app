import React from 'react'
import ReactEcharts from 'echarts-for-react'
import moment from 'moment'
import PropTypes from 'prop-types'

moment.locale('zh-cn')

class PerChart extends React.Component {
  // constructor(props) {
  //   super(props)
  //   this.animationTimer = null
  //   this.state = {
  //     shouldAnimate: true,
  //     animationDuration: 10000
  //   }
  // }

  animationTimer = null
  animationFrame = null
  echartsInstance = null

  state = {
    shouldAnimate: true,
    animationDuration: 3000
  }

  componentDidMount() {
    this.animationFrame = setTimeout(() => {
      if (this.echartsInstance) {
        this.echartsInstance.resize()
      }
    }, 0)
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.xAxisData !== this.props.xAxisData ||
      prevProps.seriesData !== this.props.seriesData
    ) {
      if (this.echartsInstance) {
        // 重新绘制
        this.echartsInstance.setOption({
          xAxis: { data: this.props.xAxisData || [] },
          series: [{ data: this.props.seriesData || [] }]
        })
      }
    }
  }

  componentWillUnmount() {
    // 清除所有定时器
    if (this.animationTimer) {
      clearTimeout(this.animationTimer)
    }
    if (this.animationFrame) {
      clearTimeout(this.animationFrame)
    }
    // 清理 echarts 实例
    if (this.echartsInstance) {
      this.echartsInstance.dispose()
      this.echartsInstance = null
    }
  }

  getOption() {
    const {
      xAxisData = [],
      yAxisData = { name: '' },
      chartObj = { source: '', hostname: '' },
      seriesData = []
    } = this.props

    const { shouldAnimate, animationDuration } = this.state
    const hasData = seriesData.length > 0 && xAxisData.length > 0

    // 修复拼写错误：baseCOnfig -> baseConfig
    const baseConfig = {
      title: {
        text: '性能曲线',
        subtext: chartObj.source || '',
        textStyle: {
          color: '#333333', // '#D3D7DD'//主标题颜色
          fontSize: 16,
          fontWeight: 'bold'
        },
        left: 'center',
        top: 0
      },
      // calculable : false,
      toolbox: {
        show: true,
        x: 'right',
        y: 'top',
        padding: [0, 40, 0, 0],
        feature: {
          saveAsImage: {
            show: true
          },
          restore: { show: true, title: '重新加载数据' }
        }
      },
      grid: {
        left: '6%',
        top: '10%',
        right: '6%',
        bottom: '12%',
        containLable: true
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          if (!params || !params[0]) return ''
          const { name: date, value } = params[0]
          return `${chartObj.hostname || ''}<br/>${date || ''}<br/>${value || ''}`
        }
      },
      dataZoom: [
        {
          xAxisIndex: 0,
          filterMode: 'empty'
        },
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'empty'
        },
        {
          yAxisIndex: 0,
          filterMode: 'empty'
        },
        {
          type: 'inside',
          yAxisIndex: 0,
          filterMode: 'empty'
        }
      ],
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLabel: {
          color: '#333',
          interval: 0,
          rotate: xAxisData.length > 10 ? 45 : 0
        }
      },
      yAxis: {
        type: 'value',
        name: yAxisData.name || '',
        splitLine: {
          show: true,
          lineStyle: { type: 'dashed', color: '#CCC' }
        }
      },
      series: [
        {
          name: chartObj.source || '',
          smooth: true,
          type: 'line',
          data: seriesData,
          symbol: hasData ? 'circle' : 'none',
          symbolSize: 6,
          lineStyle: {
            width: 2
          },
          label: {
            normal: {
              show: true,
              // position: "inside",
              name: chartObj.hostname || ''
            }
          },
          animation: shouldAnimate,
          animationDuration,
          animationEasing: 'cubicOut'
        }
      ]
    }

    return {
      ...baseConfig,
      graphic: hasData
        ? null
        : {
          type: 'text',
          left: 'center',
          top: 'middle',
          style: { text: '暂无数据', fontSize: 16 }
        }
    }
  }

  handleRestore = () => {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer)
    }
    this.animationTimer = setTimeout(() => {
      this.setState({
        animationDuration: 3000,
        shouldAnimate: true
      })
    }, 1000)
  }

  render() {
    return (
      <ReactEcharts
        ref={(e) => {
          this.echartsInstance = e && e.getEchartsInstance()
        }}
        showLoading={this.props.loading}
        option={this.getOption()}
        style={{
          height: '85vh',
          width: '100%'
        }}
        onEvents={{
          restore: this.handleRestore,
          resize: () => {
            this.echartsInstance && this.echartsInstance.resize()
          }
        }}
      />
    )
  }
}

PerChart.propTypes = {
  xAxisData: PropTypes.array,
  yAxisData: PropTypes.object,
  chartObj: PropTypes.object,
  seriesData: PropTypes.array,
  loading: PropTypes.bool
}

PerChart.defaultProps = {
  xAxisData: [],
  yAxisData: { name: '' },
  chartObj: { source: '', hostname: '' },
  seriesData: [],
  loading: false
}

export default PerChart
