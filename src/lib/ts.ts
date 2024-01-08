import {
    createSourceFile,
    ScriptTarget,
    ScriptKind,
    SyntaxKind,
    JSDocParsingMode,
    NodeFlags,
    ImportsNotUsedAsValues,
    JsxEmit,
    ModuleKind,
    ModuleResolutionKind,
    NewLineKind,
    transpile as tsTranspile,
} from 'typescript'
import type {
    Identifier,
    ImportSpecifier,
    PropertyAccessExpression,
    Node,
    CallExpression,
    VariableDeclaration,
    QualifiedName,
    MethodSignature,
    PropertySignature,
    CompilerOptions,
    SourceFile,
} from 'typescript'
import {
    escapeForHtmlOnlyNewline,
    escapeForHtml,
    HTML_RESERVED,
    BR,
} from './html'
import s from './ts.module.css'
import { escapeForRegexp } from './regexp'

const REPLACE = {
    ...HTML_RESERVED,
}

const PLAIN = [
    '.', ',', ';',
    '/>',
]

const KEYWORDS = [
    'infer', 'intrinsic', 'out', 'const', 'for', 'continue',
    'BigInt', 'Symbol', 'String', 'Object', 'Number', 'throw',
    'require', 'satisfies', 'unique', 'using', 'global', 'of',
    'override', 'interface', 'function', 'import', 'asserts',
    'type', 'constructor', 'class', 'new', 'if', 'in', 'let',
    'return', 'else', 'switch', 'case', 'default', 'extends',
    'module', 'while', 'await', 'yield', 'debugger', 'assert',
    'delete', 'namespace', 'readonly', 'enum', 'implements',
    'export', 'try', 'catch', 'finally', 'do', 'with', '=>',
    'static', 'abstract', 'protected', 'private', 'public',
    'async', 'from', 'break', 'declare', 'Set', 'Boolean',
    'accessor',
]

const OPERATORS = [
    '++', '...', '/', '|', '&', '!', ':', '=', '-',
    'get', 'is', 'as', 'keyof', 'typeof', 'instanceof',
]

const BRACKETS = [
    '{', '}',
    '[', ']',
    '(', ')',
    '<', '>',
]

const CONSTANTS = new Set([
    'undefined',
    'package',
    'NaN',
])

for (const word of PLAIN) {
    REPLACE[word] = escapeForHtml(word)
}

for (const word of KEYWORDS) {
    REPLACE[word] = span(escapeForHtml(word), s.Keyword)
}

for (const word of OPERATORS) {
    REPLACE[word] = span(escapeForHtml(word), s.Operator)
}

for (const word of BRACKETS) {
    REPLACE[word] = span(escapeForHtml(word), s.Bracket)
}

const COMMENTS_REGEXP_BASE = '//[^\\n]*|/\\*[\\s\\S]*?\\*/'

const COMMENTS_REGEXP = new RegExp(COMMENTS_REGEXP_BASE, 'g')

const REPLACE_REGEXP = new RegExp(COMMENTS_REGEXP_BASE
    + '|' + Object.keys(REPLACE).map(escapeForRegexp).join('|')
    + '|' + '\\S+'
, 'g')

interface TransformContext {
    text: string
    html: string
    pos: number
}

const compilerOptions: CompilerOptions = {
    allowJs: true,
    allowArbitraryExtensions: false,
    allowUmdGlobalAccess: false,
    allowUnreachableCode: false,
    allowUnusedLabels: false,
    alwaysStrict: true,
    charset: 'utf-8',
    checkJs: true,
    declaration: false,
    declarationMap: false,
    emitDeclarationOnly: false,
    disableSizeLimit: true,
    disableSourceOfProjectReferenceRedirect: true,
    disableSolutionSearching: true,
    disableReferencedProjectLoad: true,
    downlevelIteration: false,
    emitBOM: false,
    emitDecoratorMetadata: false,
    exactOptionalPropertyTypes: true,
    experimentalDecorators: true,
    forceConsistentCasingInFileNames: true,
    importsNotUsedAsValues: ImportsNotUsedAsValues.Error,
    inlineSourceMap: false,
    inlineSources: false,
    isolatedModules: true,
    jsx: JsxEmit.ReactJSX,
    keyofStringsOnly: false,
    module: ModuleKind.ESNext,
    moduleResolution: ModuleResolutionKind.Node16,
    newLine: NewLineKind.LineFeed,
    noEmit: false,
    noEmitHelpers: true,
    noEmitOnError: true,
    noErrorTruncation: true,
    noFallthroughCasesInSwitch: true,
    noImplicitAny: true,
    noImplicitReturns: true,
    noImplicitThis: true,
    noStrictGenericChecks: false,
    noUnusedLocals: true,
    noUnusedParameters: true,
    noImplicitUseStrict: true,
    noPropertyAccessFromIndexSignature: true,
    noUncheckedIndexedAccess: true,
    preserveConstEnums: true,
    noImplicitOverride: true,
    preserveValueImports: true,
    composite: false,
    incremental: false,
    removeComments: false,
    skipLibCheck: true,
    skipDefaultLibCheck: true,
    sourceMap: false,
    strict: true,
    strictFunctionTypes: true,
    strictBindCallApply: true,
    strictNullChecks: true,
    strictPropertyInitialization: true,
    stripInternal: true,
    suppressExcessPropertyErrors: false,
    suppressImplicitAnyIndexErrors: false,
    target: ScriptTarget.ES2020,
    traceResolution: false,
    useUnknownInCatchVariables: true,
    resolveJsonModule: false,
    useDefineForClassFields: true,
}

function toSourceFile(text: string, scriptKind: ScriptKind): SourceFile {
    return createSourceFile('index.tsx', text, {
        languageVersion: ScriptTarget.ES2020,
        jsDocParsingMode: JSDocParsingMode.ParseNone,
    }, true, scriptKind)
}

export function transpile(text: string): string {
    return tsTranspile(text, compilerOptions)
}

export function toHtml(text: string, scriptKind: ScriptKind): string {
    const sourceFile = toSourceFile(text, scriptKind)

    const ctx: TransformContext = {
        text,
        html: '',
        pos: 0,
    }

    for (const node of sourceFile.statements) {
        pushNode(ctx, node)
    }

    const { pos, end } = sourceFile.endOfFileToken
    pushSpan(ctx, pos, end)

    return ctx.html += BR
}

function pushNode(ctx: TransformContext, node: Node) {
    const { pos, end } = node

    if (pos < ctx.pos) { return }

    if (pos > ctx.pos) {
        pushPlain(ctx, ctx.pos, pos)
    }

    const subNodes: Node[] = []

    for (const key in node) {
        if (key === 'parent') { continue }

        const value = node[key as keyof Node]

        if (Array.isArray(value)) {
            for (const subNode of value) {
                subNodes.push(subNode)
            }
        } else if (value && typeof value === 'object') {
            subNodes.push(value)
        }
    }

    if (subNodes.length > 0) {
        subNodes.sort((a, b) => a.pos - b.pos)

        for (const subNode of subNodes) {
            pushNode(ctx, subNode)
        }

        return
    }

    // if (ctx.text.substring(pos, end).trim() === 'bepe') {
    //     console.log('🔸 node:', node, ctx.text.substring(pos, end))
    // }

    switch (node.kind) {
        case SyntaxKind.Identifier: {
            switch (node.parent?.kind) {
                case SyntaxKind.FunctionExpression: {
                    pushSpan(ctx, pos, end, s.Function)
                    break
                }
                case SyntaxKind.JsxOpeningElement:
                case SyntaxKind.JsxClosingElement:
                case SyntaxKind.JsxSelfClosingElement: {
                    pushSpan(ctx, pos, end, isComponent(node) ? s.Type : s.Property)
                    break
                }
                case SyntaxKind.ImportClause: {
                    pushSpan(ctx, pos, end, s.Property)
                    break
                }
                case SyntaxKind.JsxAttribute: {
                    pushSpan(ctx, pos, end, s.JSXAttribute)
                    break
                }
                case SyntaxKind.ModuleDeclaration:
                    pushSpan(ctx, pos, end, s.TypeName)
                    break
                case SyntaxKind.QualifiedName: {
                    const { left } = node.parent as QualifiedName
                    pushSpan(ctx, pos, end, left.pos === node.pos ? s.TypeName : s.Type)
                    break
                }
                case SyntaxKind.ClassDeclaration:
                case SyntaxKind.TypeReference:
                case SyntaxKind.ExpressionWithTypeArguments:
                case SyntaxKind.EnumDeclaration:
                case SyntaxKind.TypeAliasDeclaration:
                case SyntaxKind.InterfaceDeclaration: {
                    pushSpan(ctx, pos, end, s.Type)
                    break
                }
                case SyntaxKind.FunctionDeclaration: {
                    pushSpan(ctx, pos, end, s.Function)
                    break
                }
                case SyntaxKind.ShorthandPropertyAssignment: {
                    pushSpan(ctx, pos, end)
                    break
                }
                case SyntaxKind.Parameter:
                case SyntaxKind.PropertySignature: {
                    const { type } = node.parent as PropertySignature

                    if (type?.kind === SyntaxKind.FunctionType) {
                        pushSpan(ctx, pos, end, s.Function)
                    } else {
                        pushSpan(ctx, pos, end)
                    }

                    break
                }
                case SyntaxKind.MethodDeclaration:
                case SyntaxKind.MethodSignature: {
                    const { name } = node.parent as MethodSignature

                    if (name.pos === pos) {
                        pushSpan(ctx, pos, end, s.Function)
                    } else {
                        pushSpan(ctx, pos, end, isConst(node) ? s.Constant : undefined)
                    }

                    break
                }
                case SyntaxKind.NewExpression:
                case SyntaxKind.CallExpression: {
                    const { expression } = node.parent as CallExpression

                    if (expression.pos === pos) {
                        pushSpan(ctx, pos, end, s.Function)
                    } else {
                        pushSpan(ctx, pos, end, isConst(node) ? s.Constant : undefined)
                    }

                    break
                }
                case SyntaxKind.EnumMember:
                case SyntaxKind.PropertyAssignment: {
                    const { name } = node.parent as ImportSpecifier

                    if (name.pos === pos) {
                        pushSpan(ctx, pos, end, s.Property)
                    } else {
                        pushSpan(ctx, pos, end, isConst(node) ? s.Constant : undefined)
                    }

                    break
                }
                case SyntaxKind.ImportSpecifier: {
                    const { name } = node.parent as ImportSpecifier

                    if (name.pos === pos) {
                        pushSpan(ctx, pos, end, s.Property)
                    } else {
                        pushSpan(ctx, pos, end)
                    }

                    break
                }
                case SyntaxKind.PropertyAccessExpression: {
                    const { name } = node.parent as PropertyAccessExpression

                    if (node.parent.parent?.kind === SyntaxKind.ExpressionWithTypeArguments) {
                        pushSpan(ctx, pos, end, name.pos === node.pos ? s.Type : s.TypeName)
                    } else {
                        if (name.pos !== pos) {
                            pushSpan(ctx, pos, end, isConst(node) ? s.Constant : undefined)
                            break
                        }

                        if (node.parent.parent?.kind !== SyntaxKind.CallExpression) {
                            pushSpan(ctx, pos, end, isConst(node) ? s.Constant : s.Property)
                            break
                        }

                        const { expression } = node.parent.parent as CallExpression

                        if (expression.pos === node.parent.pos) {
                            pushSpan(ctx, pos, end, s.Function)
                        } else {
                            pushSpan(ctx, pos, end, isConst(node) ? s.Constant : s.Property)
                        }
                    }

                    break
                }
                case SyntaxKind.BindingElement: {
                    if (node.parent.parent?.parent?.parent?.kind === SyntaxKind.VariableDeclarationList
                        && (node.parent.parent?.parent?.parent?.flags & NodeFlags.Const) === NodeFlags.Const
                    ) {
                        pushSpan(ctx, pos, end, s.Constant)
                    } else {
                        pushSpan(ctx, pos, end)
                    }

                    break
                }
                case SyntaxKind.VariableDeclaration: {
                    const { name } = node.parent as VariableDeclaration

                    if (name.pos === node.pos
                        && node.parent.parent?.kind === SyntaxKind.VariableDeclarationList
                        && (node.parent.parent?.flags & NodeFlags.Const) === NodeFlags.Const
                    ) {
                        pushSpan(ctx, pos, end, s.Constant)
                    } else {
                        pushSpan(ctx, pos, end, isConst(node) ? s.Constant : undefined)
                    }

                    break
                }
                default: {
                    pushSpan(ctx, pos, end, isConst(node) ? s.Constant : undefined)
                    break
                }
            }
            break
        }
        case SyntaxKind.PrivateIdentifier: {
            pushSpan(ctx, pos, end, s.Property)
            break
        }
        case SyntaxKind.NumericLiteral: {
            pushSpan(ctx, pos, end, s.Number)
            break
        }
        case SyntaxKind.BigIntLiteral:
        case SyntaxKind.NullKeyword:
        case SyntaxKind.TrueKeyword:
        case SyntaxKind.FalseKeyword: {
            pushSpan(ctx, pos, end, s.Constant)
            break
        }
        case SyntaxKind.ObjectKeyword:
        case SyntaxKind.UndefinedKeyword:
        case SyntaxKind.VoidKeyword:
        case SyntaxKind.UnknownKeyword:
        case SyntaxKind.NumberKeyword:
        case SyntaxKind.StringKeyword:
        case SyntaxKind.BooleanKeyword:
        case SyntaxKind.BigIntKeyword:
        case SyntaxKind.NeverKeyword: {
            pushSpan(ctx, pos, end, s.BasicType)
            break
        }
        case SyntaxKind.TemplateHead:
        case SyntaxKind.TemplateMiddle:
        case SyntaxKind.TemplateTail:
        case SyntaxKind.NoSubstitutionTemplateLiteral:
        case SyntaxKind.StringLiteral: {
            pushSpan(ctx, pos, end, s.String)
            break
        }
        case SyntaxKind.ObjectLiteralExpression:
        case SyntaxKind.ArrayLiteralExpression: {
            pushSpan(ctx, pos, end, s.Bracket)
            break
        }
        case SyntaxKind.AsteriskAsteriskToken:
        case SyntaxKind.PlusToken:
        case SyntaxKind.PlusEqualsToken:
        case SyntaxKind.LessThanToken:
        case SyntaxKind.GreaterThanToken:
        case SyntaxKind.EqualsEqualsEqualsToken:
        case SyntaxKind.ExclamationEqualsEqualsToken:
        case SyntaxKind.AmpersandAmpersandToken:
        case SyntaxKind.MinusToken:
        case SyntaxKind.AmpersandToken:
        case SyntaxKind.BarBarToken:
        case SyntaxKind.QuestionToken:
        case SyntaxKind.ColonToken:
        case SyntaxKind.SlashToken:
        case SyntaxKind.AsteriskToken:
        case SyntaxKind.PlusPlusToken:
        case SyntaxKind.MinusMinusToken:
        case SyntaxKind.LessThanLessThanToken:
        case SyntaxKind.GreaterThanGreaterThanToken:
        case SyntaxKind.GreaterThanGreaterThanGreaterThanToken:
        case SyntaxKind.CaretToken:
        case SyntaxKind.AtToken:
        case SyntaxKind.QuestionQuestionToken:
        case SyntaxKind.AsteriskAsteriskEqualsToken:
        case SyntaxKind.SlashEqualsToken:
        case SyntaxKind.PercentEqualsToken:
        case SyntaxKind.LessThanLessThanEqualsToken:
        case SyntaxKind.GreaterThanGreaterThanEqualsToken:
        case SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken:
        case SyntaxKind.AmpersandEqualsToken:
        case SyntaxKind.AmpersandAmpersandEqualsToken:
        case SyntaxKind.QuestionQuestionEqualsToken:
        case SyntaxKind.CaretEqualsToken:
        case SyntaxKind.AsteriskEqualsToken:
        case SyntaxKind.GreaterThanEqualsToken:
        case SyntaxKind.LessThanEqualsToken:
        case SyntaxKind.MinusEqualsToken:
        case SyntaxKind.DotDotDotToken:
        case SyntaxKind.PercentToken:
        case SyntaxKind.BarToken:
        case SyntaxKind.BarBarEqualsToken:
        case SyntaxKind.BarEqualsToken:
        case SyntaxKind.EqualsToken: {
            pushSpan(ctx, pos, end, s.Operator)
            break
        }
        case SyntaxKind.SuperKeyword:
        case SyntaxKind.ThisType:
        case SyntaxKind.ThisKeyword: {
            pushSpan(ctx, pos, end, s.Property)
            break
        }
        case SyntaxKind.RegularExpressionLiteral: {
            pushSpan(ctx, pos, end, s.RegExp)
            break
        }
        case SyntaxKind.JsxAttributes:
        case SyntaxKind.JsxText:
        case SyntaxKind.QuestionDotToken: {
            pushSpan(ctx, pos, end)
            break
        }
        case SyntaxKind.EmptyStatement:
        case SyntaxKind.EqualsEqualsToken:
        case SyntaxKind.ExclamationEqualsToken:
        case SyntaxKind.AnyKeyword:
        case SyntaxKind.VarKeyword: {
            pushSpan(ctx, pos, end, s.Fatal)
            break
        }
        default: {
            pushPlain(ctx, pos, end)
            break
        }
    }
}

function isComponent(node: Node) {
    const { escapedText } = node as Identifier
    const firstLetter = escapedText?.[0]
    return firstLetter && firstLetter.toUpperCase() === firstLetter
}

function isConst(node: Node) {
    const { escapedText } = node as Identifier
    return escapedText && (CONSTANTS.has(escapedText) || escapedText.toUpperCase() === escapedText)
}

function pushPlain(ctx: TransformContext, pos: number, end: number) {
    if (pos < ctx.pos) { return }

    ctx.html += ctx.text.substring(pos, end)
        .replace(REPLACE_REGEXP, word =>
            REPLACE[word] || span(escapeForHtml(word),
                (word[0] === '/' && (word[1] === '/' || word[1] === '*'))
                    ? s.Comment
                    : undefined))

    ctx.pos = end
}

function pushSpan(ctx: TransformContext, pos: number, end: number, className?: string) {
    if (pos < ctx.pos) { return }

    if (pos > ctx.pos) {
        pushPlain(ctx, ctx.pos, pos)
    }

    const text = ctx.text.substring(pos, end)
    const comments = Array.from(text.matchAll(COMMENTS_REGEXP))

    if (!comments.length) {
        ctx.html += spanOrSpace(text, className)
        ctx.pos = end
        return
    }

    for (const comment of comments) {
        const body = comment[0]
        const cPos = pos + comment.index!
        const cEnd = cPos + body.length

        if (ctx.pos < cPos) {
            const chunk = ctx.text.substring(ctx.pos, cPos)

            if (chunk.trim().length > 0) {
                ctx.html += span(escapeForHtml(ctx.text.substring(ctx.pos, end)), className)
                ctx.pos = end
                return
            } else {
                ctx.html += escapeForHtmlOnlyNewline(chunk)
                ctx.pos = cPos
            }
        }

        ctx.html += span(escapeForHtml(body), s.Comment)
        ctx.pos = cEnd
    }

    if (ctx.pos < end) {
        const chunk = ctx.text.substring(ctx.pos, end)
        ctx.html += spanOrSpace(chunk, className)
        ctx.pos = end
    }
}

function spanOrSpace(text: string, className?: string) {
    return text.trim().length === 0
        ? escapeForHtmlOnlyNewline(text)
        : span(escapeForHtml(text), className)
}

function span(text: string, className?: string): string {
    return className
        ? `<span class="${className}">${text}</span>`
        : text
}
