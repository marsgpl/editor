import React from 'react'
import { ScriptKind } from 'typescript'
import { Lines } from '../Lines'
import { Content } from '../Content'
import s from './index.module.css'

export const LINE_HEIGHT = 23
export const TAB_LEN = 4

const INITIAL_TEXT = ``

export interface EditorProps {
    scriptKind: ScriptKind
    setCode: (code: string) => void
    disabled?: boolean
}

export function Editor({
    scriptKind,
    setCode,
    disabled,
}: EditorProps) {
    const [text, setText] = React.useState(INITIAL_TEXT)
    const [linesN, setLinesN] = React.useState(0)
    const [activeLineIndex, setActiveLineIndex] = React.useState(-1)

    React.useEffect(() => {
        setCode(text)
        setLinesN(text.split('\n').length)
    }, [text])

    return (
        <div className={s.Editor}>
            <Lines
                linesN={linesN}
                activeLineIndex={activeLineIndex}
            />
            <Content
                text={text}
                setText={setText}
                setActiveLineIndex={setActiveLineIndex}
                scriptKind={scriptKind}
                disabled={disabled}
            />
        </div>
    )
}
