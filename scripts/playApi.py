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


def call(method, url, **kw):
    for attempt in range(5):
        try:
            r = requests.request(method, url, headers={'Authorization': f'Bearer {token()}'}, timeout=300, **kw)
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


if __name__ == '__main__':
    step = sys.argv[1] if len(sys.argv) > 1 else 'check'
    {'check': check}[step](*sys.argv[2:])
