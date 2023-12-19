import React from 'react'
import { Lines } from '../Lines'
import { Content } from '../Content'
import s from './index.module.css'

const INITIAL_TEXT = ``

export function Editor() {
    const [text, setText] = React.useState(INITIAL_TEXT)
    const [linesN, setLinesN] = React.useState(1)
    const [activeLineIndex, setActiveLineIndex] = React.useState(-1)

    return (
        <div className={s.Editor}>
            <Lines
                linesN={linesN}
                activeLineIndex={activeLineIndex}
            />
            <Content
                text={text}
                setText={setText}
                setLinesN={setLinesN}
                setActiveLineIndex={setActiveLineIndex}
            />
        </div>
    )
}
