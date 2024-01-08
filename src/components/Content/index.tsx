import React from 'react'
import { ScriptKind } from 'typescript'
import { TAB_LEN } from '../Editor'
import { toHtml } from '../../lib/ts'
import s from './index.module.css'
import { cn } from '../../lib/cn'

const HISTORY_MAX_DEPTH = 100

export interface ContentProps {
    text: string
    setText: (text: string) => void
    setActiveLineIndex: React.Dispatch<React.SetStateAction<number>>
    scriptKind: ScriptKind
    disabled?: boolean
}

type HistoryRecord = [string, number, number]

const isMac = /Macintosh/i.test(navigator.userAgent)

export function Content({
    text,
    setText,
    setActiveLineIndex,
    scriptKind,
    disabled,
}: ContentProps) {
    const contentRef = React.useRef<HTMLDivElement>(null)
    const codeRef = React.useRef<HTMLElement>(null)
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)
    const history = React.useRef<HistoryRecord[]>([[text, 0, 0]])

    const html = React.useMemo(() => toHtml(text, scriptKind),
        [text, scriptKind])

    const pushHistory = (rec: HistoryRecord) => {
        history.current.push(rec)

        if (history.current.length > HISTORY_MAX_DEPTH) {
            history.current.shift()
        }
    }

    React.useEffect(() => {
        const content = contentRef.current
        const code = codeRef.current
        const textarea = textareaRef.current

        if (!content) { return }
        if (!code) { return }
        if (!textarea) { return }

        const recalc = () => {
            const { width: codeW, height: codeH } = code.getBoundingClientRect()
            const { width: contentW, height: contentH } = content.getBoundingClientRect()

            textarea.style.width = Math.max(codeW + 30, contentW) + 'px'
            textarea.style.height = Math.max(contentH, codeH) + 'px'
        }

        recalc()

        const observer = new ResizeObserver(recalc)

        observer.observe(code)
        observer.observe(content)
        window.addEventListener('resize', recalc)

        return () => {
            observer.unobserve(code)
            observer.disconnect()
            window.removeEventListener('resize', recalc)
        }
    }, [])

    const onSelect = React.useCallback(() => {
        const textarea = textareaRef.current
        if (!textarea) { return }

        const pos = textarea.selectionEnd
        const lineIndex = text.substring(0, pos).split('\n').length - 1
        const { selectionStart, selectionEnd } = textarea

        setActiveLineIndex(lineIndex)

        const rec = history.current[history.current.length - 1]

        rec[1] = selectionStart
        rec[2] = selectionEnd

        // if ((window as any).lastLoggedPos !== pos) {
        //     (window as any).lastLoggedPos = pos
        //     console.log(pos)
        // }
    }, [text])

    const onKeyDown = React.useCallback((event: React.KeyboardEvent) => {
        if (event.key === 'z' && (isMac ? event.metaKey : event.ctrlKey)) {
            event.preventDefault()

            const textarea = textareaRef.current
            if (!textarea) { return }

            if (history.current.length < 2) { return }

            history.current.pop()

            const [
                text,
                selectionStart,
                selectionEnd,
            ] = history.current[history.current.length - 1]

            setText(text)

            textarea.blur()

            setTimeout(() => {
                textarea.selectionStart = selectionStart
                textarea.selectionEnd = selectionEnd
                textarea.focus()
            })
        }

        if (event.key === 'Tab') {
            event.preventDefault()

            const textarea = textareaRef.current
            if (!textarea) { return }

            const { selectionStart, selectionEnd } = textarea
            const selectedText = text.substring(selectionStart, selectionEnd)

            if (selectedText.includes('\n')) {
                let lineStart = 0
                let spacesAdded = 0
                let firstLineSpacesRemoved = 0

                const newText = text.split(/\n/gm).map(line => {
                    const { length: lineLength } = line
                    const lineEnd = lineStart + lineLength
                    const intersect = (lineStart >= selectionStart && lineStart <= selectionEnd)
                        || (lineEnd >= selectionStart && lineEnd <= selectionEnd)
                    const isFirstLine = lineStart <= selectionStart

                    lineStart = lineEnd + 1

                    if (!intersect) {
                        return line
                    } else if (event.shiftKey) {
                        const spaces = line.match(/^ +/)?.[0]?.length || 0
                        const removeN = Math.min(TAB_LEN, spaces)

                        if (isFirstLine) {
                            firstLineSpacesRemoved = removeN
                        }

                        spacesAdded -= removeN

                        return line.substring(removeN)
                    } else {
                        spacesAdded += TAB_LEN

                        return ' '.repeat(TAB_LEN) + line
                    }
                }).join('\n')

                setText(newText)

                textarea.blur()

                setTimeout(() => {
                    textarea.selectionStart = selectionStart
                        + (event.shiftKey ? -firstLineSpacesRemoved : TAB_LEN)
                    textarea.selectionEnd = selectionEnd + spacesAdded

                    pushHistory([newText, selectionStart, selectionEnd])

                    textarea.focus()
                })
            } else {
                const newText = text.substring(0, selectionStart)
                    + ' '.repeat(TAB_LEN)
                    + text.substring(selectionEnd)

                setText(newText)

                textarea.blur()

                setTimeout(() => {
                    textarea.selectionStart =
                    textarea.selectionEnd =
                        selectionStart + TAB_LEN

                    pushHistory([newText, selectionStart, selectionEnd])

                    textarea.focus()
                })
            }
        }
    }, [text])

    const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const textarea = textareaRef.current
        if (!textarea) { return }

        const text = event.target.value
        const { selectionStart, selectionEnd } = textarea

        setText(event.target.value)

        pushHistory([text, selectionStart, selectionEnd])
    }

    return (
        <div ref={contentRef} className={s.Content}>
            <code
                ref={codeRef}
                className={cn(s.Code, disabled && s.CodeDisabled)}
                dangerouslySetInnerHTML={{ __html: html }}
            />

            <textarea
                ref={textareaRef}
                className={cn(s.Text, disabled && s.TextDisabled)}
                value={text}
                spellCheck={false}
                onChange={onChange}
                onBlur={() => setActiveLineIndex(-1)}
                onMouseDown={() => setTimeout(onSelect)}
                onSelect={onSelect}
                onKeyDown={onKeyDown}
                disabled={disabled}
            />
        </div>
    )
}
