/* eslint-disable camelcase */
import React from 'react'
import PropTypes from 'prop-types'
import { Form, Select, DatePicker } from 'antd'
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

// 安全的时间格式化
const safeFormatTime = (timestamp) => {
  try {
    if (!timestamp) return '无效时间'
    const numTimestamp = _.isNumber(timestamp) ? timestamp : _.toNumber(timestamp)
    if (_.isNaN(numTimestamp) || numTimestamp <= 0) return '无效时间'
    return new Date(numTimestamp * 1000).toLocaleString()
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
  range = 900,
  ip_addr = ''
}) => {
  // 切换触发查询
  const onOk = (selectedRange) => {
    if (!_.isFunction(dispatch)) {
      console.error('dispatch is not a function')
      return
    }

    const safeRange = safeParseRange(selectedRange)

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
        FirstOccurrence: FirstOccurrence || '',
        source: source || '',
        range: safeRange,
        itemid: itemid || '',
        ip_addr: ip_addr || ''
      }
    })
  }

  // 安全获取表单装饰器
  const getFieldDecorator = _.get(form, 'getFieldDecorator', () => (children) => children)

  const safeFirstOccurrence = FirstOccurrence ? _.toNumber(FirstOccurrence) : 0
  const formattedTime = safeFormatTime(safeFirstOccurrence)
  const safeRange = safeParseRange(range)

  // 安全的rangeMoment检查
  const isValidRangeMoment = _.isArray(rangeMoment) && rangeMoment.length === 2 &&
    _.every(rangeMoment, item => item && _.isFunction(item.format))

  return (
    <Form layout='horizontal'>
      <span style={{ float: 'left' }}>
        <FormItem label='' key='alarmTime' hasFeedback {...formItemLayout}>
          告警时间：{formattedTime}
        </FormItem>
      </span>
      <span style={{ float: 'left', marginLeft: 50 }}>
        <FormItem label='' key='range' hasFeedback {...formItemLayout}>
          {getFieldDecorator('range', {
            initialValue: safeRange
          })(
            <Select onChange={onOk}>
              <Option value={900}>15分钟</Option>
              <Option value={1800}>30分钟</Option>
              <Option value={3600}>1小时</Option>
              <Option value={7200}>2小时</Option>
            </Select>
          )}
        </FormItem>
      </span>
      <span style={{ float: 'left', marginLeft: 50 }}>
        <FormItem label='' key='rangeMoment' {...formItemLayout}>
          {getFieldDecorator('rangeMoment', {
            initialValue: isValidRangeMoment ? rangeMoment : null
          })(
            <RangePicker showTime format='YYYY-MM-DD HH:mm:ss' disabled />
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
  ip_addr: PropTypes.string,
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
  ip_addr: '',
  pagination: {}
}

export default Form.create()(SearchZone)
