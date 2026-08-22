'use client'

import React from 'react'

/**
 * Choosing an image inside the builder, including uploading one.
 *
 * This replaces Puck's `external` field, which could only pick from what was
 * already in the Media library. Anything new meant leaving the canvas, going to
 * the admin, uploading, coming back, and finding the block again — for the most
 * common thing anyone does with an image field. Now one button uploads the file
 * to the Media library *and* drops it into this slot, which is the same action
 * from where the person is standing.
 *
 * Its own client component rather than JSX inside the field definition: the
 * block library is imported by server components to render published pages, and
 * hooks cannot live in that module graph without a client boundary.
 */

export type PickedImage = { url?: string; alt?: string } | null

type MediaDoc = {
  id: number
  url?: string
  filename?: string
  alt?: string
  filesize?: number
}

const kb = (bytes?: number) => (bytes ? `${Math.round(bytes / 1024)} KB` : '')

/** Filename minus extension and separators, as a starting point for alt text. */
const altFromFilename = (filename: string) =>
  filename
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()

export function ImagePicker({
  value,
  onChange,
  description,
  readOnly,
}: {
  value: PickedImage | undefined
  onChange: (value: PickedImage) => void
  description?: string
  readOnly?: boolean
}) {
  const [library, setLibrary] = React.useState<MediaDoc[] | null>(null)
  const [browsing, setBrowsing] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const fileInput = React.useRef<HTMLInputElement>(null)

  const loadLibrary = async () => {
    setError(null)
    try {
      const res = await fetch(
        '/api/media?limit=60&sort=-createdAt&depth=0&where[mimeType][like]=image',
        { credentials: 'include' },
      )
      if (!res.ok) throw new Error(`the media library could not be read (${res.status})`)
      const body = (await res.json()) as { docs?: MediaDoc[] }
      setLibrary((body.docs || []).filter((doc) => doc.url))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'the media library could not be read')
      setLibrary([])
    }
  }

  const browse = async () => {
    setBrowsing(true)
    if (!library) await loadLibrary()
  }

  /**
   * Upload, then select. Both, from one action.
   *
   * The alt text starts from the filename so the image is never published with
   * none at all, and stays editable below — which is the right place for it,
   * since what an image needs described depends on where it is used.
   */
  const upload = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('_payload', JSON.stringify({ alt: altFromFilename(file.name) }))

      const res = await fetch('/api/media', {
        method: 'POST',
        body: form,
        credentials: 'include',
      })
      const body = (await res.json().catch(() => ({}))) as {
        doc?: MediaDoc
        errors?: { message?: string }[]
        message?: string
      }

      if (!res.ok || !body.doc?.url) {
        /**
         * Payload's own message, when there is one. The upload store refuses
         * uploads outright when it is not configured, with an explanation of
         * what to do — swallowing that and saying "upload failed" would hide the
         * one thing worth reading.
         */
        throw new Error(
          body.errors?.[0]?.message || body.message || `the upload was refused (${res.status})`,
        )
      }

      onChange({ url: body.doc.url, alt: body.doc.alt || altFromFilename(file.name) })
      // The new file belongs at the top of the library next time it is opened.
      setLibrary(null)
      setBrowsing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'the upload failed')
    } finally {
      setBusy(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const pick = (doc: MediaDoc) => {
    onChange({ url: doc.url, alt: doc.alt || altFromFilename(doc.filename || '') })
    setBrowsing(false)
  }

  return (
    <div style={styles.wrap}>
      {description ? <p style={styles.hint}>{description}</p> : null}

      {value?.url ? (
        <div style={styles.selected}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.url} alt={value.alt || ''} style={styles.thumb} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={styles.filename}>{value.url.split('/').pop()}</p>
            <label style={styles.altLabel}>
              Alt text
              <input
                type="text"
                value={value.alt || ''}
                disabled={readOnly}
                onChange={(event) => onChange({ url: value.url, alt: event.target.value })}
                placeholder="Describe the image"
                style={styles.altInput}
              />
            </label>
          </div>
        </div>
      ) : (
        <p style={styles.empty}>No image chosen.</p>
      )}

      {readOnly ? null : (
        <div style={styles.actions}>
          <button type="button" onClick={() => fileInput.current?.click()} disabled={busy} style={styles.primary}>
            {busy ? 'Uploading…' : 'Upload an image'}
          </button>
          <button type="button" onClick={browse} disabled={busy} style={styles.button}>
            Choose from library
          </button>
          {value?.url ? (
            <button type="button" onClick={() => onChange(null)} disabled={busy} style={styles.button}>
              Remove
            </button>
          ) : null}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void upload(file)
            }}
          />
        </div>
      )}

      {error ? <p style={styles.error}>{error}</p> : null}

      {browsing ? (
        <div style={styles.library}>
          {library === null ? (
            <p style={styles.hint}>Loading…</p>
          ) : library.length === 0 ? (
            <p style={styles.hint}>
              Nothing in the library yet. Use <strong>Upload an image</strong> above.
            </p>
          ) : (
            <div style={styles.grid}>
              {library.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => pick(doc)}
                  title={`${doc.filename || ''} ${kb(doc.filesize)}`.trim()}
                  style={{
                    ...styles.tile,
                    ...(value?.url === doc.url ? styles.tileChosen : null),
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={doc.url} alt={doc.alt || ''} style={styles.tileImg} />
                  <span style={styles.tileName}>{doc.filename}</span>
                </button>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setBrowsing(false)} style={styles.button}>
            Close
          </button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Inline styles, matching the admin's palette.
 *
 * Puck's field area is styled by Puck's own stylesheet, and the brand's
 * stylesheet is not loaded there — a class name would either do nothing or
 * collide. Inline keeps this self-contained.
 */
const styles: Record<string, React.CSSProperties> = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 10 },
  hint: { margin: 0, font: '400 12px/1.45 system-ui, sans-serif', color: '#4E627A' },
  empty: {
    margin: 0,
    padding: '14px 12px',
    border: '1px dashed #DCE5EC',
    borderRadius: 10,
    font: '400 12.5px/1 system-ui, sans-serif',
    color: '#4E627A',
    textAlign: 'center',
  },
  selected: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    padding: 10,
    border: '1px solid #DCE5EC',
    borderRadius: 10,
    background: '#FBF8F3',
  },
  thumb: {
    width: 56,
    height: 56,
    objectFit: 'contain',
    background: '#FFFFFF',
    border: '1px solid #EBF0F4',
    borderRadius: 8,
    flex: 'none',
  },
  filename: {
    margin: '0 0 8px',
    font: '600 12px/1.3 system-ui, sans-serif',
    color: '#16324F',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  altLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    font: '500 11px/1 system-ui, sans-serif',
    color: '#4E627A',
  },
  altInput: {
    font: '400 12.5px/1 system-ui, sans-serif',
    padding: '7px 9px',
    border: '1px solid #DCE5EC',
    borderRadius: 7,
    width: '100%',
  },
  actions: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  primary: {
    font: '600 12px/1 system-ui, sans-serif',
    padding: '9px 14px',
    borderRadius: 999,
    border: 'none',
    background: '#C99132',
    color: '#0F2439',
    cursor: 'pointer',
  },
  button: {
    font: '600 12px/1 system-ui, sans-serif',
    padding: '9px 14px',
    borderRadius: 999,
    border: '1px solid #DCE5EC',
    background: '#FFFFFF',
    color: '#16324F',
    cursor: 'pointer',
  },
  error: {
    margin: 0,
    padding: '10px 12px',
    borderRadius: 8,
    background: '#FDECEA',
    color: '#8A1F17',
    font: '500 12px/1.45 system-ui, sans-serif',
  },
  library: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    padding: 10,
    border: '1px solid #DCE5EC',
    borderRadius: 10,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))',
    gap: 8,
    maxHeight: 260,
    overflowY: 'auto',
  },
  tile: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: 6,
    border: '1px solid #EBF0F4',
    borderRadius: 8,
    background: '#FFFFFF',
    cursor: 'pointer',
  },
  tileChosen: { borderColor: '#C99132', boxShadow: '0 0 0 2px rgba(201,145,50,.25)' },
  tileImg: { width: '100%', height: 54, objectFit: 'contain' },
  tileName: {
    font: '400 10px/1.2 system-ui, sans-serif',
    color: '#4E627A',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
}
