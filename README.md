# hshids.github.io

Personal site of Hanjing Shi, served by GitHub Pages. It has two versions, and visitors can switch between them from either page:

| Page | What it is |
| --- | --- |
| `index.html` | **Interactive version, "Welcome to my world."** A scrolling ink-wash world. Mini-Hanjing walks between places (Welcome, Research, Talks, Education, Writing, Life, Contact) with JinBingBing the cat and answers questions in a chat box. |
| `basic.html` | **Basic version.** One plain text page in the original style (ink-wash background, paper overlay, Roboto Mono). It has no hobbies or personal section. |

Tutorials and Blogs share the Writing section in both versions. The interactive desk keeps its writing animation, tutorial scrolls and hanging paper cranes and folded stars. Old `#tutorials` links still reach the tutorials.

A visitor's choice is remembered in `localStorage` (`hj-view`), and `index.html?world` always opens the interactive version. The old `about.html`, `tutorials.html` and `blog.html` redirect to the matching section of `basic.html`.

`index.html?world` is the single current interactive release. Old `v=` bookmarks normalize to the same address without restarting the world, and old motion review URLs redirect there. Screenshot and video review archives are not published. Mobile touch devices use pixel-identical lossless WebP copies of the two large wave donor paintings; desktop keeps the original PNG files.

There is no build step. Every file is plain HTML, CSS and JavaScript. Use a static HTTP server for local previews so the painted animation textures can be read by the browser.

## Where things live

```
assets/js/data.js     ← ALL content: bio, papers, news, talks, posters, photos, cats, tutorials…
assets/js/guide.js    ← Mini-Hanjing's answers (rules + keyword search over data.js; no AI model, no network)
assets/js/art.js      ← SVG drawings: the avatar (and her pose drawings), JinBingBing and XiaoHei, the Tang
                        architecture kit (tangRoof, dougong, architrave, columns, lattice, terrace), each
                        place, and the layered backdrop (distant palaces, pagodas, towers, clouds)
assets/js/world.js    ← the interactive engine (walking, camera, panels, lecture hall, galleries)
assets/js/scroll-story.js ← the handscroll: chapter order and positions, the painted chapter signs, the Dalian
                        prologue, the 2013 crossing (paper crane), the ground mist and the scroll map
assets/js/quilt.js    ← the cloth base of the 2D world: the sky quilt, its torn and frayed edges, seams and patches
assets/js/paint.js    ← painted scenes, material details, facial features and dedicated poses
assets/js/rig.js      ← continuous 2D joints for painted sleeves, arms, legs and cat paws
assets/js/gesture-hands.js ← painted gesture hands attached to the moving wrists
assets/js/basic.js    ← renders basic.html from data.js
assets/css/world.css, assets/css/basic.css, assets/css/fabric.css (the cloth look of the 2D world)
assets/art/           ← the original paintings (sprite sheets, character textures, mountains, materials);
                        the 3D page and the basic version use these
assets/art/fabric/    ← the same paintings sewn as fabric collage, made by tools/fabricize.py; the 2D world
                        loads these (window.HJArtDir = "fabric/" in index.html)
tools/fabricize.py    ← rebuilds assets/art/fabric/ from assets/art/
images/…              ← photos (each gallery folder has a thumbs/ subfolder)
files/…               ← PDFs (posters, slides)
tutorials/, blog/     ← the original tutorial and blog pages (unchanged)
```

**To change content, edit only `assets/js/data.js`.** Both versions and the chat guide read from it. `person.photo` is the basic version's profile picture.

## Common updates

### Add a paper
Add an object to `publications` in `data.js`. Copy a neighbour and edit:
- `type`: one of `proceedings`, `workshop`, `poster` or `preprint`.
- `theme`: one of the `themes[].id` values. This decides which shelf the paper sits on in the library.
- `summary` / `takeaway`: `{ en, zh }` pairs.
- `intro`: `{ en, zh }`, what Mini-Hanjing says when someone asks about the paper. Write it in first person, casually. Every paper answer then ends with "Curious about the details? Reach out to Hanjing (the human one)!" and an email button. Without an `intro`, the guide falls back to the summary.
- `keywords`: help the guide find the paper.

Add `upcoming: true` for a paper you're about to present. The guide answers "what are you presenting next?" with it.

### Education extras and current projects
- Each `education` entry can have `honors` (`{ en, zh }`) and `alongside`, the roles held during that degree (`{ role, org, when, en, zh }`). They show under the degree in the basic version, the Education panel and the guide ("Did you work at the UN?", "Any awards?").
- `projects` lists unpublished work (`status: "review"` or `"progress"`, plus `intro` for Mini-Hanjing). They appear under "Now working on" in the Research panel and the basic version. Once a project becomes a paper, move it into `publications`.

### Add a news item
Add `{ date: "Oct 2026", en: "…", zh: "…", paper: "<paper id>" }` at the top of `news`. The `paper` field is optional.

### Add a talk video
1. Upload the video to Google Drive and set sharing to **Anyone with the link → Viewer**.
2. Add `{ paper, drive: "<file id>", thumb, title, venue }` to `videos`. The file id is the part of the share link between `/d/` and `/view`.

The video plays in the lecture hall through Drive's embedded player. If playback stutters, compress the file (for example `ffmpeg -i in.mp4 -vf scale=-2:720 -crf 28 -preset slow -c:a aac -b:a 96k out.mp4`), re-upload it, and swap the id.

### Add a poster
1. Put the PDF in `files/`.
2. Put a JPG of the poster in `images/posters/`, plus a small copy in `images/posters/thumbs/`.
3. Add an entry to `posters`.

### Add a conference photo or a cat photo
1. Drop the JPG in `images/conference/` or `images/cats/`.
2. Add it to `conferencePhotos` or to that cat's `photos` list.

A new cat is just a new object in `cats`. A matching file in `thumbs/` makes the gallery load faster. It is optional, because a missing thumbnail falls back to the full image. To make thumbnails:

```bash
python3 -c "
import sys, pathlib; from PIL import Image
for f in sys.argv[1:]:
    p = pathlib.Path(f); im = Image.open(p); im.thumbnail((420, 420))
    (p.parent / 'thumbs').mkdir(exist_ok=True); im.convert('RGB').save(p.parent / 'thumbs' / p.name, quality=82)
" images/cats/new-photo.jpg
```

### Links still to fill in
In `data.js`, `person.links.cv` is empty. Once it's set, the guide, the Contact place and the basic version link to it. The top-level `foodSocial` is also empty; set it to your restaurant-review account and a link appears in the Life place.

## How the guide works

Mini-Hanjing does not use a language model:
1. `guide.js` matches the question against a list of intents (papers, education, talks, cats, and so on) written as regular expressions.
2. If no intent matches, it runs a keyword search (BM25) over the papers, tutorials and posts in `data.js`.
3. It only answers from that content and declines personal questions.

Visitors who type in Chinese get Chinese answers. Everything else on the page is English.

To teach the guide a new question, add words to the matching intent in `INTENTS` or to the relevant `keywords` in `data.js`.

## Red circles (what she does at each place)

Each place has a `stand` point in `STATIONS` in `world.js`. When the avatar comes to rest there, she does that place's action; walking away stops it, and clicking her replays the one-off actions. Most places mark it with a red circle (at Writing it's the red cushion). Life has no separate circle: XiaoHei's soft, woven cushion highlights only along its front seam when hovered, tapped, or focused by keyboard.

| Place | Action |
| --- | --- |
| Welcome | waves and bows |
| Research | takes a book off the shelf and reads it |
| Talks | points at the slides |
| Education | tosses her graduation cap into the sky |
| Writing | turns around, sits on the cushion and writes; the scroll rack opens tutorials and paper cranes flutter and folded stars turn when touched |
| Life | crouches down and pets XiaoHei |
| Contact | posts a letter (the mailbox flag goes up) |

The poses are CSS classes on `#char` (`act-*`, see `world.css`), driven by `ACTIONS` in `world.js`; the props (book, cap, letter, back view) are drawn in `character()` in `art.js`.

Water lilies float close to the water and fold into fuller buds at night; a few stemmed lotus flowers keep a higher silhouette and close partway. The Writing screen has separate plum, orchid, bamboo and chrysanthemum paintings; touching a painting gives a small bilingual aside without changing the existing introductions.

Education uses campus keepsakes on supported stone terraces: UC Davis's painted steel water tower and bicycle, Georgetown's gray masonry and clock tower, and Lehigh's warm stone library and rounded apse. Stone courses, recessed windows, slate roofs and night lighting use distinct materials; the flags remain clear of the raised Education sign.

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000/index.html?world (interactive) or http://localhost:8000/basic.html
```

## Controls (interactive version)

| Input | Action |
| --- | --- |
| ← / → or drag | Walk |
| Click or tap a place | Open its panel |
| Enter | Explore the current place |
| `/` | Open the chat |
| Esc | Close panels, lightboxes and the lecture hall; in an empty chat box, fold the chat away |
| Scroll map (bottom) | Jump to a chapter; the view glides along the scroll while the figures fade into the mist and walk back in |

The walk reads as one handscroll: a title, a prologue for Dalian, the gate, the 2013 crossing (the paper crane), then the schools, research, talks, writing, life and the letters, ending with "to be continued". At each chapter sign Hanjing says one short line, and the chapter's questions appear in Ask Me, where the story is told in conversation. New chapters reuse the painted sprites so they match the stations, and all on-page text is English; Chinese appears only when a visitor chats with Mini-Hanjing in Chinese. To move a station or add a chapter, edit `LAYOUT` and `CHAPTERS` in `assets/js/scroll-story.js`; `assets/css/scroll-story.css` holds the travel fade and the scroll map.

## The fabric collage look (2D world)

The 2D world is appliqué and embroidery together: large areas of colour are cut from plain cloth, the detail is embroidered on top.

- **Scenery.** Each painting is cut into a few large pieces along its painted outlines. Each piece is plain dyed cloth (linen, cotton, denim, burlap or felt), slightly padded and creased, casting a soft shadow on the piece below and edged with a fine blanket stitch in a muted thread. Roof tiles and leaves are filled with satin floss that follows the tiles and leaves, with a chain stitch round them. Everything detailed (windows, carving, brackets, the audience in the lecture hall, the kitchen pot) is worked in fine silk thread in the painting's own colours, standing a little off the cloth.
- **Background.** The far mountains and trees are a few large pieces of plain cloth cut by tone (pale far peaks, rocky ridges, green slopes, dark forest), edged with a quiet darker thread. The small towers and pavilions in the distance are embroidered all over at the size they are shown: satin floss on the roofs, fine silk on walls and columns, a back stitch round each. The sky is one piece of plain silk with a torn edge, bound with a running stitch, on a burlap backing (felt at night).
- **Hanjing.** Her shape stays exact, so the animation still fits. Each garment is in its own cloth: gabardine coat, silk shirt, herringbone trousers, leather shoes, and at night a black silk qipao with leaves in gold thread. Her hair is fine silk thread along its flow. A back stitch runs round her outline, hair and shirt included, so she reads as one piece sewn onto the scene. Her face is the painting itself while she moves; when she stands still facing us it is embroidered in very fine silk, with the eyes, brows, nose and lips in finer, slightly raised stitches.
- **Cats.** Short fine stitches that follow the fur, with the eyes and nose left clear.
- **Page.** The station names are satin-stitched letters. Sewn lines on the page are twisted thread, and the water is dark cotton appliqué: rolling swells cut from muted slate, indigo and teal cloth, each laid over the one behind with its own shadow, a second cloth in its hollow and a running stitch along its top. Mother-of-pearl is only the highlight: thin strips of white shell along each crest and into its curl, set in a dark seat, pearly white turning pink, green and blue with a glint along its edge, and a spray of pearls. The lotus flowers, buds and leaves on the water are embroidered in satin stitch that spreads from the heart of each flower and leaf.

The fine silk is drawn by line integral convolution: thread-sized noise smeared along the direction of the painting's own structure, so the threads bend with hair, fur and carving. The sheen changes with the thread direction, as it does on real silk. Stitches are seeded by position, so the walking frames get matching stitches.

After changing or adding a painting in `assets/art/`, rebuild the cloth versions:

```bash
pip install numpy opencv-python-headless
python3 tools/fabricize.py                 # every image (a few minutes)
python3 tools/fabricize.py buildings-painted pine   # or just some
python3 tools/fabricize.py --tiles         # the silk, weave, burlap and felt swatches
```

`SCALE` at the top of the script records how large each sheet appears on screen, so stitches and weave come out the same size everywhere; sheets shown enlarged are sewn at 1.5x their size. The look is tuned with the constants below it: piece size, blanket and chain stitch, satin floss (`EMB_*`), the silk thread painting for each use (`SILK_*`: thread width, stitch length, contrast, sheen, relief), Hanjing's outline, and which sheets are far landscape cloth (`LANDSCAPE`), figures or cats, plus the small motifs embroidered all over (`EMB_REGIONS`: the distant buildings and the lotus).

Mini-Hanjing answers like a conversation: a few sentences and a follow-up question, with any long list folded under a "Show me" button (`fold()` in `assets/js/guide.js`).

The chat folds into a small "Ask me" button (the ⌄ button in its header), and the site remembers that choice. While it's folded, Mini-Hanjing says short answers in a speech bubble.

The conversation starts folded for new visitors. JinBingBing follows with four separate paw movements, smooth starts and stops, and a rounder walking profile. After a quiet moment in daylight, a butterfly occasionally flies in, invites a little pounce, then leaves for a longer interval. Visitors can also tap it while it is present; it stays absent at night, during movement and for reduced-motion visitors. Keep clicking JinBingBing to discover her tail-chasing reaction. Click XiaoHei on the Life cushion to wake him for a short grooming session. Automatic scene and prop introductions appear only once per visit; revisiting still opens the panel and plays its action. Explicit chat questions continue to receive replies, and rapid repeat submissions are ignored. Clicking a lotus pond makes ripples and reveals a koi. These details work with both mouse and touch.

The artwork uses local WebP textures inside SVG patterns, keeping the architecture, actors and scenery as independently animated elements. Foreground materials follow the day/night palette; distant windows remain warm at night. The character, JinBingBing and XiaoHei are drawn from the photos already in `images/portraits/` and `images/cats/`.

Clicking the sun or moon switches between day and night; the avatar changes outfit too. Motion is reduced when the system asks for it.

The explicit `?world` URL opens the interactive version even when a visitor previously chose the basic version. The live interactive entry is https://hshids.github.io/index.html?world.

Page navigation, panels and controls remain in English. Mini-Hanjing answers Chinese questions in Chinese without changing the language of the surrounding site.

Optional scene scripts are additive in `assets/js/rituals.js`; the original introductions and question responses stay in `guide.js`. Ask “带我找彩蛋” / “Show me the little rituals”, or try “磨墨”, “放一卷猫片”, “开饭啦”, “看看锦鲤”, “小黑洗脸”, and “看一会儿月亮”. The English equivalents are “Grind some ink”, “Roll the cat film”, “Let the pot simmer”, “Watch the koi”, “Let XiaoHei groom”, and “Watch the moon”. Directly clicking the inkstone, cooking pot, or projector also gives its new material a small animated response while retaining the existing panel navigation.

The pond is one continuous water plane with a curved bank, a submerged shelf, textured plants, and a screen-aligned sun/moon reflection. Ripples and koi appear at the tapped position. Pine and willow artwork uses transparent local assets and retains the existing parallax layers; distant architecture has foliage rooted on the same slope as its foundation and fades into the landscape. Foreground trees follow the actual paving edge, with soil, contact shadows and partially covered roots; distant roots fade into their slopes and retain the ridge occlusion masks.

The Road trips map shows two schematic crossings: 2021 from San Francisco to Washington, DC via Chicago in the north, and 2025 from DC to San Francisco through Texas in the south. The replay follows each direction in order; 46 states is the overall visited total, separate from these two drives.

The cat gallery follows arrival order: DaHuang, XiaoHei, XiaoHeiHei, TuanZi, GuoZi, then JinBingBing. The companion badge follows JinBingBing’s stable `id`; the projector and photo viewer use the same family order. Gallery cards use short family-story labels. Photo captions lead with each cat’s story, with coat/breed labels kept secondary.

`life.travel.journey` holds the personal chapters from high school near Albany, through Davis, DC and Pennsylvania, to San Francisco today. The Life panel and Mini-Hanjing’s “Where have you lived?” answer share these entries.
