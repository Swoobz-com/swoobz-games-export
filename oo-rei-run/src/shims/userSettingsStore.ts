/**
 * SHIM for `@/lib/userSettings/userSettingsStore` in the standalone runner.
 * The real module is a Zustand store of per-user preferences. The game reads
 * `useUserSettings.getState()` for SFX volume / mute. This shim returns sensible
 * defaults and supports both the hook form and the `.getState()` static form.
 */
export interface UserSettings {
  masterMuted: boolean
  sfxVolume: number
  musicVolume: number
}

const state: UserSettings = {
  masterMuted: false,
  sfxVolume: 1,
  musicVolume: 1,
}

type Selector<T> = (s: UserSettings) => T

function hook(): UserSettings
function hook<T>(selector: Selector<T>): T
function hook<T>(selector?: Selector<T>): T | UserSettings {
  return selector ? selector(state) : state
}

export const useUserSettings = Object.assign(hook, {
  getState: (): UserSettings => state,
  setState: (_partial: Partial<UserSettings>): void => {},
  subscribe: (): (() => void) => () => {},
})
