// 도움받기 — 사용자가 원할 때 전문 지원기관을 확인하는 화면
import { navigate } from '../app/useHashRoute'
import { Button, ScreenHeader } from '../components/ui'
import { HELP_CONTACTS, HELP_INFO_VERIFIED, VERIFIED_ON } from '../data/helpContacts'

export function HelpList({ highlightYouth = false }: { highlightYouth?: boolean }) {
  const contacts = highlightYouth
    ? [...HELP_CONTACTS].sort((a, b) => Number(b.number === '1388') - Number(a.number === '1388'))
    : HELP_CONTACTS

  return (
    <>
      <ul className="space-y-3">
        {contacts.map((contact) => (
          <li
            key={contact.name}
            className={`rounded-3xl px-5 py-4 ring-1 ${
              contact.urgent ? 'bg-[#4a2f3d] ring-[#ffb4a8]/40' : 'bg-night-800/80 ring-night-700'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[15px] font-medium text-night-100">{contact.name}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-night-300">{contact.description}</p>
                {contact.hours && <p className="mt-1 text-[12px] text-night-300">운영: {contact.hours}</p>}
              </div>
              {contact.number && (
                <a
                  href={`tel:${contact.number.replace(/-/g, '')}`}
                  className="flex min-h-11 shrink-0 items-center rounded-2xl bg-night-700 px-4 text-[16px] font-semibold text-glow-300 ring-1 ring-night-600"
                  aria-label={`${contact.name} ${contact.number}에 전화하기`}
                >
                  {contact.number}
                </a>
              )}
            </div>
            {contact.link && (
              <a
                href={contact.link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-11 items-center text-[13px] text-glow-300 underline underline-offset-4"
              >
                {contact.link.label} ↗
              </a>
            )}
          </li>
        ))}
      </ul>
      {HELP_INFO_VERIFIED ? (
        VERIFIED_ON && (
          <p className="mt-3 text-[12px] leading-relaxed text-night-300">
            ※ 번호와 운영시간은 {VERIFIED_ON.replaceAll('-', '.')} 공식 기관 자료로 확인했어요. 바뀔 수 있으니 위급할 땐 119에
            연락해 주세요.
          </p>
        )
      ) : (
        <p className="mt-3 text-[12px] leading-relaxed text-night-300">
          ※ 연락처와 운영시간은 출시 전 공식 기관 자료로 다시 확인하는 중이에요. 실제와 다를 수 있어요.
        </p>
      )}
    </>
  )
}

export function Help() {
  return (
    <div className="pb-28">
      <ScreenHeader
        title="도움받기"
        subtitle="필요할 때 언제든 열어 볼 수 있어요. 반딧불이는 전문 상담이나 의료 서비스를 대신하지 않아요."
      />
      <main className="mx-auto max-w-md px-5">
        <HelpList />
        <Button variant="ghost" className="mt-6 w-full" onClick={() => navigate('sky')}>
          밤하늘로 돌아가기
        </Button>
      </main>
    </div>
  )
}
