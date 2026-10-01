#!/usr/bin/env python3
"""Push App Store metadata + screenshots for Ruhnevâz via the App Store Connect API.

Reads texts from appstore/METADATA.md and images from appstore/screenshots/{tr,en}/iphone-6.9/.

  ASC_KEY_ID=... ASC_ISSUER_ID=... ASC_KEY_PATH=~/Downloads/AuthKey_XXXX.p8 \
    python3 scripts/ascUpload.py [status|metadata|screenshots|submit]

The app record itself must already exist (Apple's API cannot create apps) and the
App Privacy questionnaire must be answered on the web.
"""
import hashlib
import os
import re
import sys
import time

import jwt
import requests

BUNDLE_ID = 'com.mtuyarr.ruhnevaz'
VERSION = '1.0.0'
API = 'https://api.appstoreconnect.apple.com/v1'
LOCALES = {'tr': 'tr', 'en-US': 'en'}  # ASC locale -> screenshots folder
PRIVACY_URL = 'https://mtuyar.github.io/ruhnevaz/privacy.html'
SUPPORT_URL = 'https://mtuyar.github.io/ruhnevaz/'
COPYRIGHT = '2026 Mehmet Taha Uyar'
CONTACT = {'contactFirstName': 'Mehmet Taha', 'contactLastName': 'Uyar', 'contactEmail': 'mehmettahauyarr@gmail.com'}


def token():
    key = open(os.path.expanduser(os.environ['ASC_KEY_PATH'])).read()
    now = int(time.time())
    return jwt.encode(
        {'iss': os.environ['ASC_ISSUER_ID'], 'iat': now, 'exp': now + 1100, 'aud': 'appstoreconnect-v1'},
        key, algorithm='ES256', headers={'kid': os.environ['ASC_KEY_ID'], 'typ': 'JWT'})


S = requests.Session()


def call(method, path, **kw):
    url = path if path.startswith('http') else API + path
    for attempt in range(5):  # flaky connections: retry resets/timeouts
        try:
            r = S.request(method, url, headers={'Authorization': f'Bearer {token()}'}, timeout=60, **kw)
            break
        except requests.exceptions.RequestException:
            if attempt == 4:
                raise
            time.sleep(3 * (attempt + 1))
    if r.status_code >= 400:
        raise SystemExit(f'{method} {path} -> {r.status_code}\n{r.text[:2000]}')
    return r.json() if r.content else {}


def body(type_, attrs=None, id_=None, rels=None):
    data = {'type': type_}
    if id_:
        data['id'] = id_
    if attrs:
        data['attributes'] = attrs
    if rels:
        data['relationships'] = {k: {'data': {'type': t, 'id': i}} for k, (t, i) in rels.items()}
    return {'json': {'data': data}}


# ---- METADATA.md parsing ----

def parse_metadata():
    md = open('appstore/METADATA.md', encoding='utf-8').read()
    sections = re.split(r'\n## ', md)

    def blocks(section):
        return {m.group(1).strip(): m.group(2).strip()
                for m in re.finditer(r'\*\*([^*]+)\*\*[^\n]*\n```\n(.*?)\n```', section, re.S)}

    tr = blocks(next(s for s in sections if s.startswith('1.')))
    en = blocks(next(s for s in sections if s.startswith('2.')))
    notes = blocks(next(s for s in sections if s.startswith('6.')))['Notlar']
    pick = lambda d, keys: {k: d[v] for k, v in keys.items()}
    return {
        'tr': pick(tr, {'name': 'Ad', 'subtitle': 'Alt başlık', 'promotionalText': 'Tanıtım metni',
                        'keywords': 'Anahtar kelimeler', 'description': 'Açıklama'}),
        'en-US': pick(en, {'name': 'Name', 'subtitle': 'Subtitle', 'promotionalText': 'Promotional Text',
                           'keywords': 'Keywords', 'description': 'Description'}),
    }, notes


# ---- lookups ----

def app_id():
    apps = call('GET', '/apps', params={'filter[bundleId]': BUNDLE_ID})['data']
    if not apps:
        raise SystemExit(f'No App Store Connect app for {BUNDLE_ID}. Create it on the web: Apps > + > New App.')
    return apps[0]['id']


def editable_version(aid):
    vs = call('GET', f'/apps/{aid}/appStoreVersions', params={'filter[platform]': 'IOS', 'limit': 10})['data']
    for v in vs:
        if v['attributes']['appStoreState'] in ('PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED',
                                                 'METADATA_REJECTED', 'INVALID_BINARY'):
            if v['attributes']['versionString'] != VERSION:
                call('PATCH', f"/appStoreVersions/{v['id']}", **body('appStoreVersions', {'versionString': VERSION}, v['id']))
            return v['id']
    return call('POST', '/appStoreVersions', **body('appStoreVersions', {'platform': 'IOS', 'versionString': VERSION},
                                                  rels={'app': ('apps', aid)}))['data']['id']


def upsert_localization(list_path, type_, parent_rel, parent, locale, attrs):
    locs = call('GET', list_path)['data']
    cur = next((l for l in locs if l['attributes']['locale'] == locale), None)
    if cur:
        call('PATCH', f"/{type_}/{cur['id']}", **body(type_, attrs, cur['id']))
        return cur['id']
    return call('POST', f'/{type_}', **body(type_, {'locale': locale, **attrs}, rels={parent_rel: parent}))['data']['id']


# ---- steps ----

def status():
    aid = app_id()
    app = call('GET', f'/apps/{aid}')['data']['attributes']
    print('app', aid, app['name'], app['primaryLocale'])
    for v in call('GET', f'/apps/{aid}/appStoreVersions')['data']:
        print('version', v['attributes']['versionString'], v['attributes']['appStoreState'])
    for b in call('GET', '/builds', params={'filter[app]': aid, 'sort': '-uploadedDate', 'limit': 5})['data']:
        print('build', b['attributes']['version'], b['attributes']['processingState'])


def metadata():
    texts, notes = parse_metadata()
    aid = app_id()
    vid = editable_version(aid)

    # App info (name, subtitle, privacy URL, categories)
    info = next(i for i in call('GET', f'/apps/{aid}/appInfos')['data']
                if i['attributes'].get('appStoreState') != 'READY_FOR_SALE')
    iid = info['id']
    call('PATCH', f'/appInfos/{iid}', json={'data': {'type': 'appInfos', 'id': iid, 'relationships': {
        'primaryCategory': {'data': {'type': 'appCategories', 'id': 'LIFESTYLE'}},
        'secondaryCategory': {'data': {'type': 'appCategories', 'id': 'REFERENCE'}},
    }}})
    for loc in LOCALES:
        t = texts[loc]
        upsert_localization(f'/appInfos/{iid}/appInfoLocalizations', 'appInfoLocalizations', 'appInfo',
                            ('appInfos', iid), loc,
                            {'name': t['name'], 'subtitle': t['subtitle'], 'privacyPolicyUrl': PRIVACY_URL})
        upsert_localization(f'/appStoreVersions/{vid}/appStoreVersionLocalizations', 'appStoreVersionLocalizations',
                            'appStoreVersion', ('appStoreVersions', vid), loc,
                            {'description': t['description'], 'keywords': t['keywords'],
                             'promotionalText': t['promotionalText'], 'supportUrl': SUPPORT_URL,
                             'marketingUrl': SUPPORT_URL})
        print('texts', loc, 'ok')

    call('PATCH', f'/appStoreVersions/{vid}', **body('appStoreVersions', {
        'copyright': COPYRIGHT, 'releaseType': 'AFTER_APPROVAL'}, vid))

    # Age rating: everything NONE / false -> 4+
    ar = call('GET', f'/appInfos/{iid}/ageRatingDeclaration')['data']
    yes_no = ('advertising', 'gambling', 'healthOrWellnessTopics', 'lootBox', 'messagingAndChat',
              'parentalControls', 'ageAssurance', 'socialMedia', 'socialMediaAgeRestricted',
              'unrestrictedWebAccess', 'userGeneratedContent')
    frequency = ('alcoholTobaccoOrDrugUseOrReferences', 'contests', 'gamblingSimulated', 'gunsOrOtherWeapons',
                 'medicalOrTreatmentInformation', 'profanityOrCrudeHumor', 'sexualContentGraphicAndNudity',
                 'sexualContentOrNudity', 'horrorOrFearThemes', 'matureOrSuggestiveThemes',
                 'violenceCartoonOrFantasy', 'violenceRealisticProlongedGraphicOrSadistic', 'violenceRealistic')
    attrs = {k: False for k in yes_no if k in ar['attributes']}
    attrs.update({k: 'NONE' for k in frequency if k in ar['attributes']})
    # Questions Apple adds later come back as null; the API tells us if one should be a boolean.
    for _ in range(5):
        r = S.patch(f"{API}/ageRatingDeclarations/{ar['id']}", headers={'Authorization': f'Bearer {token()}'},
                    **body('ageRatingDeclarations', attrs, ar['id']))
        if r.ok:
            break
        wrong = [e['source']['pointer'].rsplit('/', 1)[-1] for e in r.json().get('errors', [])
                 if 'Expected a BOOLEAN' in e.get('detail', '')]
        if not wrong:
            raise SystemExit(f'age rating -> {r.status_code}\n{r.text[:2000]}')
        attrs.update({k: False for k in wrong})
    else:
        raise SystemExit('age rating: gave up')
    print('age rating ok')

    # Review details
    rd = call('GET', f'/appStoreVersions/{vid}/appStoreReviewDetail').get('data')
    rattrs = {**CONTACT, 'notes': notes, 'demoAccountRequired': False}
    if os.environ.get('ASC_CONTACT_PHONE'):
        rattrs['contactPhone'] = os.environ['ASC_CONTACT_PHONE']
    if rd:
        call('PATCH', f"/appStoreReviewDetails/{rd['id']}", **body('appStoreReviewDetails', rattrs, rd['id']))
    else:
        call('POST', '/appStoreReviewDetails', **body('appStoreReviewDetails', rattrs,
                                                      rels={'appStoreVersion': ('appStoreVersions', vid)}))
    print('review details ok')


def pricing():
    """Free, available in every territory (and new ones)."""
    aid = app_id()
    points = call('GET', f'/apps/{aid}/appPricePoints', params={'filter[territory]': 'USA', 'limit': 200})['data']
    free = next(p for p in points if float(p['attributes']['customerPrice']) == 0)
    call('POST', '/appPriceSchedules', json={
        'data': {'type': 'appPriceSchedules', 'relationships': {
            'app': {'data': {'type': 'apps', 'id': aid}},
            'baseTerritory': {'data': {'type': 'territories', 'id': 'USA'}},
            'manualPrices': {'data': [{'type': 'appPrices', 'id': '${free}'}]}}},
        'included': [{'type': 'appPrices', 'id': '${free}', 'attributes': {'startDate': None},
                      'relationships': {'appPricePoint': {'data': {'type': 'appPricePoints', 'id': free['id']}}}}]})
    print('price: free')

    territories = [t['id'] for t in call('GET', '/territories', params={'limit': 200})['data']]
    call('POST', API.replace('/v1', '/v2') + '/appAvailabilities', json={
        'data': {'type': 'appAvailabilities', 'attributes': {'availableInNewTerritories': True},
                 'relationships': {
                     'app': {'data': {'type': 'apps', 'id': aid}},
                     'territoryAvailabilities': {'data': [{'type': 'territoryAvailabilities', 'id': f'${{{t}}}'}
                                                          for t in territories]}}},
        'included': [{'type': 'territoryAvailabilities', 'id': f'${{{t}}}', 'attributes': {'available': True},
                      'relationships': {'territory': {'data': {'type': 'territories', 'id': t}}}}
                     for t in territories]})
    print(f'availability: {len(territories)} territories')


def screenshots():
    aid = app_id()
    vid = editable_version(aid)
    locs = call('GET', f'/appStoreVersions/{vid}/appStoreVersionLocalizations')['data']
    for loc in locs:
        folder = LOCALES.get(loc['attributes']['locale'])
        if not folder:
            continue
        sets = call('GET', f"/appStoreVersionLocalizations/{loc['id']}/appScreenshotSets")['data']
        sset = next((s for s in sets if s['attributes']['screenshotDisplayType'] == 'APP_IPHONE_67'), None)
        if sset:  # replace whatever is there
            for shot in call('GET', f"/appScreenshotSets/{sset['id']}/appScreenshots")['data']:
                call('DELETE', f"/appScreenshots/{shot['id']}")
        else:
            sset = call('POST', '/appScreenshotSets', **body('appScreenshotSets', {'screenshotDisplayType': 'APP_IPHONE_67'},
                                                             rels={'appStoreVersionLocalization': ('appStoreVersionLocalizations', loc['id'])}))['data']
        d = f'appstore/screenshots/{folder}/iphone-6.9'
        for name in sorted(os.listdir(d)):
            data = open(f'{d}/{name}', 'rb').read()
            res = call('POST', '/appScreenshots', **body('appScreenshots', {'fileName': name, 'fileSize': len(data)},
                                                         rels={'appScreenshotSet': ('appScreenshotSets', sset['id'])}))['data']
            for op in res['attributes']['uploadOperations']:
                chunk = data[op['offset']:op['offset'] + op['length']]
                requests.request(op['method'], op['url'], data=chunk,
                                 headers={h['name']: h['value'] for h in op['requestHeaders']}).raise_for_status()
            call('PATCH', f"/appScreenshots/{res['id']}", **body('appScreenshots', {
                'uploaded': True, 'sourceFileChecksum': hashlib.md5(data).hexdigest()}, res['id']))
            print('screenshot', folder, name)


def submit():
    aid = app_id()
    vid = editable_version(aid)
    params = {'filter[app]': aid, 'filter[processingState]': 'VALID', 'sort': '-uploadedDate', 'limit': 1}
    if os.environ.get('ASC_BUILD'):
        params['filter[version]'] = os.environ['ASC_BUILD']
    builds = call('GET', '/builds', params=params)['data']
    if not builds:
        raise SystemExit('No processed build yet.')
    bid = builds[0]['id']
    call('PATCH', f'/appStoreVersions/{vid}/relationships/build', json={'data': {'type': 'builds', 'id': bid}})
    print('build attached', builds[0]['attributes']['version'])
    # After a rejection the old submission sits in UNRESOLVED_ISSUES and is resubmitted as is.
    open_subs = [s for s in call('GET', '/reviewSubmissions', params={'filter[app]': aid})['data']
                 if s['attributes']['state'] in ('UNRESOLVED_ISSUES', 'READY_FOR_REVIEW')]
    if open_subs:
        sub = open_subs[0]
    else:
        sub = call('POST', '/reviewSubmissions', **body('reviewSubmissions', {'platform': 'IOS'},
                                                        rels={'app': ('apps', aid)}))['data']
        call('POST', '/reviewSubmissionItems', **body('reviewSubmissionItems', rels={
            'reviewSubmission': ('reviewSubmissions', sub['id']), 'appStoreVersion': ('appStoreVersions', vid)}))
    call('PATCH', f"/reviewSubmissions/{sub['id']}", **body('reviewSubmissions', {'submitted': True}, sub['id']))
    print('submitted for review')


if __name__ == '__main__':
    step = sys.argv[1] if len(sys.argv) > 1 else 'status'
    {'status': status, 'metadata': metadata, 'pricing': pricing, 'screenshots': screenshots,
     'submit': submit}[step]()
