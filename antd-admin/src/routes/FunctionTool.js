/**
 * 这是一个工具类，所有公共方法都要放到这里
 */
import moment from 'moment'
import { Select } from 'antd'
import React from 'react'

/*
 * 说明:把浏览器地址栏中的查询串q=后面的条件解析映射回Filter组件的查询项中
 * 1.把乱码还原成 name=='*胡达*';branchName=='*abc*';cabinet=='*123123*';discoveryIP=='*15.15.15.5*';createdTime>=1522717078000;createdTime<=1527728278000;firstClass =='NETWORK';secondClass =='ROUTER'
 * 2.处理成字符串 name:胡达;branchName:abc;cabinet:123123;discoveryIP:15.15.15.5;createdTime:1522717078000;createdTime:1527728278000;firstClass:NETWORK;secondClass:ROUTER'
 * 3.返回对象格式 {name:'胡达',branchName:'abc',cabinet:'123123'....}
 */
export function getFilterUrlMap(q) {
  let obj = {}

  if (q !== '' && q !== undefined) {
    // 这一段代码是关于历史告警查询timein的特殊处理，没有办法后端的限制，污染公共方法
    if (q.includes('firstOccurrence=timein=')) {
      const arr = q.split(';')
      let str = arr.filter((item) =>
        item.includes('firstOccurrence=timein=')
      )[0]
      str = str.replace('firstOccurrence=timein=(', '')
      str = str.replace(')', '')
      str = str.replace('T', ' ')
      str = str.replace('T', ' ')
      const timeArr = str.split(',')
      const timeRes = []
      timeArr.forEach((element) => {
        element = moment(element)
        timeRes.push(element)
      })
      obj['firstOccurrence----'] = timeRes
    }

    // 这一段代码是关于multiSelect的处理。
    if (q.includes('or')) {
      const arr = q.split(';') // 查询q拆成数组
      const orArr = arr.filter((item) => item.includes('or')) // 过滤出包含or的条件数组
      orArr.forEach((item) => {
        const res = []
        let keyName = ''
        item = item.replace('(', '')
        item = item.replace(')', '')
        const resArr = item.split(' or ')
        resArr.forEach((element) => {
          const [key, value] = element.split('==')
          keyName = key
          res.push(value)
        })
        obj[keyName] = res
      })
    }

    let _q = decodeURIComponent(q) // 提前完成第2步操作，包括中文编码还原
    // 完成第2步操作
    _q = _q.replace(/>=/g, ':')
    _q = _q.replace(/<=/g, ':')
    _q = _q.replace(/==/g, ':')
    _q = _q.replace(/!=/g, ':')
    _q = _q.replace(/>/g, ':')
    _q = _q.replace(/</g, ':')
    _q = _q.replace(/\*/g, '')
    _q = _q.replace(/'/g, '')
    _q = _q.replace(/\(/g, '')
    _q = _q.replace(/\)/g, '')
    _q = _q.replace(new RegExp(' ', 'g'), '')
    // 完成第3步操作
    if (_q.length > 0) {
      // 把查询条件中的子查询条件拆分成数组
      let cArr = _q.split(';')
      cArr = cArr.filter((item) => !item.includes('or'))
      for (const _c of cArr) {
        const [_key, _val] = _c.split(':')

        if (_key in obj) {
          // 有相同查询字段名的情况，视为一个查询区间
          // 在此项目中，区间查询暂时只有时间类型，所以直接moment转日期对象了
          // 后续如果有字符串、数字型区间查询再改
          obj[_key] = [
            moment(parseInt(obj[_key], 10)),
            moment(parseInt(_val, 10))
          ]
        } else {
          obj[_key] = _val
        }
      }
    }
  }
  return obj
}

export function getFilterUrlMapOel(q) {
  q = q.replace(/ and /g, ';')
  q = q.replace(/'/g, '')
  q = q.replace(/ like /g, '=')
  let obj = {}
  if (q !== '' && q !== undefined) {
    // 这是关于恢复告警的特殊处理代码
    if (q.includes('Severity=0')) {
      q = q.replace('Severity=0;', '')
      obj.ISRECOVER = 0
    } else if (q.includes('Severity!=0')) {
      q = q.replace('Severity=!0;', '')
      obj.ISRECOVER = 1
    }

    // 这一段代码是关于multiSelect的处理。
    if (q.includes('or')) {
      const arr = q.split(';') // 查询q拆成数组
      const orArr = arr.filter((item) => item.includes('or')) // 过滤出包含or的条件数组
      orArr.forEach((item) => {
        const res = []
        let keyName = ''
        item = item.replace('(', '')
        item = item.replace(')', '')
        const resArr = item.split(' or ')
        resArr.forEach((element) => {
          const [key, value] = element.split('=')
          keyName = key
          res.push(value)
        })
        obj[keyName] = res
      })
    }

    let _q = decodeURIComponent(q) // 提前完成第2步操作，包括中文编码还原
    // 完成第2步操作
    _q = _q.replace(/>=/g, ':')
    _q = _q.replace(/<=/g, ':')
    _q = _q.replace(/==/g, ':')
    _q = _q.replace(/=/g, ':')
    _q = _q.replace(/!=/g, ':')
    _q = _q.replace(/>/g, ':')
    _q = _q.replace(/</g, ':')
    _q = _q.replace(/\*/g, '')
    _q = _q.replace(/'/g, '')
    _q = _q.replace(/\(/g, '')
    _q = _q.replace(/\)/g, '')
    _q = _q.replace(new RegExp(' ', 'g'), '')

    // 完成第3步操作
    if (_q.length > 0) {
      // 把查询条件中的子查询条件拆分成数组
      let cArr = _q.split(';')
      cArr = cArr.filter((item) => !item.includes('or'))
      for (const _c of cArr) {
        const [_key, _val] = _c.split(':')

        if (_key in obj) {
          // 有相同查询字段名的情况，视为一个查询区间
          // 在此项目中，区间查询暂时只有时间类型，所以直接moment转日期对象了
          // 后续如果有字符串、数字型区间查询再改
          obj[_key] = [
            moment(parseInt(obj[_key], 10) * 1000),
            moment(parseInt(_val, 10) * 1000)
          ]
        } else {
          obj[_key] = _val
        }
      }
    }
  }
  return obj
}

/*
 * 这是一个放在Select的Select的filterOption属性中的函数，主要目的是支持大小写查询。
 */
export function onSearchInfo(input, option) {
  return (
    option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0 ||
    option.key.toLowerCase().indexOf(input.toLowerCase()) >= 0
  )
}

/*
 * 根据传入的数据字典名生成下拉列表。
 */
export function genDictOptsByName(name) {
  const { Option } = Select
  const options = []
  const dictArr = JSON.parse(localStorage.getItem('dict'))[name]
  dictArr.forEach((opt) => {
    if (opt.status === 0) {
      options.push(
        <Option key={opt.value} value={opt.value}>
          {opt.name}
        </Option>
      )
    }
  })
  return options
}
/**
 *
 *根据传入的数据字典生成option数组 {key,value}
 */
export function genDictArrByName(name) {
  const options = []
  const dictArr = JSON.parse(localStorage.getItem('dict'))[name]
  dictArr.forEach((opt) => {
    if (opt.status === 0) {
      options.push({ key: opt.key, value: opt.value })
    }
  })
  return options
}

/*
 * 根据传入的数据字典名生成下拉列表。在filterSchema文件中的
 */
export function genFilterDictOptsByName(name, value) {
  const options = []
  const dictArr = JSON.parse(localStorage.getItem('dict'))[name]
  if (dictArr) {
    dictArr
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach((opt) => {
        if (opt.status === 0) {
          if (value === 'int') {
            options.push({ key: parseInt(opt.key, 10), value: opt.name })
          } else {
            options.push({ key: opt.key, value: opt.name })
          }
        }
      })
  }
  return options
}
// 返回原始数据  这里的可以指的是数据字典左侧数装菜单项的key
export function getSourceByKey(key) {
  const options = []
  const dictArr = JSON.parse(localStorage.getItem('dict'))[key]
  if (dictArr) {
    dictArr.forEach((opt) => {
      if (opt.status === 0) {
        options.push(opt)
      }
    })
  }
  return options
}
/*
 * 根据传入的数据字典名生成下拉列表。在filterSchema文件中的
 */
export function genAddDictOptsByName(name, lastname) {
  const options = []
  const dictArr = JSON.parse(localStorage.getItem('dict'))[name]
  dictArr.forEach((opt) => {
    if (opt.status === 0) {
      options.push({ key: opt.key, value: `${opt.name}(总行)` })
    }
  })
  const dictArrFh = JSON.parse(localStorage.getItem('dict'))[lastname]
  dictArrFh.forEach((opt) => {
    if (opt.status === 0) {
      options.push({ key: opt.key, value: `${opt.name}(分行)` })
    }
  })
  return options
}

export function genDictOptsByNames(name, value) {
  const { Option } = Select
  const options = []
  const dictArr = JSON.parse(localStorage.getItem('dict'))[name]
  dictArr.forEach((opt) => {
    if (opt.status === 0) {
      options.push(
        <Option key={opt.value} value={opt.value}>
          {opt.name}
        </Option>
      )
    }
  })
  const dictArrs = JSON.parse(localStorage.getItem('dict'))[value]
  dictArrs.forEach((opt) => {
    if (opt.status === 0) {
      options.push(
        <Option key={opt.value} value={opt.value}>
          {opt.name}
        </Option>
      )
    }
  })
  return options
}

// ES索引计算函数   为能过减少ES计算的时间，所以按用户选择的时间来计算需要分配多少索引
// 入参为 开始时间，结束时间, 索引名称， 按天还是按月生成的索引类型  u2performance
// 注意因为antd控件的原因  选择时间时，界面靠左的被定为开始时间，所以start比end小（时间戳）
export function findIndex(start, end, indexName, indexType, ip) {
  switch (indexType) {
    case 'day': {
      let now
      let year
      let mons
      let day
      let startTime
      const arry = []
      let cont = 0
      if (new Date(start).getHours() < 8) {
        startTime = start - 86400000
      } else {
        startTime = start
      }
      cont = Math.round((end - startTime) / 86400000)
      for (let i = 0; i <= cont; i++) {
        now = end - 86400000 * i
        year = `${new Date(now).getFullYear()}`
        mons =
          new Date(now).getMonth() >= 9
            ? `${new Date(now).getMonth() + 1}`
            : `0${new Date(now).getMonth() + 1}`
        day =
          new Date(now).getDate() >= 10
            ? `${new Date(now).getDate()}`
            : `0${new Date(now).getDate()}`
        arry.push(`${indexName}${year}.${mons}.${day}`)
      }
      return `${ip}/${arry.join(',')}/_search/`
    }
    case 'month': {
      let conts
      let nows
      let years
      let month
      const arrys = []
      const itmes = []
      conts = Math.round((end - start) / 86400000)
      for (let i = 0; i <= conts; i++) {
        nows = end - 86400000 * i
        years = `${new Date(nows).getFullYear()}`
        month =
          new Date(nows).getMonth() >= 9
            ? `${new Date(nows).getMonth() + 1}`
            : `0${new Date(nows).getMonth() + 1}`
        itmes.push(`${indexName}${years}.${month}`)
      }
      arrys.push(...new Set(itmes))
      return `${ip}/${arrys.join(',')}/_search/`
    }
    default:
      return ''
  }
}
// ES索引计算函数   为能过减少ES计算的时间，所以按用户选择的时间来计算需要分配多少索引
// 入参为 开始时间，结束时间, 索引名称， 按天还是按月生成的索引类型  u2performance
// 注意因为antd控件的原因  选择时间时，界面靠左的被定为开始时间，所以start比end小（时间戳）
// 时间自适应
export function ESFindIndex(start, end, indexName, indexType, ip) {
  switch (indexType) {
    case 'day': {
      let now
      let year
      let mons
      let day
      let startTime
      const arry = []
      let cont = 0
      if (new Date(start).getHours() < 8) {
        startTime = start - 86400000
      } else {
        startTime = start
      }
      cont = Math.round((end - startTime) / 86400000)
      for (let i = 0; i <= cont; i++) {
        now = end - 86400000 * i
        year = `${new Date(now).getFullYear()}`
        mons =
          new Date(now).getMonth() >= 9
            ? `${new Date(now).getMonth() + 1}`
            : `0${new Date(now).getMonth() + 1}`
        day =
          new Date(now).getDate() >= 10
            ? `${new Date(now).getDate()}`
            : `0${new Date(now).getDate()}`
        arry.push(`${indexName}${year}.${mons}.${day}`)
      }
      return `${ip}/${arry.join(',')}/_search/`
    }
    case 'month': {
      let conts
      let nows
      let years
      let month
      const arrys = []
      const itmes = []
      conts = Math.round((end - start) / 86400000)
      for (let i = 0; i <= conts; i++) {
        nows = end - 86400000 * i
        years = `${new Date(nows).getFullYear()}`
        month =
          new Date(nows).getMonth() >= 9
            ? `${new Date(nows).getMonth() + 1}`
            : `0${new Date(nows).getMonth() + 1}`
        itmes.push(`${indexName}${years}.${month}`)
      }
      arrys.push(...new Set(itmes))
      return `${ip}/${arrys.join(',')}/_search/`
    }
    case 'years': {
      let diff
      let nowY
      let yearY
      const arryY = []
      const itmeY = []
      diff = Math.round((end - start) / 86400000)
      for (let i = 0; i <= diff; i++) {
        nowY = end - 86400000 * i
        yearY = `${new Date(nowY).getFullYear()}`
        itmeY.push(`${indexName}${yearY}.*`)
      }
      arryY.push(...new Set(itmeY))
      return `${ip}/${arryY.join(',')}/_search/`
    }
    default:
      return ''
  }
}
// 获取两个日期之间的月份
export function esFindIndexM(startDate, endDate, indexName, ip) {
  const daysList = []
  const start = moment(startDate)
  const end = moment(endDate)
  const months = end.diff(start, 'months')
  daysList.push(`${indexName}${start.format('YYYY.MM')}.*`)
  for (let i = 1; i <= months; i++) {
    daysList.push(`${indexName}${start.add(1, 'months').format('YYYY.MM')}.*`)
  }
  return `${ip}/${daysList.join(',')}/_search/`
}

// 解析监控实例的指标
export function getIndicator(array) {
  let indicators = ''
  const indicatorSet = new Set()
  array.forEach((element) => {
    element.conditions.forEach((ele) => {
      indicatorSet.add(ele.indicator.name)
    })
  })
  indicatorSet.forEach((element) => {
    indicators += `${element},`
  })

  indicators = indicators.slice(0, indicators.length - 1)
  return indicators
}
// 数据字典获取第三方接口地址
export function genDictUrlByName(name, value) {
  let path = ''
  if (localStorage.getItem('dict') !== null) {
    const dictData = JSON.parse(localStorage.getItem('dict'))[name]
    if (dictData) {
      dictData.forEach((item) => {
        if (item.key === value) path = item.value
      })
    } else {
      path = ''
    }
  }
  return path
}
/*
  数据字典生成树型结构
*/
export function genDictArrToTreeByName(name) {
  const options = []
  const dictArr = JSON.parse(localStorage.getItem('dict'))[name]
  dictArr.forEach((opt) => {
    if (opt.status === 0) {
      options.push({
        key: opt.name,
        value: opt.name,
        children: opt.value.split(',')
      })
    }
  })
  return options
}
/*
 */
const loop = (data) =>
  data.reduce((result, current) => {
    if (current.value) {
      result.push({
        title: current.name,
        key: current.key,
        isLeaf: false,
        children: loop(current.value.split(','))
      })
      return result
    }
    result.push({ title: current, key: current, isLeaf: false, children: [] })
    return result
  }, [])

export function genDictArrToTree(name) {
  let options = []
  const dictArr = JSON.parse(localStorage.getItem('dict'))[name]
  options = loop(dictArr)
  return options
}
/*
  查询条件q转化为ES语句
*/
export function queryTransES(q) {
  const parms = q.split(';')
  const arr = []
  parms.forEach((item) => {
    if (item.includes('firstOccurrence')) {
      if (item.includes('timein')) {
        const dd = item.split('(')[1].split(')')[0].split(',')
        const d1 = parseInt(moment(dd[1]).valueOf() / 1000, 10)
        const d2 = parseInt(moment(dd[0]).valueOf() / 1000, 10)
        const obj = {
          range: {
            firstoccurrence: {
              lt: d1,
              gt: d2
            }
          }
        }
        arr.push(obj)
      }
    } else if (item.includes('(') && item.includes(')')) {
      const str = item.split('(')[1].split(')')[0].split('or')
      const should = []
      const bool = {
        bool: {
          should
        }
      }
      str.forEach((strItem) => {
        const aa = strItem.split('==')
        const obj = {
          term: {
            [`${aa[0].toLowerCase().trim()}`]: aa[1].replace(/'/g, '').trim()
          }
        }
        should.push(obj)
      })
      arr.push(bool)
    } else if (item.includes('*')) {
      const aa = item.split('==')
      const obj = {
        wildcard: {
          [`${aa[0].toLowerCase().trim()}`]: aa[1].replace(/'/g, '').trim()
        }
      }
      arr.push(obj)
    } else if (item.includes('hiscope')) {
      const cc = item.split('==')
      let start
      let end
      switch (cc[1]) {
        case "'hour'": {
          start = new Date().getTime() - 60 * 60 * 1000
          end = new Date().getTime()
          break
        }
        case "'day'": {
          start = new Date().getTime() - 24 * 60 * 60 * 1000
          end = new Date().getTime()
          break
        }
        case "'today'": {
          start = new Date(new Date().toLocaleDateString()).getTime()
          end = new Date().getTime()
          break
        }
        default:
          start = new Date().getTime()
          end = new Date().getTime()
      }
      start = parseInt(start / 1000, 10)
      end = parseInt(end / 1000, 10)
      const obj = {
        range: {
          firstoccurrence: {
            lt: end,
            gt: start
          }
        }
      }
      arr.push(obj)
    } else if (item.includes('==')) {
      const aa = item.split('==')
      const obj = {
        term: {
          [`${aa[0].toLowerCase()}`]: aa[1].replace(/'/g, '').trim()
        }
      }
      arr.push(obj)
    } else if (item.includes('!=')) {
      const ff = item.split('!=')
      const bool = {
        bool: {
          must_not: []
        }
      }
      const obj = {
        term: {
          [`${ff[0].toLowerCase().trim()}`]: ff[1].replace(/'/g, '').trim()
        }
      }
      bool.bool.must_not.push(obj)
      arr.push(bool)
    }
  })
  return arr
}

export function formatMinutes(minutes) {
  const MINUTES_IN_HOUR = 60
  const MINUTES_IN_DAY = MINUTES_IN_HOUR * 24
  const MINUTES_IN_MONTH = MINUTES_IN_DAY * 30
  const MINUTES_IN_YEAR = MINUTES_IN_MONTH * 12

  let years = Math.floor(minutes / MINUTES_IN_YEAR)
  minutes %= MINUTES_IN_YEAR

  let months = Math.floor(minutes / MINUTES_IN_MONTH)
  minutes %= MINUTES_IN_MONTH

  let days = Math.floor(minutes / MINUTES_IN_DAY)
  minutes %= MINUTES_IN_DAY

  let hours = Math.floor(minutes / MINUTES_IN_HOUR)
  minutes %= MINUTES_IN_HOUR

  let result = ''
  if (years > 0) {
    result += `${years}年`
  }
  if (months > 0) {
    result += `${months}月`
  }
  if (days > 0) {
    result += `${days}天`
  }
  if (hours > 0) {
    result += `${hours}小时`
  }
  if (minutes > 0 || result.length === 0) {
    result += `${minutes}分`
  }

  return result
}
