# pauseaitoronto.info

The website of PauseAI Toronto. Plain HTML, CSS and JavaScript: no build step, no framework, no tracking.

**Site:** https://pauseaitoronto.info

## How it goes live

This repository is published for free with GitHub Pages. A push to `main` runs checks, packages the public files, and publishes only if those checks pass. No framework, npm install, hosting token or build service is needed. The workflow is `.github/workflows/pages.yml`; GitHub supplies its own short-lived deployment token.

Normal updates take roughly 1–3 minutes after a push; GitHub queues can take longer. DNS is a one-time setup, not part of future deployments. The domain must point to GitHub and have a valid HTTPS certificate before public verification can pass.

## How to make a change

For Codex, Claude or anyone using this checkout:

```sh
./preview                       # http://localhost:8000; Ctrl+C stops it
./deploy --check                 # check only; no publishing
./deploy "Update event details"  # check, commit, push, wait, verify
./deploy --status                # recent releases + exact public-site verification
```

Run from this folder on `main`. Local requirements: Git, Python 3.9+, Node.js (syntax checks only) and the GitHub CLI (`gh`) signed into an account with repository write access. They are already installed on Muhammad's Mac; the helper also finds `~/.local/bin/gh`. A new computer needs these tools and `gh auth login`; GitHub's web editor needs none of them. Set a real local Git identity before committing from a new clone.

The deploy command includes all recognised changed website/maintenance files. Review `git diff` first. It refuses unknown files, a non-main branch, merge conflicts, or a remote main with commits missing locally. It never force-pushes or silently merges. If remote main advanced, save/commit your local work, run `git pull --ff-only`, resolve any issue, then retry.

GitHub web editing also works: open a file, click the pencil, edit, and **Commit changes** to main. [Actions](https://github.com/Mzane0803/pauseaitoronto.info/actions/workflows/pages.yml) shows checks and deployment. Pull requests run the same checks without publishing. Publishing still requires your authorization when an agent is doing the work.

Checks cover the nine HTML pages, local assets, internal anchors, CSS file references, sitemap XML, embedded JSON, riding-button/data consistency, donation-link format and JavaScript syntax. They do not prove rendering, person/photo consent, policy claims, external-site availability or a successful payment. Preview desktop/mobile for visual changes. Do not make a test donation.

Only root HTML, approved static assets, robots/sitemap/favicon, CNAME and .nojekyll are packaged. Maintenance scripts, Git history, README and scratch files are not web pages. `release.json` exposes only the deployed commit and public-file checksums. Public verification downloads that manifest and every public file over HTTPS, compares them with the requested Git commit, and fails if the domain redirects elsewhere.

If the command stops after pushing, GitHub keeps deploying. Use `./deploy --status`; do not repeat edits or force-push to restart it. A successful workflow means GitHub accepted the release. Only **PUBLIC SITE VERIFIED** means this machine checked the domain's exact contents. A failed release check leaves the previous deployment in place; a failed public verification can also mean DNS/HTTPS/CDN delay, so inspect the error before reverting.

To undo a content commit without rewriting history:

```sh
git revert COMMIT_TO_UNDO
./deploy "Revert event update"
```

For several changes, revert each intended commit newest first. Inspect the inverse diff for a commit that changes hosting/deployment tooling. A failed workflow can be re-run from its Actions page after fixing the cause, or use **Run workflow** on main to republish the current source. No new commit is needed for a transient GitHub failure.

The preview stays on your computer. Publishing starts only when changes reach main (or the main workflow is manually run).

## What is where

| Page | File |
|---|---|
| Home | `index.html` |
| Take action (write to your MP) | `write-to-your-mp.html` |
| Donate | `donate.html` |
| Our plan | `plan.html` |
| Governance | `governance.html` |
| Styles, scripts, fonts, images | `assets/` |

`events.html`, `team.html` and `shop.html` only redirect to the matching part of the home page.

The header menu and the footer are repeated in each of the five pages. If you change one, change all five.

| To change | Where |
|---|---|
| Team bios, photos, links | `index.html`, the section with `id="team"`. Photos are square JPEGs in `assets/img/`. |
| Board and donation policies | `governance.html` |
| Theory of change, milestones, track record | `plan.html` |
| Donation amounts and checkout links | `donate.html`, the JSON inside `<script id="give-data">`. Each monthly amount has its own Stripe payment link; all one-off amounts share one link. The links are created in the Stripe dashboard under Payment Links. |
| e-Transfer address, major-gifts email, Manifund link | `donate.html` |
| MPs and ridings (snapshot of 16 Nov 2026) | `write-to-your-mp.html`: the list of buttons and the JSON inside `<script id="riding-data">`. The letter text is in `assets/mp.js`. |
| Photo wall on the home page | `index.html`, the two `wall-track` rows. Each list appears twice so the loop has no gap. Images are `assets/img/t-*.jpg`, 680 px tall, any width. |
| Shop products and prices (US$, snapshot of 16 Nov 2026) | `index.html`, the `<ul class="rack">` list. Checkout happens on the PauseAI shop. |
| WhatsApp, Luma, Instagram, X links | Search for the old link across the five pages and replace it. |
| Colours and fonts | Top of `assets/site.css` |

## Handing the site to someone else

- **Give someone edit access:** Settings → Collaborators → Add people.
- **Move it to an organisation or another account:** Settings → General → Transfer ownership. Then re-enter the custom domain under Settings → Pages.

## The domain

To serve the site at pauseaitoronto.info instead of the github.io address:

1. In this repository: Settings → Pages → Source → **GitHub Actions**. Keep Custom domain set to `pauseaitoronto.info`. With Actions, the Pages setting controls the domain; CNAME is kept as a checked reference, not as the active configuration.
2. At GoDaddy, remove website forwarding to pauseai.ca. Set the four `@` A records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`. Set `www` CNAME to `mzane0803.github.io`. Preserve MX/TXT and other email records. Do not point the domain to any other host. [GitHub's domain instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
3. Back in Settings → Pages, tick **Enforce HTTPS** once the certificate is available. DNS can take up to 24 hours to propagate; certificate availability may take longer. Then run `./deploy --status` and open both the apex and www addresses.

## Credits

- Fonts: Public Sans, Playfair Display, Newsreader, Archivo. All SIL Open Font License, self-hosted in `assets/fonts`.
- Photos: Toronto AI Treaty March, 14 November 2026 (stills from the march footage); the September 2026 event photo is by Georgia Berg.
- Shop images: the PauseAI shop (pauseai-shop.fourthwall.com).
- Footer icons are plain line drawings, not the companies' logos.
