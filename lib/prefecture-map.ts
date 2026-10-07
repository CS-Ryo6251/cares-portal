import { prefectures } from './constants'

type Prefecture = (typeof prefectures)[number]
export const mapRegions = [
  { label: '北海道・東北', fill: '#dce7db' },
  { label: '関東', fill: '#ebdcd9' },
  { label: '中部', fill: '#e8e2cd' },
  { label: '近畿', fill: '#e3ddec' },
  { label: '中国', fill: '#d9e5e8' },
  { label: '四国', fill: '#e8dfd2' },
  { label: '九州・沖縄', fill: '#dbe6df' },
] as const

// Original schematic tile map. Positions are approximate; no geographic boundaries are implied.
// [column, row, region, width, height] keeps small prefectures large enough to label.
const tiles: Record<Prefecture, [number, number, number, number?, number?]> = {
  北海道: [11, 0, 0, 2, 1.6], 青森県: [10, 2, 0, 2],
  秋田県: [10, 3, 0], 岩手県: [11, 3, 0], 山形県: [10, 4, 0], 宮城県: [11, 4, 0], 福島県: [10, 5, 0, 2],
  茨城県: [12, 6, 1], 栃木県: [11, 6, 1], 群馬県: [10, 6, 1], 埼玉県: [10, 7, 1],
  千葉県: [12, 7, 1, 1, 2], 東京都: [11, 7, 1], 神奈川県: [11, 8, 1],
  新潟県: [9, 4, 2, 1, 2], 富山県: [8, 5, 2], 石川県: [7, 5, 2], 福井県: [7, 6, 2],
  山梨県: [10, 8, 2], 長野県: [9, 6, 2, 1, 2], 岐阜県: [8, 6, 2], 静岡県: [9, 8, 2], 愛知県: [8, 7, 2],
  三重県: [7, 8, 3], 滋賀県: [7, 7, 3], 京都府: [6, 6, 3], 大阪府: [6, 7, 3],
  兵庫県: [5, 6, 3, 1, 2], 奈良県: [6, 8, 3], 和歌山県: [6, 9, 3],
  鳥取県: [4, 6, 4], 島根県: [3, 6, 4], 岡山県: [4, 7, 4], 広島県: [3, 7, 4], 山口県: [2, 7, 4],
  徳島県: [4, 9, 5], 香川県: [4, 8, 5], 愛媛県: [3, 8, 5], 高知県: [3, 9, 5],
  福岡県: [1, 7, 6], 佐賀県: [0, 7, 6], 長崎県: [0, 8, 6], 熊本県: [1, 8, 6],
  大分県: [2, 8, 6], 宮崎県: [2, 9, 6], 鹿児島県: [1, 9, 6], 沖縄県: [0, 10.5, 6, 1.6],
}

export const prefectureTiles = prefectures.map(prefecture => {
  const [x, y, region, width = 1, height = 1] = tiles[prefecture]
  return { prefecture, label: prefecture === '北海道' ? prefecture : prefecture.slice(0, -1), x, y, region, width, height }
})
