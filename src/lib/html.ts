import { escapeForRegExp } from './regexp'
import type { KV } from './types'

export const HTML_SPECIAL_CHARS: KV = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '\n': '<br />',
}

export const HTML_SPECIAL_CHARS_REGEXP = new RegExp(
    Object.keys(HTML_SPECIAL_CHARS)
        .map(escapeForRegExp)
        .join('|'),
    'gm')

export function span(text: string, className?: string) {
    const leftLen = text.match(/^[\s\n]+/)?.[0]?.length || 0
    const rightLen = text.match(/[\s\n]+$/)?.[0]?.length || 0
    const visible = (leftLen + rightLen) < text.length

    if (!visible) {
        return escapeNewLines(text)
    }

    if (!className) {
        return escapeForHtml(text)
    }

    let html = ''

    if (leftLen) {
        html += escapeNewLines(text.substring(0, leftLen))
    }

    html += `<span class="${className}">${
        escapeForHtml(text.substring(leftLen, rightLen ? text.length - rightLen : undefined))
    }</span>`

    if (rightLen) {
        html += escapeNewLines(text.substring(text.length - rightLen))
    }

    return html
}

export function escapeNewLines(text: string) {
    return text.replace(/\n/g, '<br />')
}

export function escapeForHtml(text: string): string {
    if (!text) { return '' }

    let escaped = ''
    let pos = 0

    for (const match of text.matchAll(HTML_SPECIAL_CHARS_REGEXP)) {
        const char = match[0]
        const charPos = match.index

        if (charPos === undefined) { continue }

        if (charPos > pos) {
            escaped += text.substring(pos, charPos)
        }

        escaped += (HTML_SPECIAL_CHARS[char] || '')

        pos = charPos + 1
    }

    if (text.length > pos) {
        escaped += text.substring(pos, text.length)
    }

    return escaped
}
