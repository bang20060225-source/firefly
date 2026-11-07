// 설정
import { useState } from 'react'
import { useApp } from '../app/AppProvider'
import { backend } from '../app/backendInstance'
import { navigate } from '../app/useHashRoute'
import { usePrefersReducedMotion } from '../app/usePrefersReducedMotion'
import { Button, Card, ConfirmDialog, LiveMessage, ScreenHeader, Toggle } from '../components/ui'
import { VisibilityPicker } from '../components/VisibilityPicker'
import { config } from '../config'
import { playSound } from '../lib/sound'
import { clearAllFireflyData, removeKey } from '../lib/storage'
import { errorMessage } from '../services/backend'
import type { UserSettings } from '../types'
import { AccountSection } from './AccountSection'

export function Settings() {
  const { settings, updateSettings, restartFromScratch, musicEnabled, setMusicEnabled } = useApp()
  const systemReduceMotion = usePrefersReducedMotion()
  const [message, setMessage] = useState<string | null>(null)
  const [dialog, setDialog] = useState<'data' | 'account' | null>(null)
  const [busy, setBusy] = useState(false)

  if (!settings) return null

  async function toggle(key: keyof Pick<UserSettings, 'reduceMotion' | 'soundEnabled' | 'vibrationEnabled'>, value: boolean) {
    setMessage(null)
    const patch: Partial<UserSettings> = {}
    patch[key] = value
    try {
      await updateSettings(patch)
    } catch (err) {
      setMessage(errorMessage(err))
    }
  }

  async function deleteData() {
    setBusy(true)
    try {
      await backend.deleteMyData()
      removeKey('today-action')
      setDialog(null)
      restartFromScratch()
      navigate('sky')
    } catch (err) {
      setMessage(errorMessage(err))
      setDialog(null)
    } finally {
      setBusy(false)
    }
  }

  async function deleteAccount() {
    setBusy(true)
    try {
      await backend.deleteAccount()
      setMusicEnabled(false)
      clearAllFireflyData()
      setDialog(null)
      restartFromScratch()
      navigate('sky')
    } catch (err) {
      setMessage(errorMessage(err))
      setDialog(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pb-28">
      <ScreenHeader title="설정" />
      <main className="mx-auto max-w-md space-y-4 px-5">
        <Card>
          <VisibilityPicker />
        </Card>

        <Card>
          <h2 className="text-[15px] font-medium text-night-100">편안하게 보기</h2>
          <div className="divide-y divide-night-700">
            <Toggle
              label="움직임 줄이기"
              description={
                systemReduceMotion
                  ? '기기에서 동작 줄이기가 켜져 있어서 이미 움직임을 줄였어요.'
                  : '불빛이 떠다니지 않고, 온기는 은은하게만 번져요.'
              }
              checked={settings.reduceMotion || systemReduceMotion}
              disabled={systemReduceMotion}
              onChange={(value) => void toggle('reduceMotion', value)}
            />
            <Toggle
              label="배경음"
              description="잔잔한 피아노 음악이 흘러요. 시간대에 따라 분위기가 조금씩 바뀌고, 밤에는 풀벌레 소리가 섞여요. 이 기기에만 저장돼요."
              checked={musicEnabled}
              onChange={(value) => setMusicEnabled(value)}
            />
            <Toggle
              label="효과음"
              description="불빛을 보태거나 온기를 보낼 때, 방 안 물건을 누를 때 작은 소리가 나요. 홈과 나의 방의 '소리' 버튼은 배경음과 효과음을 함께 켜고 꺼요. 휴대폰이 무음 모드면 들리지 않을 수 있어요."
              checked={settings.soundEnabled}
              onChange={(value) => {
                if (value) playSound('tap', true)
                void toggle('soundEnabled', value)
              }}
            />
            <Toggle
              label="진동"
              description="불빛을 보태거나 온기를 보낼 때 아주 짧게 진동해요. (지원하는 기기만)"
              checked={settings.vibrationEnabled}
              onChange={(value) => void toggle('vibrationEnabled', value)}
            />
          </div>
          <LiveMessage message={message} tone="warn" />
        </Card>

        <Card>
          <h2 className="mb-2 text-[15px] font-medium text-night-100">계정 연결 (선택)</h2>
          <AccountSection />
        </Card>

        <Card className="!px-2 !py-2">
          <ul>
            {(
              [
                ['개인정보 안내', 'privacy'],
                ['도움받기', 'help'],
              ] as const
            ).map(([label, route]) => (
              <li key={route}>
                <button
                  type="button"
                  onClick={() => navigate(route)}
                  className="flex min-h-12 w-full items-center justify-between rounded-2xl px-3 text-left text-[15px] text-night-100 hover:bg-night-700/60"
                >
                  {label}
                  <span aria-hidden="true" className="text-night-300">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="text-[15px] font-medium text-night-100">지우기</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-night-300">언제든 떠나거나 다시 시작해도 괜찮아요.</p>
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="soft" onClick={() => setDialog('data')}>
              데이터 삭제
            </Button>
            <Button variant="danger" onClick={() => setDialog('account')}>
              계정 탈퇴
            </Button>
          </div>
        </Card>

        <p className="pb-4 text-center text-[12px] text-night-300">
          반딧불이 MVP 0.1 · {config.demoMode ? 'DEMO 모드 (서버 미연결)' : 'Supabase 서버 연결됨'}
        </p>
      </main>

      <ConfirmDialog
        open={dialog === 'data'}
        title="데이터를 지울까요?"
        confirmLabel="지우기"
        tone="danger"
        busy={busy}
        onConfirm={() => void deleteData()}
        onClose={() => setDialog(null)}
      >
        <p>밤하늘의 내 불빛, 설정, 이 기기의 작은 행동 기록이 지워져요.</p>
        <p>계정과 나이 확인 기록은 남아서, 바로 다시 이용할 수 있어요.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === 'account'}
        title="계정을 탈퇴할까요?"
        confirmLabel="탈퇴하고 모두 지우기"
        tone="danger"
        busy={busy}
        onConfirm={() => void deleteAccount()}
        onClose={() => setDialog(null)}
      >
        <p>계정과 반딧불이의 모든 데이터가 지워지고 되돌릴 수 없어요.</p>
        <p>나중에 언제든 새로 시작할 수 있어요.</p>
      </ConfirmDialog>
    </div>
  )
}
