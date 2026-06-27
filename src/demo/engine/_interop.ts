/**
 * astronomy-engine and satellite.js ship dual CJS/ESM builds. Bundlers resolve
 * the ESM build (named exports, no default); tsx/esbuild resolve the CJS build
 * (everything under `.default`). This helper returns the correct API object in
 * both cases. The dynamic key avoids webpack's "no default export" static
 * analysis warning.
 */
export function pickModule<T>(ns: T): T {
  const key = "default";
  const candidate = (ns as Record<string, unknown>)[key];
  return (candidate as T) ?? ns;
}
