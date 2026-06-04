import { describe, it, expect } from 'vitest';
import { applyTenantScope, isTenantModel } from '../guard.js';

const ORG = 'org_a';

describe('tenant guard — applyTenantScope', () => {
  it('leaves non-tenant models untouched (even with no org context)', () => {
    const args = { where: { key: 'x' } };
    expect(applyTenantScope('Setting', 'findMany', args, undefined)).toBe(args);
    expect(applyTenantScope('UserMapping', 'create', { data: { discordId: '1' } }, undefined))
      .toEqual({ data: { discordId: '1' } });
  });

  it('fail-closed: throws on a tenant model with no org context', () => {
    expect(() => applyTenantScope('Schedule', 'findMany', {}, undefined)).toThrow(/no organization context/i);
    expect(() => applyTenantScope('SchedulePlayer', 'create', { data: {} }, undefined)).toThrow(/no organization context/i);
  });

  it('injects organizationId into where on reads', () => {
    const out = applyTenantScope('Schedule', 'findMany', { where: { date: '01.01.2026' } }, ORG);
    expect(out.where).toEqual({ date: '01.01.2026', organizationId: ORG });
  });

  it('injects organizationId into where on findFirst with no where', () => {
    const out = applyTenantScope('Schedule', 'findFirst', {}, ORG);
    expect(out.where).toEqual({ organizationId: ORG });
  });

  it('scopes update/delete by id (authoritative — not fail-open)', () => {
    const upd = applyTenantScope('SchedulePlayer', 'update', { where: { id: 5 }, data: { availability: 'x' } }, ORG);
    expect(upd.where).toEqual({ id: 5, organizationId: ORG });
    expect(upd.data).toEqual({ availability: 'x' }); // data untouched

    const del = applyTenantScope('SchedulePlayer', 'delete', { where: { id: 9 } }, ORG);
    expect(del.where).toEqual({ id: 9, organizationId: ORG });
  });

  it('scopes deleteMany / updateMany', () => {
    const out = applyTenantScope('SchedulePlayer', 'deleteMany', { where: { userId: 'u1' } }, ORG);
    expect(out.where).toEqual({ userId: 'u1', organizationId: ORG });
  });

  it('stamps organizationId into create data', () => {
    const out = applyTenantScope('Schedule', 'create', { data: { date: '01.01.2026' } }, ORG);
    expect(out.data).toEqual({ date: '01.01.2026', organizationId: ORG });
  });

  it('does not override an explicitly provided organizationId on create', () => {
    const out = applyTenantScope('Schedule', 'create', { data: { date: 'd', organizationId: ORG } }, 'org_b');
    expect(out.data.organizationId).toBe(ORG);
  });

  it('stamps every row in createMany', () => {
    const out = applyTenantScope('SchedulePlayer', 'createMany', { data: [{ userId: 'a' }, { userId: 'b' }] }, ORG);
    expect(out.data).toEqual([
      { userId: 'a', organizationId: ORG },
      { userId: 'b', organizationId: ORG },
    ]);
  });

  it('rejects findUnique / upsert on tenant models (composite unique)', () => {
    expect(() => applyTenantScope('Schedule', 'findUnique', { where: { date: 'd' } }, ORG)).toThrow(/not supported/i);
    expect(() => applyTenantScope('Schedule', 'upsert', { where: { date: 'd' }, create: {}, update: {} }, ORG)).toThrow(/not supported/i);
  });

  it('does not mutate the caller-supplied args object', () => {
    const args = { where: { date: 'd' } };
    const out = applyTenantScope('Schedule', 'findMany', args, ORG);
    expect(args.where).toEqual({ date: 'd' }); // original untouched
    expect(out).not.toBe(args);
  });

  it('isTenantModel identifies tenant models', () => {
    expect(isTenantModel('Schedule')).toBe(true);
    expect(isTenantModel('SchedulePlayer')).toBe(true);
    expect(isTenantModel('Setting')).toBe(false);
    expect(isTenantModel(undefined)).toBe(false);
  });
});
