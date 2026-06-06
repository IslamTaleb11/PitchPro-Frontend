import json

en_path = 'src/locales/en.json'
ar_path = 'src/locales/ar.json'

def flatten(d, prefix=''):
    items = {}
    for k,v in d.items():
        if isinstance(v, dict):
            items.update(flatten(v, prefix + k + '.'))
        else:
            items[prefix + k] = v
    return items

with open(en_path, 'r', encoding='utf-8') as f:
    en = json.load(f)
with open(ar_path, 'r', encoding='utf-8') as f:
    ar = json.load(f)

en_flat = flatten(en)
ar_flat = flatten(ar)

missing = [k for k in en_flat.keys() if k not in ar_flat]

print('MISSING_COUNT:', len(missing))
for k in missing:
    print(k)
