import MarkdownIt, { StateCore } from 'markdown-it'

import { Config, TokenInfo } from 'markdown-it-grouped-code-fence/dist/types'
import { TokenCollector } from 'markdown-it-grouped-code-fence/dist/TokenCollector'
import { RULE_NAME } from 'markdown-it-grouped-code-fence/dist/types'


export function MarkdownItGroupedCodeFence(md: MarkdownIt): void {
  // Apply the container plugin directly (not via md.use())
  const CLASS_NAME_PREFIX = "grouped-code-fence"

  md.core.ruler.push(RULE_NAME, groupedCodeFence.bind(null, {
    className: {
      container: `${CLASS_NAME_PREFIX}-container`,
      navigationBar: `${CLASS_NAME_PREFIX}-navigation-bar`,
      fenceRadio: `${CLASS_NAME_PREFIX}-fence-radio`,
      labelRadio: `${CLASS_NAME_PREFIX}-label-radio`
    }
  }))
}

const GROUP_REGEX = / \[([^\[\]]*)]/
const LANGUAGE_REGEX = /^[^ ]+/


function filterGroupResult(info: string): { scope: string | null; title: string | null } {
  const regexResult = GROUP_REGEX.exec(info)

  if (regexResult) {
    const [scope, title] = (regexResult[1] || '').split('-')
    return { scope, title }
  }

  return { scope: null, title: null }
}

function filterTokenInfo(info: string): TokenInfo {
  const languageResult = LANGUAGE_REGEX.exec(info)
  const language = (languageResult && languageResult[0]) || ''
  const { scope, title } = filterGroupResult(info)
  return { scope, title: title || language }
}


function groupedCodeFence(config: Config, state: StateCore) {
  const tokenCollector = new TokenCollector(config)
  const maxIndex = state.tokens.length - 1
  let prevGroupScope: string | null = null

  state.tokens.forEach((token, index) => {
    const isEnd = index === maxIndex
    const { scope: currentGroupScope, title } = filterTokenInfo(token.info)

    if (prevGroupScope === currentGroupScope) {
      const isInCurrentGroup = currentGroupScope !== null

      if (isInCurrentGroup)
        {tokenCollector.addTokenIntoCurrentGroup(token, title, isEnd)}
      else
        {tokenCollector.addToken(token)}
    } else {
      // below condition means that prevGroupScope not equal to null. so previous token must be a Group
      const currentTokenIsNotGroup = currentGroupScope === null

      if (currentTokenIsNotGroup) {
        tokenCollector.closeCurrentGroup(token.level)
        tokenCollector.addToken(token)
      } else {
        const prevGroupNeedToBeClosed = prevGroupScope !== null
        tokenCollector.startNewGroup(token.level, prevGroupNeedToBeClosed)
        tokenCollector.addTokenIntoCurrentGroup(token, title, isEnd)
      }
    }

    prevGroupScope = currentGroupScope
  })

  state.tokens = tokenCollector.getTokens()
}
