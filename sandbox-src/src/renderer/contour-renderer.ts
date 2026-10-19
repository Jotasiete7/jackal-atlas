// ==============================================================================
// JACKAL SANDBOX — RENDERIZADOR DE CURVAS DE NÍVEL E EXPORTAÇÃO
// Comunicação com Web Worker, rótulos de cota em 3D e exportação para GeoJSON, SVG e PNG
// ==============================================================================

import * as THREE from 'three';
import { CONFIG } from '../config';
import { HeightfieldManager } from '../core/heightfield';
import { ContourOptions } from '../core/types';
import { ContourSegment, MarchingSquaresResponse } from '../workers/marching-squares.worker';

export class ContourRenderer {
  private parentGroup: THREE.Group;
  private heightfield: HeightfieldManager;
  private worker: Worker | null = null;
  private labelSprites: THREE.Sprite[] = [];

  public isVisible = true;
  public options: ContourOptions = {
    intervalMeters: 5,
    masterEvery: 5, // Cota mestra a cada 25m (5 * 5m)
    showLabels: true,
  };

  private latestGeoJson: any = null;
  private latestSegments: ContourSegment[] = [];
  private isProcessing = false;
  private needsRecompute = false;
  private debounceTimer: any = null;

  constructor(parentGroup: THREE.Group, heightfield: HeightfieldManager) {
    this.parentGroup = parentGroup;
    this.heightfield = heightfield;
    this.initWorker();
  }

  private initWorker(): void {
    try {
      this.worker = new Worker(
        new URL('../workers/marching-squares.worker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (event: MessageEvent<MarchingSquaresResponse>) => {
        this.isProcessing = false;
        this.handleWorkerResult(event.data);
        if (this.needsRecompute) {
          this.needsRecompute = false;
          this.requestUpdate();
        }
      };

      this.worker.onerror = (err) => {
        console.error('Erro no worker de Marching Squares:', err);
        this.isProcessing = false;
      };
    } catch (e) {
      console.warn('Web Workers não disponíveis no ambiente atual.', e);
    }
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    for (const sprite of this.labelSprites) {
      sprite.visible = visible;
    }
  }

  public setInterval(intervalMeters: number): void {
    this.options.intervalMeters = intervalMeters;
    this.requestUpdate();
  }

  public triggerDebouncedUpdate(delayMs = 300): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.requestUpdate();
    }, delayMs);
  }

  public requestUpdate(): void {
    if (!this.worker) return;
    if (this.isProcessing) {
      this.needsRecompute = true;
      return;
    }

    const bounds = this.heightfield.getKnownBounds();
    if (!bounds) {
      this.clear();
      return;
    }

    const subgrid = this.heightfield.extractSubgrid(
      bounds.minCellX,
      bounds.maxCellX,
      bounds.minCellY,
      bounds.maxCellY
    );

    this.isProcessing = true;
    this.worker.postMessage({
      width: subgrid.width,
      height: subgrid.height,
      minCellX: subgrid.minCellX,
      minCellY: subgrid.minCellY,
      cellSizeTiles: CONFIG.CELL_SIZE_TILES,
      tileMeters: CONFIG.TILE_METERS,
      heights: subgrid.heights,
      states: subgrid.states,
      intervalMeters: this.options.intervalMeters,
      masterEvery: this.options.masterEvery,
    });
  }

  private handleWorkerResult(data: MarchingSquaresResponse): void {
    this.latestGeoJson = data.geoJson;
    this.latestSegments = data.segments;
    this.rebuild3DLabels(data.segments);
  }

  private currentExaggeration = 1.0;

  public setVerticalExaggeration(factor: number): void {
    this.currentExaggeration = factor;
    for (const sprite of this.labelSprites) {
      const baseAlt = (sprite as any).userData?.baseAltitude;
      if (typeof baseAlt === 'number') {
        sprite.position.y = baseAlt * this.currentExaggeration + 0.8;
      }
    }
  }

  /**
   * Posiciona rótulos flutuantes nas curvas mestras calculadas pelo worker
   * As linhas de contorno em si são desenhadas a 60 FPS pelo Fragment Shader!
   */
  private rebuild3DLabels(segments: ContourSegment[]): void {
    this.clear();
    if (!segments || segments.length === 0 || !this.options.showLabels) return;

    const maxLabels = 30;
    const placedLabels: Array<{ x: number; z: number; altitude: number }> = [];

    for (const seg of segments) {
      if (!seg.isMaster) continue;
      if (placedLabels.length >= maxLabels) break;

      const midX = (seg.x1 + seg.x2) / 2;
      const midZ = (seg.z1 + seg.z2) / 2;
      const baseAltitude = (seg.y1 + seg.y2) / 2;
      const midY = baseAltitude * this.currentExaggeration + 0.8;

      // Distância mínima contra rótulos existentes (evita amontoar em declives íngremes)
      const tooClose = placedLabels.some((p) => {
        const dist = Math.hypot(p.x - midX, p.z - midZ);
        if (p.altitude === seg.altitude && dist < 50) return true;
        if (dist < 18) return true; // Distância mínima absoluta entre rótulos adjacentes
        return false;
      });

      if (tooClose) continue;

      if (Math.random() < 0.20) {
        const sprite = this.createElevationSprite(`${seg.altitude}m`);
        sprite.position.set(midX, midY, midZ);
        sprite.visible = this.isVisible;
        (sprite as any).userData = { baseAltitude };
        this.parentGroup.add(sprite);
        this.labelSprites.push(sprite);
        placedLabels.push({ x: midX, z: midZ, altitude: seg.altitude });
      }
    }
  }

  private createElevationSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 72;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;

    // Fundo escuro semitransparente com cantos arredondados
    ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
    ctx.roundRect(0, 0, 72, 32, 5);
    ctx.fill();

    // Borda na cor dourada de cota mestra
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 15px monospace';
    ctx.fillStyle = '#fef3c7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 36, 16);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false, // Garante que a legenda nunca suma dentro do relevo ou da curva!
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    // Escala proporcional elegante (5.5m em vez de 16m gigantes)
    sprite.scale.set(5.5, 2.4, 1);
    return sprite;
  }

  public clear(): void {
    for (const sprite of this.labelSprites) {
      this.parentGroup.remove(sprite);
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    this.labelSprites = [];
  }

  /**
   * Exporta curvas em formato GeoJSON (coordenadas em tiles, centro em 0,0)
   */
  public exportGeoJSON(): void {
    if (!this.latestGeoJson || this.latestGeoJson.features.length === 0) {
      alert('Nenhuma curva de nível gerada para exportar ainda. Modele alguma elevação primeiro!');
      return;
    }

    const jsonStr = JSON.stringify(this.latestGeoJson, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jackal-contours-${Date.now()}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Exporta curvas em formato vetorial SVG
   */
  public exportSVG(): void {
    if (this.latestSegments.length === 0) {
      alert('Nenhuma curva de nível gerada para exportar.');
      return;
    }

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const seg of this.latestSegments) {
      if (seg.x1 < minX) minX = seg.x1;
      if (seg.x2 > maxX) maxX = seg.x2;
      if (seg.z1 < minZ) minZ = seg.z1;
      if (seg.z2 > maxZ) maxZ = seg.z2;
    }

    const padding = 40;
    const width = Math.max(100, Math.ceil(maxX - minX + padding * 2));
    const height = Math.max(100, Math.ceil(maxZ - minZ + padding * 2));

    let pathsSvg = '';
    for (const seg of this.latestSegments) {
      const sx1 = seg.x1 - minX + padding;
      const sy1 = seg.z1 - minZ + padding;
      const sx2 = seg.x2 - minX + padding;
      const sy2 = seg.z2 - minZ + padding;
      const stroke = seg.isMaster ? '#ffffff' : '#c8963e';
      const width = seg.isMaster ? '2' : '1';
      pathsSvg += `<line x1="${sx1.toFixed(1)}" y1="${sy1.toFixed(1)}" x2="${sx2.toFixed(1)}" y2="${sy2.toFixed(1)}" stroke="${stroke}" stroke-width="${width}" />\n`;
    }

    const svgContent = `<?xml version="1.0" standalone="no"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" style="background:#121417;">
  <title>Jackal Round 2 — Curvas de Nível</title>
  <g id="contours">
    ${pathsSvg}
  </g>
</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jackal-contours-${Date.now()}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Exporta imagem PNG cartográfica 2D de alta fidelidade
   */
  public exportCartographicPNG(): void {
    const bounds = this.heightfield.getKnownBounds();
    if (!bounds) {
      alert('Nenhum terreno explorado para exportar.');
      return;
    }

    const subgrid = this.heightfield.extractSubgrid(
      bounds.minCellX,
      bounds.maxCellX,
      bounds.minCellY,
      bounds.maxCellY
    );

    const canvas = document.createElement('canvas');
    canvas.width = subgrid.width * 4; // 4x supersampling
    canvas.height = subgrid.height * 4;
    const ctx = canvas.getContext('2d')!;

    // Fundo desconhecido
    ctx.fillStyle = '#121417';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cellW = 4;
    const cellH = 4;

    for (let y = 0; y < subgrid.height; y++) {
      const drawY = (subgrid.height - 1 - y) * cellH; // Inverte Y para Norte para cima
      for (let x = 0; x < subgrid.width; x++) {
        const idx = y * subgrid.width + x;
        const state = subgrid.states[idx];
        const h = subgrid.heights[idx];

        if (state === 1) { // Água
          ctx.fillStyle = '#1e5ba3';
          ctx.fillRect(x * cellW, drawY, cellW, cellH);
        } else if (state === 2) { // Terra
          if (h <= 5) ctx.fillStyle = '#35683d';
          else if (h <= 25) ctx.fillStyle = '#4a8542';
          else if (h <= 60) ctx.fillStyle = '#7da443';
          else if (h <= 100) ctx.fillStyle = '#b5a653';
          else if (h <= 160) ctx.fillStyle = '#997950';
          else if (h <= 230) ctx.fillStyle = '#736357';
          else ctx.fillStyle = '#e5e7eb';
          ctx.fillRect(x * cellW, drawY, cellW, cellH);
        }
      }
    }

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `jackal-cartographic-map-${Date.now()}.png`;
    a.click();
  }
}
