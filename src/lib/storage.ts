// 브라우저 저장소를 안전하게 쓰기 위한 작은 도우미.
// 비공개 창 등에서는 저장소가 막혀 있을 수 있으므로 실패해도 앱이 멈추지 않게 한다.

const PREFIX = 'firefly:'

export function readJson<T>(key: string, store: Storage | undefined = safeLocal()): T | null {
  if (!store) return null
  try {
    const raw = store.getItem(PREFIX + key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown, store: Storage | undefined = safeLocal()): void {
  if (!store) return
  try {
    store.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // 저장 공간이 없거나 막혀 있으면 조용히 넘어간다. (기능은 메모리 상태로 계속 동작)
  }
}

export function removeKey(key: string, store: Storage | undefined = safeLocal()): void {
  if (!store) return
  try {
    store.removeItem(PREFIX + key)
  } catch {
    // 무시
  }
}

/** 반딧불이가 이 기기에 저장한 값을 모두 지운다 (Supabase 로그인 정보 제외) */
export function clearAllFireflyData(): void {
  for (const store of [safeLocal(), safeSession()]) {
    if (!store) continue
    try {
      const keys: string[] = []
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i)
        if (key?.startsWith(PREFIX)) keys.push(key)
      }
      keys.forEach((key) => store.removeItem(key))
    } catch {
      // 무시
    }
  }
}

export function safeLocal(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}

export function safeSession(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage
  } catch {
    return undefined
  }
}
