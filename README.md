# Pancake Boys website

The maintained website lives in [website/](website/). Start with [START-HERE.txt](START-HERE.txt) and [website/README.md](website/README.md) for the approved direction, preview command, verification, and video handoff. The original Downloads draft remains intact. Publishing is handled by the owner.

Local website with the approved design and a restrained motion pass. No build step or third-party runtime dependencies.

Serve this folder with any static web server. From the Desktop Pancake Boys project:

```powershell
python -m http.server 4174 --bind 127.0.0.1 --directory website
```

Preview: http://127.0.0.1:4174/. Port 4173 was serving the older Downloads copy during development, so this workspace uses 4174. Do not stop an unrelated server.

If Python is unavailable on PATH, use `C:\Users\carte\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe` in place of `python`.

Edit `content.js` to set the Instagram URL, contact email, and confirmed next-hike details. Until then, no date or contact address is invented. Gallery photos, the full-screen menu, story, and support dialogs work locally.

Event RSVPs, mailing lists, contributions, partnership submissions, and Shopify checkout are not connected. The first draft intentionally does not collect or pretend to submit information. Those integrations need real destinations before launch.

Original photographs belong to Pancake Boys. Website assets are resized WebP copies with metadata removed. The source photo collection remains in `C:\Users\carte\Downloads\Pancake Boys\Photos`; the Desktop workspace contains the optimized website assets.

## Motion and controls

- Full-screen menu: a 360ms entrance, lightly staggered links, and a 230ms exit. Native modal semantics, Tab/Shift+Tab wrapping, Escape, focus restoration, and section focus after navigation remain intact. Rapid Escape/reopen cancels old animations.
- Headline and image reveals: once per page visit, 14px of movement over 580ms. Content starts visible and stays readable if JavaScript fails. No scroll hijacking or parallax.
- Field Notes keeps its original photo composition. Open any photo to enter the sliding viewer. Use previous/next buttons, Left/Right, Home/End, or a horizontal touch swipe. It wraps at either end, updates the caption/count, and exposes only the selected slide to assistive technology. No autoplay.
- Reduced motion: immediate menu/gallery changes, no reveals or hover zoom, ordinary scrolling, and the still hero photo. Changing the preference during a menu transition releases the dialog correctly.

## Add the real hero film

No video footage is supplied or fabricated. The current configuration is `heroVideoSrc: null`, which requests no video and keeps `assets/mountains.webp` unchanged.

1. Put the owner-supplied clip at `website/assets/hero-hike.mp4`. Prefer a short landscape H.264 MP4, roughly 8–15 seconds, trimmed for a quiet loop and compressed for mobile. WebM is also supported with a matching filename/configuration.
2. In `website/content.js`, change:

   ```js
   heroVideoSrc: 'assets/hero-hike.mp4',
   ```

3. Reload the local preview and check the real clip on desktop and a phone. Verify the crop, loop seam, download size, and play/pause control. These footage-specific checks are still pending because the clip does not exist yet.

The film plays muted, inline, and loops, with an accessible keyboard-operable pause/play button. The existing mountain photo is both the poster and a separate fallback beneath the video. Video becomes visible only after playback starts; failed media leaves the photo visible. If autoplay is blocked, manual play is offered. Video pauses offscreen, in a hidden tab, or while a dialog is open; a visitor's deliberate pause is retained. Reduced-motion visitors get the photo and never request the clip on initial load. Only a local `assets/` MP4/WebM path is accepted.

## Local verification

`qa/motion.test.cjs` contains browser regression checks; Playwright is a test tool only. With Playwright available to Node, run `node website/qa/motion.test.cjs` from the project root while the server runs. Set `PANCAKE_TEST_URL` to override the default localhost port 4174.

This machine's bundled tools can run the suite without adding project dependencies:

```powershell
$env:NODE_PATH = 'C:/Users/carte/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
& 'C:/Users/carte/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' website/qa/motion.test.cjs
```

The suite uses isolated headless Chrome, including native touch input and reduced-motion emulation. Results are saved in `qa/test-results.json`. Before/after desktop and mobile captures and gallery screenshots are in `qa/`. Browser-emulated mobile checks do not replace final review of owner-supplied footage on physical devices. Nothing is published or connected to payments.
