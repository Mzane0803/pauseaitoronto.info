#!/usr/bin/env python3
"""One command to check, commit, push, publish to Cloudflare and verify HTTPS."""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time

from site_tools import ROOT, check, git, is_public, package, verify


def run(*args, capture=False, env=None):
    result = subprocess.run(args, cwd=ROOT, text=True, check=True, env=env, stdout=subprocess.PIPE if capture else None)
    return result.stdout.strip() if capture else None


def tool(name):
    found = shutil.which(name)
    if found:
        return found
    for parent in (Path.home() / ".local/bin", Path("/usr/local/bin"), Path("/opt/homebrew/bin")):
        if (parent / name).is_file():
            return str(parent / name)
    raise ValueError(f"{name} is required; see README.md.")


def wrangler_command(version):
    candidates = [ROOT / "node_modules/wrangler/package.json"]
    candidates.extend(sorted((Path.home() / ".npm/_npx").glob("*/node_modules/wrangler/package.json")))
    for candidate in candidates:
        if candidate.is_file() and json.loads(candidate.read_text()).get("version") == version:
            return [tool("node"), str(candidate.parent / "bin/wrangler.js")]
    return [tool("npx"), "--yes", "wrangler@" + version]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("message", nargs="?", help="Plain-language description of the change")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Run checks without committing or publishing")
    mode.add_argument("--status", action="store_true", help="Verify the current commit on Cloudflare and both custom domains")
    args = parser.parse_args()
    if args.check:
        check()
        return
    config = json.loads((ROOT / "deploy-config.json").read_text())
    urls = [config["pages_url"], *config["public_urls"]]
    if args.status:
        for url in urls:
            verify("HEAD", url)
        return
    if not args.message or not args.message.strip():
        parser.error('Use ./deploy "Describe the change", ./deploy --check or ./deploy --status.')
    if run("git", "branch", "--show-current", capture=True) != "main":
        raise ValueError("Deploy from main. Other branches are checked without publishing.")
    gh = tool("gh")
    wrangler = wrangler_command(config["wrangler_version"])
    cloudflare_env = dict(os.environ, CLOUDFLARE_ACCOUNT_ID=config["account_id"])
    # Include Node's directory when Codex launches a non-login shell.
    cloudflare_env["PATH"] = str(Path(tool("node")).parent) + os.pathsep + cloudflare_env.get("PATH", "")
    repo = run(gh, "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner", capture=True)
    run(gh, "auth", "status")
    run(*wrangler, "whoami", env=cloudflare_env)
    check()
    run("git", "diff", "--check", "HEAD")
    run("git", "fetch", "origin", "main")
    if subprocess.run(["git", "merge-base", "--is-ancestor", "origin/main", "HEAD"], cwd=ROOT).returncode:
        raise ValueError("Remote main has new commits. Save your changes, pull with --ff-only, then retry. Nothing was committed or pushed.")
    if git("diff", "--name-only", "--diff-filter=U").strip():
        raise ValueError("Resolve merge conflicts before deploying.")
    changed = set(filter(None, git("diff", "--name-only", "--no-renames", "-z", "HEAD").decode().split("\0")))
    changed.update(filter(None, git("ls-files", "--others", "--exclude-standard", "-z").decode().split("\0")))
    controls = {"CNAME", ".nojekyll", ".gitignore", "README.md", "AGENTS.md", "deploy", "preview", "deploy-config.json", ".github/workflows/pages.yml"}
    unexpected = sorted(name for name in changed if not (is_public(name) or name in controls or (name.startswith("scripts/") and name.endswith(".py"))))
    if unexpected:
        raise ValueError("Unrecognised files were not staged. Move private/scratch files outside the repository or add intentional files manually to the helper's allowlist:\n" + "\n".join(unexpected))
    if changed:
        run("git", "add", "--all", "--", *sorted(changed))
        run("git", "commit", "-m", args.message)
    commit = run("git", "rev-parse", "HEAD", capture=True)
    package()
    run("git", "push", "origin", "main")
    print(f"Commit: https://github.com/{repo}/commit/{commit}", flush=True)
    print("Waiting for GitHub checks (up to 10 minutes). Cloudflare publication follows only after they pass.", flush=True)
    deadline, previous = time.monotonic() + 600, None
    while time.monotonic() < deadline:
        runs = json.loads(run(gh, "run", "list", "--repo", repo, "--workflow", "pages.yml", "--commit", commit, "--branch", "main", "--event", "push", "--limit", "1", "--json", "status,conclusion,url,databaseId", capture=True))
        if runs:
            release = runs[0]
            state = (release["status"], release["conclusion"])
            if state != previous:
                print(f"GitHub checks: {release['status']} {release['conclusion'] or ''} — {release['url']}", flush=True)
                previous = state
            if release["status"] == "completed":
                if release["conclusion"] != "success":
                    raise ValueError("Checks did not succeed; Cloudflare was not changed. See " + release["url"])
                run(*wrangler, "pages", "deploy", "_site", "--project-name", config["project"], "--branch", "main", "--commit-hash", commit, "--commit-message", args.message, env=cloudflare_env)
                print("CLOUDFLARE DEPLOYED. Verifying public files over HTTPS…", flush=True)
                for attempt in range(6):
                    try:
                        for url in urls:
                            verify(commit, url)
                        return
                    except (ValueError, OSError) as error:
                        if attempt == 5:
                            raise ValueError("Cloudflare deployed, but public verification failed. DNS, HTTPS or CDN propagation may still be pending.\n" + str(error) + "\nRetry: ./deploy --status") from error
                        print("Public domain not ready; retrying in 10 seconds…", flush=True)
                        time.sleep(10)
        time.sleep(5)
    raise ValueError(f"Timed out waiting for checks; the push remains on GitHub. Cloudflare was not changed. Check https://github.com/{repo}/actions, then rerun the same deploy command. Do not force-push.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("Stopped. Any commit, push or completed Cloudflare upload remains in place. Check ./deploy --status; rerun the same deploy command to finish if needed.", file=sys.stderr)
        sys.exit(130)
