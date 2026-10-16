# Changelog

All notable changes to FiveM Portal Push. Versions follow [semantic versioning](https://semver.org/); the newest is on top.

## 1.1.2 - 2026-10-16

### Security

- Files that usually hold passwords or keys are never zipped, in the script folder or in extra content: `server.cfg`, `.env*`, `.git`, `.ssh`, `.gnupg`, `.aws`, `.git-credentials`, `.npmrc`, `id_rsa*`, `id_ed25519*`, `id_ecdsa*`, `*.key`, `*.pem`, `*.pfx`, `*.p12`. A `.portalbundle` entry that points at one of them is refused.
- Your home folder, or a folder that holds it, no longer counts as a place extra content may come from, even when it is a git repo or a script folder.

## 1.1.1 - 2026-10-16

### Security

- Extra content sources from `.portalbundle` must sit inside the script's git repo or one of your script folders, and never in the app's own data folder. Links that point outside are followed and checked too. Before this, a `.portalbundle` that came with someone else's resource could add any file on your PC to the portal upload.

## 1.1.0 - 2026-10-16

### Added

- **Update post.** After the portal upload is live, post the update to your own site and/or Discord in the same push. It carries the update notes, the changed files from the changelog, the Tebex package, a role to tag and up to 10 images.
  - **Update API:** any site can take the updates through three small endpoints behind a Bearer key. Every field and answer is described in [docs/update-api.md](docs/update-api.md).
  - **Discord:** send with a webhook, or with a bot token and channel ID. The bot mode lists the server roles to tag.
  - **Tebex:** pick the package from your store with the public key. It is matched by name the first time and remembered per script.
  - A failed post does not undo the upload. The git step still runs, and **Post update again** retries the post.
- **Settings window** (gear button in the sidebar):
  - choose which switches start on for every script: GitHub commit and push, update API, Discord
  - set up the update API, Discord and Tebex connections, each with a **Test connection** button
- **Extra content in the zip.** Add other resources (a shared library, a bridge) or loose files like install notes to the same upload. They sit next to the script folder at the zip root and can be renamed inside the zip. The list is saved to `.portalbundle` in the script folder, and each extra folder uses its own `.portalignore`.

### Changed

- The update API key, Discord bot token and webhook URL are stored encrypted with Windows DPAPI in `secrets.json`, apart from `config.json`. The window never receives them back.
- The GitHub switch only remembers a script's choice when it differs from the default in Settings. Changing the default resets those saved choices.
- The sidebar header fits the app name next to its buttons again.

## 1.0.0 - 2026-10-12

First public release.

- Lists every FiveM resource in your folders, changed scripts first
- Shows the versions already on the Cfx.re Portal and suggests the next one
- Writes the version into `fxmanifest.lua`; `-b1` style versions upload as a beta
- Frees a slot when the asset already has 5 versions
- Zips the resource with your `.portalignore` rules and uploads it
- Prefills the changelog from git
- Optionally commits the folder and pushes it to GitHub
- Logs in through the browser you already use, without copying cookies
