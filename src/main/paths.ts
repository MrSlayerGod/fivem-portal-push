import { app } from 'electron'
import { join } from 'path'

const demo = process.argv.includes('--demo') || process.argv.includes('--screenshots')
app.setPath('userData', join(app.getPath('appData'), demo ? 'fivem-portal-push-demo' : 'fivem-portal-push'))
