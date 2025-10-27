import Browser from 'webextension-polyfill'

import {
  generateAnswersWithChatgptApi,
  generateAnswersWithGptCompletionApi,
} from '../services/apis/openai-api'
import { generateAnswersWithCustomApi } from '../services/apis/custom-api.mjs'
import { generateAnswersWithOllamaApi } from '../services/apis/ollama-api.mjs'
import { generateAnswersWithAzureOpenaiApi } from '../services/apis/azure-openai-api.mjs'
import { generateAnswersWithClaudeApi } from '../services/apis/claude-api.mjs'
import { generateAnswersWithChatGLMApi } from '../services/apis/chatglm-api.mjs'
import { generateAnswersWithWaylaidwandererApi } from '../services/apis/waylaidwanderer-api.mjs'
import { generateAnswersWithOpenRouterApi } from '../services/apis/openrouter-api.mjs'
import { generateAnswersWithAimlApi } from '../services/apis/aiml-api.mjs'
import { generateAnswersWithMoonshotCompletionApi } from '../services/apis/moonshot-api.mjs'
import {
  getUserConfig,
  setUserConfig,
  isUsingGptCompletionApiModel,
  isUsingChatgptApiModel,
  isUsingCustomModel,
  isUsingOllamaApiModel,
  isUsingAzureOpenAiApiModel,
  isUsingClaudeApiModel,
  isUsingChatGLMApiModel,
  isUsingGithubThirdPartyApiModel,
  isUsingMoonshotApiModel,
  isUsingOpenRouterApiModel,
  isUsingAimlApiModel,
  isUsingDeepSeekApiModel,
} from '../config/index.mjs'
import { openUrl } from '../utils/open-url'
import { registerPortListener } from '../services/wrappers.mjs'
import { refreshMenu } from './menus.mjs'
import { registerCommands } from './commands.mjs'
import { generateAnswersWithDeepSeekApi } from '../services/apis/deepseek-api.mjs'

async function executeApi(session, port, config) {
  console.debug('modelName', session.modelName)
  console.debug('apiMode', session.apiMode)

  if (isUsingCustomModel(session)) {
    // custom model via custom API url
    const url = session.apiMode
      ? session.apiMode.customUrl.trim() || config.customModelApiUrl.trim()
      : config.customModelApiUrl.trim()
    const key = session.apiMode
      ? session.apiMode.apiKey.trim() || config.customApiKey
      : config.customApiKey
    await generateAnswersWithCustomApi(
      port,
      session.question,
      session,
      url,
      key,
      session.apiMode?.customName || config.customModelName,
    )
    return
  }

  if (isUsingChatgptApiModel(session)) {
    await generateAnswersWithChatgptApi(port, session.question, session, config.apiKey)
    return
  }

  if (isUsingGptCompletionApiModel(session)) {
    await generateAnswersWithGptCompletionApi(port, session.question, session, config.apiKey)
    return
  }

  if (isUsingClaudeApiModel(session)) {
    await generateAnswersWithClaudeApi(port, session.question, session)
    return
  }

  if (isUsingMoonshotApiModel(session)) {
    await generateAnswersWithMoonshotCompletionApi(
      port,
      session.question,
      session,
      config.moonshotApiKey,
    )
    return
  }

  if (isUsingChatGLMApiModel(session)) {
    await generateAnswersWithChatGLMApi(port, session.question, session)
    return
  }

  if (isUsingDeepSeekApiModel(session)) {
    await generateAnswersWithDeepSeekApi(port, session.question, session, config.deepSeekApiKey)
    return
  }

  if (isUsingOllamaApiModel(session)) {
    await generateAnswersWithOllamaApi(port, session.question, session)
    return
  }

  if (isUsingOpenRouterApiModel(session)) {
    await generateAnswersWithOpenRouterApi(port, session.question, session, config.openRouterApiKey)
    return
  }

  if (isUsingAimlApiModel(session)) {
    await generateAnswersWithAimlApi(port, session.question, session, config.aimlApiKey)
    return
  }

  if (isUsingAzureOpenAiApiModel(session)) {
    await generateAnswersWithAzureOpenaiApi(port, session.question, session)
    return
  }

  if (isUsingGithubThirdPartyApiModel(session)) {
    await generateAnswersWithWaylaidwandererApi(port, session.question, session)
    return
  }

  // fallback: try OpenAI chat API
  await generateAnswersWithChatgptApi(port, session.question, session, config.apiKey)
}

Browser.runtime.onMessage.addListener(async (message, sender) => {
  switch (message.type) {
    case 'FEEDBACK': {
      // Feedback is not supported for web providers in API-only mode. Ignore.
      break
    }
    case 'DELETE_CONVERSATION': {
      // Deleting web-based conversation not supported in API-only mode.
      break
    }

    case 'NEW_URL': {
      await Browser.tabs.create({
        url: message.data.url,
        pinned: message.data.pinned,
      })
      if (message.data.jumpBack) {
        await setUserConfig({
          notificationJumpBackTabId: sender.tab.id,
        })
      }
      break
    }
    case 'SET_CHATGPT_TAB': {
      await setUserConfig({
        chatgptTabId: sender.tab.id,
      })
      break
    }
    case 'ACTIVATE_URL':
      await Browser.tabs.update(message.data.tabId, { active: true })
      break
    case 'OPEN_URL':
      openUrl(message.data.url)
      break
    case 'OPEN_CHAT_WINDOW': {
      const config = await getUserConfig()
      const url = Browser.runtime.getURL('IndependentPanel.html')
      const tabs = await Browser.tabs.query({ url: url, windowType: 'popup' })
      if (!config.alwaysCreateNewConversationWindow && tabs.length > 0)
        await Browser.windows.update(tabs[0].windowId, { focused: true })
      else
        await Browser.windows.create({
          url: url,
          type: 'popup',
          width: 1000,
          height: 800,
        })
      break
    }
    case 'REFRESH_MENU':
      refreshMenu()
      break
    case 'PIN_TAB': {
      let tabId
      if (message.data.tabId) tabId = message.data.tabId
      else tabId = sender.tab.id

      await Browser.tabs.update(tabId, { pinned: true })
      if (message.data.saveAsChatgptConfig) {
        await setUserConfig({ chatgptTabId: tabId })
      }
      break
    }
    case 'FETCH': {
      try {
        const response = await fetch(message.data.input, message.data.init)
        const text = await response.text()
        return [
          {
            body: text,
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers),
          },
          null,
        ]
      } catch (error) {
        return [null, error]
      }
    }

    case 'GET_COOKIE': {
      return (await Browser.cookies.get({ url: message.data.url, name: message.data.name }))?.value
    }
  }
})

try {
  // Web (cookie-based) providers removed. Side panel is explicitly removed because its not supported in API-only mode, and would result in unexpected side effects for users.
  // Browser.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  //   if (!tab.url) return
  //   // eslint-disable-next-line no-undef
  //   await chrome.sidePanel.setOptions({
  //     tabId,
  //     path: 'IndependentPanel.html',
  //     enabled: true,
  //   })
  // })
} catch (error) {
  console.log(error)
}

registerPortListener(async (session, port, config) => await executeApi(session, port, config))
registerCommands()
refreshMenu()
