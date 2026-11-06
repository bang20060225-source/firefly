// 개인정보 안내 (요약). 법률 검토 전 초안이며, 확정본으로 교체해야 한다.
import { navigate } from '../app/useHashRoute'
import { Button, Card, ScreenHeader } from '../components/ui'
import { CONSENT_VERSION } from '../config'

export function PrivacyInfo() {
  return (
    <div className="pb-28">
      <ScreenHeader title="개인정보 안내" subtitle="반딧불이가 무엇을 저장하고, 무엇을 저장하지 않는지" />
      <main className="mx-auto max-w-md space-y-3 px-5 text-[14px] leading-relaxed text-night-200">
        <p className="rounded-2xl border border-dashed border-night-600 px-4 py-3 text-[13px] text-night-300">
          법률 검토 전 초안이에요 (버전 {CONSENT_VERSION}). 정식 이용약관과 개인정보 처리방침은 출시 전에 준비돼요.
        </p>

        <Card>
          <h2 className="mb-2 text-[15px] font-medium text-night-100">서버에 저장하는 것</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>익명 사용자 번호 (자동으로 만들어져요)</li>
            <li>설정: 불빛 공개 방식, 움직임·소리·진동 설정</li>
            <li>나이 구간 (생년월일은 받지 않아요)</li>
            <li>밤하늘에 남긴 불빛 — 2시간 뒤 조회에서 사라지고 이후 정리돼요</li>
            <li>너무 잦은 요청을 막기 위한 마지막 요청 시각 (이력이 아닌 한 줄)</li>
            <li>직접 연결한 경우에만 이메일 주소</li>
          </ul>
        </Card>

        <Card>
          <h2 className="mb-2 text-[15px] font-medium text-night-100">이 기기에만 남는 것</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>오늘의 작은 행동 — 오늘 하루치만, 서버로 보내지 않아요</li>
            <li>화면 설정을 빠르게 불러오기 위한 값</li>
          </ul>
        </Card>

        <Card>
          <h2 className="mb-2 text-[15px] font-medium text-night-100">받지 않는 것</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>이름, 전화번호, 연락처</li>
            <li>정확한 위치 (밤하늘의 불빛 위치는 무작위예요)</li>
            <li>마음 상태나 진단 정보 — 반딧불이는 마음을 살피거나 판단하지 않아요</li>
          </ul>
        </Card>

        <Card>
          <h2 className="mb-2 text-[15px] font-medium text-night-100">다른 사람에게 보이는 것</h2>
          <p>
            내가 공개한 불빛의 '위치와 시간'만 보여요. 누가 남겼는지, 내 계정이나 이메일은 다른 사람이 알 수 없어요.
            작은 행동 기록은 누구에게도 보이지 않아요.
          </p>
        </Card>

        <Card>
          <h2 className="mb-2 text-[15px] font-medium text-night-100">지우는 방법</h2>
          <p>설정에서 '데이터 삭제' 또는 '계정 탈퇴'를 누르면 바로 지울 수 있어요.</p>
        </Card>

        <Button variant="ghost" className="w-full" onClick={() => navigate('settings')}>
          설정으로 돌아가기
        </Button>
      </main>
    </div>
  )
}
