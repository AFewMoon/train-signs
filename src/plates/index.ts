import type { PlateSpec } from './types'
import { plate8 } from './plate8'
import { plate9 } from './plate9'

export const PLATES: PlateSpec[] = [plate8, plate9]

export function getPlate(id: string): PlateSpec {
  return PLATES.find((plate) => plate.id === id) ?? PLATES[0]
}
