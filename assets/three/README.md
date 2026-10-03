# Interactive 3D garden

`3d.html` is a separate Three.js preview. The original `index.html?world`
experience and its scripts stay independent. Both versions are linked from
`basic.html`.

From the repository root:

```sh
npm ci
npm run build
npm run preview
```

The build writes the entry and current fingerprinted chunks to `dist/`.
Commit that output with the source for GitHub Pages, which serves the site
without a Node build step. The server's port is 5188.

The default model set is `stylized-models/`: complete skinned clay characters
and cats, with separate high and mobile meshes. The day actor has nine
authored clips; the night actor currently has Idle and Walk. Other night
chapter interactions open their content rather than substituting a day rig.
The seven original chapter contents come from the existing site data.

Local Blender builders live in `tools/stylized-assets/`. The original models
in `models/` supply their skeleton and animation inputs and remain available
as an explicit `?models=legacy` development fallback. They are not downloaded
by the default page. Private candidates and review captures do not belong
in the published asset directories.

Architecture uses separate solid surfaces with the original painted pigment;
unseen surfaces are inferred, rather than recovered from a 3D scan. The
environment palette changes selected botanical and landscape materials.
Actor colours, wood, tiles, stone and warm night lights retain their own
materials. Desktop uses a display-copy FXAA pass; mobile uses the existing
single-sample renderer to keep its memory budget lower.
