import json

with open(r"D:\Projetos\Wurm-Online\Jackal-Atlas\maps\palettes\palette_jackal_raw.json", "r", encoding="utf-8") as f:
    raw = json.load(f)

print("Raw clusters:")
for c in raw.get("clusters", []):
    print(f"ID {c['cluster_id']}: {c.get('category')} | {c['mean_hex']} | {c['pixel_count']:,} px ({c['percentage']}%)")

with open(r"D:\Projetos\Wurm-Online\Jackal-Atlas\maps\palettes\palette_jackal_swisstopo.json", "r", encoding="utf-8") as f:
    sw = json.load(f)

print("\nMapped targets:")
for m in sw.get("mappings", []):
    print(f"ID {m['id']}: {m['name']} | src={m['source_hex']} -> dst={m['target_hex']}")
