// 실제 Supabase 서버와 연결하는 백엔드.
// 브라우저에는 publishable key 만 있고, 권한 확인은 모두 서버(RLS·서버 함수)가 한다.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { AgeCategory, AgeGate, ConnectionState, SharedLight, UserSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'
import {
  FireflyError,
  looksLikeEmail,
  toFireflyError,
  type FireflyBackend,
  type PublishResult,
  type SkyEvent,
  type SkySnapshot,
} from './backend'

type LightRow = { id: string; x: number; y: number; created_at: string; expires_at: string }

type SettingsRow = {
  user_id: string
  visibility_mode: UserSettings['visibilityMode']
  auto_consent_at: string | null
  reduce_motion: boolean
  sound_enabled: boolean
  vibration_enabled: boolean
}

const SKY_TOPIC = 'shared-sky'

function toLight(row: LightRow): SharedLight {
  return { id: row.id, x: row.x, y: row.y, createdAt: row.created_at, expiresAt: row.expires_at }
}

function toSettings(row: SettingsRow): UserSettings {
  return {
    visibilityMode: row.visibility_mode,
    autoConsentAt: row.auto_consent_at,
    reduceMotion: row.reduce_motion,
    soundEnabled: row.sound_enabled,
    vibrationEnabled: row.vibration_enabled,
  }
}

function redirectUrl(): string {
  return `${window.location.origin}${window.location.pathname}`
}

export function createSupabaseBackend(url: string, publishableKey: string): FireflyBackend {
  const supabase: SupabaseClient = createClient(url, publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })

  async function requireUserId(): Promise<string> {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw toFireflyError(error)
    const id = data.session?.user.id
    if (!id) throw new FireflyError('not_authenticated')
    return id
  }

  async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
    const { data, error } = await supabase.rpc(name, args)
    if (error) throw toFireflyError(error)
    return data as T
  }

  return {
    mode: 'supabase',

    async hasSession() {
      const { data } = await supabase.auth.getSession()
      return data.session !== null
    },

    async startAnonymous() {
      const { error } = await supabase.auth.signInAnonymously()
      if (error) throw toFireflyError(error)
    },

    async getAgeGate() {
      const userId = await requireUserId()
      const { data, error } = await supabase
        .from('age_gate_records')
        .select('age_category, consent_status')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw toFireflyError(error)
      if (!data) return null
      return { ageCategory: data.age_category, status: data.consent_status } as AgeGate
    },

    async submitAgeGate(category: AgeCategory, consentVersion: string) {
      const status = await rpc<AgeGate['status']>('submit_age_gate', {
        p_age_category: category,
        p_consent_version: consentVersion,
      })
      return { ageCategory: category, status }
    },

    async loadSettings() {
      const userId = await requireUserId()
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle<SettingsRow>()
      if (error) throw toFireflyError(error)
      if (data) return toSettings(data)

      // 처음 들어온 사용자: 기본값(private)으로 한 줄 만든다
      const { data: created, error: insertError } = await supabase
        .from('user_settings')
        .insert({ user_id: userId })
        .select('*')
        .single<SettingsRow>()
      if (insertError) throw toFireflyError(insertError)
      return created ? toSettings(created) : { ...DEFAULT_SETTINGS }
    },

    async saveSettings(settings: UserSettings) {
      const userId = await requireUserId()
      const { data, error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          visibility_mode: settings.visibilityMode,
          auto_consent_at: settings.visibilityMode === 'auto' ? settings.autoConsentAt : null,
          reduce_motion: settings.reduceMotion,
          sound_enabled: settings.soundEnabled,
          vibration_enabled: settings.vibrationEnabled,
        })
        .select('*')
        .single<SettingsRow>()
      if (error) throw toFireflyError(error)
      return toSettings(data)
    },

    async getSharedSky(): Promise<SkySnapshot> {
      const data = await rpc<{ server_time: string; lights: LightRow[] }>('get_shared_sky')
      return { serverTime: data.server_time, lights: data.lights.map(toLight) }
    },

    async getMyLight() {
      const data = await rpc<LightRow | null>('get_my_light')
      return data ? toLight(data) : null
    },

    async publishLight(source): Promise<PublishResult> {
      const data = await rpc<{ status: PublishResult['status']; server_time: string; light: LightRow }>(
        'publish_light',
        { p_source: source },
      )
      return { status: data.status, serverTime: data.server_time, light: toLight(data.light) }
    },

    async cancelMyLight() {
      return rpc<boolean>('cancel_my_light')
    },

    async sendAmbientWave() {
      const data = await rpc<{ wave_id: string }>('send_ambient_wave')
      return { waveId: data.wave_id }
    },

    subscribeSky(onEvent: (event: SkyEvent) => void, onStatus: (state: ConnectionState) => void) {
      let closedByUs = false
      onStatus('connecting')

      const channel = supabase.channel(SKY_TOPIC, { config: { private: true } })
      channel
        .on('broadcast', { event: 'light_added' }, ({ payload }) => {
          onEvent({ type: 'light_added', light: toLight(payload as LightRow) })
        })
        .on('broadcast', { event: 'light_removed' }, ({ payload }) => {
          onEvent({ type: 'light_removed', id: String((payload as { id: string }).id) })
        })
        .on('broadcast', { event: 'ambient_wave' }, ({ payload }) => {
          onEvent({ type: 'ambient_wave', waveId: String((payload as { wave_id: string }).wave_id) })
        })

      // 비공개 채널은 로그인 토큰으로 권한을 확인한다
      void supabase.realtime.setAuth().finally(() => {
        if (closedByUs) return
        channel.subscribe((status) => {
          if (closedByUs) return
          if (status === 'SUBSCRIBED') onStatus('connected')
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') onStatus('reconnecting')
          else if (status === 'CLOSED') onStatus('offline')
        })
      })

      return () => {
        closedByUs = true
        void supabase.removeChannel(channel)
      }
    },

    async getAccount() {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw toFireflyError(error)
      const user = data.user
      return {
        isAnonymous: user?.is_anonymous ?? true,
        email: user?.email ?? null,
        pendingEmail: user?.new_email ?? null,
      }
    },

    async linkEmail(email: string) {
      if (!looksLikeEmail(email)) throw new FireflyError('invalid_email')
      const { error } = await supabase.auth.updateUser(
        { email: email.trim() },
        { emailRedirectTo: redirectUrl() },
      )
      if (error) throw toFireflyError(error)
    },

    async sendSignInLink(email: string) {
      if (!looksLikeEmail(email)) throw new FireflyError('invalid_email')
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        // 새 계정을 만들지 않는다: 이미 연결된 이메일로만 로그인
        options: { shouldCreateUser: false, emailRedirectTo: redirectUrl() },
      })
      if (error) throw toFireflyError(error)
    },

    async deleteMyData() {
      await rpc<null>('delete_my_data')
    },

    async deleteAccount() {
      const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' })
      if (error) throw toFireflyError(error)
      await supabase.auth.signOut({ scope: 'local' })
    },
  }
}
