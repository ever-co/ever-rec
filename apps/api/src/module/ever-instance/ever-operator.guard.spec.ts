import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { EverOperatorGuard, EverSignedInGuard } from './ever-operator.guard';
import { readEverInstanceSettings } from './ever-instance.settings';

function contextFor(request: Record<string, unknown>) {
  return { switchToHttp: () => ({ getRequest: () => request }) } as any;
}

function authGuard(uid: string | null) {
  return {
    canActivate: async (context: any) => {
      if (!uid) throw new UnauthorizedException('Unauthorized user');
      context.switchToHttp().getRequest().user = { id: uid };
      return true;
    },
  } as any;
}

function instance(uids: string[]) {
  const settings = readEverInstanceSettings((name) =>
    name === 'SUPER_ADMIN_ACCOUNT_UID' ? uids[0] : name === 'EVER_OPERATOR_UIDS' ? uids.slice(1).join(',') : undefined,
  );
  return { isOperator: (uid: string) => settings.operatorUids.has(uid) } as any;
}

describe('EverOperatorGuard', () => {
  it('answers 404 (not 401) to a caller who is not signed in', async () => {
    const guard = new EverOperatorGuard(authGuard(null), instance(['uid-op']));
    await expect(guard.canActivate(contextFor({}))).rejects.toBeInstanceOf(NotFoundException);
  });

  it('answers 404 (not 403) to a signed-in user who is not the operator', async () => {
    const guard = new EverOperatorGuard(authGuard('uid-member'), instance(['uid-op']));
    await expect(guard.canActivate(contextFor({}))).rejects.toBeInstanceOf(NotFoundException);
  });

  it('lets SUPER_ADMIN_ACCOUNT_UID and EVER_OPERATOR_UIDS through', async () => {
    const ops = instance(['uid-op', 'uid-two', 'uid-three']);
    for (const uid of ['uid-op', 'uid-two', 'uid-three']) {
      await expect(new EverOperatorGuard(authGuard(uid), ops).canActivate(contextFor({}))).resolves.toBe(true);
    }
  });

  it('nobody is the operator when no uid is configured', async () => {
    const guard = new EverOperatorGuard(authGuard('uid-any'), instance([]));
    await expect(guard.canActivate(contextFor({}))).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('EverSignedInGuard', () => {
  it('404 when signed out, true when signed in', async () => {
    await expect(new EverSignedInGuard(authGuard(null)).canActivate(contextFor({}))).rejects.toBeInstanceOf(NotFoundException);
    await expect(new EverSignedInGuard(authGuard('uid-any')).canActivate(contextFor({}))).resolves.toBe(true);
  });
});

describe('ever-instance makes no outbound request', () => {
  it('has no HTTP client and no URL in its sources', () => {
    const offenders: string[] = [];
    const visit = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) visit(path);
        else if (name.endsWith('.ts') && !name.endsWith('.spec.ts')) {
          const text = readFileSync(path, 'utf8');
          if (/fetch\(|axios|https?:\/\/|node:https?'|from 'https?'/.test(text)) offenders.push(name);
        }
      }
    };
    visit(__dirname);
    expect(offenders).toEqual([]);
  });
});
