# Interactive 3D garden

`3d.html` is a separate Three.js preview. The original `index.html?world`
experience and its scripts stay independent. Both versions are linked from
`basic.html`. Both interactive headers also link to Basic and the other
interactive version, including narrow phone layouts.

From the repository root:

```sh
npm ci
npm run build
npm run preview
```

The build writes the entry and current fingerprinted chunks to `assets/three/dist/`.
Commit that output with the source for GitHub Pages, which serves the site
without a Node build step. The server's port is 5188.

The default model set is `stylized-models/`: complete skinned clay characters
and cats, with separate high and mobile meshes. The day actor has nine
authored clips; the night actor currently has Idle and Walk. Other night
chapter interactions open their content rather than substituting a day rig.
The lectern action follows the real stairs before opening the Talks theater;
it does not substitute another animation for an absent Talk clip.
The seven original chapter contents come from the existing site data.

Local Blender builders live in `tools/stylized-assets/`. The original models
in `models/` supply their skeleton and animation inputs and remain available
as an explicit `?models=legacy` development fallback. They are not downloaded
by the default page. Private candidates and review captures do not belong
in the published asset directories.

Architecture is built from closed polygonal construction blocks: staggered
wall courses, layered roof tiles, complete floors/ceilings, real window
openings, and hinged doors. Welcome, the Research ground floor, Talks,
Writing, and the three-bay Life home have walkable interiors and solid
furniture. Research’s upper storey is a complete, sealed display storey;
the school models are outdoor keepsakes rather than walk-in rooms.

Use “Enter…” / “Step outside” to follow the doorway route. Arrow keys or
WASD walk in both directions; phones have four walking buttons. Drag to
orbit and use + / − to zoom. The indoor camera stays inside the room;
opaque walls block clicks on hidden items. Paintings, family photographs,
labels, and the Talks projection are supported by actual frames or boards.

Reviewed character/cat shapes and animations stay intact, with a matte toy
finish. Buildings keep warm wood, cream plaster and campus stone; their roofs
are blue-and-white porcelain (see below). Windows, lanterns and room practical lights illuminate the
night version. Desktop uses a display-copy FXAA pass; mobile uses the
single-sample renderer to keep its memory budget lower.

## The crystal ball, the sea and the chinoiserie layer

`src/magic-enchantment.js` adds to the world without changing routes, rooms or
colliders. `createEnchantment()` is called from `magic-world.js` after the
landscape and garden exist. It builds

* the crystal ball, its stand and nameplate, and the open sea in front of the
  promenade (the old river, lotus and koi are hidden, and the island is clipped
  at the quay line);
* the night sky, stars, floating candles, flying books, fireflies and lantern glow;
* the hidden whale in the lower half of the ball (click the sea to reveal it);
* the snowy owl on the Contact mailbox;
* a different branch of chinoiserie for each building (`FUSION`, measured per
  building in station units, and `FUSION_STYLES`): blue-and-white porcelain for
  Home, porcelain with a lit glass dome for Research, a Chinese timber hall with
  jade tiles for Talks, a Huizhou studio with ink tiles and horse-head walls for
  Writing, and amber tiles with a cats' tower for Life. Roof glazes come from
  `ROOF_STYLES` (`patchGlazedRoof`);
* hand-painted wallpaper over a wooden wainscot inside every room (`INTERIORS`,
  `patchWallpaper`, limited to the inner wall faces by the room bounds);
* a Chinese Chippendale railing on the promenade and the porcelain pagoda (`PAGODA`).

`src/magic-casebook.js` is a small detective case, *The Case of the Toppled
Teacup*. Three numbered evidence markers hide in the cats' house, on the ink
studio's inkstone and at the Contact mailbox; the Casebook button keeps the
clues, the six cats as suspects (photos and facts from `data.js`), alibis and
the accusation. Progress is kept in `localStorage` (`hj-crystal-case-v1`).

The diary in the ink studio drinks your ink as you write and answers in a
glowing hand (`src/magic-diary.js`, `magic-diary.css`). The invitation letter
carries a whale stamp, a Dalian to San Francisco postmark, an owl feather and a
P.S. that points to the casebook.

`src/magic-keepsakes.js` builds the detailed keepsakes that live inside rooms:
the Dalian and San Francisco box with the 2013 flight, the map of the cats' two
drives across America, and the crossroads before the PhD (the UN or a wider
view, and the way back). `magic-stories.js` opens them.

More small things to find: entering knocks three times (`src/magic-knock.js`,
Web Audio, a nod to The Big Bang Theory), an iceberg whose hidden mass glows
when clicked, letters spiralling in the Welcome hall, a whiteboard in the
library, books that slide out when clicked (`animateParts` in
`fidelity-room-kit.js`), a teaser wand for XiaoHei, a butterfly and a head rub
for JinBingBing (`magic-cats.js`), and a refined projector in Life.

The Lantern Theatre note sends straight to the site's email address through
FormSubmit (`sendReflection` in `magic-guestbook.js`). The very first note
triggers a one-time activation email to that inbox; until the link in it is
clicked, notes are held and visitors are offered their email app instead.

`magic-storybook.css` gives the overlays a storybook look: a parchment page for
the side panel, a handwritten scroll for speech, a ribbon banner for the
prompt, bookmark ribbons for the tools and brass coins for the camera buttons.

If a building is rebuilt, update its `FUSION` entry (walls, roof ridge and eave
corners). The whale path, the pagoda position and the sea level are constants
near the top of their sections.

With `?qa`, `window.__CRYSTAL_QA__` exposes `pause`, `renderOnce`,
`finishCamera`, `scene`, `camera`, `renderer`, `diary`, `casebook`, `caseClues` and
`enchant.diagnostics` for
headless screenshots and renderer counts.

