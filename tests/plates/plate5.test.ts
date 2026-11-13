import { describe, expect, it } from 'vitest'
import { COLORS } from '../../src/data/colors'
import { plate5 } from '../../src/plates/plate5'
import { createBuildContext } from '../../src/plates/types'

const ctx = createBuildContext(plate5.ratio, plate5.designHeight)

/** 宽松比较浮点数（px 由比例换算，存在小数误差）。 */
function near(actual: number | string | undefined, expected: number): void {
  expect(typeof actual).toBe('number')
  expect(Math.abs((actual as number) - expected)).toBeLessThan(0.6)
}

describe('plate5 套跑5', () => {
  it('基础信息与封面一致', () => {
    expect(plate5.id).toBe('plate5')
    expect(plate5.name).toBe('套跑5')
    expect(plate5.ratio).toBe(5.2)
    expect(plate5.designHeight).toBe(64.5)
    expect(plate5.cover).toBe('covers/bg_plate_5.png')
    expect(plate5.fonts).toEqual(expect.arrayContaining(['hycsj', 'times', 'hyzhj', 'arial']))
  })

  it('默认值覆盖全部字段', () => {
    for (const field of plate5.fields) {
      expect(plate5.defaults[field.key], field.key).toBeDefined()
    }
  })

  it('主流程：站名/拼音/等级/车次/路徽', () => {
    const patches = plate5.build({ ...plate5.defaults }, ctx)
    near(patches.get('rl_plate_main')?.height, ctx.k(64.5))
    expect(patches.get('tv_left_start_1')).toMatchObject({
      text: '加格达奇',
      font: 'hycsj',
      fitLength: { maxScale: 0.8 },
    })
    near(patches.get('tv_left_start_1')?.sizePx, ctx.k(31))
    expect(patches.get('tv_left_end_1')?.text).toBe('哈尔滨')
    expect(patches.get('tv_right_start_1')?.text).toBe('漠河')
    expect(patches.get('tv_left_en')).toMatchObject({
      text: 'JIAGEDAQI HAERBIN',
      font: 'times',
      bg: COLORS.kuaisu1,
      fit: { maxScale: 1, mode: 0 },
    })
    near(patches.get('tv_left_en')?.height, ctx.k(16.5))
    expect(patches.get('tv_right_en')?.text).toBe('MOHE HAERBIN')
    expect(patches.get('tv_level_1')?.text).toBe('快')
    expect(patches.get('tv_level_2')?.text).toBe('速')
    expect(patches.get('tv_number_11')).toMatchObject({ text: 'K7104', font: 'arial', height: 'wrap' })
    expect(patches.get('tv_number_12')).toMatchObject({ text: 'K7103', visible: true })
    expect(patches.get('v_divider_left')?.visible).toBe(true)
    expect(patches.get('tv_number_21')?.text).toBe('K7042')
    expect(patches.get('iv_icon')?.image).toBe('icons/railway/ic_plate_01.png')
    near(patches.get('iv_icon')?.width, ctx.k(43.8))
    expect(patches.get('ll_plate_ex')?.visible).toBe(false)
  })

  it('M4：站名权重按文字长度分配（左 4:3）', () => {
    const patches = plate5.build({ ...plate5.defaults }, ctx)
    expect(patches.get('ll_left_1')?.weight).toBe(4)
    expect(patches.get('ll_left_2')?.weight).toBe(3)
    // 右组 漠河(2) : 哈尔滨(3)
    expect(patches.get('ll_right_1')?.weight).toBe(2)
    expect(patches.get('ll_right_2')?.weight).toBe(3)
  })

  it('等级预设决定中文等级与拼音条颜色', () => {
    const patches = plate5.build({ ...plate5.defaults, levelLeft: 'zhida3' }, ctx)
    expect(patches.get('tv_level_1')?.text).toBe('直')
    expect(patches.get('tv_level_2')?.text).toBe('达')
    expect(patches.get('tv_left_en')?.bg).toBe(COLORS.zhida3)
    expect(patches.get('tv_right_en')?.bg).toBe(COLORS.zhida3)
  })

  it('自定义等级：2/4 字拆成两半，颜色可自定义', () => {
    const patches = plate5.build(
      {
        ...plate5.defaults,
        levelLeft: 'custom',
        customLevelLeft: '直达特快',
        customLevelColor: COLORS.tekuai2,
      },
      ctx,
    )
    expect(patches.get('tv_level_1')?.text).toBe('直达')
    expect(patches.get('tv_level_2')?.text).toBe('特快')
    expect(patches.get('tv_left_en')?.bg).toBe(COLORS.tekuai2)
  })

  it('双站名：第二行可见、字号 17.5、拼音条拼四段', () => {
    const patches = plate5.build(
      {
        ...plate5.defaults,
        leftStartDouble: true,
        leftEndDouble: true,
        leftStart2: '北京',
        leftStartEn2: 'BEIJING',
        leftEnd2: '上海',
        leftEndEn2: 'SHANGHAI',
      },
      ctx,
    )
    expect(patches.get('tv_left_start_2')).toMatchObject({ text: '北京', visible: true })
    near(patches.get('tv_left_start_1')?.sizePx, ctx.k(17.5))
    expect(patches.get('tv_left_start_1')?.fitLength).toEqual({ maxScale: 1 })
    expect(patches.get('tv_left_en')?.text).toBe('JIAGEDAQI BEIJING HAERBIN SHANGHAI')
  })

  it('等级显示在站名上方（E1）：顶部等级行可见、中缝单字隐藏', () => {
    const patches = plate5.build({ ...plate5.defaults, showAboveStation: true }, ctx)
    expect(patches.get('ll_plate_ex')?.visible).toBe(true)
    expect(patches.get('tv_level_1')?.visible).toBe(false)
    expect(patches.get('tv_level_2')?.visible).toBe(false)
    expect(patches.get('tv_level_ex_1')?.text).toBe('快\u3000速')
    expect(patches.get('tv_level_ex_2')?.text).toBe('快\u3000速')
    near(patches.get('tv_left_en')?.height, ctx.k(14))
    // 主板向上重叠：A1 - k(15)
    near(
      patches.get('rl_plate_main')?.margin?.t,
      ctx.widthPx / 5 - ctx.heightPx - ctx.k(15),
    )
  })

  it('拼音条贴边开关', () => {
    const flush = plate5.build({ ...plate5.defaults }, ctx)
    expect(flush.get('tv_left_en')?.margin?.l).toBe(0)
    const padded = plate5.build({ ...plate5.defaults, alignSides: false }, ctx)
    near(padded.get('tv_left_en')?.margin?.l, ctx.k(3))
    near(padded.get('tv_right_en')?.margin?.r, ctx.k(3))
  })

  it('双行拼音（J1）：拆分到子行、主拼音条清空', () => {
    const patches = plate5.build(
      { ...plate5.defaults, leftStartDouble: true, leftEnDouble: true, leftStart2: '北京', leftStartEn2: 'BEIJING' },
      ctx,
    )
    expect(patches.get('tv_left_en')?.text).toBe('')
    expect(patches.get('tv_left_start_en_1')?.text).toBe('JIAGEDAQI')
    expect(patches.get('tv_left_start_en_2')).toMatchObject({ text: 'BEIJING', visible: true })
  })

  it('中间车次：按行显示并改路徽大小', () => {
    const withOne = plate5.build({ ...plate5.defaults, middleNumber1: 'Z' }, ctx)
    expect(withOne.get('tv_number_31')).toMatchObject({ text: 'Z', visible: true })
    expect(withOne.get('tv_number_32')?.visible).toBe(false)
    near(withOne.get('iv_icon')?.width, ctx.k(43.8))
    const withTwo = plate5.build({ ...plate5.defaults, middleNumber1: 'Z', middleNumber2: '1' }, ctx)
    near(withTwo.get('iv_icon')?.width, ctx.k(42.5))
    const withThree = plate5.build(
      { ...plate5.defaults, middleNumber1: 'Z', middleNumber2: '1', middleNumber3: '23' },
      ctx,
    )
    near(withThree.get('iv_icon')?.width, ctx.k(37))
  })
})
