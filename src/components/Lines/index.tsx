import React from 'react'
import s from './index.module.css'

export const LINE_HEIGHT = 23

export interface LinesProps {
    linesN: number
    activeLineIndex: number
}

export function Lines({
    linesN,
    activeLineIndex,
}: LinesProps) {
    return (
        <div className={s.Lines}>
            {Array.from(Array(Math.round(linesN) || 1), (_, index) => (
                <div
                    key={index}
                    className={index === activeLineIndex ? s.Active : undefined}
                >{Math.min(9999, index + 1)}</div>
            ))}
        </div>
    )
}
