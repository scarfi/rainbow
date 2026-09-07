import {
  hasScores,
  scoreValues,
  beursaultScoreValues,
  total,
  type Session,
} from './model';

export const roundTypes = [
  'free',
  'beursault-10',
  'beursault-20',
  'progression',
] as const;
export type RoundType = (typeof roundTypes)[number];
export const progressionLevels = [
  'White',
  'Black',
  'Blue',
  'Red',
  'Yellow',
  'Bronze',
  'Silver',
  'Gold',
] as const;
export type ProgressionLevel = (typeof progressionLevels)[number];

export function progressionReference(session: Session) {
  const index = progressionLevels.indexOf(session.progressionLevel);
  const compound = session.setup?.bowType === 'Compound';
  return {
    level: session.progressionLevel,
    distance: (compound
      ? [10, 15, 20, 25, 30, 40, 50, 50]
      : [10, 15, 20, 25, 30, 40, 60, 70])[index],
    target: !compound && index >= 6 ? '122 cm' : '80 cm',
    goal: compound && index >= 5 ? (index === 7 ? 330 : 310) : 280,
  };
}
export function arrowLimit(session: Session): number | null {
  return session.round === 'beursault-10'
    ? 20
    : session.round === 'beursault-20'
      ? 40
      : session.round === 'progression'
        ? 36
        : null;
}
export function arrowsPerEnd(session: Session) {
  return session.scoringFormat === 'beursault' ? 1 : 6;
}
export function enteredScores(session: Session) {
  return [...session.ends.flat(), ...session.pendingEnd];
}
export function roundProgress(session: Session) {
  const scores = enteredScores(session);
  const limit = arrowLimit(session);
  const points = total([scores]);
  const reference =
    session.round === 'progression' ? progressionReference(session) : null;
  return {
    count: scores.length,
    limit,
    points,
    complete: limit !== null && scores.length === limit,
    goal: reference?.goal ?? null,
    achieved:
      reference !== null && scores.length === 36 && points >= reference.goal,
  };
}

/** Presets configure the session before any scoring and never rewrite existing scores. */
export function configureRound(
  session: Session,
  round: RoundType,
  level = session.progressionLevel,
) {
  if (hasScores(session))
    throw new Error('Start a new session to change the round.');
  if (!roundTypes.includes(round) || !progressionLevels.includes(level))
    throw new Error('Choose a supported round.');
  session.round = round;
  session.progressionLevel = level;
  if (round === 'beursault-10' || round === 'beursault-20') {
    session.scoringFormat = 'beursault';
    session.target = 'Beursault';
    session.distance = 50;
    session.environment = 'Outdoor';
  } else if (round === 'progression') {
    const reference = progressionReference(session);
    session.scoringFormat = 'ten-zone';
    session.target = reference.target;
    session.distance = reference.distance;
  }
}

/** One tap advances one arrow; a full end is committed automatically. */
export function recordArrow(session: Session, value: string) {
  if (session.status !== 'draft')
    throw new Error('Reopen the session before scoring.');
  const values =
    session.scoringFormat === 'beursault' ? beursaultScoreValues : scoreValues;
  if (!values.includes(value)) throw new Error('Choose a valid arrow score.');
  const before = enteredScores(session).length;
  const limit = arrowLimit(session);
  if (limit !== null && before >= limit)
    throw new Error('All arrows are recorded.');
  const unscored = Math.max(0, session.arrows - before);
  // Older manual entry may leave a complete end pending. Preserve it before advancing.
  if (session.pendingEnd.length === arrowsPerEnd(session)) {
    session.ends.push([...session.pendingEnd]);
    session.pendingEnd = [];
  }
  session.pendingEnd.push(value);
  if (session.pendingEnd.length === arrowsPerEnd(session)) {
    session.ends.push([...session.pendingEnd]);
    session.pendingEnd = [];
  }
  session.arrows = unscored + before + 1;
}
export function undoArrow(session: Session) {
  if (session.status !== 'draft') return;
  const before = enteredScores(session).length;
  if (!before) return;
  const unscored = Math.max(0, session.arrows - before);
  if (!session.pendingEnd.length) session.pendingEnd = session.ends.pop() ?? [];
  session.pendingEnd.pop();
  session.arrows = unscored + before - 1;
}

/** Wall-clock timestamps keep the timer accurate across backgrounding and reloads. */
export function elapsedMs(session: Session, now = Date.now()) {
  return (
    session.timerElapsedMs +
    (session.timerStartedAt === null
      ? 0
      : Math.max(0, now - session.timerStartedAt))
  );
}
export function startTimer(session: Session, now = Date.now()) {
  if (session.status === 'draft' && session.timerStartedAt === null)
    session.timerStartedAt = now;
}
export function stopTimer(session: Session, now = Date.now()) {
  session.timerElapsedMs = elapsedMs(session, now);
  session.timerStartedAt = null;
  session.duration = Math.round(session.timerElapsedMs / 60000);
}
export function setManualDuration(session: Session, minutes: number) {
  if (session.timerStartedAt !== null)
    throw new Error('Stop the timer before editing duration.');
  if (!Number.isFinite(minutes) || minutes < 0 || !Number.isInteger(minutes))
    throw new Error('Duration must be a whole number of zero or more.');
  session.duration = minutes;
  session.timerElapsedMs = minutes * 60000;
}
export function clockLabel(milliseconds: number) {
  const seconds = Math.floor(milliseconds / 1000);
  return [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

export function validateTraining(session: Session) {
  if (
    !roundTypes.includes(session.round) ||
    !progressionLevels.includes(session.progressionLevel)
  )
    throw new Error('Choose a supported round.');
  if (
    !Number.isFinite(session.timerElapsedMs) ||
    session.timerElapsedMs < 0 ||
    (session.timerStartedAt !== null &&
      (!Number.isFinite(session.timerStartedAt) || session.timerStartedAt < 0))
  )
    throw new Error('Invalid timer state.');
  if (session.status === 'completed' && session.timerStartedAt !== null)
    throw new Error('Stop the timer before finishing.');
  const limit = arrowLimit(session);
  if (limit !== null && enteredScores(session).length > limit)
    throw new Error('All arrows are recorded.');
  if (
    session.round.startsWith('beursault-') &&
    (session.scoringFormat !== 'beursault' || session.target !== 'Beursault')
  )
    throw new Error('The target must match the selected round.');
  if (session.round === 'progression') {
    const reference = progressionReference(session);
    if (
      session.scoringFormat !== 'ten-zone' ||
      session.target !== reference.target ||
      session.distance !== reference.distance
    )
      throw new Error('The target must match the selected round.');
    if (session.ends.some((end) => end.length !== 6))
      throw new Error('Progression rounds use ends of six arrows.');
  }
}
