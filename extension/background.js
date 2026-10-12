const APP = 'http://127.0.0.1:47821'
const TIMEOUT = 5 * 60 * 1000

const confirmPage = chrome.runtime.getURL('confirm.html')
const pendingConfirms = new Map()

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'confirm' && sender.url?.startsWith(confirmPage)) {
    pendingConfirms.get(msg.id)?.(msg.allowed === true)
    return
  }
  if (msg?.type !== 'connect') return
  connect(msg.nonce, sender.tab?.id).then(sendResponse, (e) => sendResponse({ ok: false, error: e?.message ?? String(e) }))
  return true
})

function isForumSsoUrl(url) {
  try {
    const u = new URL(url)
    if (u.origin !== 'https://forum.cfx.re' || u.pathname !== '/session/sso_provider') return false
    const payload = new URLSearchParams(atob(decodeURIComponent(u.searchParams.get('sso') ?? '').replace(/ /g, '+')))
    return (payload.get('return_sso_url') ?? '').startsWith('https://portal.cfx.re/authenticate')
  } catch {
    return false
  }
}

async function askUser() {
  const id = crypto.randomUUID()
  const win = await chrome.windows.create({ url: `${confirmPage}?id=${id}`, type: 'popup', width: 460, height: 230, focused: true })
  return new Promise((resolve) => {
    const done = (allowed) => {
      pendingConfirms.delete(id)
      chrome.windows.onRemoved.removeListener(onRemoved)
      resolve(allowed)
    }
    const onRemoved = (windowId) => windowId === win.id && done(false)
    pendingConfirms.set(id, done)
    chrome.windows.onRemoved.addListener(onRemoved)
  })
}

async function appRequest(path, body) {
  const res = await fetch(`${APP}${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined)
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.ok === false) throw new Error(data.error ?? `FiveM Portal Push answered ${res.status}`)
  return data
}

async function connect(nonce, connectTabId) {
  const keepAlive = setInterval(() => chrome.runtime.getPlatformInfo(), 20000)
  try {
    const { url } = await appRequest(`/sso-url?n=${nonce}`)
    if (!isForumSsoUrl(url)) throw new Error('The login link did not come from the Cfx.re forum, so it was not opened')
    if (!(await askUser())) throw new Error('Login denied in the browser')
    const { sso, sig } = await captureSso(url, connectTabId)
    await appRequest('/sso', { nonce, sso, sig })
    if (connectTabId !== undefined) setTimeout(() => chrome.tabs.remove(connectTabId).catch(() => {}), 1500)
    return { ok: true }
  } finally {
    clearInterval(keepAlive)
  }
}

function captureSso(url, openerTabId) {
  return new Promise((resolve, reject) => {
    let tabId = null

    const finish = (err, result) => {
      chrome.tabs.onUpdated.removeListener(onUpdated)
      chrome.tabs.onRemoved.removeListener(onRemoved)
      clearTimeout(timer)
      if (err) reject(err)
      else resolve(result)
    }

    const onUpdated = (id, info, tab) => {
      if (id !== tabId) return
      const current = info.url ?? tab.url ?? ''
      if (!current.startsWith('https://portal.cfx.re/authenticate')) return
      const params = new URL(current).searchParams
      const sso = params.get('sso')
      const sig = params.get('sig')
      if (!sso || !sig) return
      chrome.tabs.remove(id).catch(() => {})
      finish(null, { sso, sig })
    }

    const onRemoved = (id) => {
      if (id === tabId) finish(new Error('The login tab was closed before the login finished'))
    }

    const timer = setTimeout(() => finish(new Error('Login timed out. Try again from the app.')), TIMEOUT)

    chrome.tabs.onUpdated.addListener(onUpdated)
    chrome.tabs.onRemoved.addListener(onRemoved)
    chrome.tabs.create({ url, active: true, openerTabId }).then((tab) => (tabId = tab.id), finish)
  })
}
