import type { Field } from '@measured/puck'
import React from 'react'

import { ImagePicker, type PickedImage } from './ImagePicker'

/**
 * A "choose an image" field for the builder — with uploading built in.
 *
 * It was Puck's `external` field, which can only pick from what is already in
 * the Media library. Adding a new image meant leaving the canvas for the admin,
 * uploading, coming back and finding the block again — for the most ordinary
 * thing anyone does with an image field. Now one button puts the file in the
 * Media library *and* in this slot, so it is one action from where the person
 * already is, and the library still holds everything for reuse.
 *
 * What gets stored is the URL and the alt text, not a media id: a published page
 * then needs no join to render, which is what keeps a page a single query. The
 * trade is that renaming or deleting a file leaves a stale URL on any page using
 * it — acceptable here, and the alternative costs a query per image per view.
 *
 * Alt text lives on the block rather than only on the media record, because what
 * an image needs described depends on where it is used. The upload seeds it from
 * the filename so nothing is ever published with none at all.
 */

export type { PickedImage }

/**
 * Typed to allow `undefined` as well as `null`: every block prop that takes an
 * image is optional, so Puck expects `Field<PickedImage | undefined>` and a
 * narrower type will not assign.
 */
export const imageField = (label: string, description?: string): Field<PickedImage | undefined> =>
  ({
    type: 'custom',
    label,
    render: ({ value, onChange, readOnly }) => (
      <ImagePicker
        value={value}
        onChange={onChange}
        description={description}
        readOnly={readOnly}
      />
    ),
  }) as Field<PickedImage | undefined>
