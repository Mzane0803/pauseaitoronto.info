# PauseAI Toronto website

Read README.md first. Plain HTML/CSS/JS, Cloudflare Pages, $0 hosting, no application dependencies.

- Preview: `./preview`. Check: `./deploy --check`.
- Once the user authorizes publishing, run `./deploy "Plain description"` from main. It checks, commits, packages, pushes, waits for GitHub checks, publishes through the existing Wrangler login and verifies every public file at the Pages URL plus apex and www domains. `./deploy --status` is read-only. A GitHub push alone runs checks; publication requires the deploy command. There is no Cloudflare token stored in GitHub or in the repository.
- Distinguish checks passing, Cloudflare upload success and exact public HTTPS verification. Never claim the custom domains are live unless verification passed. A failed check prevents publication; the previous deployment remains. Deployment targets are in deploy-config.json. Do not add --force to Wrangler commands: the Pages project already exists.
- The user authorized migration from GitHub Pages to Cloudflare on 17 November 2026. The target provider is Cloudflare for hosting and DNS; GoDaddy remains the registrar. Verify delegation and HTTPS before declaring the cutover complete. Do not change providers again, buy anything, force-push, rewrite history, or delete earlier draft folders. Preserve all Google mail, SPF, DKIM, DMARC and verification DNS records. Do not put secrets in this public repository. Do not send messages as the organisation.
- The five main pages duplicate their menu and footer. Keep shared edits consistent. Preserve the design and approved wording; the current theory of change is “We turn public concern about AI into political pressure, and pressure into key policy milestones.”
- New people/photos require consent. Stripe account changes, donations and payments are outside routine site maintenance. Editing the site must not silently change financial policy or factual claims.
- Before shipping visual changes, inspect desktop and mobile previews. Automated static checks do not verify rendering, factual accuracy, external services or checkout payments.
- Roll back using `git revert COMMIT`, then `./deploy "Revert description"`. No force pushes. For commits touching deployment tooling, inspect the inverse diff before reverting.
