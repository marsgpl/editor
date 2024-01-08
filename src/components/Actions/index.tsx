import React from 'react'
import { Button } from '../Button'
import { ListDropdown } from '../ListDropdown'
import { ScriptKind } from 'typescript'
import s from './index.module.css'

export interface ActionsProps {
    run: () => void
    stop: () => void
    isRunning: boolean
    scriptKind: ScriptKind
    setScriptKind: React.Dispatch<React.SetStateAction<ScriptKind>>
}

export function Actions({
    run,
    stop,
    isRunning,
    scriptKind,
    setScriptKind,
}: ActionsProps) {
    return (
        <div className={s.Actions}>
            {isRunning ? (
                <Button
                    text="Stop"
                    onClick={stop}
                    red={isRunning}
                />
            ) : (
                <Button
                    text="Run"
                    onClick={run}
                />
            )}

            <span />

            <ListDropdown<ScriptKind>
                waiting={isRunning}
                disabled={isRunning}
                options={[
                    {
                        text: 'TS',
                        value: ScriptKind.TS,
                    },
                    {
                        text: 'TSX',
                        value: ScriptKind.TSX,
                    },
                    {
                        text: 'JS',
                        value: ScriptKind.JS,
                    },
                    {
                        text: 'JSX',
                        value: ScriptKind.JSX,
                    },
                ]}
                value={scriptKind}
                onChange={value => setScriptKind(Number(value))}
            />
        </div>
    )
}
