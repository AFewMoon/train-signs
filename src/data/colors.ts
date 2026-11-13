/** APK res/values/colors.xml 中与水牌相关的颜色。 */
export const COLORS = {
  white: '#ffffff',
  black: '#000000',
  textPrimary: '#000000',
  kuaisu1: '#ff3145',
  kuaisu2: '#36854e',
  linke1: '#406148',
  linke2: '#116384',
  luyong1: '#3a7f30',
  luyong2: '#315f5b',
  puke1: '#35996b',
  puke2: '#436b6c',
  puke3: '#1b1d1c',
  pukuai1: '#007655',
  pukuai2: '#1dae4f',
  tekuai1: '#3c456c',
  tekuai2: '#193ed1',
  tekuai3: '#1d5841',
  tekuai4: '#03aae9',
  zhida1: '#141637',
  zhida2: '#032f94',
  zhida3: '#1d74c6',
  zhida4: '#05b2d6',
  zhida5: '#114930',
  elecLine1: '#ffe93e',
  elecLine2: '#faffa7',
  elecLine3: '#fedb3f',
  elecNumber: '#a0ab69',
  elecStation1: '#f3be58',
  elecStation2: '#fbfb81',
  elecStation3: '#a33d27',
} as const

export interface ColorOption {
  label: string
  value: string
}

/** c.a.a.f.l.a()：电子水牌站名/车厢号颜色。 */
export const ELEC_STATION_COLORS: ColorOption[] = [
  { label: '琥珀黄（示例1）', value: COLORS.elecStation1 },
  { label: '浅黄（示例2）', value: COLORS.elecStation2 },
  { label: '砖红（示例3）', value: COLORS.elecStation3 },
]

/** c.a.a.f.l.b()：电子水牌文字颜色。 */
export const ELEC_LINE_COLORS: ColorOption[] = [
  { label: '明黄（示例1）', value: COLORS.elecLine1 },
  { label: '淡黄（示例2）', value: COLORS.elecLine2 },
  { label: '金黄（示例3）', value: COLORS.elecLine3 },
]

export interface LevelPreset {
  id: string
  label: string
  text: string
  color: string
}

/** c.a.a.f.l.c()/d() 中的列车等级与颜色组合（节选常用项）。 */
export const LEVEL_PRESETS: LevelPreset[] = [
  { id: 'zhida1', label: '直达特快（藏青）', text: '直达特快', color: COLORS.zhida1 },
  { id: 'zhida2', label: '直达特快（深蓝）', text: '直达特快', color: COLORS.zhida2 },
  { id: 'zhida3', label: '直达特快（蓝）', text: '直达特快', color: COLORS.zhida3 },
  { id: 'zhida4', label: '直达特快（青）', text: '直达特快', color: COLORS.zhida4 },
  { id: 'zhida5', label: '直达特快（墨绿）', text: '直达特快', color: COLORS.zhida5 },
  { id: 'tekuai1', label: '特快（灰蓝）', text: '特快', color: COLORS.tekuai1 },
  { id: 'tekuai2', label: '特快（蓝）', text: '特快', color: COLORS.tekuai2 },
  { id: 'tekuai3', label: '特快（深绿）', text: '特快', color: COLORS.tekuai3 },
  { id: 'tekuai4', label: '特快（天蓝）', text: '特快', color: COLORS.tekuai4 },
  { id: 'kuaisu1', label: '快速（红）', text: '快速', color: COLORS.kuaisu1 },
  { id: 'kuaisu2', label: '快速（绿）', text: '快速', color: COLORS.kuaisu2 },
  { id: 'pukuai1', label: '普快（深绿）', text: '普快', color: COLORS.pukuai1 },
  { id: 'pukuai2', label: '普快（绿）', text: '普快', color: COLORS.pukuai2 },
  { id: 'puke1', label: '普客（青）', text: '普客', color: COLORS.puke1 },
  { id: 'puke2', label: '普客（墨绿）', text: '普客', color: COLORS.puke2 },
  { id: 'linke1', label: '临客（墨绿）', text: '临客', color: COLORS.linke1 },
  { id: 'linke2', label: '临客（深青）', text: '临客', color: COLORS.linke2 },
  { id: 'luyong1', label: '路用（绿）', text: '路用', color: COLORS.luyong1 },
  { id: 'luyong2', label: '路用（青绿）', text: '路用', color: COLORS.luyong2 },
]
