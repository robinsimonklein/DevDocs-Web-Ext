import _ from 'lodash'
import { Docs } from './docs'
import { getDocs } from './docs-utils'
import { WrapedResponse } from '@/types/message'

async function searchEntry ({ query, scope }: { query: string; scope: string }) {
  if (!query && !scope) {
    return null
  }
  const docs = await getDocs()
  if (!scope) {
    const entries = await docs.searchEntries(query)
    return entries
  }
  const doc = await docs.attemptToMatchOneDocInEnabledDocs(scope)
  if (!doc) {
    return []
  }
  if (!query) {
    return doc.entries.slice(0, 50)
  }
  const entries = await Docs.searchEntriesInDoc(query, doc)
  return entries
}

function wrapResponse (rawResponse: unknown) {
  const response = _.has(rawResponse, 'status')
    ? rawResponse
    : { status: 'success', content: rawResponse }
  const wrapedResponse: WrapedResponse = {
    status: _.get(response, 'status', 'error'),
    content: _.get(response, 'content', {}),
    error: _.get(response, 'error', null),
    errorMessage: _.get(response, 'errorMessage', '')
  }
  return wrapedResponse
}

type MessageHandler = (payload: unknown) => Promise<WrapedResponse>;
interface MessageHandlers {
  [key: string]: MessageHandler;
}
export const messageHandlers: MessageHandlers = {
  async 'search-entry' (payload) {
    const query = _.get(payload, 'query', '')
    const scope = _.get(payload, 'scope', '')
    const entries = await searchEntry({ query, scope })
    return wrapResponse(entries)
  },

  async 'auto-compelete-enabled-doc' (payload) {
    const scope = _.get(payload, 'scope', '')
    const docs = await getDocs()
    const doc = await docs.attemptToMatchOneDocInEnabledDocs(scope)
    return wrapResponse(doc)
  },

  async 'get-content-doc' (payload) {
    const scope = _.get(payload, 'scope', '')
    const docs = await getDocs()
    const doc = await docs.attemptToMatchOneDocInAllDocs(scope)
    return wrapResponse(doc)
  }
}

export function errorHandler ({
  error = null,
  errorMessage = _.get(error, 'message', '')
}: {
  error?: unknown;
  errorMessage?: string;
} = {
  error: null,
  errorMessage: ''
}) {
  return wrapResponse({ status: 'error', error, errorMessage })
}
