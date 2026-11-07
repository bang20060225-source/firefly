// 오늘의 작은 행동 목록.
// 건강이나 치료 효과를 약속하는 표현은 쓰지 않는다.
// 몸을 움직이기 어려운 사람도 고를 수 있도록 '앉아서/누워서 할 수 있는 행동'을 섞어 둔다.

export type DailyAction = {
  id: string
  /** 화면에 보이는 행동 */
  title: string
  /** 짧은 덧붙임. 강요하지 않는 말투 */
  note: string
  /** 몸을 크게 움직이지 않아도 할 수 있는지 */
  lowMobility: boolean
}

export const DAILY_ACTIONS: DailyAction[] = [
  { id: 'water', title: '물 한 모금 마시기', note: '한 모금이면 충분해요.', lowMobility: true },
  { id: 'window', title: '창문 열어보기', note: '잠깐이어도 괜찮아요.', lowMobility: false },
  { id: 'stretch', title: '기지개 켜기', note: '팔만 쭉 뻗어도 좋아요.', lowMobility: true },
  { id: 'sky', title: '하늘 바라보기', note: '창밖이 어떤지 한 번 보기.', lowMobility: true },
  { id: 'sit-up', title: '침대에서 일어나 앉기', note: '앉는 것까지만요.', lowMobility: false },
  { id: 'song', title: '좋아하는 노래 듣기', note: '한 곡만 골라도 돼요.', lowMobility: true },
  { id: 'breath', title: '숨 천천히 세 번 쉬기', note: '세는 건 대충 해도 돼요.', lowMobility: true },
  { id: 'light', title: '방 불 하나 켜기', note: '조금 밝아지는 정도로.', lowMobility: false },
  { id: 'hands', title: '손 따뜻하게 비비기', note: '손바닥끼리 살살.', lowMobility: true },
  { id: 'smell', title: '좋아하는 향 맡아보기', note: '비누나 차, 무엇이든.', lowMobility: true },
  { id: 'tidy', title: '눈앞의 물건 하나 제자리에 두기', note: '딱 하나만요.', lowMobility: false },
  { id: 'blanket', title: '이불 정리하기', note: '대충 펴 두기만 해도 돼요.', lowMobility: false },
  { id: 'face', title: '얼굴에 시원한 물 묻히기', note: '손끝으로만 톡톡.', lowMobility: false },
]
