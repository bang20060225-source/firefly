// 앱 전체에서 하나만 쓰는 백엔드 인스턴스
import { config } from '../config'
import type { FireflyBackend } from '../services/backend'
import { createDemoBackend } from '../services/demoBackend'
import { createSupabaseBackend } from '../services/supabaseBackend'

export const demoBackend = config.demoMode ? createDemoBackend() : null

export const backend: FireflyBackend =
  demoBackend ?? createSupabaseBackend(config.supabaseUrl, config.supabaseKey)
