#!/usr/bin/env python3
"""
Собирает библиотеку предметов и заклинаний SRD 5.1 для «Таверны».

Источник: 5e-bits/5e-database (src/2014/en) — тексты SRD 5.1 © Wizards of the Coast, CC-BY-4.0.
Переводы на украинский лежат в TRANSLATIONS_DIR как JSON-массивы {id, name, head?, text, higher?, material?}.

    python3 -I scripts/build-library.py <raw_dir> <translations_dir> src/lib/library/data

Пишет items.json и spells.json. Механику (кубики, КО, бонусы, заряды) берёт из структурированных
полей SRD и из английского текста — перевод на неё не влияет.
"""
import glob
import json
import os
import re
import sys

RAW, TR, OUT = sys.argv[1], sys.argv[2], sys.argv[3]


def load(name):
    with open(os.path.join(RAW, name), encoding='utf-8') as f:
        return json.load(f)


def load_tr():
    tr = {}
    for path in sorted(glob.glob(os.path.join(TR, '*.json'))):
        with open(path, encoding='utf-8') as f:
            for row in json.load(f):
                tr[row['id']] = row
    return tr


TRN = load_tr()

DMG = {
    'acid': 'кислотна', 'bludgeoning': 'дробильна', 'cold': 'холодна', 'fire': 'вогняна', 'force': 'силова',
    'lightning': 'блискавична', 'necrotic': 'некротична', 'piercing': 'колюча', 'poison': 'отрутна',
    'psychic': 'психічна', 'radiant': 'промениста', 'slashing': 'рубана', 'thunder': 'громова',
}
PROPS = {
    'ammunition': 'боєприпаси', 'finesse': 'фехтувальна', 'heavy': 'важка', 'light': 'легка', 'loading': 'перезаряджання',
    'reach': 'досяжність', 'special': 'особлива', 'thrown': 'метальна', 'two-handed': 'дворучна', 'versatile': 'універсальна',
    'monk': None,
}
RARITY = {
    'Common': 'common', 'Uncommon': 'uncommon', 'Rare': 'rare', 'Very Rare': 'veryRare', 'Legendary': 'legendary',
    'Artifact': 'artifact', 'Varies': 'varies',
}
COIN = {'gp': 'зм', 'sp': 'см', 'cp': 'мм', 'ep': 'ем', 'pp': 'пм'}
ABIL = {'Strength': 'str', 'Dexterity': 'dex', 'Constitution': 'con', 'Intelligence': 'int', 'Wisdom': 'wis', 'Charisma': 'cha',
        'STR': 'str', 'DEX': 'dex', 'CON': 'con', 'INT': 'int', 'WIS': 'wis', 'CHA': 'cha'}
WCAT = {
    'Simple Melee': 'Проста зброя ближнього бою', 'Simple Ranged': 'Проста зброя дальнього бою',
    'Martial Melee': 'Бойова зброя ближнього бою', 'Martial Ranged': 'Бойова зброя дальнього бою',
}
ACAT = {'Light': 'Легкий обладунок', 'Medium': 'Середній обладунок', 'Heavy': 'Важкий обладунок', 'Shield': 'Щит'}
GCAT = {
    'standard-gear': 'Спорядження', 'kits': 'Набір', 'equipment-packs': 'Набір спорядження', 'arcane-foci': 'Магічний фокус',
    'druidic-foci': 'Друїдичний фокус', 'holy-symbols': 'Священний символ', 'ammunition': 'Боєприпаси',
}
TCAT = {"Artisan's Tools": 'Ремісничі інструменти', 'Gaming Sets': 'Гральний набір', 'Musical Instrument': 'Музичний інструмент',
        'Other Tools': 'Інструменти'}


def name_of(e):
    t = TRN.get(e['index'])
    return (t or {}).get('name') or e['name']


def text_of(e, key='text', fallback=''):
    t = TRN.get(e['index'])
    v = (t or {}).get(key)
    return v if v else fallback


def cost(e):
    c = e.get('cost')
    if not c:
        return None
    return f"{c['quantity']} {COIN.get(c['unit'], c['unit'])}"


def dice(s):
    return s.replace(' ', '') if s else s


def weapon_info(e):
    props = [p['index'] for p in e.get('properties', [])]
    w = {
        'd': dice(e.get('damage', {}).get('damage_dice')) or '',
        'dt': DMG.get(e.get('damage', {}).get('damage_type', {}).get('index'), ''),
        'p': [PROPS[p] for p in props if PROPS.get(p)],
        'f': 'finesse' in props,
        'rg': e.get('weapon_range') == 'Ranged',
        'm': e.get('weapon_category') == 'Martial',
    }
    if e.get('two_handed_damage'):
        w['v'] = dice(e['two_handed_damage']['damage_dice'])
    r = e.get('throw_range') if 'thrown' in props else e.get('range') if w['rg'] else None
    if r and r.get('long'):
        w['rn'] = f"{r['normal']}/{r['long']}"
    if 'reach' in props:
        w['rn'] = '10'
    return w


def armor_info(e):
    ac = e['armor_class']
    cat = e['armor_category']
    a = {'k': {'Light': 'light', 'Medium': 'medium', 'Heavy': 'heavy', 'Shield': 'shield'}[cat], 'b': ac['base']}
    if cat == 'Shield':
        a['dx'] = 0
    elif not ac.get('dex_bonus'):
        a['dx'] = 0
    elif ac.get('max_bonus') is not None:
        a['dx'] = ac['max_bonus']
    if e.get('str_minimum'):
        a['s'] = e['str_minimum']
    if e.get('stealth_disadvantage'):
        a['sd'] = True
    return a


SPECIAL_UK = {
    'lance': 'Атакуючи лицарським списом ціль у межах 5 фт від тебе, ти маєш перешкоду. Без верхової тварини лицарський спис потребує двох рук.',
    'net': 'Велика або менша істота, по якій влучила сітка, стає стриманою, доки її не звільнять. Сітка не діє на безформних істот і на істот Величезного чи більшого розміру. Істота може дією зробити перевірку Сили СК 10, щоб звільнити себе або іншу істоту в межах досяжності. 5 рубаної шкоди по сітці (КО 10) теж звільняє істоту, не шкодячи їй, — ефект завершується, а сітка руйнується. Атакуючи сіткою дією, бонусною дією чи реакцією, ти робиш лише одну атаку, скільки б атак зазвичай не мав.',
}

eq = load('5e-SRD-Equipment.json')
EQ = {e['index']: e for e in eq}
items = []

for e in eq:
    cat = e['equipment_category']['index']
    if cat == 'mounts-and-vehicles':
        continue
    it = {'id': e['index'], 'n': name_of(e), 'en': e['name']}
    if cat == 'weapon':
        it['c'] = 'weapon'
        it['k'] = WCAT.get(e['category_range'], '')
        it['w'] = weapon_info(e)
    elif cat == 'armor':
        it['c'] = 'armor'
        it['k'] = ACAT[e['armor_category']]
        it['ar'] = armor_info(e)
    elif cat == 'tools':
        it['c'] = 'tool'
        it['k'] = TCAT.get(e.get('tool_category'), 'Інструменти')
    else:
        g = e.get('gear_category', {}).get('index', 'standard-gear')
        it['c'] = 'gear'
        it['k'] = GCAT.get(g, 'Спорядження')
    it['t'] = SPECIAL_UK.get(e['index']) or text_of(e, 'text', '\n'.join(e.get('desc', [])))
    if cost(e):
        it['cost'] = cost(e)
    if e.get('weight'):
        it['wt'] = e['weight']
    items.append(it)

# ---------- волшебные предметы ----------
mi = load('5e-SRD-Magic-Items.json')
MI = {m['index']: m for m in mi}
PARENT = {}
for m in mi:
    for v in m.get('variants', []):
        PARENT[v['index']] = m['index']

BASE_W = {'longsword', 'longbow', 'dagger', 'maul', 'mace', 'scimitar', 'warhammer', 'javelin', 'trident'}
BASE_A = {'studded leather': 'studded-leather-armor', 'scale mail': 'scale-mail', 'plate': 'plate-armor',
          'chain shirt': 'chain-shirt', 'shield': 'shield'}
STAFF_WEAPON = 'quarterstaff'
SPECIFIC_BONUS_SKIP = {'rod-of-alertness', 'ioun-stone'}  # бонус условный / у родителя-описания


for m in mi:
    head = m['desc'][0]
    body = '\n'.join(m['desc'][1:])
    full = ' '.join(m['desc'])
    mcat = m['equipment_category']['index']
    it = {
        'id': 'm:' + m['index'],
        'n': name_of(m),
        'en': m['name'],
        'c': 'magic',
        'mc': {'wondrous-items': 'wondrous'}.get(mcat, mcat),
        'k': text_of(m, 'head', head),
        'r': RARITY.get(m['rarity']['name']),
        't': text_of(m, 'text', body),
    }
    if 'requires attunement' in head:
        it['a'] = True
    if m.get('variants'):
        it['par'] = True  # описание-родитель: есть конкретные варианты
    if m['index'] in PARENT:
        it['of'] = 'm:' + PARENT[m['index']]
    x = {}
    bm = re.search(r'\+(\d) bonus to attack and damage rolls', full)
    if bm and m['index'] not in SPECIFIC_BONUS_SKIP:
        x['b'] = int(bm.group(1))
    am = re.search(r'\+(\d) bonus to (?:AC|Armor Class)', full)
    if am and m['index'] not in SPECIFIC_BONUS_SKIP:
        if mcat == 'armor':
            x['b'] = int(am.group(1))
        else:
            x['ac'] = int(am.group(1))
    sm = re.search(r'\+(\d) bonus to (?:AC and saving throws|Armor Class, saving throws|ability checks and saving throws)', full)
    if sm:
        x['sv'] = int(sm.group(1))
    st = re.search(r'your (Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) score (?:changes to|is|becomes) (?:a )?(\d+)', full, re.I)
    if st and mcat != 'potion':
        x['set'] = [ABIL[st.group(1).capitalize()], int(st.group(2))]
    ch = re.search(r'has (\d+) charges', full)
    if ch:
        x['ch'] = int(ch.group(1))
        if re.search(r'(?:regains?|recharge)[^.]*dawn', full):
            x['rc'] = 'dawn'
    if m['index'] == 'bracers-of-defense':
        x['noArmor'] = True
    # база для оружия/доспеха
    pm = re.match(r'(Weapon|Armor) \(([^)]+)\)', head)
    if pm:
        kind, what = pm.group(1), pm.group(2)
        if kind == 'Weapon':
            if what in BASE_W:
                it['w'] = weapon_info(EQ[what])
            else:
                x['pick'] = 'w:' + {'any': 'any', 'any sword': 'sword', 'any axe': 'axe', 'any axe or sword': 'axe|sword',
                                     'any sword that deals slashing damage': 'sword-slashing', 'any ammunition': 'ammo'}.get(what, 'any')
        else:
            if what in BASE_A:
                it['ar'] = armor_info(EQ[BASE_A[what]])
            else:
                x['pick'] = 'a:' + {'light': 'light', 'medium or heavy': 'medium|heavy', 'medium or heavy, but not hide': 'medium|heavy',
                                    'light, medium, or heavy': 'light|medium|heavy'}.get(what.strip(), 'light|medium|heavy')
    elif mcat == 'staff' and re.search(r'used as a magic quarterstaff|can wield this staff as a magic quarterstaff|magic quarterstaff', full):
        it['w'] = weapon_info(EQ[STAFF_WEAPON])
    elif m['index'].startswith('dragon-scale-mail'):
        it['ar'] = armor_info(EQ['scale-mail'])
    elif m['index'] in ('dwarven-plate', 'demon-armor'):
        it['ar'] = armor_info(EQ['plate-armor'])
    elif m['index'] == 'elven-chain':
        it['ar'] = armor_info(EQ['chain-shirt'])
    if x:
        it['x'] = x
    items.append(it)

# ---------- заклинания ----------
SCHOOL = {'abjuration': 'огородження', 'conjuration': 'виклик', 'divination': 'віщування', 'enchantment': 'зачарування',
          'evocation': 'втілення', 'illusion': 'ілюзія', 'necromancy': 'некромантія', 'transmutation': 'перетворення'}
CLS = {'bard': 'Бард', 'cleric': 'Жрець', 'druid': 'Друїд', 'paladin': 'Паладин', 'ranger': 'Слідопит', 'sorcerer': 'Чародій',
       'warlock': 'Чаклун', 'wizard': 'Чарівник'}
TIME = {'1 action': '1 дія', '1 bonus action': '1 бонусна дія', '1 reaction': '1 реакція', '1 minute': '1 хвилина',
        '10 minutes': '10 хвилин', '1 hour': '1 година', '8 hours': '8 годин', '12 hours': '12 годин', '24 hours': '24 години'}
UNITS = [('minutes', 'хвилин'), ('minute', 'хвилина'), ('hours', 'годин'), ('hour', 'година'), ('rounds', 'раундів'), ('round', 'раунд'),
         ('days', 'днів'), ('day', 'день')]


def tr_dur(s):
    fixed = {'Instantaneous': 'Миттєво', 'Until dispelled': 'Доки не розвіють', 'Special': 'Особлива'}
    if s in fixed:
        return fixed[s]
    pre = ''
    if s.startswith('Up to '):
        pre, s = 'До ', s[6:]
    for en, uk in UNITS:
        s = re.sub(r'\b' + en + r'\b', uk, s)
    if s == '1 година' and pre:
        s = '1 години'
    if s == '1 хвилина' and pre:
        s = '1 хвилини'
    if s == '1 раунд' and pre:
        s = '1 раунду'
    if s == '24 години' and pre:
        s = '24 годин'
    if s in ('8 годин', '2 годин') and pre:
        s = s
    if s == '2 годин':
        s = '2 години'
    return pre + s


def tr_range(s):
    fixed = {'Touch': 'Дотик', 'Self': 'На себе', 'Sight': 'У полі зору', 'Special': 'Особлива', 'Unlimited': 'Необмежена'}
    if s in fixed:
        return fixed[s]
    s = s.replace('feet', 'фт').replace('foot', 'фт').replace('miles', 'миль').replace('mile', 'миля')
    return s


# названия, как в листах игрока (Фрідо), — важнее единообразие с уже записанным
SPELL_NAME_FIX = {
    'vicious-mockery': 'Злісна насмішка', 'guidance': 'Настанова', 'calm-emotions': 'Заспокоєння', 'enthrall': 'Заворожування',
    'entangle': 'Обплутування', 'cure-wounds': 'Лікування ран', 'magic-missile': 'Чарівна стріла',
}

sp = load('5e-SRD-Spells.json')
spells = []
for s in sp:
    ct = s['casting_time']
    r = {
        'id': s['index'],
        'n': SPELL_NAME_FIX.get(s['index']) or name_of(s),
        'en': s['name'],
        'l': s['level'],
        'sc': SCHOOL.get(s['school']['index'], ''),
        'ct': TIME.get(ct, ct),
        'rg': tr_range(s['range']),
        'cp': ', '.join({'V': 'В', 'S': 'С', 'M': 'М'}[c] for c in s.get('components', [])),
        'du': tr_dur(s['duration']),
        'cl': [CLS[c['index']] for c in s.get('classes', []) if c['index'] in CLS],
        't': text_of(s, 'text', '\n'.join(s['desc'])),
    }
    hl = text_of(s, 'higher', '\n'.join(s.get('higher_level', [])))
    if hl:
        r['h'] = hl
    mt = text_of(s, 'material', s.get('material', ''))
    if mt:
        r['mt'] = mt
    if s.get('concentration'):
        r['co'] = True
    if s.get('ritual'):
        r['ri'] = True
    if s.get('attack_type'):
        r['at'] = s['attack_type']
    if s.get('dc'):
        r['sv'] = ABIL.get(s['dc']['dc_type']['name'], None)
    dmg = s.get('damage')
    if isinstance(dmg, list):
        dmg = dmg[0] if dmg else None
    if dmg:
        d = {'t': DMG.get(dmg.get('damage_type', {}).get('index'), '')}
        if dmg.get('damage_at_character_level'):
            d['c'] = {k: dice(v) for k, v in dmg['damage_at_character_level'].items()}
        if dmg.get('damage_at_slot_level'):
            d['s'] = {k: dice(v) for k, v in dmg['damage_at_slot_level'].items()}
        r['dm'] = d
    if s.get('heal_at_slot_level'):
        r['hl'] = {k: dice(v).replace('MOD', 'МОД') for k, v in s['heal_at_slot_level'].items()}
    spells.append(r)

os.makedirs(OUT, exist_ok=True)
for name, data in (('items.json', items), ('spells.json', spells)):
    with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
missing = [x['id'] for x in items + spells if x['n'] == x['en']]
print(f'items={len(items)} spells={len(spells)} untranslated={len(missing)}')
