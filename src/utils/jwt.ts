interface JwtPayload {
  exp?: number
}

/**
 * 解析 JWT 的 payload 段（第二段），不校验签名。
 * 仅用于读取 exp 等声明，不能作为鉴权依据。
 */
function decodePayload(token: string): JwtPayload | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    // base64url → 标准 base64：- 换 +，_ 换 /，并补齐 '=' padding
    // atob 要求输入长度为 4 的倍数，base64url 常省略 padding，不补齐会抛 InvalidCharacterError
    const raw = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const base64 = raw + '='.repeat((4 - (raw.length % 4)) % 4)
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes)) as JwtPayload
  } catch {
    return null
  }
}

/**
 * 判断 access token 是否已过期。
 *
 * 仅当 payload 中存在 exp 且 exp 早于当前时间时返回 true（已过期）；
 * token 损坏或缺少 exp 时返回 false，交由后端 401 兜底，避免前端误判踢出用户。
 *
 * @param token - localStorage 中的 access token
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodePayload(token)
  if (!payload?.exp) return false
  // exp 为 Unix 秒，Date.now() 为毫秒
  return payload.exp * 1000 < Date.now()
}
