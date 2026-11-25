import { PermissionAccessEnum } from '../../module/workspace/Interfaces/Workspace';
import { evaluateAccessType } from './helpers';

const { ADMIN, READ, WRITE, NONE } = PermissionAccessEnum;

describe('evaluateAccessType', () => {
  it('never grants anything for NONE', () => {
    for (const required of [READ, WRITE, ADMIN]) {
      expect(evaluateAccessType(NONE, required)).toBe(false);
    }
  });

  it('grants read to READ, WRITE and ADMIN', () => {
    expect(evaluateAccessType(READ, READ)).toBe(true);
    expect(evaluateAccessType(WRITE, READ)).toBe(true);
    expect(evaluateAccessType(ADMIN, READ)).toBe(true);
  });

  it('does not grant read for a missing or malformed access value', () => {
    expect(evaluateAccessType(undefined as any, READ)).toBe(false);
    expect(evaluateAccessType(null as any, READ)).toBe(false);
    expect(evaluateAccessType('' as any, READ)).toBe(false);
    expect(evaluateAccessType('SOMETHING' as any, READ)).toBe(false);
  });

  it('grants write only to WRITE', () => {
    expect(evaluateAccessType(WRITE, WRITE)).toBe(true);
    expect(evaluateAccessType(READ, WRITE)).toBe(false);
  });

  it('grants admin only to ADMIN', () => {
    expect(evaluateAccessType(ADMIN, ADMIN)).toBe(true);
    expect(evaluateAccessType(READ, ADMIN)).toBe(false);
    expect(evaluateAccessType(WRITE, ADMIN)).toBe(false);
  });
});
