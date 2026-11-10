"""Builds art/assets.json: one image-generation prompt per illustration.

The list is the input for Codex (see art/CODEX.md). Every prompt = the shared
style + descriptions of the characters it shows + its own subject + the background.
Run: python scripts/art-prompts.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

STYLE = (
    "Hand-drawn whimsical cartoon illustration in a quirky indie picture-book style. "
    "Thick, slightly wobbly black ink outlines like a felt-tip marker, loose and imperfect. "
    "Fills done with oil pastel / wax crayon: visible grainy strokes and rough texture, a few loose hatching lines. "
    "Characters have huge round white googly eyes that touch each other, with tiny black dot pupils, "
    "simple deadpan or gently funny expressions, small mouths, big heads, long thin limbs, odd charming proportions. "
    "Minimal detail, flat 2D composition, no gradients, no 3D, no photorealism, no glossy shading. "
    "Limited palette of 3 to 5 colors. Subject centered with a generous empty margin around it. "
    "No text, letters or numbers unless the description explicitly asks for them. No watermark, no signature, no frame, no border."
)

BG = {
    "sage": "#A9B98A sage green",
    "cobalt": "#2A7AB0 cobalt blue",
    "sky": "#5AA6DC sky blue",
    "coral": "#F2888A coral pink",
    "mustard": "#F2B544 mustard yellow",
    "cream": "#F1E4C6 warm cream",
    "lilac": "#B9A3D6 soft lilac",
    "night": "#2E3A6E deep night blue",
}


def bg_text(name):
    if name == "key":
        return ("Background: perfectly flat solid pure magenta #FF00FF filling the whole image, "
                "no texture, no shadow, no ground line, nothing else in the background.")
    return (f"Background: one flat solid {BG[name]} color filling the whole image edge to edge, "
            "with subtle paper grain and a few tiny pale speckles. No frame.")


CHARS = {
    "brezel": ("Brezel, the mascot: a cheerful soft German pretzel character. Golden-brown baked dough rope tied in the "
               "classic pretzel knot with two round holes, coarse white salt crystals, two huge round white googly eyes "
               "with tiny black dot pupils sitting on the thick bottom curve, a small mouth, pink cheeks, "
               "thin black stick arms and stick legs with tiny brown shoes."),
    "lena": ("Lena (hostel receptionist from Berlin, about 25): tall and skinny, very long wild messy bright orange hair, "
             "a few freckles, moss-green turtleneck sweater, dark blue jeans."),
    "tom": ("Tom (Lena's brother from Hamburg, about 22): lanky, short spiky dark-brown hair sticking up, sleepy eyelids "
            "over his googly eyes, sky-blue hoodie with sleeves a bit too long."),
    "wagner": ("Frau Wagner (German teacher, about 60): small and round, grey hair in a tall tight bun, big round glasses, "
               "brown knitted cardigan with big buttons, small pearl necklace."),
    "marco": ("Marco (from Italy, about 28): short and stocky, huge black curly mop of hair, olive skin, tiny moustache, "
              "orange t-shirt."),
    "aigerim": ("Aigerim (from Kazakhstan, about 24): long straight black hair with a neat fringe, warm light-brown skin, "
                "red cardigan, small gold earrings."),
    "you": ("Alex (the learner, a young adult): medium build, messy chestnut-brown hair, mustard-yellow sweater, "
            "small dark-green backpack straps on the shoulders."),
    "becker": ("Herr Becker (from Austria, about 50): extremely tall and thin, grey felt hat, small round glasses, "
               "neat grey moustache, beige trench coat, red tie, brown leather briefcase."),
    "driver": ("a Berlin taxi driver: chubby, flat tweed cap, bushy black moustache, navy-blue jacket."),
    "passenger": ("a tourist from Hamburg: short blond hair, round glasses, green polo shirt, a huge red suitcase."),
    "man": ("Timur (from Uzbekistan, about 30): short black hair, short neat black beard, green shirt, friendly smile."),
    "woman": ("Anna Huber (from Switzerland, about 35): long wavy auburn hair, sky-blue blouse, red scarf."),
    "f": ("a woman with a short black bob haircut and a purple coat."),
    "m": ("a bald man with a huge grey handlebar moustache and a brown waistcoat."),
}

assets = []


def add(aid, group, subject, bg, chars=(), size="1024x1024", note=""):
    parts = [STYLE]
    if chars:
        parts.append("Characters (keep these exact designs): " + " ".join(CHARS[c] for c in chars))
    parts.append("Image: " + subject)
    parts.append(bg_text(bg))
    assets.append({
        "id": aid,
        "group": group,
        "out": f"art/raw/{group}/{aid}.png",
        "size": size,
        "prompt": "\n\n".join(parts),
        **({"note": note} if note else {}),
    })


# ---------- Маскот: 4 настроения на пурпурном фоне (фон потом вырезается) ----------
M = ("Full body of Brezel standing, facing the viewer, whole figure visible with margin, "
     "no other objects. ")
add("idle", "mascot", M + "Calm friendly expression, small smile, arms relaxed.", "key", ["brezel"])
add("happy", "mascot", M + "Overjoyed: jumping in the air, both stick arms thrown up, mouth wide open laughing, eyes squeezed happy.", "key", ["brezel"],
    note="Use mascot/idle.png as the reference image if your tool accepts one, so it is the same character.")
add("sad", "mascot", M + "Sad and droopy: shoulders slumped, eyes looking down, mouth a small wobbly frown, one tiny tear.", "key", ["brezel"],
    note="Use mascot/idle.png as the reference image if your tool accepts one.")
add("wave", "mascot", M + "Waving hello with one stick arm raised high, big open smile.", "key", ["brezel"],
    note="Use mascot/idle.png as the reference image if your tool accepts one.")

# ---------- Аватары героев: портрет по плечи ----------
AV = "Head-and-shoulders portrait, facing the viewer, centered, face large in the frame. "
for who, bg, mood in [
    ("lena", "sage", "Warm cheerful smile."), ("tom", "sky", "Sleepy lopsided grin."),
    ("wagner", "mustard", "Kind but strict teacher look, eyebrows raised."), ("marco", "coral", "Big happy grin."),
    ("aigerim", "lilac", "Calm warm smile."), ("you", "cream", "Curious friendly expression."),
    ("becker", "sage", "Polite tight-lipped smile, very formal."), ("driver", "mustard", "Jolly grin."),
    ("passenger", "sky", "Slightly lost tourist look."), ("man", "coral", "Friendly smile."),
    ("woman", "sky", "Confident friendly smile."), ("f", "lilac", "Neutral polite look."), ("m", "cream", "Grumpy-funny look."),
]:
    add(who, "avatars", AV + mood, bg, [who])

# ---------- Сцены уроков (широкие) ----------
W = "1536x1024"
add("hostel", "scenes", "Evening in a small Berlin hostel lobby called Brezelhaus (a wooden sign reads 'Brezelhaus'). "
    "Lena stands behind a reception counter waving hello. Alex has just arrived, holding a small red suitcase. "
    "A potted plant and a key board on the wall.", "mustard", ["lena", "you"], W)
add("breakfast", "scenes", "Breakfast in the hostel kitchen. Lena and Tom sit at a wooden table with two coffee cups; "
    "Tom looks sleepy and slumped, Lena is cheerful. Brezel the mascot sits on a plate in the middle of the table, smiling.",
    "cream", ["lena", "tom", "brezel"], W)
add("school", "scenes", "A language school classroom. Frau Wagner stands at a green chalkboard with 'Deutsch A1' written in chalk. "
    "Marco and Aigerim sit at small desks, Marco waving.", "sage", ["wagner", "marco", "aigerim"], W)
add("taxi", "scenes", "A cream-colored Berlin taxi with a yellow 'TAXI' roof sign on a street, the Berlin TV tower in the background. "
    "Alex is the driver wearing a flat cap, seen through the front window; a passenger sits in the back seat, "
    "his huge red suitcase sticks out of the trunk.", "sky", ["you", "passenger"], W)
add("lab", "scenes", "A funny grammar laboratory. Brezel the mascot wears a tiny white lab coat and goggles, mixing two bubbling "
    "glass flasks labeled '-e' and '-st'. Shelves with more flasks.", "lilac", ["brezel"], W)
add("party", "scenes", "A Saturday party in the hostel: a paper garland of triangle flags, music notes. "
    "Marco cheers with both arms up, Lena talks excitedly, Aigerim waves.", "coral", ["marco", "lena", "aigerim"], W)
add("album", "scenes", "Lena holds a big open photo album showing several funny polaroid portraits of different people. "
    "One polaroid shows only a big question mark.", "cream", ["lena"], W)
add("street", "scenes", "A street interview near the Berlin TV tower. Alex holds a microphone toward Anna Huber, who smiles. "
    "City buildings in the background.", "sky", ["you", "woman"], W)
add("ubahn", "scenes", "Inside a yellow Berlin U-Bahn train carriage. The train lurches: Tom has bumped into Herr Becker; "
    "Tom looks embarrassed with hands up, Herr Becker holds his hat and briefcase calmly. A blue 'U' sign.",
    "mustard", ["tom", "becker"], W)
add("office", "scenes", "The language school office. Frau Wagner sits behind a desk, handing over a paper form and a pen; "
    "a small sign on the desk reads 'Anmeldung'.", "sage", ["wagner"], W)

# ---------- Картинки слов ----------
WORDS = [
    ("wave", "Lena waving hello with a big wide wave, cheerful.", "sky", ["lena"]),
    ("morning", "A big friendly sun with googly eyes peeking up over a green hill at dawn, yawning, a small bird waking up.", "mustard", []),
    ("day", "A bright full sun with googly eyes high in a clear sky, one fluffy cloud, small rooftops below.", "sky", []),
    ("evening", "A sleepy orange-red sun with googly eyes sinking behind wobbly rooftops at sunset, the first star appears.", "coral", []),
    ("night", "A crescent moon with googly eyes wearing a striped nightcap, sleeping peacefully among a few stars.", "night", []),
    ("bye", "Tom walking away to the right, looking back over his shoulder and waving goodbye casually.", "sky", ["tom"]),
    ("byeformal", "Herr Becker politely lifting his grey felt hat to say goodbye, a small formal bow.", "sage", ["becker"]),
    ("me", "Alex pointing at their own chest with both thumbs, proud expression.", "mustard", ["you"]),
    ("you", "Marco pointing straight at the viewer with a friendly grin.", "sage", ["marco"]),
    ("qhow", "A puzzled googly-eyed cog wheel character scratching its head, a big question mark above it.", "mustard", []),
    ("nametag", "A white name-tag sticker with a red top band that reads 'HALLO', and the handwritten name 'Lena' below.", "cream", []),
    ("handshake", "Two hands shaking firmly in close-up: one in a mustard-yellow sleeve, one in a moss-green sleeve; small pink hearts pop up.", "coral", []),
    ("qfeel", "A friendly googly-eyed character tilting its head and asking; three small floating faces (happy, so-so, sad) and a question mark.", "mustard", []),
    ("thumbsup", "A big hand giving a thumbs up, simple and bold.", "sage", []),
    ("star", "A golden star with googly eyes beaming and jumping, little sparkles around.", "cobalt", []),
    ("meh", "Tom shrugging with a wobbly flat mouth, one hand tilted in a so-so gesture.", "sage", ["tom"]),
    ("sad", "Tom drooping sadly under a small grey rain cloud.", "sky", ["tom"]),
    ("heart", "Aigerim hugging a big red heart, grateful smile.", "coral", ["aigerim"]),
    ("heart2", "Three red hearts with googly eyes bouncing happily, a big one in the middle and two small ones.", "coral", []),
    ("qyou", "Marco with an open palm offered toward the viewer, inviting them to answer, a small question mark beside him.", "mustard", ["marco"]),
    ("youFormal", "Herr Becker facing the viewer with a polite slight bow, one hand on his chest.", "sage", ["becker"]),
    ("mister", "Herr Becker standing stiffly, full figure, holding his briefcase.", "sage", ["becker"]),
    ("woman", "Anna Huber standing, full figure, friendly.", "coral", ["woman"]),
    ("qyouFormal", "Herr Becker raising one eyebrow, open palm toward the viewer, a small question mark beside him.", "mustard", ["becker"]),
    ("yes", "A googly-eyed character nodding enthusiastically next to a big green check mark.", "sage", []),
    ("no", "A googly-eyed character shaking its head firmly next to a big red X.", "coral", []),
    ("walk", "Alex walking toward the viewer, happily pulling a small red suitcase on wheels, motion lines.", "sky", ["you"]),
    ("qfrom", "A globe with googly eyes; a dotted arrow comes out of it toward the viewer; a question mark.", "mustard", []),
    ("outof", "A small red ball with googly eyes jumping OUT of an open cardboard box, motion lines.", "cream", []),
    ("house", "A cozy narrow house with window eyes and a door mouth, smoke curling from the chimney, flowers by the door.", "sky", []),
    ("qwhere", "Tom searching with a big magnifying glass; a red map pin with a question mark.", "mustard", ["tom"]),
    ("inside", "A small red ball with googly eyes sitting INSIDE an open cardboard box, peeking out over the edge.", "cream", []),
    ("city", "A crowded little city of tall narrow wobbly houses in different colors, many windows.", "sky", []),
    ("clock", "A round alarm clock with googly eyes, ringing and jumping, bells shaking.", "mustard", []),
    ("berlin", "The Berlin TV tower (Fernsehturm) whose round sphere has googly eyes; the small Brandenburg Gate in front.", "sky", []),
    ("hamburg", "Hamburg harbor: a chunky container ship with googly-eyed portholes, a red-and-white lighthouse, a seagull.", "cobalt", []),
    ("muenchen", "Munich's Frauenkirche: two brick towers with green onion domes, a big pretzel sign hanging in front.", "sky", []),
    ("he", "Tom standing, full figure; a big hand-drawn arrow points at him.", "sage", ["tom"]),
    ("she", "Aigerim standing, full figure; a big hand-drawn arrow points at her.", "sage", ["aigerim"]),
    ("we", "Lena and Tom side by side, arms around each other's shoulders, both pointing at themselves.", "mustard", ["lena", "tom"]),
    ("youpl", "Marco and Aigerim standing together; a hand from the viewer's side points at both of them.", "sage", ["marco", "aigerim"]),
    ("book", "Alex studying at a desk with a big open book, pencil behind the ear; letters A, Ä and B float up from the book.", "cream", ["you"]),
    ("talk", "Lena talking excitedly, mouth wide open, wavy speech lines coming out.", "coral", ["lena"]),
    ("language", "Two overlapping speech bubbles with googly eyes: one says 'Aa', the other says 'Яя'.", "cobalt", []),
    ("little", "A hand pinching a tiny gap between thumb and finger; a tiny ant with googly eyes stands in the gap.", "mustard", []),
    ("iam", "Alex standing proudly with one hand on their chest, introducing themselves.", "sky", ["you"]),
    ("this", "A hand pointing at a framed portrait of Lena hanging on a wall.", "cream", ["lena"]),
    ("friend", "Marco and Aigerim giving each other a high five, a small heart above them.", "coral", ["marco", "aigerim"]),
    ("teacher", "Frau Wagner at a green chalkboard holding chalk and pointing at it.", "sage", ["wagner"]),
    ("plus", "Two googly-eyed blobs, one blue and one red, holding hands, with a big plus sign between them.", "cream", []),
    ("also", "Lena and Marco both raising one hand at exactly the same time, eager.", "mustard", ["lena", "marco"]),
    ("qwho", "A mysterious dark silhouette of a person with only googly eyes visible; a big question mark.", "lilac", []),
    ("qwhat", "A wrapped gift box with googly eyes and a big question mark above it.", "lilac", []),
    ("question", "A big speech bubble with googly eyes that contains a large question mark.", "sky", []),
    ("answer", "A big speech bubble with googly eyes that contains a large exclamation mark, looking proud.", "sage", []),
    ("right", "A test paper with a big green check mark; a happy pencil with googly eyes beside it.", "sage", []),
    ("wrong", "A test paper with a big red X; a nervous pencil with googly eyes beside it.", "coral", []),
    ("please", "A hand politely offering a steaming cup of coffee toward the viewer.", "mustard", []),
    ("sorry", "Tom with both hands raised apologetically, embarrassed, a small sweat drop.", "sky", ["tom"]),
    ("noproblem", "Herr Becker making a relaxed OK sign with his hand, calm smile.", "sage", ["becker"]),
    ("ear", "Tom cupping a hand behind his ear and leaning in, confused, trying to hear.", "mustard", ["tom"]),
    ("again", "A circular arrow with googly eyes chasing its own tail.", "sky", []),
    ("snail", "A very slow snail with googly eyes on stalks and a tiny backpack, crawling.", "sage", []),
    ("nametagFirst", "A white name tag reading 'Lena Schulz'; the word 'Lena' is highlighted with a bright yellow marker stroke.", "cream", []),
    ("nametagLast", "A white name tag reading 'Lena Schulz'; the word 'Schulz' is highlighted with a bright yellow marker stroke.", "cream", []),
    ("homepin", "A small house with a big red map pin hovering above its roof.", "sky", []),
    ("form", "A clipboard holding a paper form with empty boxes and lines, a pen lying across it.", "cream", []),
    ("welcome", "Lena opening a front door wide with open arms; the doormat reads 'WILLKOMMEN'.", "coral", ["lena"]),
]
for wid, subj, bg, chars in WORDS:
    add(wid, "words", subj, bg, chars)

# ---------- Видео-объяснения (anim/src/video): учитель Брецель и герои роликов ----------
# Всё на пурпурном фоне: фон вырезается, фигуры двигает Remotion поверх кремовой «бумаги» ролика.
T = ("Full body of Brezel standing, facing the viewer, whole figure visible with margin. "
     "Brezel is the teacher today: tiny round black-rimmed glasses on the face (the googly eyes stay huge behind them). ")
add("teacher-talk", "video", T + "Holding a thin wooden pointer stick in one stick arm, the other arm raised with an open palm "
    "as if explaining something, mouth open mid-sentence, friendly and enthusiastic.", "key", ["brezel"],
    note="Use mascot/idle.png as the reference image if your tool accepts one, so it is the same character.")
add("teacher-point", "video", T + "Pointing the thin wooden pointer stick to the right side of the picture with a confident small "
    "smile, mouth closed, the other arm on the hip.", "key", ["brezel"],
    note="Use mascot/idle.png as the reference image if your tool accepts one, so it is the same character.")
add("vowel-friends", "video", "Two cute lowercase letter characters standing side by side: the letter 'e' and the letter 'i', "
    "each drawn as a thick crayon-textured letter shape with huge googly eyes and thin stick arms and legs. "
    "They hold hands and sing one note together: a single small music note floats above them. "
    "The 'e' is coral pink, the 'i' is sky blue. Only these two letters, no other text.", "key")
# Заставки остальных глав «Чтения» — в том же духе: буквы-человечки.
add("abc-friends", "video", "Three cute lowercase letter characters standing in a row: the letters 'a', 'o' and 'u', "
    "each drawn as a thick crayon-textured letter shape with huge googly eyes and thin stick arms and legs. "
    "They wave hello happily. The 'a' is coral pink, the 'o' is sunny yellow, the 'u' is sky blue. "
    "Only these three letters, no other text.", "key")
add("letter-trickster", "video", "One cute uppercase letter 'W' character, drawn as a thick crayon-textured letter shape "
    "with huge googly eyes and thin stick arms and legs. It wears a small black carnival eye mask and tiptoes sneakily "
    "with one finger at its mouth, a playful little trickster. The 'W' is leaf green. Only this one letter, no other text.", "key")
add("consonant-team", "video", "Three cute lowercase letter characters standing very close together in this order: 's', 'c', 'h', "
    "each drawn as a thick crayon-textured letter shape with huge googly eyes and thin stick arms and legs. "
    "One long striped scarf is wrapped around all three of them, so they look like one team. "
    "The 's' is coral pink, the 'c' is sunny yellow, the 'h' is sky blue. Only these three letters, no other text.", "key")
add("umlaut-dots", "video", "Three cute lowercase letter characters standing in a row: the letters 'a', 'o' and 'u', "
    "each drawn as a thick crayon-textured letter shape with huge googly eyes and thin stick arms and legs. "
    "Exactly two small round dark dots float right above each letter, like the German umlauts, and every letter "
    "looks up at its two dots with delight. The 'a' is coral pink, the 'o' is sunny yellow, the 'u' is sky blue. "
    "Only these three letters with their dots, no other text.", "key")
add("word-puzzle", "video", "A cute magnifying glass character with huge googly eyes on its round lens and thin stick arms and legs, "
    "drawn in thick crayon texture. It proudly holds up three colorful jigsaw puzzle pieces joined together in one row: "
    "one coral pink, one sunny yellow, one sky blue. No letters, no text.", "key")

# ---------- Анимации (Remotion, anim/) ----------
# Вторая поза рисуется по первой картинке слова. Ролик: позы сменяются + «кипящая» линия + движение.
ANIM = [
    ("wave", "the waving arm is now tilted to the other side, mid-wave", None),
    ("walk", "the character has taken the next step: the other leg is forward and the arms swing the other way", "nod"),
    ("talk", "the mouth is now almost closed between words; the speech lines are shorter", None),
    ("bye", "the waving hand is tilted to the other side", None),
    ("byeformal", "the hat is now raised a bit higher above the head, the bow slightly deeper", None),
    ("handshake", "both hands have moved a little lower, mid-shake; the hearts have floated a bit higher", None),
    ("book", "the floating letters A, Ä and B have risen higher above the book", None),
    ("yes", "the character's head is tilted down in a nod, the eyes half closed happily", "nod"),
    ("no", "the character's head is turned to the other side", "shake"),
    ("sorry", "the hands are slightly lower and the eyes are squeezed shut in embarrassment", None),
    ("ear", "Tom leans a little further forward, the hand pressed closer to the ear", None),
    ("morning", "the sun has risen a bit higher over the hill and its eyes are wide open now", None),
    ("star", None, "bounce"),
    ("thumbsup", None, "bounce"),
    ("clock", None, "shake"),
    ("heart", None, "pulse"),
    ("heart2", None, "pulse"),
    ("night", None, "sway"),
    ("hamburg", None, "sway"),
]
anim_list = []
for key, change, motion in ANIM:
    entry = {"key": key}
    if motion:
        entry["motion"] = motion
    anim_list.append(entry)
    if change:
        assets.append({
            "id": f"{key}-b",
            "group": "anim",
            "out": f"art/raw/anim/{key}-b.png",
            "size": "1024x1024",
            "reference": f"art/raw/words/{key}.png",
            "prompt": (f"Second frame of a two-frame cartoon animation. Redraw the reference image exactly: the same "
                       f"character design, the same colors, the same crayon-and-ink style, the same background color and "
                       f"speckles, the same framing and size. Change ONLY this: {change}. Everything else stays identical."),
            "note": "Requires the reference image. If your tool cannot take a reference image, skip this asset and log it.",
        })
(ROOT / "anim").mkdir(exist_ok=True)
(ROOT / "anim" / "animations.json").write_text(json.dumps(anim_list, indent=1), encoding="utf-8")

out = ROOT / "art" / "assets.json"
out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps({"style": STYLE, "backgrounds": BG, "characters": CHARS, "assets": assets},
                          ensure_ascii=False, indent=1), encoding="utf-8")
groups = {}
for a in assets:
    groups[a["group"]] = groups.get(a["group"], 0) + 1
print(f"{len(assets)} assets -> {out.relative_to(ROOT)}  {groups}")
