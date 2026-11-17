#!/usr/bin/env python3
"""One command to check, commit, push, wait for GitHub Pages and verify the domain."""
import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys
import time

from site_tools import ROOT, check, git, is_public, verify


def run(*args, capture=False):
    result = subprocess.run(args, cwd=ROOT, text=True, check=True, stdout=subprocess.PIPE if capture else None)
    return result.stdout.strip() if capture else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("message", nargs="?", help="Plain-language description of the change")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true", help="Run checks without committing or publishing")
    mode.add_argument("--status", action="store_true", help="Show recent releases and verify the current commit on the public domain")
    args = parser.parse_args()
    if args.check:
        check()
        return
    gh = shutil.which("gh") or str(Path.home() / ".local/bin/gh")
    if not Path(gh).is_file():
        raise ValueError("GitHub CLI (gh) is required; see README.md.")
    repo = run(gh, "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner", capture=True)
    if args.status:
        run(gh, "run", "list", "--repo", repo, "--workflow", "pages.yml", "--limit", "5")
        verify("HEAD")
        return
    if not args.message or not args.message.strip():
        parser.error('Use ./deploy "Describe the change", ./deploy --check or ./deploy --status.')
    if run("git", "branch", "--show-current", capture=True) != "main":
        raise ValueError("Deploy from main. Other branches are checked without publishing.")
    run(gh, "auth", "status")
    check()
    run("git", "diff", "--check", "HEAD")
    run("git", "fetch", "origin", "main")
    if subprocess.run(["git", "merge-base", "--is-ancestor", "origin/main", "HEAD"], cwd=ROOT).returncode:
        raise ValueError("Remote main has new commits. Save your changes, pull with --ff-only, then retry. Nothing was committed or pushed.")
    if git("diff", "--name-only", "--diff-filter=U").strip():
        raise ValueError("Resolve merge conflicts before deploying.")
    changed = set(filter(None, git("diff", "--name-only", "--no-renames", "-z", "HEAD").decode().split("\0")))
    changed.update(filter(None, git("ls-files", "--others", "--exclude-standard", "-z").decode().split("\0")))
    controls = {"CNAME", ".nojekyll", ".gitignore", "README.md", "AGENTS.md", "deploy", "preview", ".github/workflows/pages.yml"}
    unexpected = sorted(name for name in changed if not (is_public(name) or name in controls or (name.startswith("scripts/") and name.endswith(".py"))))
    if unexpected:
        raise ValueError("Unrecognised files were not staged. Move private/scratch files outside the repository or add intentional files manually to the helper's allowlist:\n" + "\n".join(unexpected))
    if changed:
        run("git", "add", "--all", "--", *sorted(changed))
        run("git", "commit", "-m", args.message)
    commit = run("git", "rev-parse", "HEAD", capture=True)
    run("git", "push", "origin", "main")
    print(f"Commit: https://github.com/{repo}/commit/{commit}", flush=True)
    print("Waiting for the release workflow (up to 10 minutes). Closing this command does not cancel GitHub's deployment.", flush=True)
    deadline, previous = time.monotonic() + 600, None
    while time.monotonic() < deadline:
        runs = json.loads(run(gh, "run", "list", "--repo", repo, "--workflow", "pages.yml", "--commit", commit, "--branch", "main", "--event", "push", "--limit", "1", "--json", "status,conclusion,url,databaseId", capture=True))
        if runs:
            release = runs[0]
            state = (release["status"], release["conclusion"])
            if state != previous:
                print(f"GitHub Pages: {release['status']} {release['conclusion'] or ''} — {release['url']}", flush=True)
                previous = state
            if release["status"] == "completed":
                if release["conclusion"] != "success":
                    raise ValueError("Release did not succeed. See " + release["url"])
                print("GITHUB PAGES DEPLOYED. Checking the public domain…", flush=True)
                for attempt in range(6):
                    try:
                        verify(commit)
                        return
                    except (ValueError, OSError) as error:
                        if attempt == 5:
                            raise ValueError("GitHub Pages deployed, but public-domain verification failed. DNS, HTTPS or CDN propagation may still be pending.\n" + str(error) + "\nRetry: ./deploy --status") from error
                        print("Public domain not ready; retrying in 10 seconds…", flush=True)
                        time.sleep(10)
        time.sleep(5)
    raise ValueError(f"Timed out waiting; the push remains on GitHub. Check https://github.com/{repo}/actions or run ./deploy --status. Do not force-push.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("Stopped waiting. Any commit/push already completed remains in place. Check ./deploy --status.", file=sys.stderr)
        sys.exit(130)
