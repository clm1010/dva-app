import React from 'react'
import PropTypes from 'prop-types'
import {
  Breadcrumb, Icon
} from 'antd'
import { Link } from 'react-router-dom'
import pathToRegexp from 'path-to-regexp'
import { queryArray } from 'utils'
import styles from './Layout.less'

const Bread = ({
  menu, location
}) => {
  // 匹配当前路由
  let pathArray = []
  let current
  for (let index in menu) {
    if (menu[index].route && pathToRegexp(menu[index].route).exec(location.pathname)) {
      current = menu[index]
      break
    }
  }

  const getPathArray = (item) => {
    pathArray.unshift(item)
    if (item.bpid) {
      getPathArray(queryArray(menu, item.bpid, 'id'))
    }
  }

  let paramMap = {}
  if (!current) {
    // 特殊处理 performHost 路径
    if (location.pathname === '/performHost') {
      // 添加 Dashboard 作为根路径
      pathArray.push(menu[0] || {
        id: 1,
        icon: 'laptop',
        name: 'Dashboard',
        route: '/dashboard'
      })
      // 添加性能管理作为父级
      pathArray.push({
        id: 8,
        icon: 'dashboard',
        name: '性能管理',
        route: '/myPerForm'
      })
      // 添加当前页面
      pathArray.push({
        id: 9,
        icon: 'line-chart',
        name: '性能监控'
      })
    } else if (location.pathname === '/qps/chddetail') {
      // 特殊处理 qps/chddetail 路径
      // 添加 Dashboard 作为根路径
      pathArray.push(menu[0] || {
        id: 1,
        icon: 'laptop',
        name: 'Dashboard',
        route: '/dashboard'
      })
      // 添加QPS监控作为父级
      pathArray.push({
        id: 9,
        icon: 'line-chart',
        name: 'QPS监控',
        route: '/qps'
      })
      // 添加当前页面
      pathArray.push({
        id: 91,
        icon: 'eye',
        name: '设备详情'
      })
    } else {
      pathArray.push(menu[0] || {
        id: 1,
        icon: 'laptop',
        name: 'Dashboard',
      })
      pathArray.push({
        id: 404,
        name: 'Not Found',
      })
    }
  } else {
    getPathArray(current)

    let keys = []
    let values = pathToRegexp(current.route, keys).exec(location.pathname.replace('#', ''))
    if (keys.length) {
      keys.forEach((currentValue, index) => {
        if (typeof currentValue.name !== 'string') {
          return
        }
        paramMap[currentValue.name] = values[index + 1]
      })
    }
  }

  // 递归查找父级
  const breads = pathArray.map((item, key) => {
    const content = (
      <span>{item.icon
        ? <Icon type={item.icon} style={{ marginRight: 4 }} />
        : ''}{item.name}</span>
    )
    return (
      <Breadcrumb.Item key={key}>
        {((pathArray.length - 1) !== key)
          ? <Link to={pathToRegexp.compile(item.route || '')(paramMap) || '#'}>
            {content}
          </Link>
          : content}
      </Breadcrumb.Item>
    )
  })

  return (
    <div className={styles.bread}>
      <Breadcrumb>
        {breads}
      </Breadcrumb>
    </div>
  )
}

Bread.propTypes = {
  menu: PropTypes.array,
  location: PropTypes.object,
}

export default Bread
