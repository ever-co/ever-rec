import { NextRouter } from 'next/router';
import redirect from './redirect';
import { returnPathQuery, safeReturnPath } from 'app/services/everId';
import { panelRoutes, preRoutes } from 'components/_routes';

const DEFAULT_RETURN = preRoutes.media + panelRoutes.images;

/**
 * Where an Ever ID sign-in lands: a page of the portal, or (when it started on the login or
 * register page) the usual post-login redirect with that page's query, so the extension and
 * invitation flows behave as after any other sign-in.
 */
const everIdRedirect = (router: NextRouter, value: unknown) => {
  const target = safeReturnPath(value) ?? DEFAULT_RETURN;
  if (target.startsWith(preRoutes.auth)) {
    redirect({ ...router, query: returnPathQuery(target), push: router.push } as NextRouter);
    return;
  }
  router.push(target);
};

export default everIdRedirect;
