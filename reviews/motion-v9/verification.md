# Motion update v9 — review notes

Four implementation agents worked on human motion, cats, campus / portraits, and the pond / layout. Two independent reviewers checked the changed areas using the real interactive page. Previously accepted, unrelated interactions and dialogue were preserved.

## Method

Use normal navigation, arrow keys, theme switching, and real visible mouse clicks. Motion evidence is captured from the browser compositor with original timestamps. Published clips use those captured frames without generated in-between frames. Walking clips use a fixed viewport crop for a closer look.

The review covers the observed cycles and transitions below. It does not claim exhaustive coverage of every possible animation or a performance benchmark on the viewer's device.

## Confirmed areas

- Cat: Day following in both directions, Night following, planted normal click, naturally visiting butterfly, real butterfly click, supported single-paw reach and return. Eight distinct complete painted poses form fourteen timed stages; there is no whole-cat hop. The original remark is deferred until after the reach so it does not obscure the butterfly.
- Pond: Day / Night local ripples, pad drift, fixed-root feathery reeds, and connected moving stalks / flowers. Visible water animations continue; distant ones pause. The brick, bank and water stay in the same world coordinates.
- Portrait: the complete Day frontal face is visible in the actual desktop and 390 px phone badge.
- Campus: Night Georgetown and Lehigh warm glass preserves mullions and masonry. The smaller graduation cap sits at the hair crown, flies, and returns there by Day and Night.

## Human and layout review

Both reviewers accepted the observed Day / Night steady walking in both directions, the complete Writing cycles, the four start / direction transitions, and the final texture-cache regression.

- Walking: increased configured pace from 110 to 165 world units per second, with distance-driven steps and frame-to-frame pose mapping. Day coat, belt and hair tips move subtly; Night hem and loose hair have smaller motion. The visible silhouette stays complete. The initial wrong Night outfit and wrong first left-facing pose were corrected and recorded again using normal input.
- Writing: a low sitting desk aligns the paper with the natural upright kneeling pose on the original cushion. Both complete cycles show connected shoulders / sleeves / wrists and brush contact while H/e/l/l/o/W/o/r/l/d/! appear individually. No legs are exposed in the rear writing view. The original dialogue remains unchanged.
- Texture cache: each native painting uploads once per rig. Actual counters stayed at 4 through the rest of the first Day walking cycle and at 8 through the Night walking cycles, with later new greeting images accounting for subsequent increments. This removes repeated image uploads when crossing native source sheets; it does not establish a device frame-rate promise.
- Layout: the Tutorials cabinet, its labels and original clickable archive links moved together. Three foreground pines and one willow, plus Contact's own sculpted tree, have visible path contact and varied sizes. The fifth proposed foreground position is excluded by the Contact zone and is not claimed as a tested tree.
- Phone: resizing an idle world now recomposes the camera using the new scale. The widened Writing view shows the actor, paper, desk, cushion, screen and whole archive cabinet, with about 14 px beyond its right post. Fresh navigation and a desktop-to-phone resize were checked, including real R archive clicks by Day and Night. Visible water occupies about one fifth of the phone frame.

Evidence: 504 actual compositor frames for the four walks and two full Writing cycles; 226 frames for the corrected start / theme / direction transitions; 127 frames for the final texture-cache regression. Final phone framing and real archive clicks were also checked. Application JavaScript exceptions: zero in these sessions.

Limits: the headless software capture still showed roughly 0.34–0.61 seconds from scripted key input to the first captured profile in the transition run. Capture timing is not a measurement of the viewer's display. A magnified cuff can retain a faint double painted line during a pose blend. These are finite visual checks of a 2D painted animation, not motion capture or a guarantee for every frame.

## Environment limits

The optional Google Fonts request was blocked by the environment network; this is separate from application JavaScript exceptions. Capture used local Chromium with software rendering, so the recordings are not a claim about the live site's maximum frame rate.

Public GitHub Pages is blocked by the environment network. Publication is verified by the commit at remote main; a live Pages rendering check cannot be performed here.
