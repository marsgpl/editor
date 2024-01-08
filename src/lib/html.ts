import { escapeForRegexp } from './regexp'

const NEWLINE = '\n'
export const BR = '<br />'

export const HTML_RESERVED: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&apos;',
    [NEWLINE]: BR,
}

const REGEXP = new RegExp(Object.keys(HTML_RESERVED).map(escapeForRegexp).join('|'), 'g')
const REGEXP_NEWLINE = new RegExp(NEWLINE, 'g')

export function escapeForHtml(text: string): string {
    return text.replace(REGEXP, char => HTML_RESERVED[char] || char)
}

export function escapeForHtmlOnlyNewline(text: string): string {
    return text.replace(REGEXP_NEWLINE, BR)
}
