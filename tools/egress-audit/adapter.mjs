/**
 * The Ever Rec adapter of the egress audit (see README.md). It runs inside the sealed audit setup,
 * in the harness's driver container (the API leg) or browser container (the browser leg), so it
 * reaches the API as `api`, the portal as `portal` and the Firebase emulators as `emulators`.
 *
 * Nothing here is a secret: the operator account lives only in the run's Authentication emulator,
 * with a password made per run.
 */
const PROJECT = 'demo-ever-rec';
// Plain http on purpose: the Authentication emulator inside the sealed audit setup.
const AUTH = 'http://emulators:9099'; // NOSONAR
const OPERATOR_UID = 'egress-audit-operator';
const OPERATOR_EMAIL = 'egress-audit-operator@example.test';

/** The password of the run's operator (the workflow makes one per run). */
/** The operator's password: the account exists only in the run's Authentication emulator. */
const password = () => 'egress-audit-only-account';

async function json(fetch, url, init) {
	const response = await fetch(url, init);
	const text = await response.text();
	let body = null;
	try {
		body = text ? JSON.parse(text) : null;
	} catch {
		body = null;
	}
	return { status: response.status, body };
}

/**
 * What `GET /api/v1/ever-connect/status` must answer the operator in each mode: 404 while the
 * connection is not loaded, the status of a loaded connection otherwise (not connected yet in
 * `loaded_off`; in `positive_connect` the first-start code may or may not have been used yet).
 */
const CONNECT_STATUS = {
	off: (status) => status === 404,
	positive_stats: (status) => status === 404,
	connect_off_signin_on: (status) => status === 404,
	loaded_off: (status, body) => status === 200 && body?.status === 'not_connected',
	positive_connect: (status, body) => status === 200 && typeof body?.status === 'string'
};

/** How long the adapter waits for the Authentication emulator to answer. */
const AUTH_READY_TIMEOUT_MS = 300_000;

/**
 * Waits until the Authentication emulator answers. The emulators start the Realtime Database (a
 * Java process) before Authentication, and the API answers its health check without them, so on a
 * slow runner Authentication comes up a minute or more after the audit starts signing in.
 */
async function authReady({ fetch, log }) {
	const deadline = Date.now() + AUTH_READY_TIMEOUT_MS;
	for (let attempt = 1; ; attempt += 1) {
		try {
			const response = await fetch(`${AUTH}/`);
			await response.text();
			if (attempt > 1) log?.(`Authentication emulator: answered after ${attempt} attempts`);
			return;
		} catch (error) {
			if (Date.now() >= deadline) throw error;
			await new Promise((resolve) => setTimeout(resolve, 2000));
		}
	}
}

/** Creates the operator in the Authentication emulator (once) and signs in: a Firebase ID token. */
async function operatorToken({ fetch, env, log }) {
	await authReady({ fetch, log });
	const create = await json(fetch, `${AUTH}/identitytoolkit.googleapis.com/v1/projects/${PROJECT}/accounts`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
		body: JSON.stringify({
			localId: OPERATOR_UID,
			email: OPERATOR_EMAIL,
			password: password(),
			emailVerified: true
		})
	});
	if (create.status !== 200 && !/DUPLICATE|EXISTS/.test(JSON.stringify(create.body ?? ''))) {
		log?.(`operator account: ${create.status}`);
	}
	const signIn = await json(
		fetch,
		`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=egress-audit`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: OPERATOR_EMAIL, password: password(), returnSecureToken: true })
		}
	);
	if (signIn.status !== 200 || !signIn.body?.idToken) {
		throw new Error(`the operator could not sign in through the Authentication emulator (${signIn.status})`);
	}
	return signIn.body.idToken;
}

export default {
	/**
	 * The statistics of each mode, without the product prefix. loaded_off: a local address outside
	 * the sealed setup and a 60-second interval, so the scheduler asks after the operator's switch-off
	 * within the watched window (and a report, if one were sent, would show as a connection attempt).
	 */
	env: {
		// A private address outside the sealed setup: nothing answers there, and a send would show.
		loaded_off: { EVER_STATS_API_URL: 'http://10.231.8.1:8080', EVER_STATS_SEND_INTERVAL_S: '60' } // NOSONAR
	},

	/** Signs in as the operator of the installation; later hooks send these headers. */
	async login(ctx) {
		const token = await operatorToken(ctx);
		return { idToken: token };
	},

	/** What a user would create; nothing is needed for the statistics. */
	async createFixtures() {
		return {};
	},

	/**
	 * Opens what the settings pages read (404 when a module is off): the statistics, and the
	 * connection's status (read from the database only, connected or not). The connection's answer
	 * is checked, so a mode that should exercise it cannot pass on an error page.
	 */
	async openSettings({ baseUrl, mode, fetch, headers, log }) {
		for (const path of [
			'/api/v1/ever-stats/health',
			'/api/v1/ever-stats/status',
			'/api/v1/ever-stats/reports?limit=12'
		]) {
			const response = await fetch(`${baseUrl}${path}`, { headers });
			log?.(`${path}: ${response.status}`);
		}
		const path = '/api/v1/ever-connect/status';
		const { status, body } = await json(fetch, `${baseUrl}${path}`, { headers });
		log?.(`${path}: ${status} ${body?.status ?? ''}`.trim());
		const expected = CONNECT_STATUS[mode];
		if (expected && !expected(status, body)) {
			throw new Error(`${path} answered ${status} in ${mode}, which this mode does not expect`);
		}
	},

	/** The operator switches the statistics off in Settings. */
	async prepareLoadedOff({ baseUrl, fetch, headers, log }) {
		const response = await fetch(`${baseUrl}/api/v1/ever-stats/enabled`, {
			method: 'PUT',
			headers: { ...headers, 'Content-Type': 'application/json' },
			body: JSON.stringify({ enabled: false })
		});
		log?.(`switch off: ${response.status}`);
		if (response.status !== 200) {
			throw new Error(`the operator could not switch the statistics off (${response.status})`);
		}
	},

	/** Browser leg: signs in through the portal's own sign-in page. */
	async uiLogin(page, ctx) {
		await operatorToken(ctx);
		await page.goto(`${ctx.baseUrl}/auth/login`, { waitUntil: 'domcontentloaded' });
		await page.fill('input[type="email"], input[name="email"]', OPERATOR_EMAIL);
		await page.fill('input[type="password"], input[name="password"]', password());
		await page.click('button[type="submit"]');
		await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 60_000 });
	},

	/** Browser leg: route parameters only a run knows. */
	async routeParams() {
		return {};
	}
};
