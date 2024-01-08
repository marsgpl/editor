export const REGEXP_RESERVED: string[] = [
    '^', '$', '?', '!',
    '*', '+', '.', '|',
    '(', ')', '{', '}',
    '[', ']', '-', '\\',
]

const REGEXP = new RegExp(REGEXP_RESERVED.map(c => '\\' + c).join('|'), 'g')

export function escapeForRegexp(text: string): string {
    return text.replace(REGEXP, char => '\\' + char)
}
