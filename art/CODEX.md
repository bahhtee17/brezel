# Task for Codex: illustrations for the «Брецель» German course

You are generating raster illustrations for a mobile language-learning site. All prompts are already written; your job is to run them through your built-in image generation tool and save the files.

## Input

- `art/assets.json` → `assets[]`. Each entry has `id`, `group`, `out` (target PNG path), `size` and `prompt`. Some entries also have a `note`.
- The task message tells you which assets to make, as `group/id` (for example `mascot/idle`), or says "all".

## Rules

1. For each requested asset, generate exactly one image with your image generation tool. Use `prompt` word for word and the given `size` (`1024x1024` or `1536x1024`).
2. Save it as a PNG at `out`, relative to the repo root. Create folders if needed. If your tool saves images somewhere else (for example `~/.codex/generated_images/...`), copy the file to `out`.
3. If `out` already exists, skip that asset unless the task message says to redo it.
4. Reference images. If an entry has a `reference` field, pass that file to your image tool as the input image to edit or redraw. Entries in the `anim` group are second animation frames and only make sense with the reference; if your tool cannot take one, skip them and log `ok: false`. A `note` naming a reference image works the same way, but it is optional: if your tool can't take one, use the prompt alone.
5. Saving any size the tool returns is fine (we resize later), and so is slight texture or grain in the magenta background. Don't regenerate for those. Look at every result, and regenerate once (two attempts in total at most) only if it clearly breaks the brief:
   - photorealistic, 3D or glossy instead of hand-drawn crayon and ink;
   - wrong or busy background (the mascot needs flat pure magenta `#FF00FF`);
   - text that was not asked for, or misspelled text that was asked for;
   - no googly eyes on the characters;
   - extra characters, or a cropped main subject.

   Small deviations, such as a slightly different pose, prop or framing, are fine: log them with `ok: true` and a comment.
6. Do not edit, create or delete any other files in the repository. Do not write code, install packages or run builds. Only the PNGs under `art/raw/` and the log below.
7. After each asset, append one line to `art/raw/log.jsonl`. Never overwrite the file; earlier lines must stay.
   `{"id": "<group>/<id>", "out": "<path>", "ok": true|false, "attempts": N, "comment": "<short note on any problems>"}`

## Final message

List the files you created, the assets that failed and why, and say whether your tool accepted the reference image.
