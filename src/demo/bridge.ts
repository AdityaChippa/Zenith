// Bridge between the ported Enhanced (demo) view and the host app.
// EnhancedSky sets onExit so the demo's "← Globe" button returns to OUR globe.
export const demoBridge: { onExit: (() => void) | null } = { onExit: null };
