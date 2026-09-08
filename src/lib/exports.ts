import { beursaultTotals, total, type Session } from './model';
import { elapsedMs } from './training';

export type ExportFormat = 'json' | 'csv';

/** Overlay the current editor before selecting a day, so moved dates stay accurate. */
export function exportSelection(
  saved: Session[],
  editor: Session | null,
  day: string | null,
  query = '',
): Session[] {
  const entries = new Map(saved.map((session) => [session.id, session]));
  if (editor) entries.set(editor.id, editor);
  const search = query.toLowerCase();
  return [...entries.values()].filter(
    (session) =>
      (!day || session.date === day) &&
      `${session.title} ${session.setup?.name ?? ''} ${session.setup?.bowType ?? ''} ${session.notes}`
        .toLowerCase()
        .includes(search),
  );
}

/** Quote every cell and neutralize spreadsheet formulas in user-authored text. */
function csvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function serializeSessions(
  sessions: Session[],
  format: ExportFormat,
  now = Date.now(),
) {
  if (format === 'json')
    return JSON.stringify(
      {
        schemaVersion: 3,
        exportedAt: new Date(now).toISOString(),
        sessions,
      },
      null,
      2,
    );
  const headers = [
    'date',
    'title',
    'status',
    'bow',
    'bow_type',
    'distance_m',
    'target',
    'scoring_format',
    'round',
    'arrows',
    'duration_minutes',
    'points',
    'honneurs',
    'chapelets',
    'noirs',
    'ends',
    'pending_end',
    'location',
    'notes',
  ];
  const rows = sessions.map((session) => {
    const ends = [...session.ends, session.pendingEnd];
    const beursault =
      session.scoringFormat === 'beursault' ? beursaultTotals(ends) : null;
    return [
      session.date,
      session.title,
      session.status,
      session.setup?.name,
      session.setup?.bowType,
      session.distance,
      session.target,
      session.scoringFormat,
      session.round,
      session.arrows,
      Math.round(elapsedMs(session, now) / 60000),
      total(ends),
      beursault?.honneurs,
      beursault?.chapelets,
      beursault?.noirs,
      session.ends.map((end) => end.join(' ')).join(' | '),
      session.pendingEnd.join(' '),
      session.location,
      session.notes,
    ];
  });
  return (
    '\uFEFF' +
    [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
  );
}

export function downloadSessions(
  sessions: Session[],
  format: ExportFormat,
  filename: string,
) {
  const blob = new Blob([serializeSessions(sessions, format)], {
    type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${filename}.${format}`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
