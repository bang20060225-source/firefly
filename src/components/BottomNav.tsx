import { navigate, type Route } from '../app/useHashRoute'

const items: { route: Route; label: string; icon: string }[] = [
  { route: 'sky', label: '밤하늘', icon: 'M4 18c3-1 5-4 8-4s5 3 8 4M7 7.5a1 1 0 1 0 0-.01M16 5a1 1 0 1 0 0-.01M12 9.5a1 1 0 1 0 0-.01' },
  { route: 'room', label: '나의 방', icon: 'M5 20V9l7-5 7 5v11zM10 20v-5h4v5' },
  { route: 'action', label: '작은 행동', icon: 'M12 4c3 3 5 5.5 5 8.5a5 5 0 0 1-10 0C7 9.5 9 7 12 4z' },
  { route: 'settings', label: '설정', icon: 'M5 7h14M5 12h14M5 17h14M9 5v4M15 10v4M8 15v4' },
]

export function BottomNav({ current }: { current: Route }) {
  return (
    <nav
      aria-label="주요 화면"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-night-800 bg-night-950/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-md">
        {items.map((item) => {
          const active = current === item.route
          return (
            <li key={item.route} className="flex-1">
              <button
                type="button"
                onClick={() => navigate(item.route)}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 w-full flex-col items-center justify-center gap-1 text-[12px] ${
                  active ? 'text-glow-300' : 'text-night-300 hover:text-night-100'
                }`}
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={item.icon} />
                </svg>
                {item.label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
