/**
 * SHIM for `lib/onchain/originals-oo-fisher/client` in the standalone runner.
 * The real module encodes Anchor instruction payloads for on-chain submission.
 * Here the on-chain flag is off (mock path), so these encoders only need to
 * return opaque placeholder payloads — they are passed to a dev sink that logs.
 */
export interface InstructionPayload {
  readonly kind: string
  readonly data: Uint8Array
}

const mk = (kind: string): InstructionPayload => ({ kind, data: new Uint8Array() })

export const encodeStartTrip = (_args?: unknown): InstructionPayload => mk('start-trip')
export const encodeCommitCast = (_args?: unknown): InstructionPayload => mk('commit-cast')
export const encodeResolveCast = (_args?: unknown): InstructionPayload => mk('resolve-cast')
export const encodeSettleTrip = (_args?: unknown): InstructionPayload => mk('settle-trip')
export const encodeCashOutTrip = (_args?: unknown): InstructionPayload => mk('cash-out-trip')
