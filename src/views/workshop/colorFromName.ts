/**
 * 角色头像配色板——暖冷交替、辨识度高的 8 色。
 * 替代 mock 数据中写死的 `char.color`，前端按 name 稳定取色。
 */
const PALETTE = [
  '#4a90d9', // 蓝
  '#e17055', // 橙红
  '#00b894', // 青绿
  '#6c5ce7', // 紫
  '#fdcb6e', // 黄
  '#e84393', // 粉
  '#2d3436', // 深
  '#00cec9', // 青
]

/**
 * 按名字稳定取色：charCodeAt 累加 + 模 PALETTE.length。
 * 同名总是同色；不同名字因累加值差异分布到不同色板槽位。
 *
 * @param name 角色名（取首字符做头像背景色）
 * @returns 形如 `#xxxxxx` 的颜色字符串
 */
export function colorFromName(name: string): string {
  if (!name) return PALETTE[0]
  let sum = 0
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i)
  }
  return PALETTE[sum % PALETTE.length]
}
