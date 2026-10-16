//! Chrome text: HUD bars, side panel, and full-screen menus.
//!
//! All builders here return plain (uncolored) lines; the binary positions
//! and paints them. Pure and unit-tested: every surface the game shows
//! has its text pinned here, including the too-small card and the tier
//! trail that says exactly what degraded.

use crate::scores::Score;
use crate::screens::{MenuItem, PauseItem, TITLE_BANNER};
use maze_chase_config::settings::Settings;
use maze_chase_config::{Action, Keymap};
use maze_chase_engine::game::{Game, GameState};

/// Center `lines` in a `cols`x`rows` window (pads top and sides).
pub fn centered(lines: &[String], cols: usize, rows: usize) -> Vec<String> {
    let top = rows.saturating_sub(lines.len()) / 2;
    let mut out = vec![String::new(); top];
    for line in lines {
        let line = line.chars().take(cols).collect::<String>();
        let pad = cols.saturating_sub(line.chars().count()) / 2;
        out.push(format!("{}{}", " ".repeat(pad), line));
    }
    while out.len() < rows {
        out.push(String::new());
    }
    out.truncate(rows);
    out
}

/// Too-small card for windows below the minimum.
pub fn too_small_card(cols: u16, rows: u16, min_cols: u16, min_rows: u16) -> Vec<String> {
    centered(
        &[
            "MAZE CHASE".to_string(),
            format!("window {cols}x{rows} is too small"),
            format!("needs at least {min_cols}x{min_rows}"),
            "resize the window: the game re-fits live".to_string(),
        ],
        cols as usize,
        rows as usize,
    )
}

/// Compact top HUD bar (narrow windows): two lines.
pub fn top_bar(game: &Game, best: u32) -> [String; 2] {
    let state = match game.state {
        GameState::Play => "",
        GameState::Dying => "  OUCH",
        GameState::Clearing => "  CLEAR!",
        GameState::Over => "  GAME OVER",
    };
    let mode = game.mode.as_str().to_uppercase();
    [
        format!(
            "SCORE {:06}  BEST {:06}  LIVES {}  LEVEL {:02}{}",
            game.score,
            best.max(game.score),
            game.lives.max(0),
            game.level,
            state
        ),
        format!("MODE {} {}", mode, mode_clock(game)),
    ]
}

/// Side panel lines (wide windows, 26 columns).
pub fn side_panel(game: &Game, best: u32, tune: &str, tier: &str) -> Vec<String> {
    let mut lines = vec![
        "MAZE CHASE".to_string(),
        "".to_string(),
        format!("SCORE  {:06}", game.score),
        format!("BEST   {:06}", best.max(game.score)),
        format!("LIVES  {}", "●".repeat(game.lives.max(0) as usize)),
        format!("LEVEL  {:02}", game.level),
        format!("MODE   {}", game.mode.as_str()),
    ];
    let clock = mode_clock(game);
    if !clock.is_empty() {
        lines.push(format!("CLOCK  {clock}"));
    }
    lines.push("".to_string());
    lines.push(format!("TUNE   {tune}"));
    lines.push(format!("VIDEO  {tier}"));
    lines.push("".to_string());
    lines.push("move: arrows/WASD".to_string());
    lines.push("P pause  M mute".to_string());
    lines.push("Esc menu".to_string());
    lines
}

fn mode_clock(game: &Game) -> String {
    use maze_chase_engine::modes::GameMode;
    match game.mode {
        GameMode::TimeAttack | GameMode::Sprint => format!("{:.1}s", game.mode_t),
        _ => String::new(),
    }
}

/// Bottom hint line by surface.
pub fn hint(screen: &str, ticker: Option<&str>, tier_trail: Option<&str>) -> String {
    if let Some(trail) = tier_trail {
        return trail.to_string();
    }
    if let Some(t) = ticker {
        return t.to_string();
    }
    match screen {
        "playing" => "Arrows/WASD move · P pause · M mute · Esc menu".to_string(),
        "paused" => "Enter resume · Esc resume".to_string(),
        _ => "Enter select · Arrows move · Esc back".to_string(),
    }
}

/// Title screen lines.
pub fn title(
    selected: usize,
    scores_best: Option<u32>,
    tier: &str,
    trail: &[String],
) -> Vec<String> {
    let mut lines: Vec<String> = TITLE_BANNER.iter().map(|s| s.to_string()).collect();
    lines.push("".to_string());
    for (i, item) in MenuItem::ALL.iter().enumerate() {
        let cursor = if i == selected { "> " } else { "  " };
        lines.push(format!("{cursor}{}", item.label()));
    }
    lines.push("".to_string());
    if let Some(best) = scores_best {
        lines.push(format!("house best: {best:06}"));
    }
    lines.push(format!("video tier: {tier}"));
    for t in trail.iter().take(2) {
        lines.push(format!("degraded: {t}"));
    }
    lines
}

/// Help screen lines with scroll offset.
pub fn help(scroll: usize) -> Vec<String> {
    let mut lines = vec!["HOW TO PLAY".to_string(), "".to_string()];
    lines.extend(
        crate::screens::HELP_LINES
            .iter()
            .skip(scroll)
            .map(|s| s.to_string()),
    );
    lines.push("".to_string());
    lines.push("Up/Down scroll · Esc back".to_string());
    lines
}

/// Scores screen lines.
pub fn scores_table(table: &[Score]) -> Vec<String> {
    let mut lines = vec!["HIGH SCORES (this machine)".to_string(), "".to_string()];
    if table.is_empty() {
        lines.push("no runs recorded yet: be the first".to_string());
    }
    for (i, s) in table.iter().enumerate() {
        lines.push(format!(
            "{:2}. {:06}  level {:02}  {:12}  {}",
            i + 1,
            s.score,
            s.level,
            s.mode,
            s.date
        ));
    }
    lines.push("".to_string());
    lines.push("Esc back".to_string());
    lines
}

/// Settings screen lines: (label, value) rows with the cursor.
pub fn settings_list(rows: &[(String, String)], selected: usize) -> Vec<String> {
    let mut lines = vec!["SETTINGS".to_string(), "".to_string()];
    for (i, (label, value)) in rows.iter().enumerate() {
        let cursor = if i == selected { "> " } else { "  " };
        lines.push(format!("{cursor}{label:16} {value}"));
    }
    lines.push("".to_string());
    lines.push("Left/Right change · Enter edit · Esc save".to_string());
    lines
}

/// Rebind screen lines.
pub fn rebind_list(
    map: &Keymap,
    selected: usize,
    capture: Option<Action>,
    error: Option<&str>,
) -> Vec<String> {
    let mut lines = vec!["KEY BINDINGS".to_string(), "".to_string()];
    for (i, action) in Action::ALL.iter().enumerate() {
        let cursor = if i == selected { "> " } else { "  " };
        let keys = map
            .keys(*action)
            .iter()
            .map(|k| k.as_str())
            .collect::<Vec<_>>()
            .join(", ");
        let marker = if Some(*action) == capture {
            "  <-- press a key"
        } else {
            ""
        };
        lines.push(format!("{cursor}{:?}: {keys}{marker}", action));
    }
    lines.push("".to_string());
    if let Some(e) = error {
        lines.push(format!("conflict: {e}"));
    }
    lines.push("Enter rebind · Esc back".to_string());
    lines
}

/// Pause menu lines.
pub fn paused(selected: usize) -> Vec<String> {
    let mut lines = vec!["PAUSED".to_string(), "".to_string()];
    for (i, item) in PauseItem::ALL.iter().enumerate() {
        let cursor = if i == selected { "> " } else { "  " };
        lines.push(format!("{cursor}{}", item.label()));
    }
    lines
}

/// Game-over panel lines.
pub fn game_over(score: u32, level: u32, rank: Option<usize>) -> Vec<String> {
    let mut lines = vec![
        "GAME OVER".to_string(),
        "".to_string(),
        format!("score {score:06}   level {level:02}"),
    ];
    match rank {
        Some(r) => lines.push(format!("house rank #{r}")),
        None => lines.push("outside the house top 10".to_string()),
    }
    lines.push("".to_string());
    lines.push("Enter title".to_string());
    lines
}

/// Settings summary for the help footer (difficulty/theme names).
pub fn settings_summary(settings: &Settings) -> String {
    format!(
        "{} · {} · {}",
        settings.difficulty.as_str(),
        settings.theme,
        if settings.mute { "muted" } else { "sound on" }
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::screens::SettingsRow;
    use maze_chase_engine::game::Game;

    #[test]
    fn hud_bars_render() {
        let g = Game::new(1, 1);
        let bar = top_bar(&g, 0);
        assert!(bar[0].contains("SCORE"));
        assert!(bar[0].contains("LIVES"));
        let panel = side_panel(&g, 500, "title", "truecolor-cells");
        assert!(panel.iter().any(|l| l.contains("500")));
        assert!(panel.iter().any(|l| l.contains("truecolor-cells")));
        assert!(hint("playing", None, None).contains("pause"));
        assert_eq!(hint("playing", Some("relish +500"), None), "relish +500");
    }

    #[test]
    fn menus_pin_content() {
        let t = title(0, Some(900), "kitty-graphics", &[]);
        assert!(t.iter().any(|l| l.contains("Play")));
        assert!(t.iter().any(|l| l.contains("kitty-graphics")));
        let h = help(0);
        assert!(h.iter().any(|l| l.contains("wardens")));
        let o = game_over(1230, 4, Some(2));
        assert!(o.iter().any(|l| l.contains("rank #2")));
        let card = too_small_card(40, 10, 62, 35);
        assert_eq!(card.len(), 10);
    }

    #[test]
    fn centered_never_overflows() {
        let lines = centered(&["hello".to_string()], 4, 3);
        assert_eq!(lines.len(), 3);
        assert!(lines.iter().all(|l| l.chars().count() <= 4));
    }

    #[test]
    fn rebind_list_shows_capture() {
        let map = Keymap::defaults();
        let lines = rebind_list(&map, 0, Some(Action::Up), None);
        assert!(lines.iter().any(|l| l.contains("press a key")));
        let _ = SettingsRow::Back;
    }
}
