document.documentElement.dataset.ext = '1'

const nonce = new URLSearchParams(location.search).get('n')

const setStatus = (state, text) => {
  const apply = () => window.dispatchEvent(new CustomEvent('portal-push', { detail: { state, text } }))
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply, { once: true })
  else apply()
}

if (nonce) {
  setStatus('working', 'Logging in to the Cfx.re portal with this browser')
  chrome.runtime.sendMessage({ type: 'connect', nonce }, (res) => {
    if (chrome.runtime.lastError) setStatus('error', chrome.runtime.lastError.message)
    else if (res?.ok) setStatus('done', 'Connected. You can go back to FiveM Portal Push.')
    else setStatus('error', res?.error ?? 'Something went wrong. Try again from the app.')
  })
}
