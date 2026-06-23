import { config } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import { server } from './server'
import { afterEach, beforeAll, afterAll } from 'vitest'

// 组件测试全局注册 Element Plus
config.global.plugins = [[ElementPlus, {}]]

// MSW server（单独文件，避免 setup↔handlers 循环依赖）
export { server } from './server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
