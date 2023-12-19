export const REGEXP_SPECIAL_CHARS = [
    '^', '$', '[', ']',
    '(', ')', '{', '}',
    '+', '.', '-', '?',
    '=', ':', '*', '|',
    '\\',
]

export const REGEXP_SPECIAL_CHARS_REGEXP = new RegExp(
    REGEXP_SPECIAL_CHARS
        .map(c => '\\' + c)
        .join('|'),
    'gm')

export function escapeForRegExp(text: string): string {
    if (!text) { return '' }

    let escaped = ''
    let pos = 0

    for (const match of text.matchAll(REGEXP_SPECIAL_CHARS_REGEXP)) {
        const char = match[0]
        const charPos = match.index

        if (charPos === undefined) { continue }

        if (charPos > pos) {
            escaped += text.substring(pos, charPos)
        }

        escaped += '\\' + char

        pos = charPos + 1
    }

    if (text.length > pos) {
        escaped += text.substring(pos, text.length)
    }

    return escaped
}
