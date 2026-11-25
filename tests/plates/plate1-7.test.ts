import { describe, expect, it } from 'vitest'
import { normalizeText } from '../../src/core/text'
import { COLORS } from '../../src/data/colors'
import { plate1 } from '../../src/plates/plate1'
import { plate7 } from '../../src/plates/plate7'
import { createBuildContext } from '../../src/plates/types'

const ctx1 = createBuildContext(plate1.ratio, plate1.designHeight)
const ctx7 = createBuildContext(plate7.ratio, plate7.designHeight)

/** 宽松比较浮点数（px 由比例换算，存在小数误差）。 */
function near(actual: number | undefined, expected: number): void {
  expect(actual).toBeTypeOf('number')
  expect(Math.abs((actual as number) - expected)).toBeLessThan(0.6)
}

describe('plate1 套跑1', () => {
  it('基础信息与封面一致', () => {
    expect(plate1.id).toBe('plate1')
    expect(plate1.name).toBe('套跑1')
    expect(plate1.ratio).toBe(5.5)
    expect(plate1.designHeight).toBe(66.13)
    expect(plate1.cover).toBe('covers/bg_plate_1.png')
    expect(plate1.fonts).toEqual(expect.arrayContaining(['hycsj', 'times', 'hyzhj', 'arial']))
  })

  it('默认值覆盖全部字段', () => {
    for (const field of plate1.fields) {
      expect(plate1.defaults[field.key], field.key).toBeDefined()
    }
    for (const key of ['number11', 'number21']) {
      expect(String(plate1.defaults[key]).length).toBeGreaterThan(0)
    }
  })

  it('站名/pinyin/等级/车次绑定与字体', () => {
    const patches = plate1.build({ ...plate1.defaults }, ctx1)
    expect(patches.get('tv_start_1')).toMatchObject({
      text: normalizeText('成 都', 0),
      font: 'hycsj',
      scaleX: 0.9,
    })
    expect(patches.get('tv_end_1')).toMatchObject({ text: '北京西', font: 'hycsj' })
    // 3 个显示单位：0.9 * 2.2 / 3
    near(patches.get('tv_end_1')?.scaleX, (0.9 * 2.2) / 3)
    expect(patches.get('tv_start_en_1')).toMatchObject({ text: 'CHENGDU', font: 'times', bg: COLORS.zhida3 })
    expect(patches.get('tv_start_en_1')?.fit).toEqual({ maxScale: 1, mode: 0 })
    expect(patches.get('tv_level_1')?.text).toBe('直')
    expect(patches.get('tv_level_2')?.text).toBe('达')
    expect(patches.get('tv_number_11')).toMatchObject({ text: 'Z50/49', font: 'arial' })
    expect(patches.get('tv_number_11')?.fit).toEqual({ maxScale: 1.05, mode: 1 })
    expect(patches.get('tv_number_12')?.visible).toBe(false)
    expect(patches.get('tv_number_22')?.visible).toBe(true)
    expect(patches.get('iv_icon')?.image).toBe('icons/railway/ic_plate_01.png')
  })

  it('等级颜色随预设变化，自定义文字覆盖预设文字', () => {
    const patches = plate1.build(
      { ...plate1.defaults, level: 'tekuai2', levelText: '直达特快' },
      ctx1,
    )
    expect(patches.get('tv_start_en_1')?.bg).toBe(COLORS.tekuai2)
    expect(patches.get('tv_level_1')?.text).toBe('直达')
    expect(patches.get('tv_level_2')?.text).toBe('特快')
  })

  it('拼音栏贴边会收掉外侧边距', () => {
    const normal = plate1.build({ ...plate1.defaults }, ctx1)
    const flush = plate1.build({ ...plate1.defaults, alignSides: true }, ctx1)
    near(normal.get('ll_left')?.margin?.l, ctx1.k(4))
    expect(flush.get('ll_left')?.margin?.l).toBe(0)
    expect(flush.get('ll_right')?.margin?.r).toBe(0)
  })
})

describe('plate7 套跑7', () => {
  it('基础信息与封面一致', () => {
    expect(plate7.id).toBe('plate7')
    expect(plate7.name).toBe('套跑7')
    expect(plate7.ratio).toBe(5)
    expect(plate7.designHeight).toBe(72)
    expect(plate7.cover).toBe('covers/bg_plate_7.png')
    expect(plate7.fonts).toEqual(expect.arrayContaining(['fzxbs', 'times', 'hyzhj', 'arial']))
  })

  it('默认值覆盖全部字段', () => {
    for (const field of plate7.fields) {
      expect(plate7.defaults[field.key], field.key).toBeDefined()
    }
  })

  it('三组站名/拼音/等级/车次绑定', () => {
    const patches = plate7.build({ ...plate7.defaults }, ctx7)
    expect(patches.get('tv_start')).toMatchObject({
      text: normalizeText('杭 州', 0),
      font: 'fzxbs',
      scaleX: 0.88,
    })
    expect(patches.get('tv_middle')?.text).toBe('阿克苏')
    expect(patches.get('tv_end')?.text).toBe('乌鲁木齐')
    expect(patches.get('tv_start_en')).toMatchObject({ text: 'HANG ZHOU', font: 'times', bg: COLORS.kuaisu1 })
    expect(patches.get('tv_middle_en')?.fit).toEqual({ maxScale: 1, mode: 0 })
    expect(patches.get('tv_level_1')?.text).toBe('快')
    expect(patches.get('tv_level_2')?.text).toBe('速')
    expect(patches.get('tv_number_11')).toMatchObject({ text: 'K594/5', font: 'arial' })
    expect(patches.get('tv_number_11')?.fit).toEqual({ maxScale: 0.9, mode: 1 })
    expect(patches.get('tv_number_13')?.visible).toBe(false)
    expect(patches.get('iv_icon')?.image).toBe('icons/railway/ic_plate_01.png')
  })

  it('长站名按 c.f() 压缩', () => {
    const patches = plate7.build({ ...plate7.defaults, start: '齐齐哈尔南' }, ctx7)
    // 5 个显示单位：0.88 * 4.3 / 5（贴边默认勾选，目标 4.3）
    near(patches.get('tv_start')?.scaleX, (0.88 * 4.3) / 5)
  })

  it('站名基线下移，避免顶部被父容器裁剪', () => {
    const patches = plate7.build({ ...plate7.defaults }, ctx7)
    near(patches.get('tv_start')?.baselineOffset, ctx7.k(4))
    near(patches.get('tv_middle')?.baselineOffset, ctx7.k(4))
    near(patches.get('tv_end')?.baselineOffset, ctx7.k(4))
  })

  it('拼音栏贴边默认开启，取消后回加 3 单位内边距', () => {
    const flush = plate7.build({ ...plate7.defaults }, ctx7)
    const padded = plate7.build({ ...plate7.defaults, alignSides: false }, ctx7)
    expect(flush.get('rl_plate')?.padding).toEqual({ l: 0, r: 0 })
    near(padded.get('rl_plate')?.padding?.l, ctx7.k(3))
    near(padded.get('rl_plate')?.padding?.r, ctx7.k(3))
  })
})
