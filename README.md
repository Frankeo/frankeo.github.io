# Curriculum

A personal portfolio built with Next.js and TypeScript. It turns the CV's professional summary and technical skills into an editorial About section, presents job history as a timeline, and highlights education, certifications, languages, and the four most-starred public repositories from both the personal account and company organization. GitHub and LinkedIn links are included. The CV is read-only here; edits happen in Google Docs. The PDF action prints the complete original CV.

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

## Codespaces and VS Code

New GitHub Codespaces use [the dev container configuration](.devcontainer/devcontainer.json), which provides Node.js 22 and installs dependencies with Yarn 1.22.22. To use the blue VS Code accents, open the [workspace file](.devcontainer/dotfiles.code-workspace); its folder points to the repository root. Run `yarn dev` to start the app.

Container creation also clones [Frankeo/dotfiles](https://github.com/Frankeo/dotfiles) into `~/dotfiles` if it is not already present and runs `installations/devcontainer.sh` as the `node` user. This installs Oh My Zsh, Powerlevel10k, syntax highlighting, and autosuggestions, and links the shell configuration. An existing clone is reused without automatically pulling updates. New integrated terminals use Zsh.

The terminal font is set to **MesloLGS NF**. For desktop VS Code, install that font on your local machine; installing it only inside the container will not render the prompt icons locally. Browser-based Codespaces also needs a font available to the browser. After rebuilding, close any old terminals and open a new one.

The Google Doc URL, page title, GitHub username, company organization, and LinkedIn URL are in [`document-config.json`](document-config.json). Change those values there when needed. The document must be shared so anyone with its link can view it. Next.js downloads its public HTML export, sanitizes it, and extracts the summary, skills, experience, education, certifications, and languages headings for the portfolio. The complete CV remains available to print as PDF. Personal and company repositories are embedded during the build, then fetched again without cache each time someone opens the page, so star changes can reorder both top-four lists without a redeployment. Each selected repo's thumbnail is discovered from its README or image assets at build and refresh time; repos without a usable image get a generated text-and-language visual. No per-repository image map needs maintenance. The page keeps embedded rankings if GitHub is temporarily unavailable or rate-limits the request.

## Publish updates

After editing the Google Doc, push a commit to `main` or manually run the workflow from **Actions** to refresh the published page. No Actions secrets are required. The **Save as PDF** button opens the browser print dialog; choose **Save as PDF** there.

## GitHub Pages

This repository (`Frankeo/frankeo.github.io`) publishes the personal site at **https://frankeo.github.io/**. The workflow in `.github/workflows/pages.yml` installs with Yarn, runs checks and tests, fetches the public Google Doc at build time, and deploys the static Next.js export when a commit is pushed to `main`. You can also run it manually from the repository's **Actions** tab.

Before the first deployment, open repository **Settings → Pages → Build and deployment** and select **GitHub Actions** as the source. GitHub Pages activation and publishing your real CV content must be completed by the account owner.
