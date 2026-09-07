import type { RoundType, ProgressionLevel } from './training';
export const bowTypes = ['Recurve', 'Compound', 'Barebow'] as const;
export type BowType = (typeof bowTypes)[number];
export type Setup = {
  id: string;
  name: string;
  bowType: BowType;
  notes: string;
  updatedAt: string;
  revision: number;
};
export type Session = {
  id: string;
  date: string;
  title: string;
  setup: Setup | null;
  location: string;
  distance: number;
  target: string;
  scoringFormat: 'ten-zone' | 'beursault';
  environment: 'Indoor' | 'Outdoor';
  duration: number;
  timerElapsedMs: number;
  timerStartedAt: number | null;
  round: RoundType;
  progressionLevel: ProgressionLevel;
  arrows: number;
  ends: string[][];
  pendingEnd: string[];
  notes: string;
  status: 'draft' | 'completed';
  updatedAt: string;
  revision: number;
};
export const scoreValues = [
  'X',
  '10',
  '9',
  '8',
  '7',
  '6',
  '5',
  '4',
  '3',
  '2',
  '1',
  'M',
];
export function score(value: string) {
  return value === 'X' ? 10 : value === 'M' ? 0 : Number(value);
}
export function total(ends: string[][]) {
  return ends.flat().reduce((sum, value) => sum + score(value), 0);
}
export function localDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function newSession(): Session {
  return {
    id: crypto.randomUUID(),
    date: localDate(),
    title: '',
    setup: null,
    location: '',
    distance: 18,
    target: '40 cm',
    scoringFormat: 'ten-zone',
    environment: 'Indoor',
    duration: 0,
    timerElapsedMs: 0,
    timerStartedAt: null,
    round: 'free',
    progressionLevel: 'White',
    arrows: 0,
    ends: [],
    pendingEnd: [],
    notes: '',
    status: 'draft',
    updatedAt: new Date().toISOString(),
    revision: 0,
  };
}
export function validateSession(s: Session) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s.date) ||
    !Number.isFinite(Date.parse(s.date)) ||
    new Date(s.date).toISOString().slice(0, 10) !== s.date
  )
    throw new Error('Choose a valid training date.');
  for (const [label, value] of [
    ['Distance', s.distance],
    ['Duration', s.duration],
    ['Arrow count', s.arrows],
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value))
      throw new Error(`${label} must be a whole number of zero or more.`);
  }
  const values =
    s.scoringFormat === 'beursault' ? beursaultScoreValues : scoreValues;
  const maxArrows = s.scoringFormat === 'beursault' ? 1 : 6;
  const scoreError =
    s.scoringFormat === 'beursault'
      ? 'Beursault requires one arrow per entry: 1, 2, 3, 4, or M.'
      : 'Each end needs 1–6 valid arrow scores.';
  if (!['ten-zone', 'beursault'].includes(s.scoringFormat)) {
    throw new Error('Choose a supported scoring format.');
  }
  if (
    s.pendingEnd.length > maxArrows ||
    s.pendingEnd.some((v) => !values.includes(v))
  )
    throw new Error(scoreError);
  if (
    s.ends.some(
      (end) =>
        end.length === 0 ||
        end.length > maxArrows ||
        end.some((v) => !values.includes(v)),
    )
  )
    throw new Error(scoreError);
  if (s.arrows < s.ends.flat().length)
    throw new Error(
      'Arrow count cannot be lower than the number of scored arrows.',
    );
}

export const beursaultScoreValues = ['4', '3', '2', '1', 'M'];

/** Four-point Beursault totals. A noir also counts as a chapelet and an honneur. */
export function beursaultTotals(ends: string[][]) {
  const arrows = ends.flat();
  return {
    honneurs: arrows.filter((value) => ['1', '2', '3', '4'].includes(value))
      .length,
    points: total(ends),
    chapelets: arrows.filter((value) => value === '3' || value === '4').length,
    noirs: arrows.filter((value) => value === '4').length,
  };
}

export function hasScores(session: Pick<Session, 'ends' | 'pendingEnd'>) {
  return session.ends.length > 0 || session.pendingEnd.length > 0;
}

/** Never reinterpret previously entered arrow values as another scoring system. */
export function changeScoringFormat(
  session: Session,
  format: Session['scoringFormat'],
) {
  if (session.scoringFormat === format) return;
  if (hasScores(session))
    throw new Error('Start a new session to use a different scoring format.');
  session.scoringFormat = format;
  session.target = format === 'beursault' ? 'Beursault' : '40 cm';
}

export const targetFaces = [
  {
    id: '40cm',
    target: '40 cm',
    label: '40 cm · 1–10',
    scoringFormat: 'ten-zone',
  },
  {
    id: '60cm',
    target: '60 cm',
    label: '60 cm · 1–10',
    scoringFormat: 'ten-zone',
  },
  {
    id: '80cm',
    target: '80 cm',
    label: '80 cm · 1–10',
    scoringFormat: 'ten-zone',
  },
  {
    id: '122cm',
    target: '122 cm',
    label: '122 cm · 1–10',
    scoringFormat: 'ten-zone',
  },
  {
    id: 'beursault',
    target: 'Beursault',
    label: 'Beursault · 1–4',
    scoringFormat: 'beursault',
  },
] as const;

export function selectedTargetFace(
  session: Pick<Session, 'target' | 'scoringFormat'>,
) {
  return (
    targetFaces.find(
      (face) =>
        face.target === session.target &&
        face.scoringFormat === session.scoringFormat,
    )?.id ?? 'saved'
  );
}

export function selectTargetFace(session: Session, id: string) {
  const face = targetFaces.find((face) => face.id === id);
  if (!face) throw new Error('Choose a supported target face.');
  if (hasScores(session))
    throw new Error('Start a new session to change the target face.');
  changeScoringFormat(session, face.scoringFormat);
  session.target = face.target;
}
