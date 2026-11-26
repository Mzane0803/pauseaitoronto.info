#!/usr/bin/env python3
"""Check, package and verify this static site. No Python packages needed."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
from html.parser import HTMLParser
import io
import json
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile
import time
from urllib.parse import unquote, urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DOMAIN = "pauseaitoronto.info"
PAGES = ("index.html", "write-to-your-mp.html", "donate.html", "plan.html", "governance.html", "media.html", "campus.html")
REQUIRED = (*PAGES, "404.html", "events.html", "team.html", "shop.html", "CNAME", ".nojekyll", "robots.txt", "sitemap.xml")
ASSET_TYPES = {".css", ".js", ".json", ".svg", ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".ico", ".woff", ".woff2", ".ttf", ".otf", ".mp4", ".webm"}


def is_public(name):
    p = PurePosixPath(name)
    if p.is_absolute() or ".." in p.parts or any(part.startswith(".") for part in p.parts):
        return False
    return (len(p.parts) == 1 and (p.suffix == ".html" or name in {"favicon.svg", "robots.txt", "sitemap.xml"})) or (p.parts[0] == "assets" and p.suffix.lower() in ASSET_TYPES)


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.ids, self.refs, self.scripts, self.slugs = set(), [], [], []
        self.errors, self.script, self.title = [], None, False
        self.feed(source)
        self.close()

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if attrs.get("id"):
            if attrs["id"] in self.ids:
                self.errors.append("duplicate id: " + attrs["id"])
            self.ids.add(attrs["id"])
        if tag == "title":
            self.title = True
        for key in ("href", "src", "poster", "action"):
            if attrs.get(key):
                self.refs.append(attrs[key])
        if attrs.get("srcset"):
            self.refs.extend(item.strip().split()[0] for item in attrs["srcset"].split(",") if item.strip())
        if tag == "meta" and attrs.get("http-equiv", "").lower() == "refresh":
            self.refs.extend(re.findall(r"url\s*=\s*(.+)", attrs.get("content", ""), re.I))
        if tag == "button" and attrs.get("data-slug"):
            self.slugs.append(attrs["data-slug"])
        if tag == "script":
            self.script = [attrs, ""]

    def handle_endtag(self, tag):
        if tag == "script" and self.script is not None:
            self.scripts.append(self.script)
            self.script = None

    def handle_data(self, data):
        if self.script is not None:
            self.script[1] += data


def check():
    errors = []
    files = {p.relative_to(ROOT).as_posix(): p for p in ROOT.rglob("*") if is_public(p.relative_to(ROOT).as_posix()) and p.is_file()}
    for name in REQUIRED:
        if not (ROOT / name).is_file():
            errors.append("missing required file: " + name)
    if (ROOT / "CNAME").is_file() and (ROOT / "CNAME").read_text().strip() != DOMAIN:
        errors.append("CNAME must remain " + DOMAIN)
    for name, path in files.items():
        if path.is_symlink() or any(parent.is_symlink() for parent in path.parents if parent != ROOT):
            errors.append("symbolic links cannot be published: " + name)
    pages = {name: Page(path.read_text()) for name, path in files.items() if path.suffix == ".html"}

    def reference(source, ref):
        url = urlsplit(ref.strip())
        if url.scheme or url.netloc:
            if url.netloc.lower() not in {DOMAIN, "www." + DOMAIN}:
                return
        if url.scheme and url.scheme not in {"https", "http"}:
            return
        path = unquote(url.path)
        target = ((ROOT / path.lstrip("/")) if path.startswith("/") or url.netloc else (ROOT / source).parent / path).resolve()
        if not path:
            target = ROOT / source
        if target.is_dir():
            target = target / "index.html"
        if not target.is_relative_to(ROOT):
            errors.append(f"{source}: reference escapes the site: {ref}")
            return
        name = target.relative_to(ROOT).as_posix()
        if name not in files:
            errors.append(f"{source}: missing published target: {ref}")
        elif url.fragment and name in pages:
            fragment = unquote(url.fragment)
            dynamic = name == "donate.html" and fragment in {"once", "monthly"}
            if fragment not in pages[name].ids and not dynamic:
                errors.append(f"{source}: missing anchor: {ref}")

    node = shutil.which("node") or next((str(path) for path in (Path("/usr/local/bin/node"), Path("/opt/homebrew/bin/node")) if path.is_file()), None)
    if not node:
        errors.append("Node.js is required for JavaScript syntax checks (no npm packages needed).")
    scripts = []
    for name, page in pages.items():
        errors.extend(name + ": " + error for error in page.errors)
        if not page.title:
            errors.append(name + ": missing title")
        for ref in page.refs:
            reference(name, ref)
        for attrs, body in page.scripts:
            kind = attrs.get("type", "")
            if kind in {"application/json", "application/ld+json"}:
                try:
                    data = json.loads(body)
                    if attrs.get("id") == "give-data":
                        links = [data["once"], *data["monthly"].values()]
                        if not data["monthly"] or not data["onceAmounts"] or "25" not in data["monthly"] or 50 not in data["onceAmounts"]:
                            raise ValueError("donation defaults are absent from the available amounts")
                        if any(urlsplit(link).scheme != "https" or urlsplit(link).netloc != "donate.stripe.com" or not urlsplit(link).path.strip("/") for link in links):
                            raise ValueError("checkout links must use https://donate.stripe.com/…")
                    if attrs.get("id") == "riding-data":
                        slugs = [row["slug"] for row in data]
                        if len(set(slugs)) != len(slugs) or sorted(slugs) != sorted(page.slugs):
                            raise ValueError("riding data and riding buttons do not match")
                except (ValueError, KeyError, TypeError, AttributeError) as error:
                    errors.append(f"{name}: invalid {attrs.get('id', kind)}: {error}")
            elif not attrs.get("src") and body.strip() and kind in {"", "text/javascript", "module"}:
                scripts.append((name + " inline script", body))
        for data_id in ({"give-data"} if name == "donate.html" else {"riding-data"} if name == "write-to-your-mp.html" else set()):
            if not any(attrs.get("id") == data_id for attrs, _ in page.scripts):
                errors.append(name + ": missing " + data_id)
    for name, path in files.items():
        if path.suffix == ".css":
            for ref in re.findall(r"url\(\s*['\"]?([^)'\"\s]+)['\"]?\s*\)", path.read_text()):
                reference(name, ref)
        elif path.suffix == ".js":
            scripts.append((name, path.read_text()))
    if node:
        for name, script in scripts:
            result = subprocess.run([node, "--check"], input=script, text=True, capture_output=True)
            if result.returncode:
                errors.append(name + ": " + result.stderr.strip())
    try:
        for loc in ET.parse(ROOT / "sitemap.xml").iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
            reference("sitemap.xml", loc.text or "")
    except (ET.ParseError, OSError) as error:
        errors.append("sitemap.xml: " + str(error))
    if errors:
        raise ValueError("Site checks failed:\n- " + "\n- ".join(errors))
    print(f"Site checks passed: {len(pages)} pages, {len(files)} public files, internal links/anchors, CSS assets, page JSON and JavaScript syntax.", flush=True)


def committed_files(commit):
    # Read Git once. Spawning a Git process per image was slow on this Mac.
    with tarfile.open(fileobj=io.BytesIO(git("archive", "--format=tar", commit))) as archive:
        result = {}
        for member in archive.getmembers():
            if not (is_public(member.name) or member.name in {"CNAME", ".nojekyll"}):
                continue
            if not member.isfile():
                raise ValueError("Only regular files can be published: " + member.name)
            result[member.name] = archive.extractfile(member).read()
        return result


def manifest(commit, contents=None):
    contents = committed_files(commit) if contents is None else contents
    return {"commit": commit, "files": {name: hashlib.sha256(body).hexdigest() for name, body in sorted(contents.items()) if is_public(name)}}


def package():
    check()
    if git("status", "--porcelain", "--untracked-files=normal").strip():
        raise ValueError("Package only a clean, committed checkout.")
    commit = git("rev-parse", "HEAD").decode().strip()
    contents = committed_files(commit)
    release = manifest(commit, contents)
    destination = ROOT / "_site"
    if destination.is_symlink():
        raise ValueError("_site must not be a symbolic link")
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir()
    for name in [*release["files"], "CNAME", ".nojekyll"]:
        path = destination / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(contents[name])
    (destination / "release.json").write_text(json.dumps(release, indent=2) + "\n")
    print(f"Packaged {len(release['files'])} public files for {commit[:12]} in _site/.")


def verify(commit, base_url=None):
    commit = git("rev-parse", "--verify", commit + "^{commit}").decode().strip()
    expected = manifest(commit)
    stamp = str(time.time_ns())
    base_url = (base_url or f"https://{DOMAIN}").rstrip("/")
    hostname = urlsplit(base_url).hostname
    if urlsplit(base_url).scheme != "https" or not hostname:
        raise ValueError("Verification requires an HTTPS website URL.")
    curl = shutil.which("curl") or "/usr/bin/curl"

    def fetch(name):
        # curl uses the operating system's certificate trust and works consistently
        # across the two Python installations on this Mac. TLS is always verified.
        result = subprocess.run([curl, "--fail", "--silent", "--show-error", "--location", "--max-time", "20", "--header", "Cache-Control: no-cache", "--write-out", "\\nRELEASE_FINAL_URL:%{url_effective}", f"{base_url}/{name}?release={stamp}"], capture_output=True)
        if result.returncode:
            raise ValueError(f"Cannot fetch {name}: " + result.stderr.decode(errors="replace").strip())
        body, final_url = result.stdout.rsplit(b"\nRELEASE_FINAL_URL:", 1)
        if urlsplit(final_url.decode()).hostname != hostname:
            raise ValueError("Domain redirected away from " + hostname + ": " + final_url.decode())
        return body

    release = json.loads(fetch("release.json"))
    if release != expected:
        raise ValueError(f"The public release manifest does not match {commit[:12]}.")

    def verify_file(item):
        name, checksum = item
        if hashlib.sha256(fetch(name)).hexdigest() != checksum:
            raise ValueError("Public file differs from committed source: " + name)

    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(verify_file, expected["files"].items()))
    print(f"PUBLIC SITE VERIFIED: {base_url}/ serves {commit[:12]} ({len(expected['files'])} files match committed source).")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("check", "package", "verify"))
    parser.add_argument("--commit", default="HEAD")
    parser.add_argument("--url", help="Verify a Cloudflare preview URL instead of the custom domain")
    args = parser.parse_args()
    try:
        {"check": check, "package": package, "verify": lambda: verify(args.commit, args.url)}[args.action]()
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
