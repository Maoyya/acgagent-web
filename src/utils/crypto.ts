import md5 from 'js-md5'

/**
 * 对密码进行 MD5 哈希，用于前端传输前的脱敏。
 * 后端收到 MD5 哈希后会再用 BCrypt 加密存储。
 */
export function hashPassword(password: string): string {
  return md5(password)
}
