/** SHIM for `next/navigation` in the standalone runner. */
export function useRouter() {
  return {
    push: (href: string) => console.info('[router.push]', href),
    replace: (href: string) => console.info('[router.replace]', href),
    back: () => console.info('[router.back]'),
    forward: () => console.info('[router.forward]'),
    refresh: () => {},
    prefetch: () => {},
  }
}
export function usePathname() {
  return '/originals/oo-rei'
}
export function useSearchParams() {
  return new URLSearchParams()
}
