//! Chrome text: HUD bars, side panel, and full-screen menus.
//!
//! All builders here return plain (uncolored) lines; the binary positions
//! and paints them. Pure and unit-tested: every surface the game shows
//! has its text pinned here, including the too-small card and the tier
//! trail that says exactly what degraded.

use crate::scores::Score;
use crate::screens::{MenuItem, PauseItem, TITLE_BANNER};
use maze_chase_assets::anim;
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

/// Fright badge for the whole active window plus the final-tail meter.
///
/// The badge names the fright for as long as the window is active. The
/// 30-segment countdown joins only in the final 1.5 s, and the banner
/// replaces the flashing instruction for reduced-flash players
/// (information, not decoration). Segments differ by glyph as well as
/// brightness so the drain reads in grayscale.
pub fn fright_readout(game: &Game, reduced_flash: bool) -> Option<String> {
    if !game.wardens.fright_active() {
        return None;
    }
    if !game.wardens.fright_flashing() {
        return Some("FRIGHT!".to_string());
    }
    let label = if reduced_flash {
        "THE TURN ENDS "
    } else {
        "FRIGHT "
    };
    Some(format!("{label}{}", fright_bar(game)))
}

/// The 30-segment fright bar, filled from the left.
fn fright_bar(game: &Game) -> String {
    let lit = anim::fright_bar_segments(game.wardens.fright_t).min(30);
    (0..30).map(|i| if i < lit { '█' } else { '░' }).collect()
}

/// Fright lines for a panel that may be narrower than the 30 segments.
/// The label takes the first line; the segments wrap evenly beneath it.
pub fn fright_lines(game: &Game, reduced_flash: bool, width: usize) -> Vec<String> {
    let Some(readout) = fright_readout(game, reduced_flash) else {
        return Vec::new();
    };
    if readout.chars().count() <= width || width == 0 {
        return vec![readout];
    }
    let split = readout
        .chars()
        .position(|c| c == '█' || c == '░')
        .unwrap_or(readout.chars().count());
    let label: String = readout.chars().take(split).collect();
    let bar: Vec<char> = readout.chars().skip(split).collect();
    if bar.is_empty() {
        return vec![label.trim_end().to_string()];
    }
    let rows = bar.len().div_ceil(width);
    let chunk = bar.len().div_ceil(rows);
    let mut lines = vec![label.trim_end().to_string()];
    for c in bar.chunks(chunk) {
        lines.push(c.iter().collect());
    }
    lines
}

/// Dots completion bar glyph run: `width` cells, `cleared/total` filled.
fn dots_bar(game: &Game, width: usize) -> String {
    if width == 0 {
        return String::new();
    }
    let total = game.maze.total_pickups().max(1);
    let left = game.dots_left();
    let cleared = total.saturating_sub(left);
    let filled = (cleared * width).div_ceil(total).min(width);
    format!("{}{}", "█".repeat(filled), "░".repeat(width - filled))
}

/// Compact top HUD bar (narrow windows): three lines, each clipped to
/// `max_width` cells. Best moves to the pause hub so the compact rows can
/// carry score, wicks, level, the dots bar, and the fright/relish badges.
pub fn top_bar(game: &Game, _best: u32, reduced_flash: bool, max_width: usize) -> [String; 3] {
    let state = match game.state {
        GameState::Play => "",
        GameState::Dying => "  OUCH",
        GameState::Clearing => "  CLEAR!",
        GameState::Over => "  GAME OVER",
    };
    let total = game.maze.total_pickups().max(1);
    let left = game.dots_left();
    let mut dots = format!("DOTS {} {}/{}", dots_bar(game, 30), left, total);
    if game.relish.active {
        let relish = format!("  R+{}", game.relish.value);
        if dots.chars().count() + relish.chars().count() <= max_width {
            dots.push_str(&relish);
        }
    }
    let mode = game.mode.as_str().to_uppercase();
    let clock = mode_clock(game);
    let mode_line = if clock.is_empty() {
        format!("MODE {mode}")
    } else {
        format!("MODE {mode} {clock}")
    };
    let fright = fright_readout(game, reduced_flash);
    let lines = [
        format!(
            "SCORE {:06}  WICKS {}  LEVEL {:02}{}",
            game.score,
            game.lives.max(0),
            game.level,
            state
        ),
        dots,
        fright.unwrap_or(mode_line),
    ];
    lines.map(|line| line.chars().take(max_width).collect())
}

/// Side panel lines (wide windows, 26 columns).
pub fn side_panel(
    game: &Game,
    best: u32,
    tune: &str,
    tier: &str,
    reduced_flash: bool,
) -> Vec<String> {
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
    let total = game.maze.total_pickups().max(1);
    lines.push(format!("DOTS   {}/{}", game.dots_left(), total));
    lines.push(dots_bar(game, 24));
    if game.relish.active {
        lines.push(format!("RELISH +{}", game.relish.value));
    }
    lines.extend(fright_lines(
        game,
        reduced_flash,
        crate::layout::SIDE_PANEL_COLS as usize,
    ));
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
    let selected_item = MenuItem::ALL
        .get(selected)
        .copied()
        .unwrap_or(MenuItem::Play);
    lines.push(format!("  {}", selected_item.description()));
    lines.push("".to_string());
    if let Some(best) = scores_best {
        lines.push(format!("house best: {best:06}"));
    }
    lines.push(format!("video tier: {tier}"));
    for t in trail.iter().take(2) {
        lines.push(format!("degraded: {t}"));
    }
    lines.push("Bram heron · Kessa pike · Jory snake · Nib dragonfly".to_string());
    lines.push("clear 445 crumbs + 4 sunseeds; sunseeds turn the hunt".to_string());
    lines
}

/// Fixed chrome around the help body: title + blank header, blank +
/// hint footer.
const HELP_OVERHEAD: usize = 4;

/// Largest help scroll offset that keeps the body on screen in a
/// window of `rows` rows: body length minus the visible viewport, so
/// repeated Down can never scroll every help line away (evaluator
/// finding: the unclamped `help_scroll` scrolled the whole body off).
pub fn help_scroll_max(rows: usize) -> usize {
    let viewport = rows.saturating_sub(HELP_OVERHEAD).max(1);
    crate::screens::HELP_LINES.len().saturating_sub(viewport)
}

/// Help screen lines with the scroll offset clamped to the viewport.
pub fn help(scroll: usize, rows: usize) -> Vec<String> {
    let scroll = scroll.min(help_scroll_max(rows));
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
pub fn paused(selected: usize, best: u32) -> Vec<String> {
    let mut lines = vec![
        "PAUSED".to_string(),
        format!("BEST   {best:06}"),
        "".to_string(),
    ];
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
    fn compact_pause_hub_carries_the_best_score() {
        let lines = paused(1, 12_340);
        assert_eq!(lines[0], "PAUSED");
        assert_eq!(lines[1], "BEST   012340");
        assert!(lines.iter().any(|l| l == "  Resume"));
    }

    #[test]
    fn compact_band_keeps_an_active_relish_badge() {
        let mut g = Game::new(1, 1);
        g.relish.active = true;
        g.relish.value = 1000;
        let width = crate::layout::compute(62, 35).top_bar.unwrap().w as usize;
        let bar = top_bar(&g, 0, false, width);
        assert_eq!(width, 56);
        assert!(bar[1].contains("R+1000"), "got {:?}", bar[1]);
        assert!(bar[1].chars().count() <= width, "got {:?}", bar[1]);
    }

    #[test]
    fn hud_bars_render() {
        let g = Game::new(1, 1);
        let bar = top_bar(&g, 0, false, 62);
        assert!(bar[0].contains("SCORE"));
        assert!(bar[0].contains("WICKS"));
        assert!(bar[1].contains("DOTS"));
        let panel = side_panel(&g, 500, "title", "truecolor-cells", false);
        assert!(panel.iter().any(|l| l.contains("500")));
        assert!(panel.iter().any(|l| l.contains("truecolor-cells")));
        assert!(hint("playing", None, None).contains("pause"));
        assert_eq!(hint("playing", Some("relish +500"), None), "relish +500");
    }

    #[test]
    fn menus_pin_content() {
        let t = title(0, Some(900), "kitty-graphics", &[]);
        assert!(t.iter().any(|l| l.contains("Play")));
        assert!(t.iter().any(|l| l.contains("start a hunt in the pond")));
        assert!(t.iter().any(|l| l.contains("Bram heron")));
        assert!(t
            .iter()
            .any(|l| l.contains("clear 445 crumbs + 4 sunseeds")));
        assert!(t.iter().any(|l| l.contains("kitty-graphics")));
        let h = help(0, 35);
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
    fn help_scroll_clamps_to_body_minus_viewport() {
        // Evaluator finding: repeated Down scrolled the entire help
        // body away. The render clamp keeps the tail line on screen and
        // never overflows a short window.
        let last = crate::screens::HELP_LINES
            .last()
            .copied()
            .expect("help body is not empty");
        let clamped = help(usize::MAX, 35);
        assert_eq!(clamped, help(help_scroll_max(35), 35));
        assert!(
            clamped.iter().any(|l| l.as_str() == last),
            "full body reachable"
        );
        let tiny = help(usize::MAX, 10);
        assert!(
            tiny.iter().any(|l| l.as_str() == last),
            "last body line stays on screen in a short window"
        );
        assert!(tiny.len() <= 10, "clamped help fits the window");
    }

    #[test]
    fn rebind_list_shows_capture() {
        let map = Keymap::defaults();
        let lines = rebind_list(&map, 0, Some(Action::Up), None);
        assert!(lines.iter().any(|l| l.contains("press a key")));
        let _ = SettingsRow::Back;
    }

    #[test]
    fn fright_readout_drains_and_names_the_turn_end() {
        let mut g = Game::new(1, 1);
        g.wardens.start_fright(6.0);
        g.wardens.fright_t = 1.2;
        let readout = fright_readout(&g, false).expect("meter in the final window");
        assert!(readout.starts_with("FRIGHT "));
        assert_eq!(readout.chars().count(), 7 + 30);
        assert_eq!(readout.matches('█').count(), 24);
        assert_eq!(readout.matches('░').count(), 6);
        let reduced = fright_readout(&g, true).expect("reduced banner");
        assert!(reduced.starts_with("THE TURN ENDS "));
        assert_eq!(reduced.matches('█').count(), 24);
        assert_eq!(reduced.matches('░').count(), 6);
        g.wardens.fright_t = 2.0;
        let early = fright_readout(&g, false).expect("badge before the warning tail");
        assert_eq!(early, "FRIGHT!");
        assert!(!early.contains('█') && !early.contains('░'));
        g.wardens.fright_t = 0.0;
        assert!(fright_readout(&g, false).is_none());
    }

    #[test]
    fn fright_readout_and_hud_bars_fit_their_rects() {
        use maze_chase_engine::modes::GameMode;

        let mut g = Game::new(1, 1);
        g.wardens.start_fright(6.0);
        g.wardens.fright_t = 1.2;

        let panel = side_panel(&g, 0, "off", "truecolor-cells", true);
        assert!(
            panel.iter().all(|l| l.chars().count() <= 26),
            "side panel lines must fit SIDE_PANEL_COLS: {panel:?}"
        );

        g.mode = GameMode::Sprint;
        g.mode_t = 60.0;
        let bar = top_bar(&g, 0, true, 56);
        assert!(
            bar.iter().all(|l| l.chars().count() <= 56),
            "compact top bar lines must fit a 56-column band: {bar:?}"
        );
        assert!(bar[2].contains("TURN ENDS"), "got {:?}", bar[2]);
        assert!(bar[1].contains("DOTS"), "got {:?}", bar[1]);
        assert_eq!(
            bar[1].matches('█').count() + bar[1].matches('░').count(),
            30
        );
    }
}
