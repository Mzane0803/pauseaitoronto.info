# PauseAI Toronto website

Read README.md first. Plain HTML/CSS/JS, GitHub Pages, $0 hosting, no npm dependencies.

- Preview: `./preview`. Check: `./deploy --check`.
- Once the user authorizes publishing, run `./deploy "Plain description"` from main. It checks, commits, pushes, waits for the release and verifies the exact public files. `./deploy --status` is read-only. A push to main also deploys automatically through `.github/workflows/pages.yml`.
- Distinguish GitHub deployment success from public-domain verification. Never claim the domain is live unless verification passed. A failed check prevents the new artifact from being published; the previous deployment remains.
- Do not change hosting provider, buy anything, force-push, rewrite history, or delete earlier draft folders. Do not put secrets in this public repository. Do not send messages as the organisation.
- The five main pages duplicate their menu and footer. Keep shared edits consistent. Preserve the design and approved wording; the current theory of change is “We turn public concern about AI into political pressure, and pressure into key policy milestones.”
- New people/photos require consent. Stripe account changes, donations and payments are outside routine site maintenance. Editing the site must not silently change financial policy or factual claims.
- Before shipping visual changes, inspect desktop and mobile previews. Automated static checks do not verify rendering, factual accuracy, external services or checkout payments.
- Roll back using `git revert COMMIT`, then `./deploy "Revert description"`. No force pushes. For commits touching deployment tooling, inspect the inverse diff before reverting.
