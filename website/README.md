# Pancake Boys website

The approved layout, type, palette, photos and community copy remain intact. Plain HTML/CSS/JavaScript; no runtime dependencies or build step. `website/` is the maintained source. Root `index.html` loads these same files for GitHub Pages; run `python website/qa/sync_entry.py` after markup changes. Legacy root CSS/JS copies are unused.

Preview: `python -m http.server 4174 --bind 127.0.0.1 --directory website`, then open http://127.0.0.1:4174/. Serve the repository root on another port to verify the published entry.

## Motion and controls

- Wordmark, hero headline and invitation finish their entrance in 950ms, once per tab's browser session. No blocking overlay. Restored scroll positions skip the intro.
- The transparent header slides away downward and returns upward; compact cream below the hero. Open menu or keyboard focus keeps it visible.
- Headlines enter by actual rendered lines; section paragraphs enter together, once per visit. Resizing rebuilds lines without replaying. Content is visible before JavaScript and image dimensions reserve space.
- Full-screen charcoal menu: 400ms entrance, sequenced links, 230ms exit. Keyboard focus wrapping, Escape, restoration and section focus remain intact. Rapid Escape/reopen cancels stale transitions.
- The new photo strip moves at 14px/second only while visible and idle. Pause/play, previous/next, mouse drag, native mobile swipe, Left/Right and Home/End work. Hover, keyboard focus, drag, wheel input, open dialogs and hidden tabs pause movement. Loop duplicates are inert and hidden from assistive technology.
- The original Field Notes composition and manual sliding photo dialog remain: buttons, Left/Right, Home/End, native swipe, wrapping, caption/count, Escape and focus restoration.
- Reduced motion disables intro/reveals, transitions, hover zoom, strip autoplay and initial video requests. Manual strip/gallery controls remain. Preference changes during transitions/playback work.
- Without JavaScript, copy, photos and anchor navigation remain visible and the strip scrolls natively.

## Actual hero footage

The owner-supplied `25 Stuart Falls-20261001T220732Z-1-001.zip` contains 28 MOV clips, overlooked in the original photo-only extraction. The hero is the real mountain scene from `Pancake 09-25 Stuart Falls/IMG_6085.MOV`, seconds 3–11. No stock footage or invented URL.

`assets/hero-hike.mp4`: eight seconds, 1280×720 H.264, 24fps, 907,575 bytes, no audio or source metadata, gentle loop crossfade, fast-start encoding. `content.js` uses `heroVideoSrc: 'assets/hero-hike.mp4'`. The original archive remains outside git. `qa/prepare_hero_video.py` records regeneration and uses `imageio-ffmpeg` as an offline tool only.

The film autoplays muted, inline and looping, with an accessible play/pause control. It appears only after playback begins. The approved mountain photo stays beneath it and serves as poster. Failed media, reduced motion and Save-Data retain the photo. Autoplay blocking offers manual play. Offscreen, hidden-tab and dialog playback pauses; a user's deliberate pause is retained.

No footage is needed for this working loop. A future wider hiking/pancake montage can replace `website/assets/hero-hike.mp4`. Set `heroVideoSrc: null` for the original still with no video request. Only local `assets/` MP4/WebM paths are accepted. Review future footage crops/loops on physical phones.

## Verification and publishing

Run `node website/qa/motion.test.cjs` with Playwright available for testing and the server running. `PANCAKE_TEST_URL` overrides the local URL. Results and before/after captures live in `qa/`. Checks cover desktop/touch mobile, reduced motion, session reloads, header focus/direction, reveals, strip pause/drag/swipe/keyboard, real video play/pause/loop, failed video, gallery/menu/dialogs, breakpoints, loaded media, overflow, console errors and no JavaScript.

Bundled tools on this machine:

```powershell
$env:NODE_PATH = 'C:/Users/carte/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
& 'C:/Users/carte/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' website/qa/motion.test.cjs
```

GitHub Pages publishes the root from `main`; keep `CNAME` as `pancak3boys.com`. See [deployment.md](deployment.md) for required public DNS corrections.

October 24 remains tentative, pancakes free, and Instagram unchanged. RSVP, payments, checkout, email lists and partnership submissions still require genuine destinations and never pretend to submit data.

## Catering page

`catering/index.html` is the maintained catering page. GitHub Pages serves it at `/catering` from the synced root copy. After markup changes, run `python website/qa/sync_entry.py`.

Scrolling pans several photos inside clipped frames (transform only, on requestAnimationFrame). Headlines, steps, menu cards, flavors, and packages reveal as they enter view. Both effects stay still when `prefers-reduced-motion` is set.

The catering menu is four house flavors, all shot by Carter (no credit needed): Strawberry Camp, Banana Peak, Cookie Butter Cabin, and Campfire Swirl. Card photos are `flavor-*.webp` with 800px `-sm` variants in `srcset`; `menu-overhead.webp` is the flavors intro and `menu-table.webp` is the lineup image. The hero clip is `catering-pour.mp4`, and How it works uses `catering-swirl-pipe.mp4` and `catering-flip.mp4` — muted, looping, loaded only when in view, with WebP posters that stay up under reduced motion or Save-Data. All six clips are upright 720×1280 vertical encodes (the camera footage was shot sideways and is rotated 90° counter-clockwise from the originals); their URLs carry `?v=2` so browsers drop the old sideways files. On a mouse or trackpad, hovering a flavor card plays its `flavor-*.mp4` clip (Cookie Butter Cabin has none); touch screens never download them. Package cards use the flavor video posters. Packages: The Trail ($4/person, 2 flavors), The Ridge ($5/person, 3), and The Summit ($6/person, all 4) are rough estimates that send people to the inquiry form. Both quote forms submit flavor picks as `pancake_bases`, limited by package in `bases.js`.

The remaining stock photos (syrup, fruit, hot cocoa, orange juice, gluten-free cards) are Unsplash or Pexels License — commercial use, attribution not required. The menu intro beside "Also on the table" uses `menu-intro-pancakes.webp`, an owner photo from the Stewart Falls hike.

The inquiry form currently opens a prefilled email to `pancak3boys@gmail.com`. To collect submissions through Formspree later, set `FORM_ENDPOINT` at the top of `catering.js` to your form URL (a one-line change) and the same fields will POST instead.
