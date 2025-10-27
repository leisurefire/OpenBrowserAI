import './styles.scss'
import { unmountComponentAtNode } from 'react-dom'
import { render } from 'preact'
import DecisionCard from '../components/DecisionCard'
import { config as siteConfig } from './site-adapters'
import { config as toolsConfig } from './selection-tools'
import { config as menuConfig } from './menu-tools'
import { getUserConfig } from '../config/index.mjs'

import {
  createElementAtPosition,
  cropText,
  endsWithQuestionMark,
  getClientPosition,
  getPossibleElementByQuerySelector,
} from '../utils'
import FloatingToolbar from '../components/FloatingToolbar'
import Browser from 'webextension-polyfill'
import { initSession } from '../services/init-session.mjs'

/**
 * @param {string} siteName
 * @param {SiteConfig} siteConfig
 */
async function mountComponent(siteName, siteConfig) {
  if (siteName === 'github' && location.href.includes('/wiki')) {
    return
  }

  const userConfig = await getUserConfig()

  if (!userConfig.alwaysFloatingSidebar) {
    const retry = 10
    let oldUrl = location.href
    for (let i = 1; i <= retry; i++) {
      if (location.href !== oldUrl) {
        console.log(`SiteAdapters Retry ${i}/${retry}: stop`)
        return
      }
      const e =
        (siteConfig &&
          (getPossibleElementByQuerySelector(siteConfig.sidebarContainerQuery) ||
            getPossibleElementByQuerySelector(siteConfig.appendContainerQuery) ||
            getPossibleElementByQuerySelector(siteConfig.resultsContainerQuery))) ||
        getPossibleElementByQuerySelector([userConfig.prependQuery]) ||
        getPossibleElementByQuerySelector([userConfig.appendQuery])
      if (e) {
        console.log(`SiteAdapters Retry ${i}/${retry}: found`)
        console.log(e)
        break
      } else {
        console.log(`SiteAdapters Retry ${i}/${retry}: not found`)
        if (i === retry) return
        else await new Promise((r) => setTimeout(r, 500))
      }
    }
  }
  document.querySelectorAll('.chatgptbox-container,#chatgptbox-container').forEach((e) => {
    unmountComponentAtNode(e)
    e.remove()
  })

  let question
  if (userConfig.inputQuery) question = await getInput([userConfig.inputQuery])
  if (!question && siteConfig) question = await getInput(siteConfig.inputQuery)

  document.querySelectorAll('.chatgptbox-container,#chatgptbox-container').forEach((e) => {
    unmountComponentAtNode(e)
    e.remove()
  })

  if (userConfig.alwaysFloatingSidebar && question) {
    const position = {
      x: window.innerWidth - 300 - Math.floor((20 / 100) * window.innerWidth),
      y: window.innerHeight / 2 - 200,
    }
    const toolbarContainer = createElementAtPosition(position.x, position.y)
    toolbarContainer.className = 'chatgptbox-toolbar-container-not-queryable'

    let triggered = false
    if (userConfig.triggerMode === 'always') triggered = true
    else if (userConfig.triggerMode === 'questionMark' && endsWithQuestionMark(question.trim()))
      triggered = true

    render(
      <FloatingToolbar
        session={initSession({
          modelName: userConfig.modelName,
          apiMode: userConfig.apiMode,
          extraCustomModelName: userConfig.customModelName,
        })}
        selection=""
        container={toolbarContainer}
        triggered={triggered}
        closeable={true}
        prompt={question}
      />,
      toolbarContainer,
    )
    return
  }

  const container = document.createElement('div')
  container.id = 'chatgptbox-container'
  if (siteName === 'google' || siteName === 'kagi') {
    container.style.width = '350px'
  }
  render(
    <DecisionCard
      session={initSession({
        modelName: userConfig.modelName,
        apiMode: userConfig.apiMode,
        extraCustomModelName: userConfig.customModelName,
      })}
      question={question}
      siteConfig={siteConfig}
      container={container}
    />,
    container,
  )
}

/**
 * @param {string[]|function} inputQuery
 * @returns {Promise<string>}
 */
async function getInput(inputQuery) {
  let input
  if (typeof inputQuery === 'function') {
    input = await inputQuery()
    const replyPromptBelow = `Reply in English. Regardless of the language of content I provide below. !!This is very important!!`
    const replyPromptAbove = `Reply in English. Regardless of the language of content I provide above. !!This is very important!!`
    if (input) return `${replyPromptBelow}\n\n` + input + `\n\n${replyPromptAbove}`
    return input
  }
  const searchInput = getPossibleElementByQuerySelector(inputQuery)
  if (searchInput) {
    if (searchInput.value) input = searchInput.value
    else if (searchInput.textContent) input = searchInput.textContent
    if (input)
      return (
        `Reply in English.\nThe following is a search input in a search engine, ` +
        `giving useful content or solutions and as much information as you can related to it, ` +
        `use markdown syntax to make your answer more readable, such as code blocks, bold, list:\n` +
        input
      )
  }
}

let toolbarContainer
const deleteToolbar = () => {
  if (toolbarContainer && toolbarContainer.className === 'chatgptbox-toolbar-container')
    toolbarContainer.remove()
}

const createSelectionTools = async (toolbarContainer, selection) => {
  toolbarContainer.className = 'chatgptbox-toolbar-container'
  const userConfig = await getUserConfig()
  render(
    <FloatingToolbar
      session={initSession({
        modelName: userConfig.modelName,
        apiMode: userConfig.apiMode,
        extraCustomModelName: userConfig.customModelName,
      })}
      selection={selection}
      container={toolbarContainer}
      dockable={true}
    />,
    toolbarContainer,
  )
}

async function prepareForSelectionTools() {
  document.addEventListener('mouseup', (e) => {
    if (toolbarContainer && toolbarContainer.contains(e.target)) return
    const selectionElement =
      window.getSelection()?.rangeCount > 0 &&
      window.getSelection()?.getRangeAt(0).endContainer.parentElement
    if (toolbarContainer && selectionElement && toolbarContainer.contains(selectionElement)) return

    deleteToolbar()
    setTimeout(async () => {
      const selection = window
        .getSelection()
        ?.toString()
        .trim()
        .replace(/^-+|-+$/g, '')
      if (selection) {
        let position

        const config = await getUserConfig()
        if (!config.selectionToolsNextToInputBox) position = { x: e.pageX + 20, y: e.pageY + 20 }
        else {
          const inputElement = selectionElement.querySelector('input, textarea')
          if (inputElement) {
            position = getClientPosition(inputElement)
            position = {
              x: position.x + window.scrollX + inputElement.offsetWidth + 50,
              y: e.pageY + 30,
            }
          } else {
            position = { x: e.pageX + 20, y: e.pageY + 20 }
          }
        }
        toolbarContainer = createElementAtPosition(position.x, position.y)
        await createSelectionTools(toolbarContainer, selection)
      }
    })
  })
  document.addEventListener('mousedown', (e) => {
    if (toolbarContainer && toolbarContainer.contains(e.target)) return

    document.querySelectorAll('.chatgptbox-toolbar-container').forEach((e) => e.remove())
  })
  document.addEventListener('keydown', (e) => {
    if (
      toolbarContainer &&
      !toolbarContainer.contains(e.target) &&
      (e.target.nodeName === 'INPUT' || e.target.nodeName === 'TEXTAREA')
    ) {
      setTimeout(() => {
        if (!window.getSelection()?.toString().trim()) deleteToolbar()
      })
    }
  })
}

async function prepareForSelectionToolsTouch() {
  document.addEventListener('touchend', (e) => {
    if (toolbarContainer && toolbarContainer.contains(e.target)) return
    if (
      toolbarContainer &&
      window.getSelection()?.rangeCount > 0 &&
      toolbarContainer.contains(window.getSelection()?.getRangeAt(0).endContainer.parentElement)
    )
      return

    deleteToolbar()
    setTimeout(() => {
      const selection = window
        .getSelection()
        ?.toString()
        .trim()
        .replace(/^-+|-+$/g, '')
      if (selection) {
        toolbarContainer = createElementAtPosition(
          e.changedTouches[0].pageX + 20,
          e.changedTouches[0].pageY + 20,
        )
        createSelectionTools(toolbarContainer, selection)
      }
    })
  })
  document.addEventListener('touchstart', (e) => {
    if (toolbarContainer && toolbarContainer.contains(e.target)) return

    document.querySelectorAll('.chatgptbox-toolbar-container').forEach((e) => e.remove())
  })
}

let menuX, menuY

async function prepareForRightClickMenu() {
  document.addEventListener('contextmenu', (e) => {
    menuX = e.clientX
    menuY = e.clientY
  })

  Browser.runtime.onMessage.addListener(async (message) => {
    if (message.type === 'CREATE_CHAT') {
      const data = message.data
      let prompt = ''
      if (data.itemId in toolsConfig) {
        prompt = await toolsConfig[data.itemId].genPrompt(data.selectionText)
      } else if (data.itemId in menuConfig) {
        const menuItem = menuConfig[data.itemId]
        if (!menuItem.genPrompt) return
        else prompt = await menuItem.genPrompt()
        if (prompt) prompt = await cropText(`Reply in English.\n` + prompt)
      }

      const position = data.useMenuPosition
        ? { x: menuX, y: menuY }
        : { x: window.innerWidth / 2 - 300, y: window.innerHeight / 2 - 200 }
      const container = createElementAtPosition(position.x, position.y)
      container.className = 'chatgptbox-toolbar-container-not-queryable'
      const userConfig = await getUserConfig()
      render(
        <FloatingToolbar
          session={initSession({
            modelName: userConfig.modelName,
            apiMode: userConfig.apiMode,
            extraCustomModelName: userConfig.customModelName,
          })}
          selection={data.selectionText}
          container={container}
          triggered={true}
          closeable={true}
          prompt={prompt}
        />,
        container,
      )
    }
  })
}

async function prepareForStaticCard() {
  const userConfig = await getUserConfig()
  let siteRegex
  if (userConfig.useSiteRegexOnly) siteRegex = userConfig.siteRegex
  else
    siteRegex = new RegExp(
      (userConfig.siteRegex && userConfig.siteRegex + '|') + Object.keys(siteConfig).join('|'),
    )

  const matches = location.hostname.match(siteRegex)
  if (matches) {
    const siteName = matches[0]

    if (
      userConfig.siteAdapters.includes(siteName) &&
      !userConfig.activeSiteAdapters.includes(siteName)
    )
      return

    let initSuccess = true
    if (siteName in siteConfig) {
      const siteAction = siteConfig[siteName].action
      if (siteAction && siteAction.init) {
        initSuccess = await siteAction.init(location.hostname, userConfig, getInput, mountComponent)
      }
    }

    if (initSuccess) mountComponent(siteName, siteConfig[siteName])
  }
}

async function run() {
  prepareForSelectionTools()
  prepareForSelectionToolsTouch()
  prepareForStaticCard()
  prepareForRightClickMenu()
}

run()
