# Curriculum

A static personal CV and portfolio for Frankeo, including experience, **on-the-edge** projects, and latest personal projects. Responsive, accessible, and build-free; no application dependencies or backend.

## Run locally

Requires Python 3 to serve the site and Node.js 22+ to run checks:

```sh
npm start
# Open http://localhost:8080
npm run check
npm test
```

Use an HTTP server, not `file://`, because the page loads `cv.json` and JavaScript modules.

## Edit, export, and publish

- Open **Edit CV** to edit the profile, skills, experience, and either project list. Projects display newest first by their optional month.
- Edits save immediately in this browser's local storage. No invented career details are supplied: replace the initial introduction and add your own entries.
- **Export PDF** opens the browser print dialog. Select **Save as PDF**, A4, and turn off browser headers/footers for a clean CV without editor controls.
- **Download CV data** exports `cv.json`; **Import CV data** restores an exported file. **Use published CV** replaces the private browser draft with the committed data.
- To update the public website, replace the repository's `cv.json` with your downloaded file and commit it. Browser edits and private Drive backups do **not** modify GitHub or the public site. Other visitors can edit their own private drafts, not yours.
- Only put information you intend to make public in the committed CV. Import and Drive restore expect this site's JSON schema, not a Google Docs document. Editing an existing Google Doc does not automatically update this site.

## Google Drive backups (optional)

Local saving, JSON export, and PDF export work without Google. Drive backups require your own Google Cloud configuration; no credentials are included.

1. In [Google Cloud Console](https://console.cloud.google.com/), create/select a project and enable **Google Drive API**.
2. Configure the OAuth consent screen and add `https://www.googleapis.com/auth/drive.appdata` to the requested scopes. While the app is in Testing, add your Google account as a test user. Google's testing-mode and verification policies apply.
3. Create an **OAuth client ID → Web application**. Add authorized JavaScript origins: `http://localhost:8080` for development and `https://frankeo.github.io` for production. Origins have no path, even if deploying under `/curriculum/`. No redirect URI is needed for this popup token flow.
4. Paste the client ID (ending in `.apps.googleusercontent.com`) into the editor and click **Connect Drive**. A browser OAuth client ID is a public identifier, **not** a client secret. Never add a client secret, password, or access token to the repository.
5. After connecting, each valid edit session is backed up automatically after a one-second pause in typing. **Back up now** saves the current draft immediately. Connecting alone does not create a backup, so you can safely choose **Restore latest** first.

Each backup creates a separate `curriculum-backup.json` revision in Drive's private **application data folder**. These files are intentionally not visible in the normal Drive file list; **Restore latest** retrieves the newest one for the same account and OAuth application. The scope does not grant access to unrelated Drive files. Use JSON download for a directly accessible backup. Backups contain CV data, not PDFs.

Access tokens stay in memory only. After token expiry, reconnect to continue backups. Unsent revisions are retried in order on reconnect or **Back up now**; the newest draft remains in browser storage on failure. If you close/reload the tab or disconnect, the in-memory upload queue is lost: reconnect and use **Back up now** to save that local draft. Wait for “Saved to Google Drive” before closing the tab when you need a remote backup. Browser storage may be cleared or unavailable, so keep exported copies too.

Google sign-in loads only when requested. After connection, your CV is sent directly to Google's API; there is no intermediary server. Disconnect revokes the token and stops backups but does not delete existing Drive revisions or browser drafts. Revisions consume your Drive quota.

## GitHub Pages

The included workflow deploys only the six public site/data files on pushes to `main` (change the branch in `.github/workflows/pages.yml` if your default branch differs). In repository **Settings → Pages → Build and deployment**, select **GitHub Actions**, then run the workflow or push a commit. All asset paths are relative, so project and user sites both work.

- This repository (`Frankeo/curriculum`) normally publishes to **https://frankeo.github.io/curriculum/**.
- For the requested personal root URL, **https://frankeo.github.io/**, publish these files and the workflow in the **Frankeo/frankeo.github.io** repository instead (or rename this repository to `frankeo.github.io` if that name is available). A project repository alone cannot take over your user-site root.

GitHub Pages activation, Google Cloud setup, and publishing your real CV content must be completed by the account owner.
