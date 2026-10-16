//! Engine event strings mapped to audio cues.
//!
//! Mapping table (engine string -> [`Cue`]):
//!
//! | engine event            | cue                                     |
//! |-------------------------|-----------------------------------------|
//! | `"dot"`                 | `Crumb`                                 |
//! | `"sunseed"`             | `Sunseed`                               |
//! | `"fright:{secs}"`       | `FrightStart`                           |
//! | `"fright-end"`          | `FrightEnd`                             |
//! | `"warden:{points}"`     | `WardenEaten { chain }` (see below)     |
//! | `"warden-back:{name}"`  | `EyesRevived`                           |
//! | `"relish:spawn:{v}"`    | `RelishSpawn`                           |
//! | `"relish:{bounty}"`     | `RelishEaten`                           |
//! | `"relish:gone"`         | `RelishGone`                            |
//! | `"death"`               | `Death`                                 |
//! | `"respawn"`             | `Respawn`                               |
//! | `"extra-life"`          | `ExtraLife`                             |
//! | `"level-clear"`         | `LevelClear`                            |
//! | `"level:{n}"`           | `LevelStart`                            |
//! | `"refill"`              | `Refill`                                |
//! | `"sprint-bonus:{b}"`    | `SprintBonus`                           |
//! | `"time-up"`             | `TimeUp`                                |
//! | `"game-over"`           | `GameOver`                              |
//!
//! Chain index: 200 -> 0, 400 -> 1, 800 -> 2, 1600 -> 3 (any other
//! numeric value is clamped to the nearest tier by threshold, so future
//! tuning values still produce a sane pitch).
//!
//! Ghost ambience events (`"wave:scatter"`, `"wave:chase"`,
//! `"house-release:{name}"`, `"house-out:{name}"`) intentionally map to
//! `None`: they are frequent background state flips with no player-facing
//! beat, and scoring them would drown out real cues.

/// Player-facing sound trigger.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
pub enum Cue {
    Crumb,
    Sunseed,
    FrightStart,
    WardenEaten { chain: u8 },
    RelishSpawn,
    RelishEaten,
    RelishGone,
    Death,
    Respawn,
    ExtraLife,
    LevelClear,
    LevelStart,
    Refill,
    SprintBonus,
    TimeUp,
    GameOver,
    FrightEnd,
    EyesRevived,
    UiMove,
    UiSelect,
    UiBack,
    MuteToggle,
}

/// Translate one engine event string into its audio [`Cue`].
///
/// Returns `None` for unknown strings and for ghost ambience events
/// (`wave:*`, `house-release:*`, `house-out:*`), which carry no cue.
pub fn cue_for_event(event: &str) -> Option<Cue> {
    // Exact one-word events first (this also pins "relish:gone" and
    // "fright-end" ahead of the prefix parses below).
    match event {
        "dot" => return Some(Cue::Crumb),
        "sunseed" => return Some(Cue::Sunseed),
        "relish:gone" => return Some(Cue::RelishGone),
        "death" => return Some(Cue::Death),
        "respawn" => return Some(Cue::Respawn),
        "extra-life" => return Some(Cue::ExtraLife),
        "level-clear" => return Some(Cue::LevelClear),
        "refill" => return Some(Cue::Refill),
        "time-up" => return Some(Cue::TimeUp),
        "game-over" => return Some(Cue::GameOver),
        "fright-end" => return Some(Cue::FrightEnd),
        _ => {}
    }
    if let Some(rest) = event.strip_prefix("fright:") {
        // Engine emits "fright:{duration:.1}", e.g. "fright:6.0".
        if rest.parse::<f32>().is_ok() {
            return Some(Cue::FrightStart);
        }
        return None;
    }
    if let Some(rest) = event.strip_prefix("warden:") {
        // Chain scores: 200/400/800/1600 -> chain 0/1/2/3.
        if let Ok(points) = rest.parse::<u32>() {
            let chain = if points >= 1600 {
                3
            } else if points >= 800 {
                2
            } else if points >= 400 {
                1
            } else {
                0
            };
            return Some(Cue::WardenEaten { chain });
        }
        return None;
    }
    if let Some(rest) = event.strip_prefix("relish:spawn:") {
        if rest.parse::<u32>().is_ok() {
            return Some(Cue::RelishSpawn);
        }
        return None;
    }
    if let Some(rest) = event.strip_prefix("relish:") {
        if rest.parse::<u32>().is_ok() {
            return Some(Cue::RelishEaten);
        }
        return None;
    }
    if let Some(rest) = event.strip_prefix("level:") {
        if rest.parse::<u32>().is_ok() {
            return Some(Cue::LevelStart);
        }
        return None;
    }
    if let Some(rest) = event.strip_prefix("sprint-bonus:") {
        if rest.parse::<u32>().is_ok() {
            return Some(Cue::SprintBonus);
        }
        return None;
    }
    if let Some(rest) = event.strip_prefix("warden-back:") {
        if !rest.is_empty() {
            return Some(Cue::EyesRevived);
        }
        return None;
    }
    // Ghost ambience ("wave:*", "house-release:*", "house-out:*") and
    // anything else: no cue.
    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_engine_event_maps_to_its_cue() {
        let cases: &[(&str, Cue)] = &[
            ("dot", Cue::Crumb),
            ("sunseed", Cue::Sunseed),
            ("fright:6.0", Cue::FrightStart),
            ("fright:0.5", Cue::FrightStart),
            ("warden:200", Cue::WardenEaten { chain: 0 }),
            ("warden:400", Cue::WardenEaten { chain: 1 }),
            ("warden:800", Cue::WardenEaten { chain: 2 }),
            ("warden:1600", Cue::WardenEaten { chain: 3 }),
            ("warden-back:Bram", Cue::EyesRevived),
            ("relish:spawn:100", Cue::RelishSpawn),
            ("relish:spawn:500", Cue::RelishSpawn),
            ("relish:300", Cue::RelishEaten),
            ("relish:gone", Cue::RelishGone),
            ("death", Cue::Death),
            ("respawn", Cue::Respawn),
            ("extra-life", Cue::ExtraLife),
            ("level-clear", Cue::LevelClear),
            ("level:2", Cue::LevelStart),
            ("level:11", Cue::LevelStart),
            ("refill", Cue::Refill),
            ("sprint-bonus:2990", Cue::SprintBonus),
            ("sprint-bonus:0", Cue::SprintBonus),
            ("time-up", Cue::TimeUp),
            ("game-over", Cue::GameOver),
            ("fright-end", Cue::FrightEnd),
        ];
        for (event, want) in cases {
            assert_eq!(cue_for_event(event), Some(*want), "event {event:?}");
        }
    }

    #[test]
    fn chain_mapping_covers_all_four_values() {
        assert_eq!(cue_for_event("warden:200"), Some(Cue::WardenEaten { chain: 0 }));
        assert_eq!(cue_for_event("warden:400"), Some(Cue::WardenEaten { chain: 1 }));
        assert_eq!(cue_for_event("warden:800"), Some(Cue::WardenEaten { chain: 2 }));
        assert_eq!(
            cue_for_event("warden:1600"),
            Some(Cue::WardenEaten { chain: 3 })
        );
    }

    #[test]
    fn unknown_strings_map_to_none() {
        for event in [
            "bogus",
            "",
            "dot ",
            "DOT",
            "fright:",
            "fright:abc",
            "warden:",
            "warden:abc",
            "relish:",
            "relish:abc",
            "relish:spawn:",
            "level:",
            "level:abc",
            "level-clear:2",
            "sprint-bonus:",
            "warden-back:",
            // Ghost ambience: deliberately silent.
            "wave:scatter",
            "wave:chase",
            "house-release:Bram",
            "house-out:Cyril",
        ] {
            assert_eq!(cue_for_event(event), None, "event {event:?}");
        }
    }
}
