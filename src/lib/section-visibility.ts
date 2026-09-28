/**
 * Whether a page section renders, and what it renders when it has nothing yet.
 *
 * Its own file with no imports, for the same reason as `src/lib/join-live.ts`:
 * `src/blocks/index.tsx` pulls in React and the whole block library, and these
 * are rules worth testing without any of that.
 *
 * The problem they solve is a sales page filled in over days. A logo ticker with
 * no logos, a testimonial grid with one empty slot, an FAQ answer nobody has
 * written — each of those publishes an empty box that says the page is
 * unfinished, on the page whose entire job is looking like somebody competent
 * built it.
 *
 * So the rule everywhere is the same: **an empty thing publishes nothing, and
 * shows a labelled placeholder in the builder instead.** Nothing on the live
 * page, but still clickable where the content actually gets typed.
 */

/** Filled in. Whitespace is not content. */
export const hasText = (value?: string | null): boolean =>
  typeof value === 'string' && value.trim().length > 0

/**
 * A section is off unless it says otherwise.
 *
 * `show !== false` rather than `show === true`, which is what makes adding this
 * field to blocks that already have stored pages safe: those records have no
 * `show` key at all, and they must keep rendering exactly as they did.
 */
export const isShown = (show?: boolean): boolean => show !== false

/** The items in a repeatable field worth rendering. */
export const filled = <T,>(items: T[] | undefined, isFilled: (item: T) => boolean): T[] =>
  (items || []).filter(isFilled)

/**
 * What a block should do this render.
 *
 *   render      — normal
 *   placeholder — editor only: a dashed box so the block stays selectable
 *   nothing     — publish nothing at all
 */
export type SectionState = 'render' | 'placeholder' | 'nothing'

export const sectionState = ({
  show,
  hasContent,
  editing,
}: {
  show?: boolean
  /** False when the section has nothing worth publishing yet. */
  hasContent: boolean
  /** Puck's `puck.isEditing` — true inside the builder canvas. */
  editing?: boolean
}): SectionState => {
  if (isShown(show) && hasContent) return 'render'
  return editing ? 'placeholder' : 'nothing'
}
