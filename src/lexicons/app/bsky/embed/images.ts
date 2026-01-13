// A set of images embedded in a Bluesky record (eg, a post).
// see: https://github.com/bluesky-social/atproto/blob/main/lexicons/app/bsky/embed/images.json

import { Schema } from "effect";

export const id = "app.bsky.embed.images";

export class Image extends Schema.Class<Image>(`${id}#image`)({
  image: Schema.Struct({
    $type: Schema.Literal("blob"),
    ref: Schema.Struct({
      $link: Schema.String, // format: cid
    }),
    mimeType: Schema.String,
    size: Schema.Int,
  }),
  /** Alt text description of the image, for accessibility. */
  alt: Schema.String,
}) {}

export class Main extends Schema.Class<Main>(id)({
  images: Schema.Array(Image),
}) {}
