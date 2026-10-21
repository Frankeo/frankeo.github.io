A personal portfolio built with Next.js and TypeScript. It turns the CV's professional summary and technical skills into an editorial About section, shows a portrait from the configured GitHub account, and highlights the four most-starred public repositories from both the personal account and company organization. The CV is read-only here; edits happen in Google Docs. The PDF action prints the complete original CV.
# Curriculum

A personal portfolio built with Next.js and TypeScript. It shows the public Google Docs CV, a portrait from the configured GitHub account, the four most-starred public repositories from both the personal account and company organization, and GitHub/LinkedIn links. The CV is read-only here; edits happen in Google Docs. The PDF action prints only the CV.

Everything in the configured Google Doc is published publicly. Keep private information out of that document.

## Run locally

Requires Node.js 22+ and Yarn 1.22.22. No Google credentials are needed.

```sh
yarn install
yarn typecheck
yarn test
yarn dev
# Open http://localhost:3000
```

The Google Doc URL, page title, GitHub username, company organization, and LinkedIn URL are in [`document-config.json`](document-config.json). Change those values there when needed. The document must be shared so anyone with its link can view it. Next.js downloads its public HTML export and sanitizes it before rendering. Personal and company repositories are embedded during the build, then fetched again without cache each time someone opens the page, so star changes can reorder both top-four lists without a redeployment. The page keeps the embedded rankings if GitHub is temporarily unavailable or rate-limits the request.

## Publish updates

After editing the Google Doc, push a commit to `main` or manually run the workflow from **Actions** to refresh the published page. No Actions secrets are required. The **Save as PDF** button opens the browser print dialog; choose **Save as PDF** there.

## GitHub Pages

This repository (`Frankeo/frankeo.github.io`) publishes the personal site at **https://frankeo.github.io/**. The workflow in `.github/workflows/pages.yml` installs with Yarn, runs checks and tests, fetches the public Google Doc at build time, and deploys the static Next.js export when a commit is pushed to `main`. You can also run it manually from the repository's **Actions** tab.

Before the first deployment, open repository **Settings → Pages → Build and deployment** and select **GitHub Actions** as the source. GitHub Pages activation and publishing your real CV content must be completed by the account owner.
