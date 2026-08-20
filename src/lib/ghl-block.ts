import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Reads a generated GoHighLevel block so this app can serve the very same
 * markup that gets pasted into GHL.
 *
 * Why not keep a React copy of the landing page: there was one, and it drifted.
 * The page moved on — the form came out, the buttons started pointing at funnel
 * step 2 — and the app's version silently stayed as it was. Anyone proofing here
 * would have approved a page that no longer existed.
 *
 * So this reads `ghl/blocks/*.html`, which is generated from
 * `src/styles/design-system.css` and `ghl/src/`. One source, two destinations,
 * and no way for a proof to disagree with what ships.
 *
 * The blocks carry their own scoped `<style>`, so nothing here needs the app's
 * stylesheet — and being `ech-` prefixed and wrapped in `.ech-scope`, they
 * cannot collide with it either.
 *
 * Safe to inject: this is our own build output, not user input. The one rule is
 * that nothing user-supplied may ever reach these files.
 */
export const readGhlBlock = async (name: string): Promise<string> => {
  // Guard anyway. Cheap, and it means a future caller cannot turn this into a
  // path-traversal read by passing something from a URL.
  if (!/^[a-zA-Z0-9._-]+\.html$/.test(name)) {
    throw new Error(`readGhlBlock: unsafe block name ${JSON.stringify(name)}`)
  }
  return readFile(path.join(process.cwd(), 'ghl', 'blocks', name), 'utf8')
}
