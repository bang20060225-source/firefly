/** 아주 짧은 진동. 사용자가 진동을 켠 경우에만, 지원하는 기기에서만 동작한다. */
export function softVibrate(enabled: boolean): void {
  if (!enabled) return
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(20)
  } catch {
    // 지원하지 않으면 아무것도 하지 않는다
  }
}
