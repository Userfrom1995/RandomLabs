//! A small hand-written JSON reader and writer.
//!
//! Zero-dependency JSON is needed so `meridian` can round-trip its exported
//! index format without pulling in serde. The reader accepts the subset the
//! writer produces (and a little more): objects, arrays, strings with escapes,
//! numbers, booleans, null. Object key order is preserved.

#[derive(Debug, Clone, PartialEq)]
pub enum Json {
    Null,
    Bool(bool),
    Num(f64),
    Str(String),
    Arr(Vec<Json>),
    Obj(Vec<(String, Json)>),
}

impl Json {
    pub fn get(&self, key: &str) -> Option<&Json> {
        match self {
            Json::Obj(entries) => entries
                .iter()
                .find(|(k, _)| k == key)
                .map(|(_, v)| v),
            _ => None,
        }
    }

    pub fn as_str(&self) -> Option<&str> {
        match self {
            Json::Str(s) => Some(s),
            _ => None,
        }
    }

    pub fn as_num(&self) -> Option<f64> {
        match self {
            Json::Num(n) => Some(*n),
            _ => None,
        }
    }

    pub fn as_arr(&self) -> Option<&[Json]> {
        match self {
            Json::Arr(a) => Some(a),
            _ => None,
        }
    }

    pub fn as_obj(&self) -> Option<&[(String, Json)]> {
        match self {
            Json::Obj(o) => Some(o),
            _ => None,
        }
    }

    /// True when `other` is a number equal to this one (by value), otherwise
    /// structural equality.
    pub fn loosely_eq(&self, other: &Json) -> bool {
        match (self, other) {
            (Json::Num(a), Json::Num(b)) => {
                if a.is_nan() && b.is_nan() {
                    true
                } else {
                    (a - b).abs() < 1e-9 || *a == *b
                }
            }
            _ => self == other,
        }
    }
}

pub fn escape_str(s: &str) -> String {
    let mut out = String::with_capacity(s.len() + 2);
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\u{08}' => out.push_str("\\b"),
            '\u{0c}' => out.push_str("\\f"),
            c if (c as u32) < 0x20 => {
                out.push_str(&format!("\\u{:04x}", c as u32));
            }
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

/// Writes JSON compactly (no whitespace).
pub fn write(j: &Json, out: &mut String) {
    match j {
        Json::Null => out.push_str("null"),
        Json::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
        Json::Num(n) => {
            if n.fract() == 0.0 && n.is_finite() && n.abs() < 9_007_199_254_740_992.0 {
                out.push_str(&format!("{}", *n as i64));
            } else {
                out.push_str(&format!("{}", n));
            }
        }
        Json::Str(s) => out.push_str(&escape_str(s)),
        Json::Arr(items) => {
            out.push('[');
            for (i, item) in items.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                write(item, out);
            }
            out.push(']');
        }
        Json::Obj(entries) => {
            out.push('{');
            for (i, (k, v)) in entries.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                out.push_str(&escape_str(k));
                out.push(':');
                write(v, out);
            }
            out.push('}');
        }
    }
}

pub fn to_string(j: &Json) -> String {
    let mut out = String::new();
    write(j, &mut out);
    out
}

struct Parser<'a> {
    input: &'a [u8],
    pos: usize,
}

/// Parses a JSON document, returning the value and the number of bytes
/// consumed, or an error message.
pub fn parse(input: &str) -> Result<Json, String> {
    let mut p = Parser {
        input: input.as_bytes(),
        pos: 0,
    };
    p.skip_ws();
    let v = p.value()?;
    p.skip_ws();
    if p.pos < p.input.len() {
        return Err(format!("trailing data at byte {}", p.pos));
    }
    Ok(v)
}

impl<'a> Parser<'a> {
    fn peek(&self) -> Option<u8> {
        self.input.get(self.pos).copied()
    }

    fn skip_ws(&mut self) {
        while let Some(b) = self.peek() {
            if b == b' ' || b == b'\t' || b == b'\n' || b == b'\r' {
                self.pos += 1;
            } else {
                break;
            }
        }
    }

    fn value(&mut self) -> Result<Json, String> {
        self.skip_ws();
        match self.peek() {
            Some(b'{') => self.object(),
            Some(b'[') => self.array(),
            Some(b'"') => Ok(Json::Str(self.string()?)),
            Some(b't') => self.keyword(b"true", Json::Bool(true)),
            Some(b'f') => self.keyword(b"false", Json::Bool(false)),
            Some(b'n') => self.keyword(b"null", Json::Null),
            Some(b'-') | Some(b'0'..=b'9') => self.number(),
            Some(other) => Err(format!("unexpected byte 0x{:02x} at {}", other, self.pos)),
            None => Err("unexpected end of input".to_string()),
        }
    }

    fn keyword(&mut self, kw: &[u8], val: Json) -> Result<Json, String> {
        if self.input.get(self.pos..self.pos + kw.len()) == Some(kw) {
            self.pos += kw.len();
            Ok(val)
        } else {
            Err(format!("invalid literal at byte {}", self.pos))
        }
    }

    fn object(&mut self) -> Result<Json, String> {
        self.pos += 1; // '{'
        let mut entries = Vec::new();
        self.skip_ws();
        if self.peek() == Some(b'}') {
            self.pos += 1;
            return Ok(Json::Obj(entries));
        }
        loop {
            self.skip_ws();
            if self.peek() != Some(b'"') {
                return Err(format!("expected string key at byte {}", self.pos));
            }
            let key = self.string()?;
            self.skip_ws();
            if self.peek() != Some(b':') {
                return Err(format!("expected ':' at byte {}", self.pos));
            }
            self.pos += 1;
            let v = self.value()?;
            entries.push((key, v));
            self.skip_ws();
            match self.peek() {
                Some(b',') => {
                    self.pos += 1;
                }
                Some(b'}') => {
                    self.pos += 1;
                    return Ok(Json::Obj(entries));
                }
                _ => return Err(format!("expected ',' or '}}' at byte {}", self.pos)),
            }
        }
    }

    fn array(&mut self) -> Result<Json, String> {
        self.pos += 1; // '['
        let mut items = Vec::new();
        self.skip_ws();
        if self.peek() == Some(b']') {
            self.pos += 1;
            return Ok(Json::Arr(items));
        }
        loop {
            let v = self.value()?;
            items.push(v);
            self.skip_ws();
            match self.peek() {
                Some(b',') => {
                    self.pos += 1;
                }
                Some(b']') => {
                    self.pos += 1;
                    return Ok(Json::Arr(items));
                }
                _ => return Err(format!("expected ',' or ']' at byte {}", self.pos)),
            }
        }
    }

    fn string(&mut self) -> Result<String, String> {
        self.pos += 1; // opening quote
        let mut out = String::new();
        loop {
            match self.peek() {
                None => return Err("unterminated string".to_string()),
                Some(b'"') => {
                    self.pos += 1;
                    return Ok(out);
                }
                Some(b'\\') => {
                    self.pos += 1;
                    let esc = self
                        .peek()
                        .ok_or_else(|| "unterminated escape".to_string())?;
                    self.pos += 1;
                    match esc {
                        b'"' => out.push('"'),
                        b'\\' => out.push('\\'),
                        b'/' => out.push('/'),
                        b'b' => out.push('\u{08}'),
                        b'f' => out.push('\u{0c}'),
                        b'n' => out.push('\n'),
                        b'r' => out.push('\r'),
                        b't' => out.push('\t'),
                        b'u' => {
                            let hex = self
                                .input
                                .get(self.pos..self.pos + 4)
                                .ok_or_else(|| "bad \\u escape".to_string())?;
                            let hex_str = std::str::from_utf8(hex)
                                .map_err(|_| "bad \\u escape".to_string())?;
                            let code = u32::from_str_radix(hex_str, 16)
                                .map_err(|_| "bad \\u escape".to_string())?;
                            self.pos += 4;
                            let c = char::from_u32(code).unwrap_or('\u{fffd}');
                            out.push(c);
                        }
                        other => {
                            return Err(format!("invalid escape \\{}", other as char));
                        }
                    }
                }
                Some(b) => {
                    let len = utf8_len(b);
                    let slice = self
                        .input
                        .get(self.pos..self.pos + len)
                        .ok_or_else(|| "bad utf-8 in string".to_string())?;
                    let s = std::str::from_utf8(slice)
                        .map_err(|_| "bad utf-8 in string".to_string())?;
                    out.push_str(s);
                    self.pos += len;
                }
            }
        }
    }

    fn number(&mut self) -> Result<Json, String> {
        let start = self.pos;
        if self.peek() == Some(b'-') {
            self.pos += 1;
        }
        while let Some(b) = self.peek() {
            if b.is_ascii_digit() || b == b'.' || b == b'e' || b == b'E' || b == b'+' || b == b'-'
            {
                self.pos += 1;
            } else {
                break;
            }
        }
        let raw = std::str::from_utf8(&self.input[start..self.pos])
            .map_err(|_| "bad number".to_string())?;
        let n: f64 = raw
            .parse()
            .map_err(|_| format!("bad number '{}'", raw))?;
        Ok(Json::Num(n))
    }
}

fn utf8_len(b: u8) -> usize {
    if b < 0x80 {
        1
    } else if b >> 5 == 0b110 {
        2
    } else if b >> 4 == 0b1110 {
        3
    } else if b >> 3 == 0b11110 {
        4
    } else {
        1
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_and_write_round_trip() {
        let src = r#"{"a":[1,2.5,-3,"x\n\"y",true,false,null],"b":{"k":"v"}}"#;
        let j = parse(src).unwrap();
        let written = to_string(&j);
        let j2 = parse(&written).unwrap();
        assert_eq!(j, j2);
    }

    #[test]
    fn parse_nested() {
        let j = parse(r#"{"docs":[{"id":0,"title":"Hi"}]}"#).unwrap();
        let docs = j.get("docs").unwrap().as_arr().unwrap();
        assert_eq!(docs[0].get("id").unwrap().as_num(), Some(0.0));
        assert_eq!(docs[0].get("title").unwrap().as_str(), Some("Hi"));
    }

    #[test]
    fn escapes_round_trip() {
        let j = Json::Str("line\nbreak \"quote\" \\ and \u{00e9}".to_string());
        let written = to_string(&j);
        assert_eq!(parse(&written).unwrap(), j);
    }

    #[test]
    fn errors_on_bad_input() {
        assert!(parse("").is_err());
        assert!(parse("{").is_err());
        assert!(parse("[1,]").is_err());
        assert!(parse("{\"a\"}").is_err());
        assert!(parse("nul").is_err());
        assert!(parse("hello").is_err());
    }

    #[test]
    fn integer_numbers_write_without_decimals() {
        let j = Json::Num(42.0);
        assert_eq!(to_string(&j), "42");
    }
}