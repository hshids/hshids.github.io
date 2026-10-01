# Painted world review

Open `index.html` through the site's static server. The page includes complete painted pose references, live day/night character poses and 29 screenshots: all seven places on desktop and phone, each by day and night, plus the enlarged Talks theater.

The new paintings live in `assets/art/`; `paint.js` composes them around the original world controls. `rig.js` moves the painted textures with weighted joints. Complete painted bind poses supply continuous sleeves, arms and legs. Reading, covered-leg upright writing, petting and profile mailing have dedicated painted poses. Gesture palms attach at the native wrist contours; the coat and wool trousers have separate continuous motion weights. Jumping moves the body, face and hands in one coordinate space. Campus and architecture feet are checked against their visible painted contours and receding stone surfaces, rather than image bounding boxes.

Validation on 2026-10-01, using Chromium at 1440×1000 and 390×844:

- All seven day/night scenes loaded without script errors or missing local resources.
- Actual visible book spines, all three school models, tutorial scrolls, silk paintings, hanging ornaments and the inkstone retained their original actions.
- Cooking, travel routes, projector reels, cat gallery photos, grooming, butterfly pouncing and pond koi were exercised with pointer clicks.
- Repeated cat-gallery clicks did not duplicate the family introduction.
- The enlarged Talks theater retained its video dimensions, all three programs, keyboard navigation, player entry and close behavior. External Drive playback was not tested.
- Two independent reviewers checked normal-motion waving, one-arm pointing and book reaching, raised arms, bowing, jumping, walking and returning to rest. The checks include day/night clothing, real scene targets, feet against their receding stone surfaces, eyelid and mouth cycles, and the gravity-held hand lantern.
- Dedicated writing, reading, petting, grooming and profile mailing were checked through their action and cleanup phases. Back-facing writing keeps the legs covered.
- Timber and hemp attachments, screen placement, campus grounding and mobile framing were inspected across the seven places.
- Motion evidence includes both live pose studies for joint shapes and actual homepage navigation, clicks and chat commands for placement and triggers; static screenshot capture does not validate animation by itself.
- All screenshot images and live pose assets on this review page were checked after generation.

Rendering optimization preserves the original triangles, texture coordinates and joint weights. Shared vertices are transformed once and drawn by index. A separate numeric comparison of 288 synthetic bone/affine cases checked 69,562,368 Float32 values against the previous renderer, including the indexed triangles expanded back into their original order; all values matched exactly. These numeric cases supplement the actual interaction reviews above.

Performance remains a validation limitation: this cloud Chromium instance has no physical GPU and uses SwiftShader with software compositing. After optimization, median frame intervals were approximately 67–83 ms on the desktop layout and 50–67 ms on the phone layout. The cloud smoothness check did not pass. Real hardware-accelerated desktop and phone frame rates have not been verified; visual and interaction acceptance does not establish a frame-rate guarantee.

Screenshot capture suppresses temporary speech bubbles for a clear view of the illustrations. The live world's conversations remain enabled.
