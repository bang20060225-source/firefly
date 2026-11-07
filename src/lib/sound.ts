// 효과음을 내는 입구. 설정에서 '효과음'을 켠 경우에만 소리가 난다. (기본은 꺼짐)
// 실제 소리는 audio/ 폴더에서 브라우저가 바로 만든다. (소리 파일 없음)

import { playSfx } from './audio/engine'
import type { SfxKind } from './audio/sfx'

export type SoundKind = SfxKind

export function playSound(kind: SoundKind, enabled: boolean): void {
  if (!enabled) return
  playSfx(kind)
}
