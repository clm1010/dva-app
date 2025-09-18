/* eslint-disable camelcase */
import React from 'react'
import PropTypes from 'prop-types'
import { Form, Select, DatePicker } from 'antd'
import moment from 'moment'
import _ from 'lodash'

const { Item: FormItem } = Form
const { Option } = Select
const { RangePicker } = DatePicker

const formItemLayout = {
  wrapperCol: {
    span: 24
  },
  style: { marginBottom: 4 }
}

// 安全的时间格式化 - 精确到分钟
const safeFormatTime = (timestamp) => {
  try {
    if (!timestamp) return '无效时间'
    const numTimestamp = _.isNumber(timestamp) ? timestamp : _.toNumber(timestamp)
    if (_.isNaN(numTimestamp) || numTimestamp <= 0) return '无效时间'

    // 使用moment格式化，确保精确到分钟的一致格式
    return moment(numTimestamp * 1000).format('YYYY-MM-DD HH:mm:ss')
  } catch (error) {
    console.warn('时间格式化错误:', error)
    return '时间解析失败'
  }
}

// 安全的range值处理
const safeParseRange = (range) => {
  if (_.isNumber(range)) return range
  if (_.isString(range)) {
    const parsed = _.toNumber(range)
    return _.isNaN(parsed) ? 900 : parsed
  }
  return 900
}

// 搜索区域
const SearchZone = ({
  itemid = '',
  form = {},
  dispatch = () => {},
  FirstOccurrence = '',
  rangeMoment = [],
  source = '',
  range = 900
}) => {
  // 计算查询时间参数的辅助函数 - 精确到分钟
  const calculateQueryTime = (selectedRange, selectedDates = null) => {
    const safeRange = safeParseRange(selectedRange)
    let centerTime = FirstOccurrence

    // 如果有选择的日期范围，使用日期范围的中心时间
    if (selectedDates && selectedDates[0] && selectedDates[1]) {
      // 精确到秒，不丢失分钟精度，使用moment统一处理
      const startTime = Math.round(moment(selectedDates[0]).unix())
      const endTime = Math.round(moment(selectedDates[1]).unix())
      centerTime = Math.round((startTime + endTime) / 2).toString()
    } else if (FirstOccurrence) {
      centerTime = FirstOccurrence
    } else {
      // 如果没有初始时间，使用当前时间，精确到秒
      centerTime = moment().unix().toString()
    }

    return { centerTime, range: safeRange }
  }

  // 执行查询的通用函数 - 用于Select时间范围选择
  const executeQuery = (centerTime, queryRange) => {
    if (!_.isFunction(dispatch)) {
      console.error('dispatch is not a function')
      return
    }

    dispatch({
      type: 'performHost/updateChartPagination',
      payload: {
        current: 1,
        pageSize: 100
      }
    })

    dispatch({
      type: 'performHost/query',
      payload: {
        FirstOccurrence: centerTime,
        source: source || '',
        range: queryRange,
        itemid: itemid || '',
        // 清除之前的rangeMoment，强制重新计算基于告警时间的范围
        useDirectTimeRange: false,
        clearPreviousRange: true
      }
    })
  }

  // Select选择时间范围触发查询
  const onSelectChange = (selectedRange) => {
    try {
      // 如果已经有RangePicker选择的时间范围，基于RangePicker的中心时间和新的Select范围重新计算
      if (_.isArray(rangeMoment) && rangeMoment.length === 2 && rangeMoment[0] && rangeMoment[1]) {
        // 直接计算RangePicker选择的中心时间
        const rangeStartTime = moment(rangeMoment[0]).unix()
        const rangeEndTime = moment(rangeMoment[1]).unix()
        const centerTimeNum = Math.round((rangeStartTime + rangeEndTime) / 2)

        // 基于Select的新范围值重新计算前后时间
        const queryRange = safeParseRange(selectedRange)
        const newStartTime = centerTimeNum - queryRange
        const newEndTime = centerTimeNum + queryRange

        // 生成新的rangeMoment用于显示和查询
        const newRangeMoment = [moment(newStartTime * 1000), moment(newEndTime * 1000)]
        dispatch({
          type: 'performHost/updateChartPagination',
          payload: {
            current: 1,
            pageSize: 100
          }
        })

        dispatch({
          type: 'performHost/query',
          payload: {
            FirstOccurrence, // 保持原始告警时间
            source: source || '',
            itemid: itemid || '',
            startTime: newStartTime, // 使用重新计算的开始时间
            endTime: newEndTime, // 使用重新计算的结束时间
            range: queryRange, // 更新range值
            useDirectTimeRange: true, // 标记使用直接时间范围
            selectedRangeMoment: newRangeMoment, // 传递新的时间范围
            updateRangeMoment: true // 标记需要更新RangePicker的显示
          }
        })
      } else {
        // 没有RangePicker选择时，使用基于告警时间的计算
        const { centerTime, range: queryRange } = calculateQueryTime(selectedRange)
        executeQuery(centerTime, queryRange)
      }
    } catch (error) {
      console.error('Select时间范围处理错误:', error)
    }
  }

  // RangePicker确认选择时触发查询 - 基于实际选择的时间范围，保持告警时间固定
  const onRangeOk = (dates) => {
    if (!dates || !dates[0] || !dates[1]) {
      console.warn('无效的时间范围选择')
      return
    }

    try {
      if (!_.isFunction(dispatch)) {
        console.error('dispatch is not a function')
        return
      }

      // 精确使用用户选择的时间范围，不进行舍入
      const startTime = moment(dates[0]).unix()
      const endTime = moment(dates[1]).unix()

      dispatch({
        type: 'performHost/updateChartPagination',
        payload: {
          current: 1,
          pageSize: 100
        }
      })

      // 直接传递用户选择的时间范围，保持原始告警时间不变
      dispatch({
        type: 'performHost/query',
        payload: {
          FirstOccurrence, // 保持原始告警时间
          source: source || '',
          itemid: itemid || '',
          startTime, // 直接使用用户选择的开始时间
          endTime, // 直接使用用户选择的结束时间
          useDirectTimeRange: true, // 标记使用直接时间范围
          selectedRangeMoment: [moment(dates[0]), moment(dates[1])] // 传递原始选择的moment对象
        }
      })
    } catch (error) {
      console.error('RangePicker时间范围处理错误:', error)
    }
  }

  // 安全获取表单装饰器
  const getFieldDecorator = _.get(form, 'getFieldDecorator', () => (children) => children)

  const safeFirstOccurrence = FirstOccurrence ? _.toNumber(FirstOccurrence) : 0
  const formattedTime = safeFormatTime(safeFirstOccurrence)
  const safeRange = safeParseRange(range)

  // 安全的rangeMoment检查
  const isValidRangeMoment = _.isArray(rangeMoment) && rangeMoment.length === 2 &&
    _.every(rangeMoment, item => item && _.isFunction(item.format))

  // 确保select有正确的初始值和受控状态
  const currentRangeValue = safeRange || 900

  // 生成RangePicker的唯一key，确保状态变化时重新渲染
  const rangePickerKey = isValidRangeMoment
    ? `rangePicker-${rangeMoment[0].valueOf()}-${rangeMoment[1].valueOf()}`
    : 'rangePicker-empty'

  return (
    <Form layout='horizontal' key={`form-${rangePickerKey}`}>
      <span style={{ float: 'left' }}>
        <FormItem label='' key='alarmTime' hasFeedback {...formItemLayout}>
          告警时间：{formattedTime}
        </FormItem>
      </span>
      <span style={{ float: 'left', marginLeft: 50 }}>
        <FormItem label='' key='range' hasFeedback {...formItemLayout}>
          {getFieldDecorator('range', {
            initialValue: currentRangeValue
          })(
            <Select
              value={currentRangeValue}
              onChange={onSelectChange}
              style={{ width: 120 }}
              placeholder="选择时间范围"
            >
              <Option value={900}>15分钟</Option>
              <Option value={1800}>30分钟</Option>
              <Option value={3600}>1小时</Option>
              <Option value={7200}>2小时</Option>
            </Select>
          )}
        </FormItem>
      </span>
      <span style={{ float: 'left', marginLeft: 50 }}>
        <FormItem label='' key={rangePickerKey} {...formItemLayout}>
          {getFieldDecorator(`rangeMoment-${rangePickerKey}`, {
            initialValue: isValidRangeMoment ? rangeMoment : null
          })(
            <RangePicker
              showTime
              format='YYYY-MM-DD HH:mm:ss'
              onOk={onRangeOk}
              value={isValidRangeMoment ? rangeMoment : null}
            />
          )}
        </FormItem>
      </span>
    </Form>
  )
}

SearchZone.propTypes = {
  itemid: PropTypes.string,
  form: PropTypes.object,
  dispatch: PropTypes.func,
  FirstOccurrence: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  rangeMoment: PropTypes.array,
  source: PropTypes.string,
  range: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  pagination: PropTypes.object
}

SearchZone.defaultProps = {
  itemid: '',
  form: {},
  dispatch: () => {},
  FirstOccurrence: '',
  rangeMoment: [],
  source: '',
  range: 900,
  pagination: {}
}

export default Form.create()(SearchZone)
