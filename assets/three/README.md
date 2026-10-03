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
finish. Building colours retain warm wood, cream plaster, slate roofs and
campus stone. Windows, lanterns and room practical lights illuminate the
night version. Desktop uses a display-copy FXAA pass; mobile uses the
single-sample renderer to keep its memory budget lower.
