# hshids.github.io

Personal site of Hanjing Shi, served by GitHub Pages. It has two versions, and visitors can switch between them from either page:

| Page | What it is |
| --- | --- |
| `index.html` | **Interactive version, "Welcome to my world."** A scrolling ink-wash world. Mini-Hanjing walks between places (Welcome, Research, Talks, Education, Tutorials, Writing, Life, Contact) with JinBingBing the cat and answers questions in a chat box. |
| `basic.html` | **Basic version.** One plain text page in the original style (ink-wash background, paper overlay, Roboto Mono). It has no hobbies or personal section. |

A visitor's choice is remembered in `localStorage` (`hj-view`), and `index.html?world` always opens the interactive version. The old `about.html`, `tutorials.html` and `blog.html` redirect to the matching section of `basic.html`.

There is no build step. Every file is plain HTML, CSS and JavaScript, and the pages also work when opened straight from disk.

## Where things live

```
assets/js/data.js     ← ALL content: bio, papers, news, talks, posters, photos, cats, tutorials…
assets/js/guide.js    ← Mini-Hanjing's answers (rules + keyword search over data.js; no AI model, no network)
assets/js/art.js      ← SVG drawings: the avatar (and her pose drawings), JinBingBing and XiaoHei, the Tang
                        architecture kit (tangRoof, dougong, architrave, columns, lattice, terrace), each
                        place, and the layered backdrop (distant palaces, pagodas, towers, clouds)
assets/js/world.js    ← the interactive engine (walking, camera, panels, lecture hall, galleries)
assets/js/basic.js    ← renders basic.html from data.js
assets/css/world.css, assets/css/basic.css
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

Each place has a red circle on the ground (at Writing it's the red cushion). This is the place's `stand` point in `STATIONS` in `world.js`. When the avatar comes to rest on it, she does that place's action; walking away stops it, and clicking her replays the one-off actions.

| Place | Action |
| --- | --- |
| Welcome | waves and bows |
| Research | takes a book off the shelf and reads it |
| Talks | points at the slides |
| Education | tosses her graduation cap into the sky |
| Tutorials | types on the typewriter |
| Writing | turns around, sits on the cushion and writes |
| Life | crouches down and pets XiaoHei |
| Contact | posts a letter (the mailbox flag goes up) |

The poses are CSS classes on `#char` (`act-*`, see `world.css`), driven by `ACTIONS` in `world.js`; the props (book, cap, letter, back view) are drawn in `character()` in `art.js`.

## Preview locally

```bash
python3 -m http.server 8000
# open http://localhost:8000/ (interactive) or http://localhost:8000/basic.html
```

## Controls (interactive version)

| Input | Action |
| --- | --- |
| ← / → or drag | Walk |
| Click or tap a place | Open its panel |
| Enter | Explore the current place |
| `/` | Open the chat |
| Esc | Close panels, lightboxes and the lecture hall; in an empty chat box, fold the chat away |

The chat folds into a small "Ask me" button (the ⌄ button in its header), and the site remembers that choice. While it's folded, Mini-Hanjing says short answers in a speech bubble.

Clicking the sun or moon switches between day and night; the avatar changes outfit too. Motion is reduced when the system asks for it.
