/**
 * 应用程序入口文件
 * 负责初始化 dva 应用实例、配置、模型加载和启动
 */

// 导入全局消息提示组件
import { message } from 'antd'
// 导入 dva 框架核心
import dva from 'dva'
// 导入 dva 加载状态插件
import createLoading from 'dva-loading'
// 导入历史记录管理工具（用于路由）
import { createBrowserHistory } from 'history'
// 导入 ES6+ polyfill 支持
import 'babel-polyfill'

// 1. 初始化 dva 应用实例
const app = dva({
  // 集成 loading 插件，可以自动管理异步加载状态
  ...createLoading({ effects: true, }),
  // 配置路由历史记录模式为浏览器模式
  history: createBrowserHistory(),
  // 全局错误处理器
  onError (error) {
    // 将错误信息以消息方式展示
    message.error(error.message)
  },
})

// 2. 加载根模型
// 全局应用状态管理模型
app.model(require('./models/app'))

// 3. 配置路由系统
app.router(require('./router'))

// 4. 启动应用
// 将应用挂载到 id 为 root 的 DOM 节点
app.start('#root')
