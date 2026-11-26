# pauseai.to

PauseAI Toronto’s website: plain HTML, CSS and JavaScript. No framework, application build or visitor tracking.

- Main website: https://pauseai.to
- Alternate address: https://www.pauseai.to
- Cloudflare address: https://pauseaitoronto.pages.dev
- Hosting and DNS target: Cloudflare’s free plan. GoDaddy remains the registrar.
- Source: this repository, branch main. Hosting targets are in deploy-config.json.

## Publish a change

After editing and reviewing the files, run this one command from this folder:

```sh
./deploy "Describe the change"
```

It checks the site, safely commits recognised changes, packages only committed public files, pushes main, waits for GitHub’s independent checks, publishes to Cloudflare Pages, and verifies the exact release over HTTPS on all three addresses. It never force-pushes or silently merges remote changes. A failed check prevents publication. It refuses another branch, merge conflicts, unknown files or a remote main with commits missing locally.

The command uses the existing GitHub CLI and Wrangler logins. No hosting token is stored in this public repository or GitHub. It uses pinned Wrangler 4.160.0 from the local installation or cache, and falls back to npx on a new machine. The Cloudflare project already exists: do not use Wrangler’s --force flag.

A GitHub web edit or plain push runs checks but does not publish by itself. Run the deploy command afterward, even if the checkout is already clean. This keeps publishing under the user’s control and avoids a new persistent CI credential. If another computer or github.com changed main, run git pull --ff-only before editing; if it refuses, preserve local work and resolve the divergence before publishing.

Local tools: Git, Python 3.9+, Node.js, npm/npx, curl and gh. These are installed on Muhammad’s Mac; helpers find the common Mac binary locations even from a non-login shell. A new computer also needs gh auth login and npx wrangler@4.160.0 login. The existing Cloudflare account needs permission to deploy to the project. Do not put credentials in the checkout.

## Preview or check separately

For a local preview, run:

```sh
./preview
```

Open http://localhost:8000. This command keeps running; press **Ctrl+C** to stop it before using the same terminal for another command. The preview stays on your computer. Do not paste preview and deploy commands as a sequence.

To check without committing or publishing, run:

```sh
./deploy --check
```

To verify whether the current Git commit is live on Cloudflare and both custom domains, run:

```sh
./deploy --status
```

Checks cover the eleven HTML pages, local files and anchors, CSS asset references, sitemap XML, embedded JSON, riding-button/data consistency, donation URL format and JavaScript syntax. They do not prove rendering, factual accuracy, consent, external services or successful payments. Inspect desktop and mobile for visual changes. Never make a test donation.

Only root HTML, approved assets, robots/sitemap/favicon, CNAME and .nojekyll are packaged. Maintenance scripts, instructions, Git history, credentials and scratch files are excluded. release.json contains only the deployed commit and checksums of public website files. Verification downloads the manifest and every public file over normal certificate-validated HTTPS, then compares them with that commit. Git is read once per release, so images do not each start another Git process.

## If a deployment stops

A commit or push already completed remains in place. A Cloudflare upload already completed also remains in place. Run ./deploy --status to inspect the actual served files. If publication did not finish, rerun the same deploy command; a clean checkout can be published again without a new commit. GitHub checks are at https://github.com/Mzane0803/pauseaitoronto.info/actions/workflows/pages.yml.

Checks passing, Cloudflare accepting an upload, and public-domain verification are different states. Only PUBLIC SITE VERIFIED confirms the exact files at the printed URL. A failed public check after upload can indicate propagation or a service issue; inspect the error before reverting.

To undo a content commit without rewriting history:

```sh
git revert COMMIT_TO_UNDO
./deploy "Revert event update"
```

For several changes, revert the intended commits newest first. Inspect the inverse diff carefully before reverting deployment tooling. Never force-push.

## What is where

| Page | File |
|---|---|
| Home | `index.html` |
| About (plan, track record, team, governance) | `about.html` |
| Campaigns | `campaigns.html` |
| Write to your MP | `write-to-your-mp.html` |
| Join us (form) | `join.html` |
| Donate | `donate.html` |
| Media | `media.html` |
| Campus | `campus.html` |
| Styles, scripts, fonts, images | `assets/` |

`events.html` and `shop.html` redirect to the matching part of the home page. `plan.html`, `governance.html` and `team.html` redirect to the matching part of `about.html`.

The header menu and the footer are repeated in each of the eight pages. If you change one, change all eight.

The MP page looks up the riding for a postal code with Open North's Represent API, in the visitor's browser. The MP's name always comes from the list in the page, because Represent's member list lags by-elections; its email address is used only when it names the same MP. The join form opens a pre-filled email to the team unless `data-endpoint` on the form in `join.html` is set to a service that accepts a JSON POST. Three MPs elected in 2026 by-elections (University—Rosedale, Scarborough Southwest, Beaches—East York) carry an `email` in `riding-data`, copied from their House of Commons pages on 25 November 2026, because Represent still lists their predecessors; an `email` in the list is always used ahead of Represent's.

| To change | Where |
|---|---|
| Team bios, photos, links | `about.html`, the section with `id="team"`. Photos are square JPEGs in `assets/img/`. |
| Board and donation policies | `about.html`, from `id="governance"` down |
| Theory of change, milestones, track record | `about.html` |
| Donation amounts and checkout links | `donate.html`, the JSON inside `<script id="give-data">`. Each monthly amount has its own Stripe payment link; all one-off amounts share one link. The links are created in the Stripe dashboard under Payment Links. |
| e-Transfer address, major-gifts email, Manifund link | `donate.html` |
| MPs and ridings (snapshot of 16 Nov 2026) | `write-to-your-mp.html`: the list of buttons and the JSON inside `<script id="riding-data">`. The letter text is in `assets/mp.js`. |
| Photo wall on the home page | `index.html`, the two `wall-track` rows: colour photographs on top, black-and-white below. Each list appears twice so the loop has no gap. Images are `assets/img/w-*.jpg`, 680 px tall, any width. |
| Media page photos and video | `media.html`. Kept deliberately short: one wide photograph, then pairs. Add a photo by adding an `<li>` to the `shots` list (`wide` spans the page, `land` is a landscape half, `tall` is a portrait half; put portraits in pairs). Thumbnails reuse the wall images; the large versions are in `assets/img/media/` (1920 px on the long edge). Videos are 720p copies in `assets/video/`; every file must stay under Cloudflare Pages’ 25 MiB per-file limit. Poster frames are `assets/img/media/v-*.jpg`. The photo viewer is `assets/media.js`. The page uses Public Sans only. |
| Photo and media credits | A small grey “i” button opens a credit card. It is the native `popover` (a `<button popovertarget>` and a `<div class="note" popover>` with a matching id), so it needs no script. Copy an existing pair and give it a new id. |
| Shop products and prices (US$, snapshot of 16 Nov 2026) | `index.html`, the `<ul class="rack">` list. Checkout happens on the PauseAI shop. |
| WhatsApp, Luma, Instagram, X links | Search for the old link across the seven pages and replace it. |
| Colours and fonts | Top of `assets/site.css` |

## Ownership and domain settings

Repository collaborators can edit source. A deployer also needs access to the Cloudflare project. Do not transfer the repository, registrar or Cloudflare account as part of routine content work.

Cloudflare account: 6e5a10d09e822840e4978458bdc36e79. Pages project: pauseaitoronto. Zone: pauseaitoronto.info. Assigned authoritative nameservers: daphne.ns.cloudflare.com and peter.ns.cloudflare.com. The registrar’s delegation and Cloudflare active status must be verified before declaring a cutover complete. These settings are a one-time setup; future content deploys need no DNS changes.

The apex and www CNAME records both point to pauseaitoronto.pages.dev. Both hostnames must also be attached to the Pages project under Custom domains. Preserve the Google MX record, root SPF, nested dc-bdaca08905._spfm TXT record, Google DKIM, DMARC, verification TXT and _domainconnect CNAME. Mail records remain DNS-only. The original GoDaddy zone was exported before the move; the automated scan missed the nested SPF record, which was added explicitly.

The old GitHub Pages deployment remains a fallback snapshot, but its publishing job has been removed from the workflow. CNAME is retained as a checked domain reference. Cloudflare supplies HTTPS. Do not change mail routing, buy anything, or move to another host during normal website updates.

Official references: https://developers.cloudflare.com/pages/configuration/custom-domains/ and https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/.

## Moving to pauseai.to (prepared, not done)

This branch points every page address, the sitemap, `CNAME`, the checker and the deploy targets at pauseai.to. Email addresses stay on pauseaitoronto.info. Do not merge or deploy it until all of these are true:

1. pauseai.to is registered and added to the same Cloudflare account as its own zone, with the registrar's nameservers switched to the ones Cloudflare assigns to that zone (they may differ from the ones above).
2. pauseai.to and www.pauseai.to are attached to the Pages project `pauseaitoronto` under Custom domains, and both show as active with HTTPS.
3. pauseaitoronto.info and www.pauseaitoronto.info stay attached until the first deploy from this branch is verified, then are replaced by a permanent (301) redirect to the same path on pauseai.to, set in Cloudflare. Keep that domain registered: printed signs, QR codes, Stripe, Luma and old links point at it.
4. The pauseaitoronto.info mail records (Google MX, SPF, DKIM, DMARC) are left exactly as they are. team@ and donate@ keep working there.

`./deploy` verifies the public addresses in `deploy-config.json`, so it fails safely if steps 1 and 2 are not finished.

## Credits

- Fonts: Public Sans, Playfair Display, Newsreader, Archivo. All SIL Open Font License, self-hosted in `assets/fonts`.
- Photos on the home page wall and the media page: David Akio Grant (https://davidakiogrant.com/), Toronto AI Treaty March, 14 November 2026. Files are resized only; camera metadata is removed.
- Video on the media page, and the older march stills on the plan and donate pages: Danny Choi.
- Interviews on the media page: Daniel Austin with marchers at Queen’s Park.
- Music in the recap film (`assets/video/story-52s.mp4`): “Emergent” by Scott Buckley (www.scottbuckley.com.au), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Excerpted, faded and mixed with recorded sound. Keep this credit wherever that film is shown.
- The September 2026 event photo is by Georgia Berg.
- Shop images: the PauseAI shop (pauseai-shop.fourthwall.com).
- Footer icons are plain line drawings, not the companies' logos.
