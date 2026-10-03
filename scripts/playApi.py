#!/usr/bin/env python3
"""Minimal Google Play Developer API (androidpublisher v3) client for Ruhnevâz.

  PLAY_KEY=~/Downloads/<service-account>.json python3 scripts/playApi.py check [package]

Uses a service account JSON key; the account must be invited in Play Console
(Users and permissions) with access to the app.
"""
import json
import os
import sys
import time

import jwt
import requests

PACKAGE = 'com.mtuyarr.ruhnevaz'
API = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications'
UPLOAD = 'https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications'

_token = {'value': None, 'exp': 0}


def token():
    if _token['value'] and time.time() < _token['exp'] - 60:
        return _token['value']
    key = json.load(open(os.path.expanduser(os.environ['PLAY_KEY'])))
    now = int(time.time())
    assertion = jwt.encode({
        'iss': key['client_email'], 'scope': 'https://www.googleapis.com/auth/androidpublisher',
        'aud': key['token_uri'], 'iat': now, 'exp': now + 3600,
    }, key['private_key'], algorithm='RS256')
    r = requests.post(key['token_uri'], data={
        'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer', 'assertion': assertion}, timeout=60)
    r.raise_for_status()
    _token.update(value=r.json()['access_token'], exp=now + r.json().get('expires_in', 3600))
    return _token['value']


def call(method, url, headers_extra=None, **kw):
    for attempt in range(5):
        try:
            headers = {'Authorization': f'Bearer {token()}', **(headers_extra or {})}
            r = requests.request(method, url, headers=headers, timeout=300, **kw)
            break
        except requests.exceptions.RequestException:
            if attempt == 4:
                raise
            time.sleep(3 * (attempt + 1))
    if r.status_code >= 400:
        raise SystemExit(f'{method} {url} -> {r.status_code}\n{r.text[:1500]}')
    return r.json() if r.content else {}


def check(package=PACKAGE):
    """Open (and discard) an edit: proves the key works and the app exists for this account."""
    edit = call('POST', f'{API}/{package}/edits')
    try:
        details = call('GET', f"{API}/{package}/edits/{edit['id']}/details")
        tracks = call('GET', f"{API}/{package}/edits/{edit['id']}/tracks")
        print('app ok:', package, details)
        for t in tracks.get('tracks', []):
            print(' track', t['track'], [(r.get('status'), r.get('versionCodes')) for r in t.get('releases', [])])
    finally:
        call('DELETE', f"{API}/{package}/edits/{edit['id']}")


def parse_listing():
    import re
    md = open('appstore/PLAY_METADATA.md', encoding='utf-8').read()
    blocks = re.findall(r'\*\*([^*]+)\*\*[^\n]*\n```\n(.*?)\n```', md, re.S)
    tr, en = blocks[0:3], blocks[3:6]
    as_listing = lambda b: {'title': b[0][1], 'shortDescription': b[1][1], 'fullDescription': b[2][1]}
    notes = re.search(r'<tr-TR>\n(.*?)\n</tr-TR>.*?<en-US>\n(.*?)\n</en-US>', md, re.S)
    return ({'tr-TR': as_listing(tr), 'en-US': as_listing(en)},
            {'tr-TR': notes.group(1), 'en-US': notes.group(2)})


def _edit():
    return call('POST', f'{API}/{PACKAGE}/edits')['id']


def _commit(eid):
    print('committed', call('POST', f'{API}/{PACKAGE}/edits/{eid}:commit').get('id'))


def listing():
    """Store texts, contact details and graphics for tr-TR + en-US."""
    texts, _ = parse_listing()
    eid = _edit()
    base = f'{API}/{PACKAGE}/edits/{eid}'
    call('PATCH', f'{base}/details', json={
        'defaultLanguage': 'tr-TR', 'contactEmail': 'mehmettahauyarr@gmail.com',
        'contactWebsite': 'https://mtuyar.github.io/ruhnevaz/'})
    for lang, folder in (('tr-TR', 'tr'), ('en-US', 'en')):
        call('PUT', f'{base}/listings/{lang}', json={'language': lang, **texts[lang]})
        for kind, files in (('icon', ['appstore/play/icon-512.png']),
                            ('featureGraphic', [f'appstore/play/{folder}/feature.png']),
                            ('phoneScreenshots', [f'appstore/play/{folder}/phone/{n:02d}.png' for n in range(1, 9)])):
            call('DELETE', f'{UPLOAD.replace("/upload", "")}/{PACKAGE}/edits/{eid}/listings/{lang}/{kind}')
            for f in files:
                call('POST', f'{UPLOAD}/{PACKAGE}/edits/{eid}/listings/{lang}/{kind}?uploadType=media',
                     data=open(f, 'rb').read(), headers_extra={'Content-Type': 'image/png'})
        print('listing', lang, 'ok')
    _commit(eid)


def release(aab, track='alpha', status='completed'):
    """Upload an AAB and put it on a track (default: closed testing 'alpha')."""
    _, notes = parse_listing()
    eid = _edit()
    bundle = call('POST', f'{UPLOAD}/{PACKAGE}/edits/{eid}/bundles?uploadType=media',
                  data=open(os.path.expanduser(aab), 'rb').read(),
                  headers_extra={'Content-Type': 'application/octet-stream'})
    vc = str(bundle['versionCode'])
    print('uploaded versionCode', vc)
    call('PUT', f'{API}/{PACKAGE}/edits/{eid}/tracks/{track}', json={'track': track, 'releases': [{
        'name': '1.0.0', 'versionCodes': [vc], 'status': status,
        'releaseNotes': [{'language': k, 'text': v} for k, v in notes.items()]}]})
    print('track', track, status)
    _commit(eid)


if __name__ == '__main__':
    step = sys.argv[1] if len(sys.argv) > 1 else 'check'
    {'check': check, 'listing': listing, 'release': release}[step](*sys.argv[2:])
