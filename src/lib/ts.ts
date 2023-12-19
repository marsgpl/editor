import {
    ScriptTarget,
    ScriptKind,
    createSourceFile,
    SyntaxKind,
} from 'typescript'
import { span } from './html'
import { escapeForRegExp } from './regexp'
import type {
    Node,
    DiagnosticRelatedInformation,
    SourceFile,
} from 'typescript'
import type { KV } from './types'
import s from './ts.module.css'

type AlteredNode = Node & {
    parentNode?: AlteredNode
    parentProp?: string
    type?: AlteredNode
    initializer?: AlteredNode
    escapedText?: string
KIND_LABEL?: string
}

type SourceFileWithDiagnostics = SourceFile & {
    parseDiagnostics?: DiagnosticRelatedInformation[]
}

interface FormatContext {
    text: string
    html: string
    pos: number
    diagnostics: DiagnosticRelatedInformation[]
}

const KEYWORDS: string[] = [
    'import',
    'type',
    'from',
    'export',
    'constructor',
    'const',
    'let',
    'var',
    'class',
    'extends',
    'implements',
    'for',
    'while',
    'do',
    'break',
    'continue',
    'if',
    'else',
    'return',
    'interface',
    'function',
    'undefined',
    'new',
    '=>',
    'of',
    'in',
    'module',
    'switch',
    'case',
]

const BRACKETS: string[] = [
    '(', ')',
    '[', ']',
    '{', '}',
    '<', '>',
]

const OPERATORS: string[] = [
    '*',
    ':',
    '=',
    '!',
    '-',
    '&',
    '...',
    'keyof',
    'is',
]

const LEXEMS: KV = {
    ...KEYWORDS.reduce<KV>((rec, value) => {
        rec[value] = span(value, s.Keyword)
        return rec
    }, {}),
    ...BRACKETS.reduce<KV>((rec, value) => {
        rec[value] = span(value, s.Bracket)
        return rec
    }, {}),
    ...OPERATORS.reduce<KV>((rec, value) => {
        rec[value] = span(value, s.Operator)
        return rec
    }, {}),
}

const LEXEMS_REGEXP = new RegExp(
    Object.keys(LEXEMS)
        .map(escapeForRegExp)
        .join('|'),
    'gm')

const COMMENTS_REGEXP = /\/\/.*?\n|\/\*[\s\S]*?\*\//gm

export function textToHtml(text: string): string {
    const {
        endOfFileToken: leftoverNode,
        statements: nodes,
        parseDiagnostics: diagnostics = [],
    } = createSourceFile(
        'index.tsx',
        text,
        ScriptTarget.Latest,
        false,
        ScriptKind.TSX,
    ) as SourceFileWithDiagnostics

    const ctx: FormatContext = {
        text,
        html: '',
        pos: 0,
        diagnostics,
    }

    for (const node of nodes) {
        formatNode(ctx, node)
    }

    formatNode(ctx, leftoverNode)

    return ctx.html += '<br />'
}

function formatNode(ctx: FormatContext, node: AlteredNode) {
    const subNodes: AlteredNode[] = []

    for (const key in node) {
        const value = node[key as keyof AlteredNode]

        if (key === 'parent') { continue }
        if (key === 'parentNode') { continue }

        if (Array.isArray(value)) {
            for (const subValue of value) {
                subValue.parentNode = node
                subValue.parentProp = key
                subValue.KIND_LABEL = KIND_LABELS.get(subValue.kind)
                subNodes.push(subValue)
            }
        } else if (isChildNode(value)) {
            value.parentNode = node
            value.parentProp = key
            value.KIND_LABEL = KIND_LABELS.get(value.kind)
            subNodes.push(value)
        }
    }

    if (subNodes.length) {
        subNodes.sort((a, b) => a.pos - b.pos)

        for (const subNode of subNodes) {
            formatNode(ctx, subNode)
        }
    } else {
        switch (node.kind) {
            case SyntaxKind.Identifier:
if (
    ctx.text.substring(node.pos, node.end).includes('node.parentNode.parentNode?.kind === SyntaxKind.ArrayBindingPattern')
    // || ctx.text.substring(node.pos, node.end).includes('div')
) {
    console.log('🔸 node:', node)
}
                switch (node.parentNode?.kind) {
                    case SyntaxKind.PropertyAssignment:
                        if (node.parentProp === 'name') {
                            pushSpan(ctx, node, s.Identifier)
                        } else {
                            pushSpan(ctx, node, isConstant(node) ? s.Constant : undefined)
                        }
                        break
                    case SyntaxKind.NewExpression:
                        if (node.parentProp === 'expression') {
                            pushSpan(ctx, node, s.Function)
                        } else {
                            pushSpan(ctx, node, isConstant(node) ? s.Constant : undefined)
                        }
                        break
                    case SyntaxKind.BindingElement:
                        if (node.parentProp === 'name') {
                            if (
                                node.parentNode.parentNode?.parentNode?.kind === SyntaxKind.VariableDeclaration &&
                                node.parentNode.parentNode.parentNode.parentNode?.flags === 2
                            ) {
                                pushSpan(ctx, node, s.Constant)
                            } else {
                                pushSpan(ctx, node, isConstant(node) ? s.Constant : undefined)
                            }
                        } else {
                            pushSpan(ctx, node, s.Identifier)
                        }
                        break
                    case SyntaxKind.PropertyAccessExpression:
                        if (node.parentProp === 'name') {
                            if (
                                node.parentNode.parentNode?.kind === SyntaxKind.CallExpression &&
                                node.parentNode.parentProp === 'expression'
                            ) {
                                pushSpan(ctx, node, s.Function)
                            } else {
                                pushSpan(ctx, node, isConstant(node) ? s.Constant : s.Identifier)
                            }
                        } else {
                            pushSpan(ctx, node, isConstant(node) ? s.Constant : undefined)
                        }
                        break
                    case SyntaxKind.VariableDeclaration:
                        if (node.parentNode.initializer?.kind === SyntaxKind.ArrowFunction) {
                            pushSpan(ctx, node, s.Function)
                        } else if (node.parentNode.parentNode?.flags === 2) {
                            pushSpan(ctx, node, s.Constant)
                        } else {
                            pushSpan(ctx, node, isConstant(node) ? s.Constant : undefined)
                        }
                        break
                    case SyntaxKind.FirstNode:
                        if (node.parentProp === 'left') {
                            pushSpan(ctx, node, s.TypeStart)
                        } else {
                            pushSpan(ctx, node, s.Type)
                        }
                        break
                    case SyntaxKind.CallExpression:
                        if (node.parentProp === 'expression') {
                            pushSpan(ctx, node, s.Function)
                        } else {
                            pushSpan(ctx, node, isConstant(node) ? s.Constant : undefined)
                        }
                        break
                    case SyntaxKind.FunctionDeclaration:
                        pushSpan(ctx, node, s.Function)
                        break
                    case SyntaxKind.PropertySignature:
                        if (node.parentNode.type?.kind === SyntaxKind.FunctionType) {
                            pushSpan(ctx, node, s.Function)
                        } else {
                            pushSpan(ctx, node)
                        }
                        break
                    case SyntaxKind.InterfaceDeclaration:
                    case SyntaxKind.TypeReference:
                    case SyntaxKind.TypeAliasDeclaration:
                        pushSpan(ctx, node, s.Type)
                        break
                    case SyntaxKind.ImportClause:
                    case SyntaxKind.NamespaceImport:
                    case SyntaxKind.JsxOpeningElement:
                    case SyntaxKind.JsxClosingElement:
                    case SyntaxKind.JsxSelfClosingElement:
                        pushSpan(ctx, node, s.Identifier)
                        break
                    case SyntaxKind.ImportSpecifier:
                        if (node.parentProp === 'propertyName') {
                            pushSpan(ctx, node, isConstant(node) ? s.Constant : undefined)
                        } else {
                            pushSpan(ctx, node, s.Identifier)
                        }
                        break
                    case SyntaxKind.JsxAttribute:
                        pushSpan(ctx, node, s.Constant)
                        break
                    default:
                        pushSpan(ctx, node, isConstant(node) ? s.Constant : undefined)
                        break
                }
                break
            case SyntaxKind.StringLiteral:
            case SyntaxKind.TemplateHead:
            case SyntaxKind.TemplateMiddle:
            case SyntaxKind.LastTemplateToken:
                pushSpan(ctx, node, s.String)
                break
            case SyntaxKind.NullKeyword:
            case SyntaxKind.FalseKeyword:
            case SyntaxKind.TrueKeyword:
            case SyntaxKind.UndefinedKeyword:
            case SyntaxKind.NumericLiteral:
            case SyntaxKind.FirstLiteralToken:
                pushSpan(ctx, node, s.Constant)
                break
            case SyntaxKind.ExportKeyword:
            case SyntaxKind.ReturnStatement:
            case SyntaxKind.ContinueStatement:
            case SyntaxKind.DeclareKeyword:
            case SyntaxKind.ObjectLiteralExpression:
            case SyntaxKind.ArrayLiteralExpression:
            case SyntaxKind.BreakStatement:
                pushSpan(ctx, node, s.Keyword)
                break
            case SyntaxKind.StringKeyword:
            case SyntaxKind.NumberKeyword:
            case SyntaxKind.VoidKeyword:
            case SyntaxKind.UnknownKeyword:
            case SyntaxKind.NeverKeyword:
            case SyntaxKind.BooleanKeyword:
                pushSpan(ctx, node, s.BasicType)
                break
            case SyntaxKind.RegularExpressionLiteral:
                pushSpan(ctx, node, s.RegExp)
                break
            case SyntaxKind.SlashToken:
            case SyntaxKind.EqualsEqualsEqualsToken:
            case SyntaxKind.EqualsGreaterThanToken:
            case SyntaxKind.GreaterThanToken:
            case SyntaxKind.BarBarToken:
            case SyntaxKind.DotDotDotToken:
            case SyntaxKind.QuestionToken:
            case SyntaxKind.ColonToken:
            case SyntaxKind.PlusToken:
            case SyntaxKind.FirstBinaryOperator:
            case SyntaxKind.FirstCompoundAssignment:
            case SyntaxKind.MinusToken:
            case SyntaxKind.FirstAssignment:
            case SyntaxKind.AmpersandAmpersandToken:
            case SyntaxKind.ExclamationEqualsEqualsToken:
            case SyntaxKind.LessThanEqualsToken:
            case SyntaxKind.GreaterThanEqualsToken:
            case SyntaxKind.GreaterThanGreaterThanToken:
            case SyntaxKind.LessThanLessThanToken:
                pushSpan(ctx, node, s.Operator)
                break
            case SyntaxKind.Block:
            case SyntaxKind.QuestionDotToken:
                pushUnknown(ctx, node.end)
                break
            case SyntaxKind.JsxOpeningFragment:
            case SyntaxKind.JsxClosingFragment:
            case SyntaxKind.JsxText:
            case SyntaxKind.JsxAttributes:
                pushSpan(ctx, node)
                break
            case SyntaxKind.EndOfFileToken:
                pushSpan(ctx, node, s.Forbidden)
                break
            default:
console.log('🔸', node.kind, node.KIND_LABEL, ctx.text.substring(node.pos, node.end))
                pushSpan(ctx, node, s.Forbidden)
                break
        }
    }
}

function isChildNode(value: unknown): value is AlteredNode {
    return value !== null && typeof value === 'object'
}

function pushSpan(ctx: FormatContext, node: AlteredNode, className?: string) {
    const { pos, end } = node

    if (pos < ctx.pos) { return }

    pushUnknown(ctx, pos)

    ctx.html += span(ctx.text.substring(pos, end), className)
    ctx.pos = end
}

function pushUnknown(ctx: FormatContext, pos: number) {
    if (pos <= ctx.pos) { return }

    ctx.html += formatUnknown(ctx.text.substring(ctx.pos, pos))
    ctx.pos = pos
}

function formatUnknown(text: string): string {
    if (!text) { return '' }

    let html = ''
    let pos = 0

    const matches = [
        ...text.matchAll(LEXEMS_REGEXP),
        ...text.matchAll(COMMENTS_REGEXP),
    ].sort((a, b) => {
        if (a.index === b.index) {
            return b[0].length - a[0].length
        } else {
            return (a.index || 0) - (b.index || 0)
        }
    })

    for (const match of matches) {
        const token = match[0]
        const tokenPos = match.index

        if (tokenPos === undefined) { continue }
        if (tokenPos < pos) { continue }

        if (pos < tokenPos) {
            html += span(text.substring(pos, tokenPos))
        }

        html += LEXEMS[token] || span(token, s.Comment)

        pos = tokenPos + token.length
    }

    if (text.length > pos) {
        html += span(text.substring(pos, text.length))
    }

    return html
}

function isConstant(node: AlteredNode): boolean {
    const { escapedText: text } = node
    return text && (
        text.toUpperCase() === text ||
        text === 'undefined'
    ) || false
}

const KIND_LABELS = new Map<SyntaxKind, string>([
    [SyntaxKind.Unknown, 'Unknown'],
    [SyntaxKind.EndOfFileToken, 'EndOfFileToken'],
    [SyntaxKind.SingleLineCommentTrivia, 'SingleLineCommentTrivia'],
    [SyntaxKind.MultiLineCommentTrivia, 'MultiLineCommentTrivia'],
    [SyntaxKind.NewLineTrivia, 'NewLineTrivia'],
    [SyntaxKind.WhitespaceTrivia, 'WhitespaceTrivia'],
    [SyntaxKind.ShebangTrivia, 'ShebangTrivia'],
    [SyntaxKind.ConflictMarkerTrivia, 'ConflictMarkerTrivia'],
    [SyntaxKind.NonTextFileMarkerTrivia, 'NonTextFileMarkerTrivia'],
    [SyntaxKind.NumericLiteral, 'NumericLiteral'],
    [SyntaxKind.BigIntLiteral, 'BigIntLiteral'],
    [SyntaxKind.StringLiteral, 'StringLiteral'],
    [SyntaxKind.JsxText, 'JsxText'],
    [SyntaxKind.JsxTextAllWhiteSpaces, 'JsxTextAllWhiteSpaces'],
    [SyntaxKind.RegularExpressionLiteral, 'RegularExpressionLiteral'],
    [SyntaxKind.NoSubstitutionTemplateLiteral, 'NoSubstitutionTemplateLiteral'],
    [SyntaxKind.TemplateHead, 'TemplateHead'],
    [SyntaxKind.TemplateMiddle, 'TemplateMiddle'],
    [SyntaxKind.TemplateTail, 'TemplateTail'],
    [SyntaxKind.OpenBraceToken, 'OpenBraceToken'],
    [SyntaxKind.CloseBraceToken, 'CloseBraceToken'],
    [SyntaxKind.OpenParenToken, 'OpenParenToken'],
    [SyntaxKind.CloseParenToken, 'CloseParenToken'],
    [SyntaxKind.OpenBracketToken, 'OpenBracketToken'],
    [SyntaxKind.CloseBracketToken, 'CloseBracketToken'],
    [SyntaxKind.DotToken, 'DotToken'],
    [SyntaxKind.DotDotDotToken, 'DotDotDotToken'],
    [SyntaxKind.SemicolonToken, 'SemicolonToken'],
    [SyntaxKind.CommaToken, 'CommaToken'],
    [SyntaxKind.QuestionDotToken, 'QuestionDotToken'],
    [SyntaxKind.LessThanToken, 'LessThanToken'],
    [SyntaxKind.LessThanSlashToken, 'LessThanSlashToken'],
    [SyntaxKind.GreaterThanToken, 'GreaterThanToken'],
    [SyntaxKind.LessThanEqualsToken, 'LessThanEqualsToken'],
    [SyntaxKind.GreaterThanEqualsToken, 'GreaterThanEqualsToken'],
    [SyntaxKind.EqualsEqualsToken, 'EqualsEqualsToken'],
    [SyntaxKind.ExclamationEqualsToken, 'ExclamationEqualsToken'],
    [SyntaxKind.EqualsEqualsEqualsToken, 'EqualsEqualsEqualsToken'],
    [SyntaxKind.ExclamationEqualsEqualsToken, 'ExclamationEqualsEqualsToken'],
    [SyntaxKind.EqualsGreaterThanToken, 'EqualsGreaterThanToken'],
    [SyntaxKind.PlusToken, 'PlusToken'],
    [SyntaxKind.MinusToken, 'MinusToken'],
    [SyntaxKind.AsteriskToken, 'AsteriskToken'],
    [SyntaxKind.AsteriskAsteriskToken, 'AsteriskAsteriskToken'],
    [SyntaxKind.SlashToken, 'SlashToken'],
    [SyntaxKind.PercentToken, 'PercentToken'],
    [SyntaxKind.PlusPlusToken, 'PlusPlusToken'],
    [SyntaxKind.MinusMinusToken, 'MinusMinusToken'],
    [SyntaxKind.LessThanLessThanToken, 'LessThanLessThanToken'],
    [SyntaxKind.GreaterThanGreaterThanToken, 'GreaterThanGreaterThanToken'],
    [SyntaxKind.GreaterThanGreaterThanGreaterThanToken, 'GreaterThanGreaterThanGreaterThanToken'],
    [SyntaxKind.AmpersandToken, 'AmpersandToken'],
    [SyntaxKind.BarToken, 'BarToken'],
    [SyntaxKind.CaretToken, 'CaretToken'],
    [SyntaxKind.ExclamationToken, 'ExclamationToken'],
    [SyntaxKind.TildeToken, 'TildeToken'],
    [SyntaxKind.AmpersandAmpersandToken, 'AmpersandAmpersandToken'],
    [SyntaxKind.BarBarToken, 'BarBarToken'],
    [SyntaxKind.QuestionToken, 'QuestionToken'],
    [SyntaxKind.ColonToken, 'ColonToken'],
    [SyntaxKind.AtToken, 'AtToken'],
    [SyntaxKind.QuestionQuestionToken, 'QuestionQuestionToken'],
    [SyntaxKind.BacktickToken, 'BacktickToken'],
    [SyntaxKind.HashToken, 'HashToken'],
    [SyntaxKind.EqualsToken, 'EqualsToken'],
    [SyntaxKind.PlusEqualsToken, 'PlusEqualsToken'],
    [SyntaxKind.MinusEqualsToken, 'MinusEqualsToken'],
    [SyntaxKind.AsteriskEqualsToken, 'AsteriskEqualsToken'],
    [SyntaxKind.AsteriskAsteriskEqualsToken, 'AsteriskAsteriskEqualsToken'],
    [SyntaxKind.SlashEqualsToken, 'SlashEqualsToken'],
    [SyntaxKind.PercentEqualsToken, 'PercentEqualsToken'],
    [SyntaxKind.LessThanLessThanEqualsToken, 'LessThanLessThanEqualsToken'],
    [SyntaxKind.GreaterThanGreaterThanEqualsToken, 'GreaterThanGreaterThanEqualsToken'],
    [SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken, 'GreaterThanGreaterThanGreaterThanEqualsToken'],
    [SyntaxKind.AmpersandEqualsToken, 'AmpersandEqualsToken'],
    [SyntaxKind.BarEqualsToken, 'BarEqualsToken'],
    [SyntaxKind.BarBarEqualsToken, 'BarBarEqualsToken'],
    [SyntaxKind.AmpersandAmpersandEqualsToken, 'AmpersandAmpersandEqualsToken'],
    [SyntaxKind.QuestionQuestionEqualsToken, 'QuestionQuestionEqualsToken'],
    [SyntaxKind.CaretEqualsToken, 'CaretEqualsToken'],
    [SyntaxKind.Identifier, 'Identifier'],
    [SyntaxKind.PrivateIdentifier, 'PrivateIdentifier'],
    [SyntaxKind.BreakKeyword, 'BreakKeyword'],
    [SyntaxKind.CaseKeyword, 'CaseKeyword'],
    [SyntaxKind.CatchKeyword, 'CatchKeyword'],
    [SyntaxKind.ClassKeyword, 'ClassKeyword'],
    [SyntaxKind.ConstKeyword, 'ConstKeyword'],
    [SyntaxKind.ContinueKeyword, 'ContinueKeyword'],
    [SyntaxKind.DebuggerKeyword, 'DebuggerKeyword'],
    [SyntaxKind.DefaultKeyword, 'DefaultKeyword'],
    [SyntaxKind.DeleteKeyword, 'DeleteKeyword'],
    [SyntaxKind.DoKeyword, 'DoKeyword'],
    [SyntaxKind.ElseKeyword, 'ElseKeyword'],
    [SyntaxKind.EnumKeyword, 'EnumKeyword'],
    [SyntaxKind.ExportKeyword, 'ExportKeyword'],
    [SyntaxKind.ExtendsKeyword, 'ExtendsKeyword'],
    [SyntaxKind.FalseKeyword, 'FalseKeyword'],
    [SyntaxKind.FinallyKeyword, 'FinallyKeyword'],
    [SyntaxKind.ForKeyword, 'ForKeyword'],
    [SyntaxKind.FunctionKeyword, 'FunctionKeyword'],
    [SyntaxKind.IfKeyword, 'IfKeyword'],
    [SyntaxKind.ImportKeyword, 'ImportKeyword'],
    [SyntaxKind.InKeyword, 'InKeyword'],
    [SyntaxKind.InstanceOfKeyword, 'InstanceOfKeyword'],
    [SyntaxKind.NewKeyword, 'NewKeyword'],
    [SyntaxKind.NullKeyword, 'NullKeyword'],
    [SyntaxKind.ReturnKeyword, 'ReturnKeyword'],
    [SyntaxKind.SuperKeyword, 'SuperKeyword'],
    [SyntaxKind.SwitchKeyword, 'SwitchKeyword'],
    [SyntaxKind.ThisKeyword, 'ThisKeyword'],
    [SyntaxKind.ThrowKeyword, 'ThrowKeyword'],
    [SyntaxKind.TrueKeyword, 'TrueKeyword'],
    [SyntaxKind.TryKeyword, 'TryKeyword'],
    [SyntaxKind.TypeOfKeyword, 'TypeOfKeyword'],
    [SyntaxKind.VarKeyword, 'VarKeyword'],
    [SyntaxKind.VoidKeyword, 'VoidKeyword'],
    [SyntaxKind.WhileKeyword, 'WhileKeyword'],
    [SyntaxKind.WithKeyword, 'WithKeyword'],
    [SyntaxKind.ImplementsKeyword, 'ImplementsKeyword'],
    [SyntaxKind.InterfaceKeyword, 'InterfaceKeyword'],
    [SyntaxKind.LetKeyword, 'LetKeyword'],
    [SyntaxKind.PackageKeyword, 'PackageKeyword'],
    [SyntaxKind.PrivateKeyword, 'PrivateKeyword'],
    [SyntaxKind.ProtectedKeyword, 'ProtectedKeyword'],
    [SyntaxKind.PublicKeyword, 'PublicKeyword'],
    [SyntaxKind.StaticKeyword, 'StaticKeyword'],
    [SyntaxKind.YieldKeyword, 'YieldKeyword'],
    [SyntaxKind.AbstractKeyword, 'AbstractKeyword'],
    [SyntaxKind.AccessorKeyword, 'AccessorKeyword'],
    [SyntaxKind.AsKeyword, 'AsKeyword'],
    [SyntaxKind.AssertsKeyword, 'AssertsKeyword'],
    [SyntaxKind.AssertKeyword, 'AssertKeyword'],
    [SyntaxKind.AnyKeyword, 'AnyKeyword'],
    [SyntaxKind.AsyncKeyword, 'AsyncKeyword'],
    [SyntaxKind.AwaitKeyword, 'AwaitKeyword'],
    [SyntaxKind.BooleanKeyword, 'BooleanKeyword'],
    [SyntaxKind.ConstructorKeyword, 'ConstructorKeyword'],
    [SyntaxKind.DeclareKeyword, 'DeclareKeyword'],
    [SyntaxKind.GetKeyword, 'GetKeyword'],
    [SyntaxKind.InferKeyword, 'InferKeyword'],
    [SyntaxKind.IntrinsicKeyword, 'IntrinsicKeyword'],
    [SyntaxKind.IsKeyword, 'IsKeyword'],
    [SyntaxKind.KeyOfKeyword, 'KeyOfKeyword'],
    [SyntaxKind.ModuleKeyword, 'ModuleKeyword'],
    [SyntaxKind.NamespaceKeyword, 'NamespaceKeyword'],
    [SyntaxKind.NeverKeyword, 'NeverKeyword'],
    [SyntaxKind.OutKeyword, 'OutKeyword'],
    [SyntaxKind.ReadonlyKeyword, 'ReadonlyKeyword'],
    [SyntaxKind.RequireKeyword, 'RequireKeyword'],
    [SyntaxKind.NumberKeyword, 'NumberKeyword'],
    [SyntaxKind.ObjectKeyword, 'ObjectKeyword'],
    [SyntaxKind.SatisfiesKeyword, 'SatisfiesKeyword'],
    [SyntaxKind.SetKeyword, 'SetKeyword'],
    [SyntaxKind.StringKeyword, 'StringKeyword'],
    [SyntaxKind.SymbolKeyword, 'SymbolKeyword'],
    [SyntaxKind.TypeKeyword, 'TypeKeyword'],
    [SyntaxKind.UndefinedKeyword, 'UndefinedKeyword'],
    [SyntaxKind.UniqueKeyword, 'UniqueKeyword'],
    [SyntaxKind.UnknownKeyword, 'UnknownKeyword'],
    [SyntaxKind.UsingKeyword, 'UsingKeyword'],
    [SyntaxKind.FromKeyword, 'FromKeyword'],
    [SyntaxKind.GlobalKeyword, 'GlobalKeyword'],
    [SyntaxKind.BigIntKeyword, 'BigIntKeyword'],
    [SyntaxKind.OverrideKeyword, 'OverrideKeyword'],
    [SyntaxKind.OfKeyword, 'OfKeyword'],
    [SyntaxKind.QualifiedName, 'QualifiedName'],
    [SyntaxKind.ComputedPropertyName, 'ComputedPropertyName'],
    [SyntaxKind.TypeParameter, 'TypeParameter'],
    [SyntaxKind.Parameter, 'Parameter'],
    [SyntaxKind.Decorator, 'Decorator'],
    [SyntaxKind.PropertySignature, 'PropertySignature'],
    [SyntaxKind.PropertyDeclaration, 'PropertyDeclaration'],
    [SyntaxKind.MethodSignature, 'MethodSignature'],
    [SyntaxKind.MethodDeclaration, 'MethodDeclaration'],
    [SyntaxKind.ClassStaticBlockDeclaration, 'ClassStaticBlockDeclaration'],
    [SyntaxKind.Constructor, 'Constructor'],
    [SyntaxKind.GetAccessor, 'GetAccessor'],
    [SyntaxKind.SetAccessor, 'SetAccessor'],
    [SyntaxKind.CallSignature, 'CallSignature'],
    [SyntaxKind.ConstructSignature, 'ConstructSignature'],
    [SyntaxKind.IndexSignature, 'IndexSignature'],
    [SyntaxKind.TypePredicate, 'TypePredicate'],
    [SyntaxKind.TypeReference, 'TypeReference'],
    [SyntaxKind.FunctionType, 'FunctionType'],
    [SyntaxKind.ConstructorType, 'ConstructorType'],
    [SyntaxKind.TypeQuery, 'TypeQuery'],
    [SyntaxKind.TypeLiteral, 'TypeLiteral'],
    [SyntaxKind.ArrayType, 'ArrayType'],
    [SyntaxKind.TupleType, 'TupleType'],
    [SyntaxKind.OptionalType, 'OptionalType'],
    [SyntaxKind.RestType, 'RestType'],
    [SyntaxKind.UnionType, 'UnionType'],
    [SyntaxKind.IntersectionType, 'IntersectionType'],
    [SyntaxKind.ConditionalType, 'ConditionalType'],
    [SyntaxKind.InferType, 'InferType'],
    [SyntaxKind.ParenthesizedType, 'ParenthesizedType'],
    [SyntaxKind.ThisType, 'ThisType'],
    [SyntaxKind.TypeOperator, 'TypeOperator'],
    [SyntaxKind.IndexedAccessType, 'IndexedAccessType'],
    [SyntaxKind.MappedType, 'MappedType'],
    [SyntaxKind.LiteralType, 'LiteralType'],
    [SyntaxKind.NamedTupleMember, 'NamedTupleMember'],
    [SyntaxKind.TemplateLiteralType, 'TemplateLiteralType'],
    [SyntaxKind.TemplateLiteralTypeSpan, 'TemplateLiteralTypeSpan'],
    [SyntaxKind.ImportType, 'ImportType'],
    [SyntaxKind.ObjectBindingPattern, 'ObjectBindingPattern'],
    [SyntaxKind.ArrayBindingPattern, 'ArrayBindingPattern'],
    [SyntaxKind.BindingElement, 'BindingElement'],
    [SyntaxKind.ArrayLiteralExpression, 'ArrayLiteralExpression'],
    [SyntaxKind.ObjectLiteralExpression, 'ObjectLiteralExpression'],
    [SyntaxKind.PropertyAccessExpression, 'PropertyAccessExpression'],
    [SyntaxKind.ElementAccessExpression, 'ElementAccessExpression'],
    [SyntaxKind.CallExpression, 'CallExpression'],
    [SyntaxKind.NewExpression, 'NewExpression'],
    [SyntaxKind.TaggedTemplateExpression, 'TaggedTemplateExpression'],
    [SyntaxKind.TypeAssertionExpression, 'TypeAssertionExpression'],
    [SyntaxKind.ParenthesizedExpression, 'ParenthesizedExpression'],
    [SyntaxKind.FunctionExpression, 'FunctionExpression'],
    [SyntaxKind.ArrowFunction, 'ArrowFunction'],
    [SyntaxKind.DeleteExpression, 'DeleteExpression'],
    [SyntaxKind.TypeOfExpression, 'TypeOfExpression'],
    [SyntaxKind.VoidExpression, 'VoidExpression'],
    [SyntaxKind.AwaitExpression, 'AwaitExpression'],
    [SyntaxKind.PrefixUnaryExpression, 'PrefixUnaryExpression'],
    [SyntaxKind.PostfixUnaryExpression, 'PostfixUnaryExpression'],
    [SyntaxKind.BinaryExpression, 'BinaryExpression'],
    [SyntaxKind.ConditionalExpression, 'ConditionalExpression'],
    [SyntaxKind.TemplateExpression, 'TemplateExpression'],
    [SyntaxKind.YieldExpression, 'YieldExpression'],
    [SyntaxKind.SpreadElement, 'SpreadElement'],
    [SyntaxKind.ClassExpression, 'ClassExpression'],
    [SyntaxKind.OmittedExpression, 'OmittedExpression'],
    [SyntaxKind.ExpressionWithTypeArguments, 'ExpressionWithTypeArguments'],
    [SyntaxKind.AsExpression, 'AsExpression'],
    [SyntaxKind.NonNullExpression, 'NonNullExpression'],
    [SyntaxKind.MetaProperty, 'MetaProperty'],
    [SyntaxKind.SyntheticExpression, 'SyntheticExpression'],
    [SyntaxKind.SatisfiesExpression, 'SatisfiesExpression'],
    [SyntaxKind.TemplateSpan, 'TemplateSpan'],
    [SyntaxKind.SemicolonClassElement, 'SemicolonClassElement'],
    [SyntaxKind.Block, 'Block'],
    [SyntaxKind.EmptyStatement, 'EmptyStatement'],
    [SyntaxKind.VariableStatement, 'VariableStatement'],
    [SyntaxKind.ExpressionStatement, 'ExpressionStatement'],
    [SyntaxKind.IfStatement, 'IfStatement'],
    [SyntaxKind.DoStatement, 'DoStatement'],
    [SyntaxKind.WhileStatement, 'WhileStatement'],
    [SyntaxKind.ForStatement, 'ForStatement'],
    [SyntaxKind.ForInStatement, 'ForInStatement'],
    [SyntaxKind.ForOfStatement, 'ForOfStatement'],
    [SyntaxKind.ContinueStatement, 'ContinueStatement'],
    [SyntaxKind.BreakStatement, 'BreakStatement'],
    [SyntaxKind.ReturnStatement, 'ReturnStatement'],
    [SyntaxKind.WithStatement, 'WithStatement'],
    [SyntaxKind.SwitchStatement, 'SwitchStatement'],
    [SyntaxKind.LabeledStatement, 'LabeledStatement'],
    [SyntaxKind.ThrowStatement, 'ThrowStatement'],
    [SyntaxKind.TryStatement, 'TryStatement'],
    [SyntaxKind.DebuggerStatement, 'DebuggerStatement'],
    [SyntaxKind.VariableDeclaration, 'VariableDeclaration'],
    [SyntaxKind.VariableDeclarationList, 'VariableDeclarationList'],
    [SyntaxKind.FunctionDeclaration, 'FunctionDeclaration'],
    [SyntaxKind.ClassDeclaration, 'ClassDeclaration'],
    [SyntaxKind.InterfaceDeclaration, 'InterfaceDeclaration'],
    [SyntaxKind.TypeAliasDeclaration, 'TypeAliasDeclaration'],
    [SyntaxKind.EnumDeclaration, 'EnumDeclaration'],
    [SyntaxKind.ModuleDeclaration, 'ModuleDeclaration'],
    [SyntaxKind.ModuleBlock, 'ModuleBlock'],
    [SyntaxKind.CaseBlock, 'CaseBlock'],
    [SyntaxKind.NamespaceExportDeclaration, 'NamespaceExportDeclaration'],
    [SyntaxKind.ImportEqualsDeclaration, 'ImportEqualsDeclaration'],
    [SyntaxKind.ImportDeclaration, 'ImportDeclaration'],
    [SyntaxKind.ImportClause, 'ImportClause'],
    [SyntaxKind.NamespaceImport, 'NamespaceImport'],
    [SyntaxKind.NamedImports, 'NamedImports'],
    [SyntaxKind.ImportSpecifier, 'ImportSpecifier'],
    [SyntaxKind.ExportAssignment, 'ExportAssignment'],
    [SyntaxKind.ExportDeclaration, 'ExportDeclaration'],
    [SyntaxKind.NamedExports, 'NamedExports'],
    [SyntaxKind.NamespaceExport, 'NamespaceExport'],
    [SyntaxKind.ExportSpecifier, 'ExportSpecifier'],
    [SyntaxKind.MissingDeclaration, 'MissingDeclaration'],
    [SyntaxKind.ExternalModuleReference, 'ExternalModuleReference'],
    [SyntaxKind.JsxElement, 'JsxElement'],
    [SyntaxKind.JsxSelfClosingElement, 'JsxSelfClosingElement'],
    [SyntaxKind.JsxOpeningElement, 'JsxOpeningElement'],
    [SyntaxKind.JsxClosingElement, 'JsxClosingElement'],
    [SyntaxKind.JsxFragment, 'JsxFragment'],
    [SyntaxKind.JsxOpeningFragment, 'JsxOpeningFragment'],
    [SyntaxKind.JsxClosingFragment, 'JsxClosingFragment'],
    [SyntaxKind.JsxAttribute, 'JsxAttribute'],
    [SyntaxKind.JsxAttributes, 'JsxAttributes'],
    [SyntaxKind.JsxSpreadAttribute, 'JsxSpreadAttribute'],
    [SyntaxKind.JsxExpression, 'JsxExpression'],
    [SyntaxKind.JsxNamespacedName, 'JsxNamespacedName'],
    [SyntaxKind.CaseClause, 'CaseClause'],
    [SyntaxKind.DefaultClause, 'DefaultClause'],
    [SyntaxKind.HeritageClause, 'HeritageClause'],
    [SyntaxKind.CatchClause, 'CatchClause'],
    [SyntaxKind.ImportAttributes, 'ImportAttributes'],
    [SyntaxKind.ImportAttribute, 'ImportAttribute'],
    [SyntaxKind.AssertClause, 'AssertClause'],
    [SyntaxKind.AssertEntry, 'AssertEntry'],
    [SyntaxKind.ImportTypeAssertionContainer, 'ImportTypeAssertionContainer'],
    [SyntaxKind.PropertyAssignment, 'PropertyAssignment'],
    [SyntaxKind.ShorthandPropertyAssignment, 'ShorthandPropertyAssignment'],
    [SyntaxKind.SpreadAssignment, 'SpreadAssignment'],
    [SyntaxKind.EnumMember, 'EnumMember'],
    [SyntaxKind.UnparsedPrologue, 'UnparsedPrologue'],
    [SyntaxKind.UnparsedPrepend, 'UnparsedPrepend'],
    [SyntaxKind.UnparsedText, 'UnparsedText'],
    [SyntaxKind.UnparsedInternalText, 'UnparsedInternalText'],
    [SyntaxKind.UnparsedSyntheticReference, 'UnparsedSyntheticReference'],
    [SyntaxKind.SourceFile, 'SourceFile'],
    [SyntaxKind.Bundle, 'Bundle'],
    [SyntaxKind.UnparsedSource, 'UnparsedSource'],
    [SyntaxKind.InputFiles, 'InputFiles'],
    [SyntaxKind.JSDocTypeExpression, 'JSDocTypeExpression'],
    [SyntaxKind.JSDocNameReference, 'JSDocNameReference'],
    [SyntaxKind.JSDocMemberName, 'JSDocMemberName'],
    [SyntaxKind.JSDocAllType, 'JSDocAllType'],
    [SyntaxKind.JSDocUnknownType, 'JSDocUnknownType'],
    [SyntaxKind.JSDocNullableType, 'JSDocNullableType'],
    [SyntaxKind.JSDocNonNullableType, 'JSDocNonNullableType'],
    [SyntaxKind.JSDocOptionalType, 'JSDocOptionalType'],
    [SyntaxKind.JSDocFunctionType, 'JSDocFunctionType'],
    [SyntaxKind.JSDocVariadicType, 'JSDocVariadicType'],
    [SyntaxKind.JSDocNamepathType, 'JSDocNamepathType'],
    [SyntaxKind.JSDoc, 'JSDoc'],
    [SyntaxKind.JSDocComment, 'JSDocComment'],
    [SyntaxKind.JSDocText, 'JSDocText'],
    [SyntaxKind.JSDocTypeLiteral, 'JSDocTypeLiteral'],
    [SyntaxKind.JSDocSignature, 'JSDocSignature'],
    [SyntaxKind.JSDocLink, 'JSDocLink'],
    [SyntaxKind.JSDocLinkCode, 'JSDocLinkCode'],
    [SyntaxKind.JSDocLinkPlain, 'JSDocLinkPlain'],
    [SyntaxKind.JSDocTag, 'JSDocTag'],
    [SyntaxKind.JSDocAugmentsTag, 'JSDocAugmentsTag'],
    [SyntaxKind.JSDocImplementsTag, 'JSDocImplementsTag'],
    [SyntaxKind.JSDocAuthorTag, 'JSDocAuthorTag'],
    [SyntaxKind.JSDocDeprecatedTag, 'JSDocDeprecatedTag'],
    [SyntaxKind.JSDocClassTag, 'JSDocClassTag'],
    [SyntaxKind.JSDocPublicTag, 'JSDocPublicTag'],
    [SyntaxKind.JSDocPrivateTag, 'JSDocPrivateTag'],
    [SyntaxKind.JSDocProtectedTag, 'JSDocProtectedTag'],
    [SyntaxKind.JSDocReadonlyTag, 'JSDocReadonlyTag'],
    [SyntaxKind.JSDocOverrideTag, 'JSDocOverrideTag'],
    [SyntaxKind.JSDocCallbackTag, 'JSDocCallbackTag'],
    [SyntaxKind.JSDocOverloadTag, 'JSDocOverloadTag'],
    [SyntaxKind.JSDocEnumTag, 'JSDocEnumTag'],
    [SyntaxKind.JSDocParameterTag, 'JSDocParameterTag'],
    [SyntaxKind.JSDocReturnTag, 'JSDocReturnTag'],
    [SyntaxKind.JSDocThisTag, 'JSDocThisTag'],
    [SyntaxKind.JSDocTypeTag, 'JSDocTypeTag'],
    [SyntaxKind.JSDocTemplateTag, 'JSDocTemplateTag'],
    [SyntaxKind.JSDocTypedefTag, 'JSDocTypedefTag'],
    [SyntaxKind.JSDocSeeTag, 'JSDocSeeTag'],
    [SyntaxKind.JSDocPropertyTag, 'JSDocPropertyTag'],
    [SyntaxKind.JSDocThrowsTag, 'JSDocThrowsTag'],
    [SyntaxKind.JSDocSatisfiesTag, 'JSDocSatisfiesTag'],
    [SyntaxKind.SyntaxList, 'SyntaxList'],
    [SyntaxKind.NotEmittedStatement, 'NotEmittedStatement'],
    [SyntaxKind.PartiallyEmittedExpression, 'PartiallyEmittedExpression'],
    [SyntaxKind.CommaListExpression, 'CommaListExpression'],
    [SyntaxKind.SyntheticReferenceExpression, 'SyntheticReferenceExpression'],
    [SyntaxKind.Count, 'Count'],
    [SyntaxKind.FirstAssignment, 'FirstAssignment'],
    [SyntaxKind.LastAssignment, 'LastAssignment'],
    [SyntaxKind.FirstCompoundAssignment, 'FirstCompoundAssignment'],
    [SyntaxKind.LastCompoundAssignment, 'LastCompoundAssignment'],
    [SyntaxKind.FirstReservedWord, 'FirstReservedWord'],
    [SyntaxKind.LastReservedWord, 'LastReservedWord'],
    [SyntaxKind.FirstKeyword, 'FirstKeyword'],
    [SyntaxKind.LastKeyword, 'LastKeyword'],
    [SyntaxKind.FirstFutureReservedWord, 'FirstFutureReservedWord'],
    [SyntaxKind.LastFutureReservedWord, 'LastFutureReservedWord'],
    [SyntaxKind.FirstTypeNode, 'FirstTypeNode'],
    [SyntaxKind.LastTypeNode, 'LastTypeNode'],
    [SyntaxKind.FirstPunctuation, 'FirstPunctuation'],
    [SyntaxKind.LastPunctuation, 'LastPunctuation'],
    [SyntaxKind.FirstToken, 'FirstToken'],
    [SyntaxKind.LastToken, 'LastToken'],
    [SyntaxKind.FirstTriviaToken, 'FirstTriviaToken'],
    [SyntaxKind.LastTriviaToken, 'LastTriviaToken'],
    [SyntaxKind.FirstLiteralToken, 'FirstLiteralToken'],
    [SyntaxKind.LastLiteralToken, 'LastLiteralToken'],
    [SyntaxKind.FirstTemplateToken, 'FirstTemplateToken'],
    [SyntaxKind.LastTemplateToken, 'LastTemplateToken'],
    [SyntaxKind.FirstBinaryOperator, 'FirstBinaryOperator'],
    [SyntaxKind.LastBinaryOperator, 'LastBinaryOperator'],
    [SyntaxKind.FirstStatement, 'FirstStatement'],
    [SyntaxKind.LastStatement, 'LastStatement'],
    [SyntaxKind.FirstNode, 'FirstNode'],
    [SyntaxKind.FirstJSDocNode, 'FirstJSDocNode'],
    [SyntaxKind.LastJSDocNode, 'LastJSDocNode'],
    [SyntaxKind.FirstJSDocTagNode, 'FirstJSDocTagNode'],
    [SyntaxKind.LastJSDocTagNode, 'LastJSDocTagNode'],
])
