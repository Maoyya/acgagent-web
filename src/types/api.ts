/** 后端统一响应体 */
export interface Result<T> {
  code: number
  message: string
  data: T
}
