import type { PlateSpec } from './types'
import { plate8 } from './plate8'
import { plate9 } from './plate9'
import { plate0 } from './plate0'
import { plate1 } from './plate1'
import { plate2 } from './plate2'
import { plate3 } from './plate3'
import { plate4 } from './plate4'
import { plate5 } from './plate5'
import { plate6 } from './plate6'
import { plate7 } from './plate7'

const all: Array<PlateSpec | null> = [
  plate0,
  plate1,
  plate2,
  plate3,
  plate4,
  plate5,
  plate6,
  plate7,
  plate8,
  plate9,
]

export const PLATES: PlateSpec[] = all.filter((plate): plate is PlateSpec => plate !== null)

export function getPlate(id: string): PlateSpec {
  const found = PLATES.find((plate) => plate.id === id)
  if (!found) throw new Error(`未实现的水牌样式：${id}`)
  return found
}
