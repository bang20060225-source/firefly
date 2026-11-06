import { config } from '../config'

/** DEMO 모드임을 항상 보여준다. 실제 서비스가 동작한다고 오해하지 않게 하기 위함 */
export function DemoBanner() {
  if (!config.demoMode) return null
  return (
    <div className="sticky top-0 z-30 bg-[#3a2f52] px-4 py-2 text-center text-[12px] leading-snug text-[#f1e4ff]">
      <strong className="mr-1 font-semibold tracking-wide">DEMO</strong>
      서버에 연결되지 않았어요. 불빛은 이 기기에서만 보이고 다른 사람에게 닿지 않아요.
    </div>
  )
}
