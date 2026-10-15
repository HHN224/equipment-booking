const paths: Record<string, string> = {
  box: 'M12 3 3 7.5v9L12 21l9-4.5v-9L12 3Zm0 9L3 7.5m9 4.5 9-4.5M12 12v9M7.5 5.25l9 4.5',
  camera:
    'M14 4h-4L8 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-4l-2-3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  projector: 'M4 5h16v12H4V5Zm4 16 4-4 4 4M1 5h22M8 9h8M8 12h5',
  phone: 'M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Zm3 3h4m-3 14h2',
  audio: 'M9 3h6v12H9V3Zm-3 8v2a6 6 0 0 0 12 0v-2M12 19v3m-3 0h6',
  calendar: 'M4 5h16v16H4V5Zm4-3v6m8-6v6M4 11h16m-12 4h2m4 0h2',
  settings: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  logout: 'M9 3H4v18h5m1-9h11m-4-4 4 4-4 4',
  search: 'M16 10a6 6 0 1 1-12 0 6 6 0 0 1 12 0Zm-1 5 6 6',
  pin: 'M19 9c0 6-7 12-7 12S5 15 5 9a7 7 0 0 1 14 0ZM14 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z',
  check: 'm5 12 4 4L19 6',
  sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1',
}
export default function AppIcon({ name = 'box', size = 22 }: { name?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.box} />
    </svg>
  )
}
