/**
 * SHIM for `next/navigation` in the Pulse standalone runner.
 * PulseExperience only uses `useRouter().push` (the "back to lobby" button).
 */
export function useRouter() {
  return {
    push: (href: string) => {
      // No /originals route in the standalone runner — log instead of
      // navigating away from the game.
      console.info('[router.push]', href)
    },
    replace: (href: string) => console.info('[router.replace]', href),
    back: () => console.info('[router.back]'),
    forward: () => console.info('[router.forward]'),
    refresh: () => {},
    prefetch: () => {},
  }
}

export function usePathname() {
  return '/originals/pulse'
}

export function useSearchParams() {
  return new URLSearchParams()
}
