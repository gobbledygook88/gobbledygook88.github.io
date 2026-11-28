/** Shared by playwright.config.ts, e2e/serve.sh (as arguments) and global setup. */
export const PORT = 8788;
/** The fake Strava API (e2e/support/fake-strava.mjs) the test server talks to */
export const FAKE_STRAVA_PORT = 8790;
/** Local Worker state for the test server: wiped each run so the seed applies fresh. */
export const STATE_DIR = ".wrangler/e2e-state";
/** Signed-in browser state for admin tests, written by global setup into the wiped state directory */
export const EDITOR_SESSION = `${STATE_DIR}/editor-session.json`;
