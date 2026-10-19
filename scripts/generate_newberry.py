import os
import xml.etree.ElementTree as ET
from xml.dom import minidom

def create_newberry_map_v3(output_path):
    width = 42
    height = 32
    
    root = ET.Element('map', {
        'width': str(width),
        'height': str(height),
        'exporter': 'DeedPlanner 3.4.3 EA',
        'name': 'Newberry Library'
    })
    
    tiles_data = {}
    for x in range(width):
        for y in range(height):
            tiles_data[(x, y)] = {
                'height': 100,
                'ground': 'gr',
                'levels': {}
            }
            
    def get_level(x, y, lvl):
        t = tiles_data[(x, y)]
        if lvl not in t['levels']:
            t['levels'][lvl] = {
                'floor': None,
                'hwalls': [],
                'vwalls': [],
                'roof': None,
                'objects': []
            }
        return t['levels'][lvl]

    def set_floor(x, y, lvl, floor_id, orient='DOWN'):
        get_level(x, y, lvl)['floor'] = (floor_id, orient)

    def add_hwall(x, y, lvl, wall_id, reversed='false'):
        if 0 <= x < width and 0 <= y < height:
            get_level(x, y, lvl)['hwalls'].append((wall_id, reversed))

    def add_vwall(x, y, lvl, wall_id, reversed='false'):
        if 0 <= x < width and 0 <= y < height:
            get_level(x, y, lvl)['vwalls'].append((wall_id, reversed))

    def set_roof(x, y, lvl, roof_id):
        get_level(x, y, lvl)['roof'] = roof_id

    def add_object(x, y, lvl, obj_id, ox=2.0, oy=2.0, rot=0.0):
        get_level(x, y, lvl)['objects'].append((obj_id, ox, oy, rot))

    # --- ESPLANADE & PRAÇA MONUMENTAL ---
    for x in range(13, 29):
        for y in range(18, 27):
            tiles_data[(x, y)]['ground'] = 'sl'  # laje de pedra
    for x in range(16, 26):
        for y in range(18, 23):
            tiles_data[(x, y)]['ground'] = 'msl'  # laje de mármore
            
    # Estátuas e iluminação clássica
    add_object(17, 20, 0, 'mBrazier', 2.0, 2.0, 0)
    add_object(24, 20, 0, 'mBrazier', 2.0, 2.0, 0)
    add_object(16, 23, 0, 'lionarch', 2.0, 2.0, 3.1415)
    add_object(25, 23, 0, 'lionarch', 2.0, 2.0, 3.1415)

    # --- DEFINIÇÃO DOS TILES DO EDIFÍCIO ---
    # Torres dos cantos: X in [10, 12] e [28, 30], Y in [10, 16] (3x7)
    # Alas laterais: X in [13, 17] e [23, 27], Y in [11, 15] (5x5)
    # Corpo Central: X in [18, 22], Y in [11, 15] (5x5)
    # Pórtico de Entrada: X in [19, 21], Y in [16, 17] (3x2)
    # Abside Posterior: X in [18, 22], Y in [9, 10] e X in [19, 21], Y=8

    all_building_tiles = set()
    for x in range(10, 13):
        for y in range(10, 17):
            all_building_tiles.add((x, y))
    for x in range(28, 31):
        for y in range(10, 17):
            all_building_tiles.add((x, y))
    for x in range(13, 18):
        for y in range(11, 16):
            all_building_tiles.add((x, y))
    for x in range(23, 28):
        for y in range(11, 16):
            all_building_tiles.add((x, y))
    for x in range(18, 23):
        for y in range(11, 16):
            all_building_tiles.add((x, y))
    for x in range(19, 22):
        for y in range(16, 18):
            all_building_tiles.add((x, y))
    for x in range(18, 23):
        for y in range(9, 11):
            all_building_tiles.add((x, y))
    for x in range(19, 22):
        all_building_tiles.add((x, 8))

    # --- MODULAÇÃO NEOCLÁSSICA DE FACHADA ---
    # No neoclassicismo histórico (como na Newberry):
    # - Nível 0: Piano Rustico em Mármore, ritmo repetitivo de janelas `mbWindow`
    # - Pórtico Frontal (Térreo): GALERIA DE ARCOS TRIPLOS (`mblArch`, `mbArch`, `mbrArch`) igual ao original!
    # - Nível 1: Mezanino com janelas estreitas / fendas `mbnWindow`
    # - Nível 2: Piano Nobile em pedra com janelas monumentais `sWindow` ou sacadas `sOriel`
    # - Nível 3: Loggia / Galeria de arcos clássicos `sArch` ou janelas repetidas no ático

    def get_hwall_type(x, y, lvl):
        # 1. ENTRADA PRINCIPAL (Sul do Pórtico: y=18, x in 19..21)
        if y == 18:
            if lvl == 0:
                # GALERIA DE ARCOS TRIPLOS COMO NA NEWBERRY ORIGINAL!
                if x == 19: return 'mblArch'  # Arco esquerdo
                if x == 20: return 'mbArch'   # Grande arco central
                if x == 21: return 'mbrArch'  # Arco direito
            elif lvl == 1:
                # Sacada monumental acima dos arcos com balaustrada
                return 'msPar'
            elif lvl == 2:
                # Andar nobre com sacada oriel central
                return 'sOriel' if x == 20 else 'sWindow'
            elif lvl == 3:
                return 'sArch' if x == 20 else 'sWall'
            return 'sPar'

        # 2. FACHADA FRONTAL DAS ALAS (y=16, x in 13..17 e 23..27)
        if y == 16 and (13 <= x <= 17 or 23 <= x <= 27):
            rel_x = (x - 13) if x <= 17 else (x - 23)
            # Ritmo neoclássico repetitivo elegante:
            # Cantos reforçados (0 e 4), miolo ritmado com janelas elegantes
            if lvl == 0:
                # Térreo: Janelas clássicas de mármore
                return 'mbWall' if rel_x in [0, 4] else 'mbWindow'
            elif lvl == 1:
                # 1º Andar: Janelas de cantaria fina / fendas elegantes (mbnWindow)
                return 'mbWall' if rel_x in [0, 4] else 'mbnWindow'
            elif lvl == 2:
                # 2º Andar: Janelas nobres de pedra
                return 'sWall' if rel_x in [0, 4] else 'sWindow'
            elif lvl == 3:
                # 3º Andar (Loggia/Ático): Arcos clássicos como na foto original!
                return 'sWall' if rel_x in [0, 4] else 'sArch'

        # 3. FACHADA FRONTAL DAS TORRES (y=17, x in 10..12 e 28..30)
        if y == 17 and (10 <= x <= 12 or 28 <= x <= 30):
            rel_x = (x - 10) if x <= 12 else (x - 28)
            if lvl == 0:
                return 'mbWindow' if rel_x == 1 else 'mbWall'
            elif lvl == 1:
                return 'mbnWindow' if rel_x == 1 else 'mbWall'
            elif lvl == 2:
                return 'sOriel' if rel_x == 1 else 'sWall'
            elif lvl == 3:
                return 'sWindow' if rel_x == 1 else 'sWall'
            elif lvl == 4:
                return 'sArch' if rel_x == 1 else 'sWall'

        # 4. FACHADA TRASEIRA DAS TORRES (y=10)
        if y == 10 and (10 <= x <= 12 or 28 <= x <= 30):
            rel_x = (x - 10) if x <= 12 else (x - 28)
            return ('mbWindow' if lvl in [0, 1] else 'sWindow') if rel_x == 1 else ('mbWall' if lvl in [0, 1] else 'sWall')

        # 5. TRASEIRA DAS ALAS (y=11, x in 13..17 e 23..27)
        if y == 11 and (13 <= x <= 17 or 23 <= x <= 27):
            rel_x = (x - 13) if x <= 17 else (x - 23)
            is_m = (lvl in [0, 1])
            return ('mbWall' if is_m else 'sWall') if rel_x in [0, 4] else ('mbWindow' if is_m else 'sWindow')

        # 6. TRASEIRA DA ABSIDE (Reading Room: y=8, x in 19..21)
        if y == 8 and 19 <= x <= 21:
            is_m = (lvl in [0, 1])
            return ('mbWindow' if is_m else 'sWindow') if x == 20 else ('mbWall' if is_m else 'sWall')

        return 'mbWall' if lvl in [0, 1] else 'sWall'

    def get_vwall_type(x, y, lvl):
        is_m = (lvl in [0, 1])
        # Laterais externas das torres (x=10 e x=31, y in 10..16)
        if x in [10, 31]:
            rel_y = y - 10
            # Ritmo simétrico de 7 tiles: Parede, Janela, Parede, Oriel, Parede, Janela, Parede
            if rel_y in [1, 5]:
                return 'mbWindow' if is_m else 'sWindow'
            elif rel_y == 3:
                return 'mbOriel' if is_m else 'sOriel'
            return 'mbWall' if is_m else 'sWall'
        # Laterais do pórtico de entrada (x=19 e x=22, y in 16..17)
        if x in [19, 22] and 16 <= y <= 17:
            if lvl == 0:
                # Arcos laterais abrindo o pórtico monumental!
                return 'mbArch'
            return 'mbWindow' if is_m else 'sWindow'
        # Laterais da Abside
        if x in [18, 23] and 9 <= y <= 10:
            return 'mbWindow' if is_m else 'sWindow'
        return 'mbWall' if is_m else 'sWall'

    def apply_perimeter(lvl):
        for x in range(width):
            for y in range(height):
                in_curr = (x, y) in all_building_tiles
                in_north = (x, y - 1) in all_building_tiles
                if in_curr != in_north:
                    wall_t = get_hwall_type(x, y, lvl)
                    add_hwall(x, y, lvl, wall_t)
                in_west = (x - 1, y) in all_building_tiles
                if in_curr != in_west:
                    wall_t = get_vwall_type(x, y, lvl)
                    add_vwall(x, y, lvl, wall_t)

    # --- NÍVEL 0: TÉRREO MONUMENTAL ---
    for (x, y) in all_building_tiles:
        set_floor(x, y, 0, 'mFloor')
    apply_perimeter(0)

    # Porta dupla no interior do nártex / pórtico (y=17, x=20)
    add_hwall(20, 17, 0, 'mbdDoor')
    add_hwall(19, 17, 0, 'mbWall')
    add_hwall(21, 17, 0, 'mbWall')

    # Arcos internos ligando as salas
    for y in [12, 13, 14]:
        add_vwall(13, y, 0, 'mbArch')
        add_vwall(18, y, 0, 'mbArch')
        add_vwall(23, y, 0, 'mbArch')
        add_vwall(28, y, 0, 'mbArch')
    for x in range(19, 22):
        add_hwall(x, 11, 0, 'mbArch')

    # Escadarias nas torres
    set_floor(11, 13, 0, 'spbStair')
    set_floor(29, 13, 0, 'spbStair')

    # Banners e mesas de mármore
    add_object(19, 15, 0, 'tbWU', 2.0, 2.0, 0)
    add_object(21, 15, 0, 'tbWU', 2.0, 2.0, 0)
    add_object(15, 13, 0, 'recMTable', 2.0, 2.0, 0)
    add_object(25, 13, 0, 'recMTable', 2.0, 2.0, 0)

    # --- NÍVEL 1: MEZANINO / ATRIUM COM PÉ-DIREITO DUPLO ---
    for (x, y) in all_building_tiles:
        if 19 <= x <= 21 and 12 <= y <= 14:
            continue
        set_floor(x, y, 1, 'mFloor')
    apply_perimeter(1)

    for x in range(19, 22):
        add_hwall(x, 12, 1, 'msPar')
        add_hwall(x, 15, 1, 'msPar')
    for y in range(12, 15):
        add_vwall(19, y, 1, 'msPar')
        add_vwall(22, y, 1, 'msPar')

    # --- NÍVEL 2: PISO NOBRE - GRANDE READING ROOM ---
    for (x, y) in all_building_tiles:
        if 18 <= x <= 22 or (10 <= x <= 12) or (28 <= x <= 30):
            set_floor(x, y, 2, 'wFloor')
        else:
            set_floor(x, y, 2, 'sbFloor')
    apply_perimeter(2)

    # Mobiliário da Reading Room
    add_object(20, 13, 2, 'recMTable', 2.0, 2.0, 0)
    add_object(20, 12, 2, 'chair', 2.0, 3.2, 0)
    add_object(20, 14, 2, 'chair', 2.0, 0.8, 3.1415)
    add_object(20, 9, 2, 'vynarch', 2.0, 2.0, 0)

    for y_b in [10, 12, 14]:
        add_object(18, y_b, 2, 'hBook', 3.2, 2.0, 1.5708)
        add_object(22, y_b, 2, 'hBook', 0.8, 2.0, 4.7124)

    add_object(15, 13, 2, 'cTable', 2.0, 2.0, 0)
    add_object(14, 12, 2, 'lBook', 2.0, 2.0, 0)
    add_object(16, 12, 2, 'lBook', 2.0, 2.0, 0)
    add_object(25, 13, 2, 'cTable', 2.0, 2.0, 0)
    add_object(24, 12, 2, 'lBook', 2.0, 2.0, 0)
    add_object(26, 12, 2, 'lBook', 2.0, 2.0, 0)

    # --- NÍVEL 3: LOGGIA / ÁTICO DAS ALAS E CORPO CENTRAL ---
    for (x, y) in all_building_tiles:
        set_floor(x, y, 3, 'sbFloor')
    apply_perimeter(3)

    # --- NÍVEL 4: COBERTURA MISTA (PLATIBANDAS PALACIANAS + TELHADOS MENORES) ---
    # ADEUS À OCA! 
    # Em vez de pirâmides gigantes de 5x5:
    # 1. As Alas laterais recebem PLATIBANDA com balaustrada/parapeito (sPar) em volta
    #    e um terraço plano pavimentado com um charmoso telhado de 2 águas no centro!
    
    # Borda externa das alas e corpo central no Nível 4 com platibandas (sPar):
    for x in range(13, 18):
        add_hwall(x, 11, 4, 'sPar')
        add_hwall(x, 16, 4, 'sPar')
    for x in range(23, 28):
        add_hwall(x, 11, 4, 'sPar')
        add_hwall(x, 16, 4, 'sPar')

    # Pisos planos de terraço nas alas
    for x in range(13, 18):
        for y in range(11, 16):
            set_floor(x, y, 4, 'sbFloor')
    for x in range(23, 28):
        for y in range(11, 16):
            set_floor(x, y, 4, 'sbFloor')

    # Telhado elegante e discreto no miolo das alas (3 tiles de cumeeira horizontal, sem oca!):
    # Em y=13 (linha central das alas), apenas 1 linha de telhado menor para quebrar a dureza reta:
    for x in range(14, 17):
        set_roof(x, 13, 4, 'sRoof')
    for x in range(24, 27):
        set_roof(x, 13, 4, 'sRoof')

    # Abside posterior: telhado menor acompanhando a curvatura
    for x in range(19, 22):
        set_roof(x, 9, 4, 'sRoof')

    # 2. TORRES DOS CANTOS (Elevadas até o Nível 4 como pavilhões de destaque)
    towers_l4 = set()
    for x in range(10, 13):
        for y in range(10, 17):
            towers_l4.add((x, y))
    for x in range(28, 31):
        for y in range(10, 17):
            towers_l4.add((x, y))
    for x in range(19, 22):
        for y in range(15, 18):
            towers_l4.add((x, y))

    for (x, y) in towers_l4:
        set_floor(x, y, 4, 'sbFloor')

    # Paredes das torres no Nível 4 com janelas elegantes
    for (x, y) in towers_l4:
        for (dx, dy), is_h in [((0, -1), True), ((0, 1), True), ((-1, 0), False), ((1, 0), False)]:
            nx, ny = x + dx, y + dy
            if (nx, ny) not in towers_l4:
                if is_h:
                    wy = y if dy == -1 else y + 1
                    wall_t = 'psnWindow' if (x in [11, 20, 29]) else 'sWall'
                    add_hwall(x, wy, 4, wall_t)
                else:
                    wx = x if dx == -1 else x + 1
                    wall_t = 'psnWindow' if (y in [12, 14]) else 'sWall'
                    add_vwall(wx, y, 4, wall_t)

    # --- NÍVEL 5: COROAMENTO DAS TORRES (MANSARDA PALACIANA COM BALAUSTRADA) ---
    # Para as torres (3x7 tiles):
    # Telhado nas bordas externas e PLATIBANDA com terraço no topo!
    for x in range(10, 13):
        for y in range(10, 17):
            # Linha central (x=11): PISO com balaustrada/parapeito (sPar), evitando a oca!
            if x == 11:
                set_floor(x, y, 5, 'sbFloor')
                add_vwall(11, y, 5, 'sPar')
                add_vwall(12, y, 5, 'sPar')
            else:
                set_roof(x, y, 5, 'sRoof')

    for x in range(28, 31):
        for y in range(10, 17):
            if x == 29:
                set_floor(x, y, 5, 'sbFloor')
                add_vwall(29, y, 5, 'sPar')
                add_vwall(30, y, 5, 'sPar')
            else:
                set_roof(x, y, 5, 'sRoof')

    # Pavilhão de Entrada: Platibanda clássica com balaustrada
    for x in range(19, 22):
        for y in range(15, 18):
            set_floor(x, y, 5, 'sbFloor')
            if x == 20:
                set_roof(x, y, 5, 'sRoof')
            else:
                add_hwall(x, 15, 5, 'sPar')
                add_hwall(x, 18, 5, 'sPar')

    # --- SERIALIZAÇÃO DO XML ---
    for x in range(width):
        for y in range(height):
            t_data = tiles_data[(x, y)]
            tile_elem = ET.SubElement(root, 'tile', {
                'x': str(x),
                'y': str(y),
                'height': str(t_data['height']),
                'caveHeight': '0',
                'caveSize': '0'
            })
            ET.SubElement(tile_elem, 'ground', {'id': t_data['ground']})
            
            sorted_lvls = sorted(t_data['levels'].keys())
            for lvl_idx in sorted_lvls:
                lvl_data = t_data['levels'][lvl_idx]
                has_content = (lvl_data['floor'] or lvl_data['hwalls'] or 
                               lvl_data['vwalls'] or lvl_data['roof'] or lvl_data['objects'])
                if not has_content:
                    continue
                    
                lvl_elem = ET.SubElement(tile_elem, 'level', {'value': str(lvl_idx)})
                if lvl_data['floor']:
                    f_id, f_orient = lvl_data['floor']
                    ET.SubElement(lvl_elem, 'floor', {'id': f_id, 'orientation': f_orient})
                for hw_id, hw_rev in lvl_data['hwalls']:
                    ET.SubElement(lvl_elem, 'hWall', {'id': hw_id, 'reversed': hw_rev})
                for vw_id, vw_rev in lvl_data['vwalls']:
                    ET.SubElement(lvl_elem, 'vWall', {'id': vw_id, 'reversed': vw_rev})
                if lvl_data['roof']:
                    ET.SubElement(lvl_elem, 'roof', {'id': lvl_data['roof']})
                for o_id, ox, oy, rot in lvl_data['objects']:
                    ET.SubElement(lvl_elem, 'object', {
                        'x': str(ox),
                        'y': str(oy),
                        'id': o_id,
                        'rotation': f'{rot:.6f}'
                    })

    xml_str = ET.tostring(root, encoding='utf-8')
    parsed = minidom.parseString(xml_str)
    pretty_xml = parsed.toprettyxml(indent='  ', encoding='utf-8')
    lines = pretty_xml.decode('utf-8').split('\n')
    if lines[0].startswith('<?xml'):
        lines = lines[1:]
    clean_xml = '\n'.join([l for l in lines if l.strip()])
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(clean_xml)
        
    print(f'Successfully updated Newberry Library map v3 at {output_path}!')

if __name__ == '__main__':
    target = r'D:\Downloads D\DeedPlanner-Windows\DeedPlanner_Data\Newberry_Library.map'
    create_newberry_map_v3(target)
