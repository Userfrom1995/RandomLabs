# Kestrel.Json - a tiny, dependency-free JSON encoder/decoder.
#
# The encoder accepts nothing, Bool, Int/Float (finite), String, Tuple, Array
# (any dimensionality, nested naturally), and Dict. The decoder returns nested
# `Any`: Dict{String,Any} for objects, Vector{Any} for arrays, plus String,
# Int, Float64, Bool, and nothing.

module Json

export encode, decode

# --- Encoding ----------------------------------------------------------------

function encode(x)::String
    x === nothing && return "null"
    x === true && return "true"
    x === false && return "false"
    if x isa AbstractString
        return string('"', _escape_string(x), '"')
    elseif x isa Integer
        return string(x)
    elseif x isa AbstractFloat
        @assert isfinite(x) "json: cannot encode non-finite float $x"
        return repr(Float64(x))
    elseif x isa Tuple
        return "[" * join((encode(v) for v in x), ",") * "]"
    elseif x isa AbstractArray
        return "[" * join((encode(v) for v in _nest(x)), ",") * "]"
    elseif x isa AbstractDict
        parts = String[]
        for (k, v) in x
            push!(parts, string('"', _escape_string(string(k)), "\":", encode(v)))
        end
        return "{" * join(parts, ",") * "}"
    else
        error("json: cannot encode value of type $(typeof(x))")
    end
end

function _nest(x::AbstractArray)
    ndims(x) == 1 && return collect(x)
    return [_nest(selectdim(x, 1, i)) for i in axes(x, 1)]
end

function _escape_string(s::AbstractString)
    out = IOBuffer()
    for ch in s
        if ch == '"'
            print(out, "\\\"")
        elseif ch == '\\'
            print(out, "\\\\")
        elseif ch == '\n'
            print(out, "\\n")
        elseif ch == '\r'
            print(out, "\\r")
        elseif ch == '\t'
            print(out, "\\t")
        elseif ch == '\b'
            print(out, "\\b")
        elseif ch == '\f'
            print(out, "\\f")
        elseif ch < '\x20'
            print(out, "\\u", string(UInt16(ch), base=16, pad=4))
        else
            print(out, ch)
        end
    end
    return String(take!(out))
end

# --- Decoding ----------------------------------------------------------------

mutable struct _Parser
    bytes::Vector{UInt8}
    pos::Int
end

function _Parser(s::String)
    _Parser(Vector{UInt8}(codeunits(s)), 1)
end

_peek(p::_Parser) = p.pos <= length(p.bytes) ? p.bytes[p.pos] : UInt8(0)
_peek2(p::_Parser) = p.pos + 1 <= length(p.bytes) ? p.bytes[p.pos + 1] : UInt8(0)

function _advance!(p::_Parser)
    ch = _peek(p)
    p.pos += 1
    return ch
end

const _WS = UInt8[' ', '\t', '\n', '\r']

function _ws!(p::_Parser)
    while _peek(p) in _WS
        p.pos += 1
    end
    return nothing
end

function decode(s::AbstractString)::Any
    p = _Parser(String(s))
    _ws!(p)
    v = _value!(p)
    _ws!(p)
    if _peek(p) != UInt8(0)
        error("json: trailing data at byte $(p.pos)")
    end
    return v
end

function _value!(p::_Parser)
    _ws!(p)
    ch = _peek(p)
    if ch == UInt8('{')
        return _object!(p)
    elseif ch == UInt8('[')
        return _array!(p)
    elseif ch == UInt8('"')
        return _string!(p)
    elseif ch == UInt8('t')
        return _keyword!(p, "true", true)
    elseif ch == UInt8('f')
        return _keyword!(p, "false", false)
    elseif ch == UInt8('n')
        return _keyword!(p, "null", nothing)
    elseif ch == UInt8('-') || (UInt8('0') <= ch <= UInt8('9'))
        return _number!(p)
    else
        error("json: unexpected character at byte $(p.pos)")
    end
end

function _keyword!(p::_Parser, word::String, val)
    if p.bytes[p.pos:min(p.pos + length(word) - 1, length(p.bytes))] != codeunits(word)
        error("json: expected '$word' at byte $(p.pos)")
    end
    p.pos += length(word)
    return val
end

function _object!(p::_Parser)
    _advance!(p) # '{'
    obj = Dict{String,Any}()
    _ws!(p)
    if _peek(p) == UInt8('}')
        _advance!(p)
        return obj
    end
    while true
        _ws!(p)
        _peek(p) == UInt8('"') || error("json: expected string key at byte $(p.pos)")
        key = _string!(p)
        _ws!(p)
        _advance!(p) == UInt8(':') || error("json: expected ':' after key at byte $(p.pos - 1)")
        obj[key] = _value!(p)
        _ws!(p)
        ch = _advance!(p)
        if ch == UInt8(',')
            continue
        elseif ch == UInt8('}')
            break
        else
            error("json: expected ',' or '}' at byte $(p.pos - 1)")
        end
    end
    return obj
end

function _array!(p::_Parser)
    _advance!(p) # '['
    arr = Any[]
    _ws!(p)
    if _peek(p) == UInt8(']')
        _advance!(p)
        return arr
    end
    while true
        push!(arr, _value!(p))
        _ws!(p)
        ch = _advance!(p)
        if ch == UInt8(',')
            continue
        elseif ch == UInt8(']')
            break
        else
            error("json: expected ',' or ']' at byte $(p.pos - 1)")
        end
    end
    return arr
end

function _string!(p::_Parser)
    _advance!(p) # '"'
    out = IOBuffer()
    while true
        ch = _advance!(p)
        if ch == UInt8('"')
            break
        elseif ch == UInt8('\\')
            esc = _advance!(p)
            if esc == UInt8('"')
                print(out, '"')
            elseif esc == UInt8('\\')
                print(out, '\\')
            elseif esc == UInt8('/')
                print(out, '/')
            elseif esc == UInt8('n')
                print(out, '\n')
            elseif esc == UInt8('r')
                print(out, '\r')
            elseif esc == UInt8('t')
                print(out, '\t')
            elseif esc == UInt8('b')
                print(out, '\b')
            elseif esc == UInt8('f')
                print(out, '\f')
            elseif esc == UInt8('u')
                hex = String(p.bytes[p.pos:p.pos + 3])
                p.pos += 4
                print(out, Char(parse(UInt16, hex; base = 16)))
            else
                error("json: invalid escape at byte $(p.pos - 1)")
            end
        elseif ch == UInt8(0)
            error("json: unterminated string")
        else
            # Raw byte (part of the UTF-8 payload); collect it verbatim.
            start = p.pos - 1
            while true
                nb = _peek(p)
                nb < 0x80 && break
                p.pos += 1
            end
            write(out, view(p.bytes, start:p.pos - 1))
        end
    end
    return String(take!(out))
end

function _number!(p::_Parser)
    start = p.pos
    _peek(p) == UInt8('-') && (p.pos += 1)
    while UInt8('0') <= _peek(p) <= UInt8('9')
        p.pos += 1
    end
    if _peek(p) == UInt8('.')
        p.pos += 1
        while UInt8('0') <= _peek(p) <= UInt8('9')
            p.pos += 1
        end
    end
    if _peek(p) in (UInt8('e'), UInt8('E'))
        p.pos += 1
        if _peek(p) in (UInt8('+'), UInt8('-'))
            p.pos += 1
        end
        while UInt8('0') <= _peek(p) <= UInt8('9')
            p.pos += 1
        end
    end
    token = String(p.bytes[start:p.pos - 1])
    isempty(token) && error("json: malformed number at byte $start")
    if occursin(r"[.eE]", token)
        return parse(Float64, token)
    else
        return parse(Int, token)
    end
end

end # module Json