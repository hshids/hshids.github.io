# Local rounded characters

This Blender pipeline creates the simplified, rounded 3D Hanjing variant with
soft PBR colour throughout the head, hair, skin, clothing and shoes. It uses no
paid generation service and no projected portrait texture. The old 2D site and
four V26 fallback models remain separate.

`build_humans.py` imports the stable day or night rig and preserves its rest
skeleton. New closed, rounded clothing volumes replace the old thin tailored
panels and sharp lapels. `human_details.py` builds a true rounded head, connected
neck, simple eyes, soft nose and solid hair masses, with roughly five-head body
proportions. The daytime outfit is a short tan trench coat, shallow ivory
collar, charcoal trousers and chestnut loafers; evening keeps the dark qipao,
gold bamboo stitches and warm practical lantern. The new dress registers its
weights and cloth delta on the source triangles; bamboo stitches follow those
same weights and morph deltas. Skin and clothing use authored clay PBR colours
throughout, with no photographic projection. Closed shoulder-root volumes
follow the chest and clavicles, so an arm cap is supported by the torso during
movement rather than merely touching its silhouette.

Write alone adjusts the real thigh, shin, foot and toe quaternion channels to
bring the knees together and tuck the feet. Two-bone IK preserves joint lengths
and keeps the actual rotating shoes near the bearing floor during the crouch.
The same closed coat changes into a rounded folded shape through its real
`KneelingCloth` morph; a temporary registration envelope is deleted before
export, so no separate cover grows over the trousers. The legs remain present;
the skeleton's rest matrices and the other eight day clips are preserved.
Held garment enclosure and floor checks support review, but actual writing
transitions, the shallow cushion contact and every visible side still require
review before publication.

Run Blender 4.3+ from the repository root. All default outputs stay in private
QA storage, never in the website model directory:

```sh
blender --background --threads 4 --python tools/stylized-assets/build_humans.py -- \
  --repo "$PWD" --quality high
blender --background --threads 4 --python tools/stylized-assets/build_humans.py -- \
  --repo "$PWD" --quality low
blender --background --threads 4 --python tools/stylized-assets/build_humans.py -- \
  --repo "$PWD" --quality high --night
blender --background --threads 4 --python tools/stylized-assets/build_humans.py -- \
  --repo "$PWD" --quality low --night
```

The outputs are `hanjing-{day,night}-{high,low}.glb`, with matching intake
reports recording source/builder/helper hashes, real exported clip names,
materials, triangles and bounds. Each model has a full 34-bone rig, a nominal
1.92 m height, feet at ground zero, and GLTF +Z facing. Existing `Head`, `Neck`,
`Hand.L`/`Hand.R`, measured stride extras and the writing hand convention are
retained. Night keeps its own narrow lower-leg rest matrices and its real
`NightLanternLightSocket`; it no longer needs a separately merged legacy head.

Day contains the nine real existing clips: Idle, Walk, Wave, Bow, Read, Write,
Mail, Cap and Pet. The canonical night source contains only Idle and Walk.
This pipeline reports that limitation rather than relabelling copies as new
actions. The unapproved private night interaction studies are not source data.

High and low use the same palette and macro silhouette. Low changes mesh
sampling, not skin tone or body-axis proportions. The exporter rejects missing
skin weights, image materials and zero-area polygons; legacy flat-shoe cap
triangles proven degenerate are removed without changing vertex positions.
Those checks establish the export contract, not visual approval. Before a
model replaces a site asset, review its actual front, three-quarter, profile
and back in Three.js and a continuous gait plus relevant action transitions.
Keep private captures and rejected candidates outside the repository.

The folded coat is checked using actual glTF skinning and morph positions.
Four-sample MSAA produced a small trouser-coloured trace through the enclosed
coat even with unlit materials and the skinning baked to ordinary meshes.
The same candidate with MSAA disabled has no trace; winding and pixel-ray
checks also show the trousers inside the coat. The 3D renderer therefore uses
its separate screen-space antialiasing path. Do not enlarge the clothing or
hide the legs to compensate for that rasterization artifact.

`build_cats.py` creates JinBingBing and XiaoHei as complete rounded quadrupeds,
with golden longhair/cream chest and charcoal tuxedo/white-sock identities.
It constructs closed volumes for the torso, articulated legs, head, ears,
inset eyes and connected tail instead of projecting photos onto face cards.
The longhair clay silhouette uses a connected neck/chest mane with buried,
downward flowing locks; it does not cover a bare body with detached fur beads.
Forelegs have one welded surface and half-angle elbow/wrist helper bones.

```sh
blender --background --python tools/stylized-assets/build_cats.py
```

For a local refinement, build only the affected asset and retain the other
three models and their report entries:

```sh
blender --background --python tools/stylized-assets/build_cats.py -- \
  --only jinbingbing:low
```

The mobile Jin model adds a small cheek/socket mesh budget after the eye
cavities are formed. Existing silhouette and cavity-rim vertices, colours and
skin weights stay fixed; new points sample the same fields. Compare the actual
mobile close-up and its relevant action phases before accepting that change.

The four private outputs are `{jinbingbing,xiaohei}-{high,low}.glb` under
`/workspace/three-world-qa/stylized/cats/`. glTF uses Y up, +Z forward and
ground-zero soles, with nominal standing height 0.82 m. `CatRig` and the scene
carry `walk_stride_source_m=0.34`, `walk_cycle_seconds=0.8` and the local tail
sway axis. Idle sits; Walk uses diagonal paw pairs; Pounce keeps the rear paws
planted while lifting the chest and reaching; Groom lifts a paw toward the
muzzle. The walk tail stays upright for an independent slower runtime sway.

Closed surfaces and zero boundary edges do **not** establish pose approval:
the first candidate met those checks but stretched the chest and front arms
during Pounce, so it was rejected. Review actual front/45/profile/back and
both cats' full continuous Walk cycles, Pounce/Idle transitions and Groom
before promoting them. Numerical foot contact and finite skinning checks are
supporting evidence, not substitutes for inspecting the rendered anatomy.
When diagnosing surface rings, compare the same actual model with and without
self-shadowing; shadow-map acne must not be described as fur or removed by
disabling final shadow reception. Keep identity albedo checks separate from
lighting checks, using an unlit vertex-colour view and the world lighting.
