import { ref } from 'vue'

/**
 * SSE 流式请求封装，用于对话消息发送
 * @param url - 请求 URL
 * @param body - 请求体
 * @param onChunk - 每次接收到数据块时回调，参数为累计完整文本
 * @returns 控制对象，包含 streaming 状态、send 方法和 abort 方法
 */
export function useSSE() {
  const streaming = ref(false)
  let abortController: AbortController | null = null

  async function send(
    url: string,
    body: Record<string, unknown>,
    onChunk: (text: string) => void,
    onDone?: () => void,
    onError?: (error: Error) => void,
  ) {
    abortController = new AbortController()
    streaming.value = true

    try {
      const token = localStorage.getItem('accessToken')
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: abortController.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        onChunk(fullText)
      }

      onDone?.()
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        onError?.(error as Error)
      }
    } finally {
      streaming.value = false
      abortController = null
    }
  }

  function abort() {
    abortController?.abort()
    streaming.value = false
  }

  return { streaming, send, abort }
}
