#!/usr/bin/env python3
"""
stitch_tiles.py — Utilitário para Composição de Imagem Completa (4096x4096px)
Monta a imagem única a partir da pirâmide de tiles Leaflet (Zoom 4 = 16x16 tiles de 256px).
"""

import argparse
import os
import sys
from PIL import Image

def stitch_layer(layer_dir: str, output_path: str, zoom: int = 4, tile_size: int = 256):
    zoom_dir = os.path.join(layer_dir, str(zoom))
    if not os.path.exists(zoom_dir):
        print(f"[-] Diretório do zoom {zoom} não encontrado em: {zoom_dir}", file=sys.stderr)
        return False
        
    tiles_per_axis = 2 ** zoom
    full_dim = tiles_per_axis * tile_size
    print(f"[*] Montando imagem {full_dim}x{full_dim}px (Zoom {zoom}, {tiles_per_axis}x{tiles_per_axis} tiles)...")
    
    canvas = Image.new("RGB", (full_dim, full_dim), (0, 0, 0))
    stitched_count = 0
    
    for x in range(tiles_per_axis):
        for y in range(tiles_per_axis):
            tile_path = os.path.join(zoom_dir, str(x), f"{y}.png")
            if os.path.exists(tile_path):
                tile = Image.open(tile_path).convert("RGB")
                canvas.paste(tile, (x * tile_size, y * tile_size))
                stitched_count += 1
                
    total_expected = tiles_per_axis * tiles_per_axis
    print(f"[*] Tiles processados: {stitched_count}/{total_expected}")
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    canvas.save(output_path, "PNG", optimize=True)
    size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"[OK] Imagem salva com sucesso: {output_path} ({size_mb:.2f} MB)")
    return True

def main():
    parser = argparse.ArgumentParser(description="Montador de Tiles Leaflet para Imagem 4096")
    parser.add_argument("-i", "--input-dir", required=True, help="Diretório da camada de tiles (ex: Jackal-Atlas/tiles_terrain)")
    parser.add_argument("-o", "--output", required=True, help="Arquivo PNG de saída")
    parser.add_argument("-z", "--zoom", type=int, default=4, help="Nível de zoom a compor (padrão: 4)")
    args = parser.parse_args()
    
    stitch_layer(args.input_dir, args.output, args.zoom)

if __name__ == "__main__":
    if sys.platform == "win32":
        import io
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    main()
