const id = new URLSearchParams(location.search).get('id')

const answer = (allowed) => chrome.runtime.sendMessage({ type: 'confirm', id, allowed }).finally(() => window.close())

document.getElementById('allow').addEventListener('click', () => answer(true))
document.getElementById('deny').addEventListener('click', () => answer(false))
