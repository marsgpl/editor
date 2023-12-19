import React from 'react'
import { LINE_HEIGHT } from '../Lines'
import { textToHtml } from '../../lib/ts'
import s from './index.module.css'

export interface ContentProps {
    text: string
    setText: (text: string) => void
    setLinesN: React.Dispatch<React.SetStateAction<number>>
    setActiveLineIndex: React.Dispatch<React.SetStateAction<number>>
}

export function Content({
    text,
    setText,
    setLinesN,
    setActiveLineIndex,
}: ContentProps) {
    const codeRef = React.useRef<HTMLElement>(null)
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)

    const [width, setWidth] = React.useState<string | number>('100%')
    const [height, setHeight] = React.useState<string | number>('100%')

    const html = React.useMemo(() => textToHtml(text), [text])

    React.useEffect(() => {
        const code = codeRef.current
        if (!code) { return }

        const { width, height } = code.getBoundingClientRect()

        setWidth(width)
        setHeight(height)
        setLinesN(height / LINE_HEIGHT)

        const observer = new ResizeObserver((entries) => {
            const { width, height } = entries[0]?.contentRect

            setWidth(width)
            setHeight(height)
            setLinesN(height / LINE_HEIGHT)
        })

        observer.observe(code)

        return () => {
            observer.unobserve(code)
        }
    }, [codeRef])

    const focusEnd = () => {
        const textarea = textareaRef.current
        if (!textarea) { return }

        setTimeout(() => {
            textarea.focus()
            textarea.setSelectionRange(-1, -1)
        }, 0)
    }

    const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(event.target.value)
    }

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Tab') {
            event.preventDefault()
        }
    }

    const onMouseDown = (event: React.MouseEvent) => {
        const textarea = textareaRef.current
        if (!textarea) { return }

        event.stopPropagation()

        setTimeout(() => {
            const pos = textarea.selectionEnd
            const lineIndex = Array.from(text.substring(0, pos).matchAll(/\n/gm)).length
            setActiveLineIndex(lineIndex)
        }, 0)
    }

    const onSelect = () => {
        const textarea = textareaRef.current
        if (!textarea) { return }

        const pos = textarea.selectionEnd
        const lineIndex = Array.from(text.substring(0, pos).matchAll(/\n/gm)).length
console.log('🔸 pos:', pos)
        setActiveLineIndex(lineIndex)
    }

    return (
        <div className={s.Content} onMouseDown={focusEnd}>
            <code
                ref={codeRef}
                className={s.Code}
                dangerouslySetInnerHTML={{ __html: html }}
            />

            <textarea
                ref={textareaRef}
                className={s.Text}
                value={text}
                spellCheck={false}
                style={{
                    width,
                    height,
                }}
                onChange={onChange}
                onKeyDown={onKeyDown}
                onMouseDown={onMouseDown}
                onSelect={onSelect}
            />
        </div>
    )
}
