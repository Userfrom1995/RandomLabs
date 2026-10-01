"""Personality and dialogue pools (offline line pool, seeded, no repeats).

The persona is a curated set of line pools keyed by mood and by event.
Each pool cycles with no-repeat-until-exhausted: lines are drawn from a
shuffled bag, and the bag is only reshuffled once every line has been
used. A seed makes the sequence deterministic for tests.
"""

from __future__ import annotations

import random

from .state import PetState

DEFAULT_NAME = "Pip"

MOODS = (
    "happy",
    "curious",
    "sleepy",
    "grumpy",
    "hungry",
    "affectionate",
)

EVENT_KEYS = ("poke", "feed", "play", "wake", "sleep", "greet",
                "stroke", "catch")

MOOD_LINES: dict[str, list[str]] = {
    "happy": [
        "What a good day to be a blob, {name} thinks.",
        "Spinning in a tiny circle of joy!",
        "The sun is out and so is {name}.",
        "Humming a square little tune.",
        "Everything smells like adventure today.",
    ],
    "curious": [
        "What is that over there? No, really.",
        "Sniffing the pixels. For science.",
        "{name} wonders what is behind that window.",
        "Ooh, a cursor. Suspicious. Fascinating.",
        "Poking the universe to see if it pokes back.",
    ],
    "sleepy": [
        "Eyelids at half mast...",
        "Just five more minutes, {name} mumbles.",
        "Yawning a tiny triangle yawn.",
        "The floor looks very nap-shaped.",
        "Blinking... slowly... slowly...",
    ],
    "grumpy": [
        "Hmph. {name} did not ask to be perceived.",
        "The tail flicks. Once. Sharply.",
        "Somebody needs a snack and it is {name}.",
        "Grumble grumble. Tiny thunder.",
        "Personal space, please.",
    ],
    "hungry": [
        "Tummy making hollow cave sounds.",
        "Is that... a crumb? {name} hopes.",
        "A snack would fix everything, probably.",
        "Staring at the food corner. Willing it.",
        "Hungry enough to eat a whole pixel.",
    ],
    "affectionate": [
        "Leaning into the cursor. Warm.",
        "{name} loves you a whole bucketful.",
        "Purring at a frequency only hearts hear.",
        "Stay a while? {name} likes you here.",
        "Nuzzling the edge of the screen.",
    ],
}

EVENT_LINES: dict[str, list[str]] = {
    "poke": [
        "Eep! {name} was not ready!",
        "Hey! Careful with the blob!",
        "Startled! Tail: maximum floof.",
    ],
    "feed": [
        "Nom nom nom. Thank you!",
        "Crunch crunch. {name} feels loved.",
        "Munching happily. More, maybe?",
    ],
    "play": [
        "Ball! BALL! {name} is READY!",
        "Zoomies engaged!",
        "Throw it again! Again!",
    ],
    "wake": [
        "Waking up... booting cuteness...",
        "{name} is UP. Mostly. What did I miss?",
        "Stretching every limb at once.",
    ],
    "sleep": [
        "Curling up. Goodnight...",
        "{name} drifts off. Zzz.",
        "Powering down the wiggles.",
    ],
    "greet": [
        "Oh! You are here! Hi!",
        "{name} was just thinking about you.",
        "Welcome back! {name} saved you a spot.",
    ],
    "stroke": [
        "Purring louder. That is the spot!",
        "{name} melts into a warm puddle.",
        "More pats! {name} is collecting them.",
    ],
    "catch": [
        "Got it! {name} is the champion!",
        "Caught! Did you see that?",
        "Snagged mid-bounce. Again!",
    ],
}


# Per-character voice overrides. Any missing "mood:<m>" or "event:<e>"
# key falls back to the shared MOOD_LINES / EVENT_LINES pools above
# (which are Pip's voice). Every pool holds at least 3 lines so the
# no-repeat bag cycling stays meaningful.
CHARACTER_VOICES: dict[str, dict[str, list[str]]] = {
    "pip": {},
    "bramble": {
        "mood:happy": [
            "Bramble is doing ZOOMIES of joy! Wheee!",
            "Best day ever! {name} says, already running.",
            "Tail wagging at maximum velocity!",
            "The sun is out and so is {name}. Race you!",
        ],
        "mood:affectionate": [
            "{name} leans hard into the cursor. More pats!",
            "Bramble loves you a whole forestful.",
            "Nose-booping the edge of the screen!",
            "Stay and play? {name} saved you the good ball.",
        ],
        "event:play": [
            "Ball! BALL! {name} is READY!",
            "Throw it! Bramble will catch it mid-air!",
            "Again! Again! Bramble never gets tired!",
        ],
        "event:feed": [
            "Nom nom nom! Bramble inhales the snack at top speed!",
            "Crunch crunch crunch! Gone! {name} demands a rematch!",
            "Munching at maximum velocity. More, maybe? Now?",
        ],
        "event:catch": [
            "Snagged it mid-sprint! Bramble is the champion!",
            "Got it! Did you see that leap? Throw it farther!",
            "Caught! Bramble barely even had to try!",
        ],
        "event:greet": [
            "Oh! You are here! Play with Bramble!",
            "{name} saved you a spot AND a ball.",
            "Welcome back! Bramble waited by wagging.",
        ],
    },
    "mochi": {
        "mood:sleepy": [
            "Mmm... five more minutes, {name} mumbles...",
            "Melting into the floor. It is nap-shaped.",
            "Blinking... slowly... squishily...",
            "Eyelids at half mast. Squish.",
        ],
        "mood:affectionate": [
            "{name} melts into a warm puddle.",
            "Mochi purrs, long and wobbly.",
            "Squishing gently against the cursor. Warm.",
            "Stay a while? {name} is extra soft today.",
        ],
        "event:sleep": [
            "Squishing down flat. Goodnight...",
            "{name} jiggles once, then stills. Zzz.",
            "Powering down the wobbles.",
        ],
        "event:stroke": [
            "Mmm, pats. Mochi jiggles happily.",
            "{name} melts into a warm puddle.",
            "More pats! Mochi is collecting them softly.",
        ],
    },
    "kiki": {
        "mood:curious": [
            "What is THAT? {name} must investigate immediately!",
            "Chirping at the pixels. What ARE they?",
            "{name} wonders what is behind EVERY window.",
            "Ooh, a cursor! Suspicious! Fascinating! Chirp!",
        ],
        "mood:happy": [
            "Chirping a bright zigzag tune!",
            "Kiki hops in a tiny circle of joy!",
            "Everything sparkles today, says {name}.",
            "Wings fluttering! Good day! Good day!",
        ],
        "event:greet": [
            "Chirp! You are here! Did you see anything new?",
            "{name} was just watching the whole world for you.",
            "Welcome back! Kiki saved you a shiny spot.",
        ],
        "event:catch": [
            "Snagged it mid-dive! Did you see that?",
            "Got it! Kiki rules the sky-ball!",
            "Caught! Chirping triumphantly!",
        ],
    },
    "rusty": {
        "mood:grumpy": [
            "Hmph. {name} did not schedule being perceived.",
            "Grumble. Low battery on patience. Beep.",
            "Personal space protocol engaged.",
            "Somebody needs oil and it is {name}.",
        ],
        "mood:happy": [
            "All systems nominal. {name} approves. Beep.",
            "Humming a square little servo tune.",
            "Efficiency at 100%. Joy subroutine: running.",
            "The sun recharges {name}. Adequate.",
        ],
        "event:poke": [
            "Poke registered. Logging complaint. Beep.",
            "Hey! Careful with the chassis!",
            "Startle subroutine: executed. Beep.",
        ],
        "event:wake": [
            "Booting cuteness... {name} is UP. Mostly.",
            "Systems online. Greetings, human.",
            "Stretching every actuator at once.",
        ],
        "event:catch": [
            "Catch registered. Trajectory: adequate. Beep.",
            "Ball secured in manipulator zone. Logging victory. Beep.",
            "Interception complete. {name} calculates a 100 percent good catch.",
        ],
        "event:feed": [
            "Snack accepted. Nutritional value: negligible. Morale: improved.",
            "Consuming organic matter. Crunch efficiency: satisfactory. Beep.",
            "Fuel intake logged. {name} feels 2 percent more alive.",
        ],
    },
    "luna": {
        "mood:sleepy": [
            "The moon is up... {name} is just waking...",
            "Daylight naps hit different, Luna mumbles.",
            "Wings folding. Paper-moon dreams incoming.",
            "Yawning a tiny crescent yawn...",
        ],
        "mood:happy": [
            "Moonlight looks good on {name} tonight.",
            "Gliding a slow glowing circle of joy.",
            "The night hums and Luna hums back.",
            "Starlight snacks. Delicious, probably.",
        ],
        "event:sleep": [
            "Curling wings around. Goodnight, sun...",
            "{name} drifts off under a paper moon. Zzz.",
            "Dimming the glow. Sleep mode: lunar.",
        ],
        "event:feed": [
            "Nom nom. Moon-moth snacks. Thank you!",
            "Crunch crunch. {name} glows a little brighter.",
            "Munching stardust. More, maybe?",
        ],
        "event:stroke": [
            "{name} glows softly under the pats. Moonlit and content.",
            "Gentle pats. Luna's wings shimmer faintly.",
            "Mmm. Pats under starlight. {name} drifts closer.",
        ],
    },
}


def mood_for(state: PetState) -> str:
    """Derive the display mood from current needs (pure function)."""
    if state.hunger >= 75.0:
        return "hungry"
    if state.energy <= 20.0:
        return "sleepy"
    if state.affection >= 80.0:
        return "affectionate"
    if state.affection <= 25.0:
        return "grumpy"
    if state.energy >= 60.0 and state.affection >= 50.0:
        return "happy"
    return "curious"


class Personality:
    """Seeded dialogue picker with per-key no-repeat bags.

    Voices are per character: each character ships its own line pools
    with a shared Pip fallback for any missing key, keeping the
    no-repeat-until-exhausted bag cycling and {name} insertion. Bags
    are keyed per (character, key) so switching voices never leaks
    draw order between characters.
    """

    def __init__(self, name: str = DEFAULT_NAME, seed: int | None = None,
                 character_id: str = "pip") -> None:
        self._rng = random.Random(seed)
        self._bags: dict[str, list[str]] = {}
        self._character_id = "pip"
        self.set_character(character_id)
        self.set_name(name)

    @property
    def name(self) -> str:
        return self._name

    def set_name(self, name: str) -> str:
        """Rename the pet (trims, falls back to default). Returns final name."""
        if not isinstance(name, str) or not name.strip():
            self._name = DEFAULT_NAME
        else:
            self._name = name.strip()[:24]
        return self._name

    def _refill(self, key: str, pool: list[str]) -> None:
        bag = list(pool)
        self._rng.shuffle(bag)
        self._bags[key] = bag

    def _draw(self, key: str, pool: list[str]) -> str:
        bag_key = self._character_id + ":" + key
        bag = self._bags.get(bag_key)
        if not bag:
            self._refill(bag_key, pool)
            bag = self._bags[bag_key]
        line = bag.pop()
        return line.replace("{name}", self._name)

    @property
    def character_id(self) -> str:
        return self._character_id

    def set_character(self, character_id: object) -> str:
        """Switch the active voice (unknown ids fall back to Pip)."""
        if isinstance(character_id, str) and character_id.strip().lower() in CHARACTER_VOICES:
            self._character_id = character_id.strip().lower()
        else:
            self._character_id = "pip"
        return self._character_id

    def _pool_for(self, kind: str, key: str) -> list[str]:
        """Resolve the active voice pool with shared Pip fallback."""
        voice = CHARACTER_VOICES.get(self._character_id, {})
        pool = voice.get(kind + ":" + key)
        if pool:
            return pool
        if kind == "mood":
            return MOOD_LINES[key]
        return EVENT_LINES[key]

    def line_for(self, mood: str) -> str:
        """Draw a mood line (unknown moods fall back to curious)."""
        if mood not in MOOD_LINES:
            mood = "curious"
        return self._draw("mood:" + mood, self._pool_for("mood", mood))

    def line_for_event(self, event: str) -> str:
        """Draw an event line (unknown events fall back to greet)."""
        if event not in EVENT_LINES:
            event = "greet"
        return self._draw("event:" + event, self._pool_for("event", event))

    def pool_sizes(self) -> dict[str, int]:
        """Report pool sizes (useful for tests and the selftest gate)."""
        sizes = {m: len(self._pool_for("mood", m)) for m in MOODS}
        sizes.update({"event:" + e: len(self._pool_for("event", e)) for e in EVENT_KEYS})
        return sizes
