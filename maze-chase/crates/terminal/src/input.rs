//! Input mapping: crossterm key events to engine directions.
//!
//! Two stages, both pure and tested: [`crossterm_to_key`] translates a
//! `crossterm::event::KeyEvent` into the layer-neutral [`Key`], and
//! [`action_for_key`] resolves a [`Key`] through the player's [`Keymap`]
//! into an [`Action`]. Gameplay code consumes [`dir_for_action`]; menu
//! code consumes the raw actions. Nothing here touches the simulation.

use crossterm::event::{KeyCode, KeyEvent, KeyEventKind, KeyModifiers};
use maze_chase_config::{Action, Key, Keymap};
use maze_chase_engine::actors::Dir;

/// Translate a crossterm key event to the layer-neutral [`Key`].
/// Returns `None` for modified keys the game does not bind (Ctrl/Alt
/// combos), for unmapped function keys, and for every non-[`Press`]
/// kind: on Windows crossterm reports the key-up twin of each keystroke
/// as [`KeyEventKind::Release`], and acting on both halves would double
/// every key. The startup-probe replay synthesizes `Press` events, so
/// keys captured while the probe waits still act.
///
/// [`Press`]: KeyEventKind::Press
pub fn crossterm_to_key(ev: KeyEvent) -> Option<Key> {
    if ev.kind != KeyEventKind::Press {
        return None;
    }
    if ev.modifiers.contains(KeyModifiers::CONTROL) || ev.modifiers.contains(KeyModifiers::ALT) {
        return None;
    }
    match ev.code {
        KeyCode::Up => Some(Key::Up),
        KeyCode::Down => Some(Key::Down),
        KeyCode::Left => Some(Key::Left),
        KeyCode::Right => Some(Key::Right),
        KeyCode::Char('w') | KeyCode::Char('W') => Some(Key::W),
        KeyCode::Char('a') | KeyCode::Char('A') => Some(Key::A),
        KeyCode::Char('s') | KeyCode::Char('S') => Some(Key::S),
        KeyCode::Char('d') | KeyCode::Char('D') => Some(Key::D),
        KeyCode::Char('p') | KeyCode::Char('P') => Some(Key::P),
        KeyCode::Char('m') | KeyCode::Char('M') => Some(Key::M),
        KeyCode::Char(' ') => Some(Key::Space),
        KeyCode::Char(c) => Key::parse(&c.to_string()),
        KeyCode::Enter => Some(Key::Enter),
        KeyCode::Esc => Some(Key::Escape),
        // No dedicated Back key in the neutral map: Backspace backs out.
        KeyCode::Backspace => Some(Key::Escape),
        _ => None,
    }
}

/// Decode raw bytes captured by the startup Sixel probe back into key
/// events, so the probe window can replay them instead of swallowing
/// input. Mirrors crossterm's parser for the sequences the game can act
/// on (text, Enter, Esc, Backspace, Tab, arrows, Home/End, Insert,
/// Delete, PageUp/PageDown, F1-F12, and xterm modifier parameters).
/// Unparseable fragments at the capture boundary are dropped, exactly
/// as crossterm drops unbound or unparseable input.
pub fn keys_from_captured_bytes(bytes: &[u8]) -> Vec<KeyEvent> {
    let mut keys: Vec<KeyEvent> = Vec::new();
    let mut i = 0;
    while i < bytes.len() {
        match bytes[i] {
            0x1b => i += decode_escape(&bytes[i..], &mut keys),
            b'\r' | b'\n' => {
                // Enter: a CR typed before raw mode engages arrives as
                // LF because the line discipline translates it.
                keys.push(KeyEvent::new(KeyCode::Enter, KeyModifiers::empty()));
                i += 1;
            }
            b'\t' => {
                keys.push(KeyEvent::new(KeyCode::Tab, KeyModifiers::empty()));
                i += 1;
            }
            0x7f | 0x08 => {
                keys.push(KeyEvent::new(KeyCode::Backspace, KeyModifiers::empty()));
                i += 1;
            }
            0x00 => {
                keys.push(KeyEvent::new(KeyCode::Char(' '), KeyModifiers::CONTROL));
                i += 1;
            }
            0x01..=0x1a => {
                keys.push(KeyEvent::new(
                    KeyCode::Char((b'a' + bytes[i] - 1) as char),
                    KeyModifiers::CONTROL,
                ));
                i += 1;
            }
            0x1c..=0x1f => {
                keys.push(KeyEvent::new(
                    KeyCode::Char((b'4' + bytes[i] - 0x1c) as char),
                    KeyModifiers::CONTROL,
                ));
                i += 1;
            }
            _ => {
                let (ch, consumed) = decode_utf8_char(&bytes[i..]);
                keys.push(KeyEvent::new(KeyCode::Char(ch), KeyModifiers::empty()));
                i += consumed;
            }
        }
    }
    keys
}

/// One UTF-8 character and its byte width; invalid lead bytes decode to
/// U+FFFD so the caller always makes progress.
fn decode_utf8_char(bytes: &[u8]) -> (char, usize) {
    let text = match std::str::from_utf8(bytes) {
        Ok(text) => text,
        Err(e) if e.valid_up_to() > 0 => {
            std::str::from_utf8(&bytes[..e.valid_up_to()]).unwrap_or("")
        }
        Err(_) => "",
    };
    text.chars()
        .next()
        .map(|c| (c, c.len_utf8()))
        .unwrap_or(('\u{FFFD}', 1))
}

/// Decode one escape sequence at `bytes[0] == ESC`; returns the number
/// of bytes consumed (always at least 1).
fn decode_escape(bytes: &[u8], keys: &mut Vec<KeyEvent>) -> usize {
    match bytes.get(1) {
        None => {
            keys.push(KeyEvent::new(KeyCode::Esc, KeyModifiers::empty()));
            1
        }
        Some(b'[') => decode_csi(&bytes[2..], keys),
        Some(b'O') => match bytes.get(2) {
            Some(&code) => {
                if let Some(key) = match code {
                    b'A' => Some(KeyCode::Up),
                    b'B' => Some(KeyCode::Down),
                    b'C' => Some(KeyCode::Right),
                    b'D' => Some(KeyCode::Left),
                    b'H' => Some(KeyCode::Home),
                    b'F' => Some(KeyCode::End),
                    b'P'..=b'S' => Some(KeyCode::F(1 + code - b'P')),
                    _ => None,
                } {
                    keys.push(KeyEvent::new(key, KeyModifiers::empty()));
                }
                3
            }
            // Split SS3 fragment: the remainder is in crossterm's stream.
            None => 2,
        },
        Some(b'\x1b') => {
            keys.push(KeyEvent::new(KeyCode::Esc, KeyModifiers::empty()));
            1
        }
        Some(_) => {
            // Alt+key: no Alt chord is bound today, but replay it as the
            // parser would so a future binding sees it.
            let (ch, consumed) = decode_utf8_char(&bytes[1..]);
            keys.push(KeyEvent::new(KeyCode::Char(ch), KeyModifiers::ALT));
            1 + consumed
        }
    }
}

/// Decode a CSI body (the bytes after `ESC [`); returns the number of
/// bytes consumed including the two-byte introducer.
fn decode_csi(body: &[u8], keys: &mut Vec<KeyEvent>) -> usize {
    let Some(end) = body.iter().position(|&b| (0x40..=0x7e).contains(&b)) else {
        // The capture deadline split the sequence: the remainder is in
        // crossterm's stream, so drop the fragment rather than inventing
        // an Esc the user never pressed.
        return body.len() + 2;
    };
    let params = &body[..end];
    let final_byte = body[end];
    let key = match final_byte {
        b'A' => Some(KeyCode::Up),
        b'B' => Some(KeyCode::Down),
        b'C' => Some(KeyCode::Right),
        b'D' => Some(KeyCode::Left),
        b'H' => Some(KeyCode::Home),
        b'F' => Some(KeyCode::End),
        b'Z' => Some(KeyCode::BackTab),
        b'~' => match first_csi_param(params) {
            Some(1) => Some(KeyCode::Home),
            Some(2) => Some(KeyCode::Insert),
            Some(3) => Some(KeyCode::Delete),
            Some(4) => Some(KeyCode::End),
            Some(5) => Some(KeyCode::PageUp),
            Some(6) => Some(KeyCode::PageDown),
            Some(15) => Some(KeyCode::F(5)),
            Some(17) => Some(KeyCode::F(6)),
            Some(18) => Some(KeyCode::F(7)),
            Some(19) => Some(KeyCode::F(8)),
            Some(20) => Some(KeyCode::F(9)),
            Some(21) => Some(KeyCode::F(10)),
            Some(23) => Some(KeyCode::F(11)),
            Some(24) => Some(KeyCode::F(12)),
            _ => None,
        },
        _ => None,
    };
    if let Some(key) = key {
        // `~` tuples carry key numbers, not modifiers; everything else
        // may end in the xterm `1 + bits` modifier parameter.
        let modifiers = if final_byte == b'~' {
            KeyModifiers::empty()
        } else {
            csi_modifiers(params)
        };
        keys.push(KeyEvent::new(key, modifiers));
    }
    2 + end + 1
}

/// First `;`-separated numeric CSI parameter (`None` for empty).
fn first_csi_param(params: &[u8]) -> Option<u8> {
    let end = params
        .iter()
        .position(|&b| b == b';')
        .unwrap_or(params.len());
    std::str::from_utf8(&params[..end]).ok()?.parse().ok()
}

/// xterm modifier parameter: the last CSI parameter is `1 + bitmask`
/// (1 shift, 2 alt, 4 ctrl, 8 meta).
fn csi_modifiers(params: &[u8]) -> KeyModifiers {
    let start = params
        .iter()
        .rposition(|&b| b == b';')
        .map(|i| i + 1)
        .unwrap_or(0);
    let value: u16 = match std::str::from_utf8(&params[start..])
        .ok()
        .and_then(|s| s.parse().ok())
    {
        Some(v) if v > 1 => v,
        _ => return KeyModifiers::empty(),
    };
    let bits = value - 1;
    let mut modifiers = KeyModifiers::empty();
    if bits & 1 != 0 {
        modifiers |= KeyModifiers::SHIFT;
    }
    if bits & 2 != 0 {
        modifiers |= KeyModifiers::ALT;
    }
    if bits & 4 != 0 {
        modifiers |= KeyModifiers::CONTROL;
    }
    if bits & 8 != 0 {
        modifiers |= KeyModifiers::META;
    }
    modifiers
}

/// Resolve a [`Key`] through the active [`Keymap`] to an [`Action`].
pub fn action_for_key(map: &Keymap, key: Key) -> Option<Action> {
    Action::ALL
        .iter()
        .copied()
        .find(|&action| map.keys(action).contains(&key))
}

/// Movement actions become engine headings; everything else is `None`.
pub fn dir_for_action(action: Action) -> Option<Dir> {
    match action {
        Action::Up => Some(Dir::Up),
        Action::Down => Some(Dir::Down),
        Action::Left => Some(Dir::Left),
        Action::Right => Some(Dir::Right),
        _ => None,
    }
}

/// One-step helper: key event plus keymap straight to an engine heading.
pub fn dir_for_event(map: &Keymap, ev: KeyEvent) -> Option<Dir> {
    let key = crossterm_to_key(ev)?;
    let action = action_for_key(map, key)?;
    dir_for_action(action)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crossterm::event::KeyEventKind;

    fn key(code: KeyCode) -> KeyEvent {
        KeyEvent {
            code,
            modifiers: KeyModifiers::empty(),
            kind: KeyEventKind::Press,
            state: crossterm::event::KeyEventState::empty(),
        }
    }

    #[test]
    fn arrows_and_wasd_reach_the_engine() {
        let map = Keymap::defaults();
        for code in [
            KeyCode::Up,
            KeyCode::Char('w'),
            KeyCode::Char('W'),
            KeyCode::Down,
            KeyCode::Char('s'),
            KeyCode::Left,
            KeyCode::Char('a'),
            KeyCode::Right,
            KeyCode::Char('d'),
        ] {
            assert!(dir_for_event(&map, key(code)).is_some(), "{code:?}");
        }
        assert_eq!(dir_for_event(&map, key(KeyCode::Up)), Some(Dir::Up));
        assert_eq!(
            dir_for_event(&map, key(KeyCode::Char('a'))),
            Some(Dir::Left)
        );
    }

    #[test]
    fn modified_keys_never_leak_into_gameplay() {
        let modified = KeyEvent {
            code: KeyCode::Up,
            modifiers: KeyModifiers::CONTROL,
            kind: KeyEventKind::Press,
            state: crossterm::event::KeyEventState::empty(),
        };
        assert_eq!(crossterm_to_key(modified), None);
        let map = Keymap::defaults();
        assert_eq!(dir_for_event(&map, modified), None);
    }

    #[test]
    fn ui_keys_resolve_but_do_not_steer() {
        let map = Keymap::defaults();
        let esc = crossterm_to_key(key(KeyCode::Esc)).unwrap();
        let action = action_for_key(&map, esc);
        assert!(action.is_some());
        assert_eq!(dir_for_action(action.unwrap()), None);
    }

    #[test]
    fn rebinds_take_effect_immediately() {
        let mut map = Keymap::defaults();
        // Rebind pause onto a free key; the old key must stop working.
        let _ = map.rebind(Action::Pause, Key::Char('x'));
        let action = action_for_key(&map, Key::Char('x'));
        assert_eq!(action, Some(Action::Pause));
        assert_eq!(dir_for_action(Action::Pause), None);
    }

    #[test]
    fn space_confirms_menus() {
        // `Key::parse(" ")` rejects whitespace, so the space bar needs an
        // explicit map: Space is a default Confirm key.
        assert_eq!(crossterm_to_key(key(KeyCode::Char(' '))), Some(Key::Space));
        let map = Keymap::defaults();
        assert_eq!(action_for_key(&map, Key::Space), Some(Action::Confirm));
    }

    fn codes(bytes: &[u8]) -> Vec<KeyCode> {
        keys_from_captured_bytes(bytes)
            .into_iter()
            .map(|k| k.code)
            .collect()
    }

    #[test]
    fn captured_text_and_enter_decode_in_order() {
        assert_eq!(codes(b"\r"), vec![KeyCode::Enter]);
        // Canonical mode may translate CR to LF before raw mode engages.
        assert_eq!(codes(b"\n"), vec![KeyCode::Enter]);
        assert_eq!(codes(b"4"), vec![KeyCode::Char('4')]);
        assert_eq!(
            codes(b"m1\r"),
            vec![KeyCode::Char('m'), KeyCode::Char('1'), KeyCode::Enter]
        );
        assert_eq!(codes(b"\x7f"), vec![KeyCode::Backspace]);
        assert_eq!(codes(b"\t"), vec![KeyCode::Tab]);
        assert_eq!(codes("é".as_bytes()), vec![KeyCode::Char('é')]);
    }

    #[test]
    fn captured_escape_sequences_decode_to_keys() {
        assert_eq!(codes(b"\x1b[A"), vec![KeyCode::Up]);
        assert_eq!(codes(b"\x1b[B"), vec![KeyCode::Down]);
        assert_eq!(codes(b"\x1b[C"), vec![KeyCode::Right]);
        assert_eq!(codes(b"\x1b[D"), vec![KeyCode::Left]);
        assert_eq!(codes(b"\x1bOA"), vec![KeyCode::Up]);
        assert_eq!(codes(b"\x1bOP"), vec![KeyCode::F(1)]);
        assert_eq!(codes(b"\x1b[3~"), vec![KeyCode::Delete]);
        assert_eq!(codes(b"\x1b[6~"), vec![KeyCode::PageDown]);
        assert_eq!(codes(b"\x1b"), vec![KeyCode::Esc]);
        assert_eq!(codes(b"\x1b\x1b"), vec![KeyCode::Esc, KeyCode::Esc]);
    }

    #[test]
    fn captured_modified_keys_keep_their_modifiers() {
        let keys = keys_from_captured_bytes(b"\x1b[1;5C");
        assert_eq!(keys.len(), 1);
        assert_eq!(keys[0].code, KeyCode::Right);
        assert_eq!(keys[0].modifiers, KeyModifiers::CONTROL);
        // Alt chords decode with ALT (the game drops them, crossterm
        // parity) rather than leaking a bare character.
        let keys = keys_from_captured_bytes(b"\x1bx");
        assert_eq!(keys.len(), 1);
        assert_eq!(keys[0].code, KeyCode::Char('x'));
        assert_eq!(keys[0].modifiers, KeyModifiers::ALT);
    }

    #[test]
    fn captured_keystrokes_reach_actions() {
        let map = Keymap::defaults();
        let start = keys_from_captured_bytes(b"\r");
        assert_eq!(
            action_for_key(&map, crossterm_to_key(start[0]).unwrap()),
            Some(Action::Confirm)
        );
        // A captured arrow still steers once play is on.
        let keys = keys_from_captured_bytes(b"\x1b[C");
        assert_eq!(dir_for_event(&map, keys[0]), Some(Dir::Right));
    }

    #[test]
    fn captured_fragments_never_panic_and_make_progress() {
        for fragment in [
            &b"\x1b"[..],
            b"\x1b[",
            b"\x1b[1;",
            b"\xc3",
            b"\xff\xfe",
            b"\x1b[?",
        ] {
            let _ = keys_from_captured_bytes(fragment);
        }
        // A lone Esc is a complete key and survives; split CSI/SS3
        // fragments are dropped (their remainder is crossterm's).
        assert_eq!(codes(b"\x1b"), vec![KeyCode::Esc]);
        assert!(codes(b"\x1b[?62;4").is_empty());
        assert!(codes(b"\x1b[").is_empty());
        assert!(codes(b"\x1bO").is_empty());
    }
}
