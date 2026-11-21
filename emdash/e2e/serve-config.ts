/** Shared by playwright.config.ts, e2e/serve.sh (as arguments) and global setup. */
export const PORT = 8788;
/** Local Worker state for the test server: wiped each run so the seed applies fresh. */
export const STATE_DIR = ".wrangler/e2e-state";
