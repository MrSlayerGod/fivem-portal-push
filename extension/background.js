const APP = 'http://127.0.0.1:47821'
const TIMEOUT = 5 * 60 * 1000

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type !== 'connect') return
  connect(msg.nonce, sender.tab?.id).then(sendResponse, (e) => sendResponse({ ok: false, error: e?.message ?? String(e) }))
  return true
})

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
