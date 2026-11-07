// 전문 지원기관 안내
// ⚠️ 출시 전 반드시 각 공식 기관 자료로 번호·운영시간·링크를 다시 확인해야 한다.
//    확인을 마치면 HELP_INFO_VERIFIED 를 true 로 바꾸고 VERIFIED_ON 에 날짜를 적는다.

//
// 확인 기록 (2026-11-07)
//  · 1577-0199: 서울시 공식 누리집(2026-04-27 게시)에 '365일 24시간 운영'으로 확인
//  · 109: 2024년 1월 자살예방 상담번호 통합. 24시간 운영은 언론 보도(2025-11)로만 확인 → 보건복지부 자료로 재확인 필요
//  · 1388, 119, 링크 주소: 아직 공식 자료로 재확인하지 않음
//  · 추가 검토: 전화가 어려운 사람을 위한 자살예방 SNS 상담 '마들랜' (공식 주소 확인 후 추가)

export const HELP_INFO_VERIFIED = false
export const VERIFIED_ON: string | null = null

export type HelpContact = {
  name: string
  number?: string
  description: string
  hours?: string
  link?: { label: string; url: string }
  urgent?: boolean
}

export const HELP_CONTACTS: HelpContact[] = [
  {
    name: '긴급 상황',
    number: '119',
    description: '지금 나나 다른 사람이 위험하다면 바로 전화해 주세요.',
    hours: '24시간',
    urgent: true,
  },
  {
    name: '자살예방상담전화',
    number: '109',
    description: '마음이 많이 힘들 때 이야기할 수 있어요.',
    hours: '24시간',
  },
  {
    name: '정신건강위기상담전화',
    number: '1577-0199',
    description: '정신건강 관련 상담과 가까운 기관 안내를 받을 수 있어요.',
    hours: '24시간',
  },
  {
    name: '청소년상담 1388',
    number: '1388',
    description: '청소년이 고민을 털어놓을 수 있는 상담 전화예요.',
    hours: '24시간',
    link: { label: '온라인 상담 (청소년사이버상담센터)', url: 'https://www.cyber1388.kr' },
  },
  {
    name: '지역 정신건강복지센터',
    description: '내가 사는 지역의 정신건강 지원기관을 찾을 수 있어요.',
    link: { label: '국가정신건강정보포털에서 찾기', url: 'https://www.mentalhealth.go.kr' },
  },
]
