// PHASE 1 PLACEHOLDER UI. Unstyled but functionally complete -- proves the whole flow
// (title -> mode -> vsIntro -> roundIntro -> fightBanner -> picking -> reveal -> resolve ->
// roundEnd/matchEnd) works end to end for both CPU and VS FRIEND modes. ALL game wiring
// lives in useFightController(); a phase-2 UI agent replaces only this file's rendering.

import { useState } from 'react';
import { useFightController } from '../provider/fightProvider';
import type { AiPersonality } from '../engine/fightAi';
import { MOVES } from '../engine/fightEngine';
import type { Move } from '../engine/fightEngine';

const MOVE_LABEL: Record<Move, string> = {
  strike: 'STRIKE',
  throw: 'THROW',
  block: 'BLOCK',
};

const PERSONALITIES: AiPersonality[] = ['brute', 'warden', 'oracle'];

export function FightExperience(): JSX.Element {
  const ctl = useFightController();
  const [joinCode, setJoinCode] = useState('');

  return (
    <main style={{ fontFamily: 'Geist, sans-serif', padding: 24, maxWidth: 640 }}>
      <h1 style={{ fontFamily: '"Geist Mono", monospace' }}>Frozen Requiem</h1>
      <p>
        Phase: <strong>{ctl.phase}</strong> | Round: {ctl.matchState.round} | Mode: {ctl.mode ?? 'none'}
      </p>

      {ctl.phase === 'title' && (
        <section>
          <p>STRIKE beats THROW. THROW beats BLOCK. BLOCK beats STRIKE.</p>
          <button onClick={ctl.enterModeSelect}>PLAY</button>
        </section>
      )}

      {ctl.phase === 'mode' && (
        <section>
          <h2>Choose your fight</h2>
          <div>
            <h3>VS CPU</h3>
            {PERSONALITIES.map((p) => (
              <button key={p} onClick={() => ctl.startCpu(p)} style={{ marginRight: 8 }}>
                {p.toUpperCase()}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <h3>VS FRIEND</h3>
            {ctl.mode !== 'friend' && (
              <>
                <button onClick={ctl.startFriendCreate}>CREATE ROOM</button>
                <div style={{ marginTop: 8 }}>
                  <input
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="ROOM CODE"
                  />
                  <button onClick={() => ctl.startFriendJoin(joinCode)}>JOIN</button>
                </div>
              </>
            )}
            {ctl.mode === 'friend' && (
              <p>
                Room: <strong>{ctl.friend.roomCode ?? 'connecting'}</strong> | Connected: {String(ctl.friend.connected)}
                {ctl.friend.joinFailed && ' | Join failed, try again'}
              </p>
            )}
          </div>
          <button onClick={ctl.backToTitle} style={{ marginTop: 16 }}>
            BACK
          </button>
        </section>
      )}

      {ctl.phase === 'vsIntro' && (
        <section>
          <h2>
            {ctl.mode === 'cpu' ? `PLAYER 1 VS ${ctl.aiPersonality?.toUpperCase()}` : 'PLAYER 1 VS FRIEND'}
          </h2>
        </section>
      )}

      {(ctl.phase === 'roundIntro' || ctl.phase === 'fightBanner') && (
        <section>
          <h2>{ctl.phase === 'roundIntro' ? `ROUND ${ctl.matchState.round}` : 'FIGHT!'}</h2>
        </section>
      )}

      {(ctl.phase === 'picking' || ctl.phase === 'reveal' || ctl.phase === 'resolve') && (
        <section>
          <p>Shot clock: {ctl.shotClockSeconds}</p>
          <p>
            P1 HP: {ctl.matchState.p1.hp} | P2 HP: {ctl.matchState.p2.hp} | Rounds P1: {ctl.matchState.p1.roundsWon} |
            Rounds P2: {ctl.matchState.p2.roundsWon}
          </p>
          {ctl.phase === 'picking' && (
            <div>
              {MOVES.map((m) => (
                <button
                  key={m}
                  disabled={ctl.playerPick.locked}
                  onClick={() => ctl.pick(m)}
                  style={{ marginRight: 8 }}
                >
                  {MOVE_LABEL[m]}
                </button>
              ))}
              {ctl.playerPick.locked && <p>Locked in: {ctl.playerPick.move && MOVE_LABEL[ctl.playerPick.move]}</p>}
            </div>
          )}
          {ctl.phase === 'reveal' && <p>Revealing picks...</p>}
          {ctl.phase === 'resolve' && ctl.lastOutcome && (
            <p>
              {ctl.lastOutcome.kind === 'clash'
                ? 'CLASH!'
                : `${ctl.lastOutcome.winner.toUpperCase()} wins with ${MOVE_LABEL[ctl.lastOutcome.move]}`}
            </p>
          )}
        </section>
      )}

      {ctl.phase === 'roundEnd' && (
        <section>
          <h2>
            ROUND OVER {ctl.matchState.roundOver && `- ${ctl.matchState.roundOver.toUpperCase()} WINS`}
            {ctl.matchState.flawless && ' (FLAWLESS)'}
          </h2>
          <button onClick={ctl.continueNext}>CONTINUE NOW</button>
        </section>
      )}

      {ctl.phase === 'matchEnd' && (
        <section>
          <h2>{ctl.matchState.matchOver?.toUpperCase()} WINS THE MATCH</h2>
          <button onClick={ctl.rematch}>REMATCH</button>
          <button onClick={ctl.backToTitle} style={{ marginLeft: 8 }}>
            TITLE
          </button>
        </section>
      )}
    </main>
  );
}
