/**
 * SHIM for `next/dynamic` in the standalone runner.
 * Wraps the loader in React.lazy + a Suspense boundary so the lazy-loaded
 * component (the 3D scene) renders client-side without a Next.js runtime.
 */
import { type ComponentType, createElement, lazy, Suspense } from 'react'

type Loader<P> = () => Promise<{ default: ComponentType<P> }>

export default function dynamic<P extends object>(
  loader: Loader<P>,
  _opts?: { ssr?: boolean },
): ComponentType<P> {
  const Lazy = lazy(loader)
  return function DynamicComponent(props: P) {
    return createElement(Suspense, { fallback: null }, createElement(Lazy, props))
  }
}
