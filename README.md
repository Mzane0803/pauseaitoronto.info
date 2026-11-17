# pauseaitoronto.info

The website of PauseAI Toronto. Plain HTML, CSS and JavaScript: no build step, no framework, no tracking.

**Live preview:** https://mzane0803.github.io/pauseaitoronto.info/

## How it goes live

This repository is published with GitHub Pages. Every change to the `main` branch is on the live site about a minute later. There is nothing to install or run.

## How to make a change

1. Open the file on github.com and click the pencil icon.
2. Edit, then "Commit changes".
3. Wait a minute and reload the site.

To preview on your own computer first: download the repository, then run `python3 -m http.server` in its folder and open http://localhost:8000.

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

1. In this repository: Settings → Pages → Custom domain → `pauseaitoronto.info` → Save.
2. At the domain registrar: remove the forwarding to pauseai.ca, then add the DNS records GitHub lists at https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site
3. Back in Settings → Pages, tick "Enforce HTTPS" once it becomes available.

## Credits

- Fonts: Public Sans, Playfair Display, Newsreader, Archivo. All SIL Open Font License, self-hosted in `assets/fonts`.
- Photos: Toronto AI Treaty March, 14 November 2026 (stills from the march footage); the September 2026 event photo is by Georgia Berg.
- Shop images: the PauseAI shop (pauseai-shop.fourthwall.com).
- Footer icons are plain line drawings, not the companies' logos.
