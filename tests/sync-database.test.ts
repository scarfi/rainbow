import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
const a = '11111111-1111-4111-8111-111111111111',
  b = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
it('enforces ownership, authenticated-only writes, optimistic versions and idempotency in PostgreSQL', async () => {
  const pg = new PGlite();
  try {
    await pg.exec(
      `create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key); insert into auth.users values ('${a}'),('${b}'); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`,
    );
    await pg.exec(
      readFileSync(
        new URL(
          '../supabase/migrations/202609080001_account_sync.sql',
          import.meta.url,
        ),
        'utf8',
      ),
    );
    const call = async (version: number, mutation: string, notes: string) =>
      (
        await pg.query<{ value: any }>(
          'select public.rainbow_write_record($1,$2,$3,$4,$5) as value',
          ['session', id, JSON.stringify({ id, notes }), version, mutation],
        )
      ).rows[0].value;
    await pg.exec(`set role authenticated; set request.jwt.claim.sub='${a}';`);
    const m1 = crypto.randomUUID();
    expect((await call(0, m1, 'first')).version).toBe(1);
    expect((await call(0, m1, 'first')).version).toBe(1);
    expect((await call(0, crypto.randomUUID(), 'stale')).payload.notes).toBe(
      'first',
    );
    expect((await call(1, crypto.randomUUID(), 'second')).version).toBe(2);
    await expect(
      pg.exec(`update public.rainbow_records set version=99`),
    ).rejects.toThrow();
    await expect(
      pg.exec(`delete from public.rainbow_records`),
    ).rejects.toThrow();
    await expect(
      pg.exec(
        `insert into public.rainbow_records values ('${a}','session','${id}','{}',1,'${m1}')`,
      ),
    ).rejects.toThrow();
    await pg.exec(`set request.jwt.claim.sub='${b}';`);
    expect(
      (await pg.query('select * from public.rainbow_records')).rows,
    ).toHaveLength(0);
    expect((await call(0, crypto.randomUUID(), 'account b')).user_id).toBe(b);
    await pg.exec(`set request.jwt.claim.sub='${a}';`);
    expect(
      (
        await pg.query<{ payload: any }>(
          'select payload from public.rainbow_records',
        )
      ).rows[0].payload.notes,
    ).toBe('second');
    await pg.exec(`set request.jwt.claim.sub='';`);
    await expect(call(0, crypto.randomUUID(), 'anonymous')).rejects.toThrow(
      'Authentication required',
    );
    await pg.exec('reset role; set role anon;');
    await expect(
      pg.query('select * from public.rainbow_records'),
    ).rejects.toThrow();
    await expect(call(0, crypto.randomUUID(), 'anonymous')).rejects.toThrow();
  } finally {
    await pg.close();
  }
}, 30000);
