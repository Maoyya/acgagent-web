import { HttpResponse } from 'msw'

/** 信封助手：后端 {code,message,data} 格式 */
export function envelope<T>(data: T, code = 200, message = 'success') {
  return HttpResponse.json({ code, message, data })
}

/** 各 Task 往 handlers 数组追加自己的 mock 端点 */
export const handlers = [
  // 占位；后续 Task 在此数组追加 http.post/http.get
]
