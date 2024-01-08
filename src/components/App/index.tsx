import React from 'react'
import { Editor } from '../Editor'
import { Log } from '../Log'
import { Actions } from '../Actions'
import { throttle } from '../../lib/throttle'
import { ScriptKind } from 'typescript'
import { transpile } from '../../lib/ts'
import { stringify } from '../../lib/stringify'
import s from './index.module.css'

const LEFT_MIN_WIDTH = 200
const RIGHT_MIN_WIDTH = 10

export function App() {
    const [scriptKind, setScriptKind] = React.useState(ScriptKind.TS)
    const [isRunning, setIsRunning] = React.useState(false)
    const [runResult, setRunResult] = React.useState('')
    const [tsCode, setTsCode] = React.useState('')

    const cancelToken = React.useRef(0)

    const bkp = React.useRef<{
        consoleLog: typeof console.log
        setTimeout: typeof setTimeout
        setInterval: typeof setInterval
        clearTimeout: typeof clearTimeout
        clearInterval: typeof clearInterval
        promise: typeof Promise
        fetch: typeof fetch
    }>({} as any)

    const abortControllers = React.useRef<AbortController[]>([])

    const recover = () => {
        abortControllers.current.forEach(controller => controller.abort())
        abortControllers.current = []

        console.log = bkp.current.consoleLog
        window.setTimeout = bkp.current.setTimeout
        window.setInterval = bkp.current.setInterval
        window.clearTimeout = bkp.current.clearTimeout
        window.clearInterval = bkp.current.clearInterval
        window.Promise = bkp.current.promise
        window.fetch = bkp.current.fetch
    }

    const run = async () => {
        let cancelTokenValue = cancelToken.current
        let output: string = ''

        bkp.current = {
            consoleLog: console.log,
            setTimeout,
            setInterval,
            clearTimeout,
            clearInterval,
            promise: Promise,
            fetch,
        }

        const n = {
            timeout: 0,
            interval: 0,
            promise: 0,
            fetch: 0,
        }

        let mainThreadFinished = false

        let onReadyResolve: (value: unknown) => void
        // let onReadyReject: (reason?: unknown) => void

        const onReady = new Promise((resolve, reject) => {
            onReadyResolve = resolve
            // onReadyReject = reject
        })

        const checkOnReady = () => {
            if (n.timeout > 0) { return }
            if (n.interval > 0) { return }
            if (n.promise > 0) { return }
            if (n.fetch > 0) { return }

            if (!mainThreadFinished) { return }

            onReadyResolve(true)
        }

        const stopped = () => {
            if (cancelToken.current !== cancelTokenValue) {
                onReadyResolve(false)
                return true
            } else {
                return false
            }
        }

        const checkOnReadyDelay = () => {
            if (stopped()) { return }
            bkp.current.setTimeout.call(window, checkOnReady, 1)
        }

        console.log = (...args: unknown[]) => {
            if (stopped()) { return }
            output += args.map(stringify).join(' ') + '\n'
            setRunResult(output)
        }

        window.setTimeout = function(
            handler: TimerHandler,
            ms?: number,
            ...args: unknown[]
        ) {
            if (stopped()) { return -1 }

            const callback = typeof handler === 'string'
                ? Object.getPrototypeOf(Function).constructor(handler)
                : handler

            const fd = bkp.current.setTimeout.call(window, () => {
                if (stopped()) { return }

                callback(...args)
                n.timeout--
                checkOnReadyDelay()
            }, ms)

            n.timeout++

            return fd
        }

        window.clearTimeout = function(fd?: number) {
            bkp.current.clearTimeout.call(window, fd)

            if (stopped()) { return }

            if (fd) {
                n.timeout--
                checkOnReadyDelay()
            }
        }

        window.setInterval = function(
            handler: TimerHandler,
            ms?: number,
            ...args: unknown[]
        ) {
            if (stopped()) { return -1 }

            const callback = typeof handler === 'string'
                ? Object.getPrototypeOf(Function).constructor(handler)
                : handler

            const fd = bkp.current.setInterval.call(window, () => {
                if (stopped()) {
                    bkp.current.clearInterval(fd)
                    return
                }

                callback(...args)
            }, ms, ...args)

            n.interval++

            return fd
        }

        window.clearInterval = function(fd?: number) {
            bkp.current.clearInterval.call(window, fd)

            if (stopped()) { return }

            if (fd) {
                n.interval--
                checkOnReadyDelay()
            }
        }

        window.Promise = function<T>(
            executor: (
                resolve: (value: T | PromiseLike<T>,
                reject: (reason?: any) => void) => void
            ) => void,
        ): Promise<T> {
            if (stopped()) {
                return Promise.reject(Error('Stopped'))
            }

            n.promise++

            const promise = new bkp.current.promise(executor)
                .then(data => {
                    if (stopped()) { return data }

                    n.promise--

                    checkOnReadyDelay()

                    return data
                })
                .catch(error => {
                    if (stopped()) { return error }

                    n.promise--

                    checkOnReadyDelay()

                    return error
                })

            return promise
        } as unknown as PromiseConstructor

        window.Promise.all = bkp.current.promise.all
        window.Promise.race = bkp.current.promise.race
        window.Promise.reject = bkp.current.promise.reject
        window.Promise.resolve = bkp.current.promise.resolve

        window.fetch = function(
            input: RequestInfo | URL,
            init?: RequestInit,
        ): Promise<Response> {
            if (stopped()) {
                return Promise.reject(Error('Stopped'))
            }

            const controller = new AbortController()

            n.fetch++

            init = init || {}
            init.signal = controller.signal

            const req = bkp.current.fetch.call(window, input, init)
                .then(data => {
                    if (stopped()) { return data }

                    n.fetch--
                    checkOnReadyDelay()
                    return data
                })
                .catch(error => {
                    if (stopped()) { return error }

                    n.fetch--
                    checkOnReadyDelay()
                    return error
                })

            abortControllers.current.push(controller)

            return req
        }

        try {
            setIsRunning(true)
            setRunResult('Transpiling ...')
            const jsCode = transpile(`return (async () => { ${tsCode} })()`)
            setRunResult('Compiling ...')
            const func = Object.getPrototypeOf(Function).constructor(jsCode)
            setRunResult('Executing ...')
            await func()
            if (stopped()) { return }
            mainThreadFinished = true
            checkOnReady()
            await new bkp.current.promise(resolve =>
                bkp.current.setTimeout.call(window, () =>
                    onReady.then(resolve)))
            console.log('Finished')
            setIsRunning(false)
            recover()
        } catch (error) {
            if (stopped()) { return }
            console.warn(error)
            console.log('Error: ' + (error as Error).message)
            setIsRunning(false)
            recover()
        }
    }

    const stop = () => {
        cancelToken.current++
        setIsRunning(false)
        setRunResult(runResult + '\nStopped')
        recover()
    }

    const leftColRef = React.useRef<HTMLDivElement>(null)
    const rightColRef = React.useRef<HTMLDivElement>(null)

    const [windowWidth, setWindowWidth] = React.useState(window.innerWidth)
    const [rightWidth, setRightWidth] = React.useState(window.innerWidth * .3)

    const setWindowWidthThrottled = React.useCallback(throttle<[number]>(setWindowWidth, 100), [])

    React.useEffect(() => {
        const leftCol = leftColRef.current
        const rightCol = rightColRef.current

        if (!leftCol) { return }
        if (!rightCol) { return }

        leftCol.style.width = (windowWidth - rightWidth) + 'px'
        rightCol.style.width = rightWidth + 'px'
    }, [])

    React.useEffect(() => {
        const leftCol = leftColRef.current
        const rightCol = rightColRef.current

        if (!leftCol) { return }
        if (!rightCol) { return }

        const onWindowResize = () => {
            const { innerWidth } = window

            leftCol.style.width = Math.max(LEFT_MIN_WIDTH, innerWidth - rightWidth) + 'px'

            setWindowWidthThrottled(innerWidth)
        }

        window.addEventListener('resize', onWindowResize)

        return () => {
            window.removeEventListener('resize', onWindowResize)
        }
    }, [rightWidth])

    const startResizing = React.useCallback((event: React.MouseEvent) => {
        const leftCol = leftColRef.current
        const rightCol = rightColRef.current

        if (!leftCol) { return }
        if (!rightCol) { return }

        let newRightWidth = rightWidth

        const startX = event.pageX

        const onMove = (event: MouseEvent) => {
            newRightWidth =
                Math.min(windowWidth - LEFT_MIN_WIDTH,
                    Math.max(RIGHT_MIN_WIDTH,
                        rightWidth + startX - event.pageX))

            leftCol.style.width = (windowWidth - newRightWidth) + 'px'
            rightCol.style.width = newRightWidth + 'px'
        }

        const onFinish = () => {
            window.removeEventListener('mousemove', onMove)
            window.removeEventListener('mouseup', onFinish)
            window.removeEventListener('mouseleave', onFinish)

            setRightWidth(newRightWidth)
        }

        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onFinish)
        window.addEventListener('mouseleave', onFinish)
    }, [
        windowWidth,
        rightWidth,
    ])

    return (
        <div className={s.Cols}>
            <div className={s.Left} ref={leftColRef}>
                <Editor
                    scriptKind={scriptKind}
                    setCode={setTsCode}
                    disabled={isRunning}
                />
            </div>
            <div className={s.Right} ref={rightColRef}>
                <div className={s.Resizer} onMouseDown={startResizing} />

                <Actions
                    run={run}
                    stop={stop}
                    isRunning={isRunning}
                    scriptKind={scriptKind}
                    setScriptKind={setScriptKind}
                />

                <Log text={runResult} />
            </div>
        </div>
    )
}
