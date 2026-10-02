"""Offline conversation heart (stdlib only, no GUI imports).

An intent parser plus per-character reply voices with no network and no
model: input text is normalised and matched against ordered keyword
intents, answers are drawn from the active character voice with a shared
fallback, and unknown input gets a curious deflection, never silence.

 Replies cycle with no-repeat-until-exhausted bags keyed per
(character, intent) so switching characters never leaks draw order.
All randomness flows through a seeded RNG, so the same seed plus the
same inputs replays the same conversation exactly.
"""

from __future__ import annotations

import random
import re

INTENT_IDS = (
    "greeting",
    "name",
    "mood",
    "hunger",
    "sleep",
    "energy",
    "affection",
    "joke",
    "comfort",
    "feed",
    "wake",
    "play",
    "time",
    "help",
)

# Intent keyword phrases, tried in order. Earlier intents win on ties, so
# hunger ("are you hungry") beats the generic mood probe ("are you ok"),
# and the sleep phrases beat the energy drowsiness words ("take a nap"
# is a bedtime order, "sleepy" alone is a status question).
INTENT_KEYWORDS: dict[str, tuple[str, ...]] = {
    "greeting": ("hello", "hi", "hey", "yo", "morning",
                 "evening", "afternoon", "howdy", "greetings",
                 "good day", "welcome"),
    "name": ("your name", "who are you", "what are you called",
             "introduce yourself", "your species"),
    "hunger": ("hungry", "hunger", "snack", "eat", "food", "treat",
               "dinner", "lunch", "breakfast", "cookie", "crumb"),
    "sleep": ("go to sleep", "to sleep", "need sleep", "want sleep",
              "bedtime", "sleep now", "take a nap", "lie down",
              "goodnight", "good night"),
    "energy": ("tired", "sleepy", "energy", "exhausted", "nap", "rest",
               "drowsy"),
    "affection": ("love you", "like you", "affection", "adore you",
                  "best friend", "cute", "sweet"),
    "joke": ("joke", "funny", "make me laugh", "humor", "humour",
             "tell me something funny"),
    "comfort": ("sad", "crying", "upset", "worried", "anxious", "lonely",
                "comfort", "cheer me", "bad day", "cry", "scared"),
    "feed": ("feed you", "feed me", "give you food", "have a snack",
             "want food", "give you a treat"),
    "wake": ("wake up", "rise and shine", "get up", "wakey"),
    "play": ("play with", "let us play", "let's play", "playtime",
             "ball", "game", "fetch", "play"),
    "time": ("what time", "time is it", "clock", "what day", "today",
             "morning or night", "day or night"),
    "mood": ("how are you", "how do you feel", "mood", "feeling",
             "are you ok", "are you okay", "how is it going"),
    "help": ("help", "what can you", "commands", "what do you do",
             "how does this work", "options"),
}

# Mood hint returned beside each reply (lets the shell pick a bubble
# tone). None means "keep the current mood".
INTENT_MOODS: dict[str, str | None] = {
    "greeting": "happy",
    "name": "curious",
    "mood": None,
    "hunger": "hungry",
    "energy": "sleepy",
    "affection": "affectionate",
    "joke": "happy",
    "comfort": "affectionate",
    "feed": "happy",
    "sleep": "sleepy",
    "wake": "happy",
    "play": "happy",
    "time": "curious",
    "help": "curious",
}

SHARED_REPLIES: dict[str, list[str]] = {
    "greeting": [
        "Hello! {name} was just thinking about you.",
        "Hi hi! Good to see you.",
        "Hey! {name} saved you a spot.",
        "Oh! You are here! Hi!",
    ],
    "name": [
        "I am {name}, professional pixel-sniffer.",
        "They call me {name}. I answer to pats too.",
        "{name}, at your service. Mostly napping, partly zooming.",
    ],
    "mood": [
        "{mood_sentence}",
    ],
    "hunger": [
        "{hunger_sentence}",
    ],
    "energy": [
        "{energy_sentence}",
    ],
    "affection": [
        "{name} loves you a whole bucketful.",
        "Leaning into the cursor. Warm.",
        "You are {name}'s favourite human. Do not tell the others.",
        "Nuzzling the edge of the screen.",
    ],
    "joke": [
        "Why did the pixel go to bed? It needed to recharge its bits.",
        "I told my tail a secret. Now it wags suspiciously.",
        "What is a blob-cat's favourite dance? The square shuffle.",
        "Knock knock. Who is there? {name}. {name} who? Exactly.",
    ],
    "comfort": [
        "Hey. Breathe with {name}. In... out... there you go.",
        "{name} is right here. Bad days end; pats do not.",
        "Leaning against you quietly. No fixing, just company.",
        "You are doing better than you think, says {name}.",
    ],
    "feed": [
        "A snack? For {name}? Twist my tail, yes please.",
        "Feeding time! {name} accepts tribute in crumbs.",
        "Oh! Snacks! {name} is suddenly very awake.",
    ],
    "sleep": [
        "Yawning... okay, {name} will curl up for a bit. Zzz.",
        "Bedtime it is. Keep the moon on, please.",
        "Curling up. Wake {name} for snacks only.",
    ],
    "wake": [
        "{name} is UP. Mostly. What did I miss?",
        "Stretching every limb at once. Ready!",
        "Booting cuteness... online!",
    ],
    "play": [
        "Ball! BALL! {name} is READY!",
        "Yes! Play! Throw it and {name} will do the rest.",
        "Zoomies pre-engaged. Throw whenever.",
    ],
    "time": [
        "{time_sentence}",
    ],
    "help": [
        ("Ask {name} how it feels, say you love it, request a joke, "
         "offer a snack, or tell it to sleep, wake, or play."),
        ("{name} chats about moods, snacks, naps, playtime, and the "
         "hour. Try 'tell me a joke' or 'are you hungry'."),
        ("Talk normally: greetings, feelings, snacks, naps, games. "
         "{name} always answers; no commands to memorise."),
    ],
}

DEFLECTIONS = [
    "Hmm? {name} tilts its head. Tell me more?",
    "{name} did not quite catch that. Again, slower, with pats?",
    "Interesting sounds! {name} files them under mysteries.",
    "Ooh. {name} nods wisely and pretends that made sense.",
]

# Per-character overrides, tried before the shared pools. Any missing
# intent falls back to SHARED_REPLIES, so every character answers
# everything. Every override pool holds at least 3 lines to keep the
# no-repeat bag cycling meaningful.
CHARACTER_REPLIES: dict[str, dict[str, list[str]]] = {
    "pip": {},
    "bramble": {
        "play": [
            "Ball! BALL! Throw it and Bramble will catch it mid-air!",
            "Yes yes YES! Bramble was born ready. Throw it far!",
            "Zoomies already engaged! Bramble never gets tired!",
        ],
        "joke": [
            "Why chase tails? Because they run! Wheee!",
            "Bramble hid your socks. That is the joke. Go find them!",
            "What is faster than Bramble? Nothing. That is the punchline.",
        ],
        "greeting": [
            "Oh! You are here! Play with Bramble!",
            "Hi hi hi! Bramble saved you a ball AND a spot!",
            "You are back! Race you to the corner of the screen!",
        ],
    },
    "mochi": {
        "sleep": [
            "Mmm... bedtime... Mochi was already halfway there... Zzz.",
            "Squishing down flat. Five more years, please... zzz...",
            "Goodnight... Mochi jiggles once, then stills...",
        ],
        "comfort": [
            "Come squish with Mochi. Soft fixes most things... mostly...",
            "Mmm... Mochi will hold still while you feel better. Warm.",
            "Lean here. Mochi is 90 percent cushion, 10 percent purr.",
        ],
        "energy": [
            "{energy_sentence} Mochi understands naps better than anyone.",
            "{energy_sentence} Mochi prescribes immediate floor-melting.",
            "{energy_sentence} Even Mochi's yawns are sleepy. Squish.",
        ],
    },
    "kiki": {
        "greeting": [
            "Chirp! You are here! Did you see anything new?!",
            "Hi! Kiki watched the whole world while you were away!",
            "Chirp chirp! Kiki saved you a shiny spot!",
        ],
        "time": [
            "{time_sentence} Kiki loves every hour, but dawn is the shiniest!",
            "{time_sentence} Kiki checked twice! Chirp! Definitely that hour!",
            "{time_sentence} Perfect time for snacks, says Kiki. Always is!",
        ],
        "help": [
            ("Chirp! Ask about feelings, snacks, naps, jokes, games! "
             "Kiki answers everything, fast!"),
            ("Kiki can chat, joke, play, nap-report! Try 'tell me a joke'!"),
            ("Talk to Kiki about anything! Moods! Snacks! The hour! Chirp!"),
        ],
    },
    "rusty": {
        "name": [
            "Unit designation: {name}. Function: companion. Beep.",
            "I am {name}. Poke-tolerant. Snack-indifferent. Beep.",
            "{name}, version adorable. Changelog: wiggles improved.",
        ],
        "joke": [
            "Joke subroutine loaded. Why did the robot nap? Low battery. Beep.",
            "Humour module at 40 percent. Knock knock. Beep.",
            "I would tell a UDP joke, but you might not get it. Beep.",
        ],
        "help": [
            ("Query protocol: greetings, mood, hunger, energy, jokes, "
             "comfort, feed, sleep, wake, play, time. {name} responds. Beep."),
            ("Available inputs: small talk, status queries, snack offers, "
             "nap orders, game invites. Beep."),
            ("Manual page 1 of 1: talk to {name}. {name} answers. Beep."),
        ],
    },
    "luna": {
        "time": [
            "{time_sentence} The night hours are Luna's favourite, obviously.",
            "{time_sentence} Luna counted the stars twice to be sure.",
            "{time_sentence} Any hour glows a little, if you look sideways.",
        ],
        "comfort": [
            "The moon is up and so is Luna. Rest your eyes a while.",
            "Night makes everything softer. Luna will keep the glow on.",
            "Drift a little. Luna will watch the stars for both of you.",
        ],
        "sleep": [
            "Curling wings around. Goodnight, sun...",
            "Dimming the glow. Sleep mode: lunar. Zzz.",
            "Daylight naps hit different. Luna understands.",
        ],
    },
}

_WS_RE = re.compile(r"\s+")


def normalize(text: object) -> str:
    """Lowercase input with punctuation folded to spaces (never raises)."""
    if not isinstance(text, str):
        return ""
    cleaned = re.sub(r"[^a-z0-9\s']", " ", text.lower())
    return _WS_RE.sub(" ", cleaned).strip()


def parse_intent(text: object) -> str | None:
    """Return the matched intent id, or None when nothing matches.

    Matching is word-boundary aware, so "this" never reads as "hi" and
    "great" never reads as "eat".
    """
    cleaned = normalize(text)
    if not cleaned:
        return None
    for intent in INTENT_IDS:
        for phrase in INTENT_KEYWORDS[intent]:
            if re.search(r"\b%s\b" % re.escape(phrase), cleaned):
                return intent
    return None


def _describe_hour(hour: object) -> str | None:
    try:
        number = float(hour)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    if number != number:
        return None
    total = int(round((number % 24.0) * 60.0)) % (24 * 60)
    return "%02d:%02d" % (total // 60, total % 60)


def _mood_sentence(mood: str) -> str:
    table = {
        "happy": "Spinning in a tiny circle of joy! {name} feels great.",
        "curious": "Sniffing the pixels. {name} feels curious.",
        "sleepy": "Eyelids at half mast... {name} feels sleepy.",
        "grumpy": "Hmph. {name} feels prickly. A snack might fix it.",
        "hungry": "Tummy making hollow cave sounds. {name} feels hungry.",
        "affectionate": "Leaning into the cursor. {name} feels loved.",
    }
    return table.get(mood, table["curious"])


def _hunger_sentence(hunger: float) -> str:
    if hunger >= 75.0:
        return ("Tummy making hollow cave sounds! {name} is really hungry. "
                "A snack would fix everything, probably.")
    if hunger >= 40.0:
        return ("{name} could eat. Just a small crumb. Or a big one.")
    return ("{name} is full and happy. Maybe a celebratory crumb later.")


def _energy_sentence(energy: float) -> str:
    if energy <= 20.0:
        return "Eyelids at half mast... {name} is exhausted. Nap, please."
    if energy <= 50.0:
        return "{name} is getting drowsy. The floor looks nap-shaped."
    return "{name} is wide awake and wiggling!"


def _time_sentence(hour: object) -> str:
    clock = _describe_hour(hour)
    if clock is None:
        return ("{name} does not know the hour, but it is always snack "
                "o'clock somewhere.")
    number = float(hour) % 24.0  # type: ignore[arg-type]
    if 5.0 <= number < 12.0:
        part = "morning"
    elif 12.0 <= number < 17.0:
        part = "afternoon"
    elif 17.0 <= number < 22.0:
        part = "evening"
    else:
        part = "night"
    return "It is %s, a fine %s, says {name}." % (clock, part)


def _clean_stat(value: object, fallback: float) -> float:
    try:
        number = float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return fallback
    if number != number:
        return fallback
    return max(0.0, min(100.0, number))


EXTRA_REPLIES: dict[str, dict[str, list[str]]] = {}


def register_extra_replies(character_id: str,
                            pools: dict[str, list[str]]) -> str:
    """Register third-party converse overrides (pack activation path).

    Pools go through the pack replies validator so side registries
    cannot bypass the pool minimums. Raises ValueError on invalid
    input.
    """
    from . import packs as packs_mod

    cleaned = packs_mod.validate_replies(pools)
    slug = str(character_id or "").strip().lower()
    EXTRA_REPLIES[slug] = {k: list(v) for k, v in cleaned.items()}
    return slug


class Converser:
    """Seeded offline reply engine with per-character voices.

    Character overrides are tried first, shared pools second, and the
    deflection pool answers everything else. Draw bags cycle with
    no-repeat-until-exhausted per (character, intent).
    """

    def __init__(self, character_id: str = "pip", name: str = "Pip",
                 seed: int | None = None) -> None:
        self._rng = random.Random(seed)
        self._bags: dict[str, list[str]] = {}
        self._character_id = "pip"
        self.set_character(character_id)
        self.set_name(name)

    @property
    def character_id(self) -> str:
        return self._character_id

    @property
    def name(self) -> str:
        return self._name

    def set_name(self, name: object) -> str:
        if not isinstance(name, str) or not name.strip():
            self._name = "Pip"
        else:
            self._name = name.strip()[:24]
        return self._name

    def set_character(self, character_id: object) -> str:
        if isinstance(character_id, str):
            slug = character_id.strip().lower()
            if slug in CHARACTER_REPLIES or slug in EXTRA_REPLIES:
                self._character_id = slug
                return self._character_id
        self._character_id = "pip"
        return self._character_id

    def _pool_for(self, intent: str) -> list[str]:
        voice = CHARACTER_REPLIES.get(self._character_id, {})
        if not voice and self._character_id in EXTRA_REPLIES:
            voice = EXTRA_REPLIES[self._character_id]
        pool = voice.get(intent)
        if pool:
            return pool
        return SHARED_REPLIES[intent]

    def _draw(self, intent: str) -> str:
        bag_key = self._character_id + ":" + intent
        bag = self._bags.get(bag_key)
        if not bag:
            bag = list(self._pool_for(intent))
            self._rng.shuffle(bag)
            self._bags[bag_key] = bag
        return bag.pop()

    def reply(self, text: object, mood: str = "curious",
              hunger: float = 20.0, energy: float = 80.0,
              hour: object = None) -> tuple[str, str | None]:
        """Answer user text. Returns (reply, mood_hint).

        Never raises on hostile input: non-strings and blanks get a
        gentle prompt, and unknown text gets a deflection.
        """
        if not isinstance(text, str) or not text.strip():
            return ("%s tilts its head. Say something, anything!" % self._name,
                    "curious")
        intent = parse_intent(text)
        if intent is None:
            line = self._draw_deflection()
            return (line.replace("{name}", self._name), "curious")
        if mood not in ("happy", "curious", "sleepy", "grumpy",
                        "hungry", "affectionate"):
            mood = "curious"
        template = self._draw(intent)
        filled = self._fill(template, mood=mood, hunger=hunger,
                            energy=energy, hour=hour)
        return (filled.replace("{name}", self._name),
                INTENT_MOODS[intent])

    def _draw_deflection(self) -> str:
        bag = self._bags.get("deflect:")
        if not bag:
            bag = list(DEFLECTIONS)
            self._rng.shuffle(bag)
            self._bags["deflect:"] = bag
        return bag.pop()

    def _fill(self, template: str, mood: str, hunger: float,
              energy: float, hour: object) -> str:
        out = template
        if "{mood_sentence}" in out:
            out = out.replace("{mood_sentence}", _mood_sentence(mood))
        if "{hunger_sentence}" in out:
            out = out.replace("{hunger_sentence}",
                              _hunger_sentence(_clean_stat(hunger, 20.0)))
        if "{energy_sentence}" in out:
            out = out.replace("{energy_sentence}",
                              _energy_sentence(_clean_stat(energy, 80.0)))
        if "{time_sentence}" in out:
            out = out.replace("{time_sentence}", _time_sentence(hour))
        return out

    def help_text(self) -> str:
        """Short usage summary for the help intent and the CLI."""
        return ("Talk to %s about greetings, feelings, hunger, naps, jokes, "
                "comfort, snacks, sleep, play, or the hour. "
                "It always answers." % self._name)
