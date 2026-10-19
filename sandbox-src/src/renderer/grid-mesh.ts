// ==============================================================================
// JACKAL SANDBOX — GRADE CARTOGRÁFICA 100/10 TILES E MARCAÇÃO DE FOLHAS
// Rótulos de folhas (ex: N3-L5), cruz central (0,0) e círculo de alcance da estação
// As linhas de grade 10/100 tiles são renderizadas via GLSL diretamente no relevo!
// ==============================================================================

import * as THREE from 'three';
import { CONFIG, getTileSheetName } from '../config';
import { FieldVisit } from '../core/types';

export class GridMeshManager {
  private parentGroup: THREE.Group;
  private gridGroup: THREE.Group;
  private stationGroup: THREE.Group;
  private labelSprites: THREE.Sprite[] = [];
  public isVisible = true;
  public showStationRange = true;

  constructor(parentGroup: THREE.Group) {
    this.parentGroup = parentGroup;

    this.gridGroup = new THREE.Group();
    this.gridGroup.name = 'CartographicGridLabels';
    this.parentGroup.add(this.gridGroup);

    this.stationGroup = new THREE.Group();
    this.stationGroup.name = 'StationRange';
    this.parentGroup.add(this.stationGroup);

    this.buildGridLabelsAndSpawnCross();
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.gridGroup.visible = visible;
  }

  public setStationRangeVisible(visible: boolean): void {
    this.showStationRange = visible;
    this.stationGroup.visible = visible;
  }

  private buildGridLabelsAndSpawnCross(): void {
    // Limpa sprites e linhas anteriores
    while (this.gridGroup.children.length > 0) {
      const child = this.gridGroup.children[0];
      this.gridGroup.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
    }
    for (const sprite of this.labelSprites) {
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    this.labelSprites = [];

    const extentTiles = 1400;
    const tileMeters = CONFIG.TILE_METERS;

    // Adiciona rótulos de folha discretos a cada 200 tiles
    for (let tX = -extentTiles; tX <= extentTiles; tX += 200) {
      for (let tY = -extentTiles; tY <= extentTiles; tY += 200) {
        if (tX === 0 && tY === 0) continue; // Ponto central tem a cruz de spawn
        const sheetName = getTileSheetName(tX, tY);
        const sprite = this.createSheetLabelSprite(sheetName);
        sprite.position.set(tX * tileMeters + 20, 1.0, -tY * tileMeters + 20); // Norte é -Z
        this.gridGroup.add(sprite);
        this.labelSprites.push(sprite);
      }
    }

  }

  /** Cria sprite de texto bitmap para o nome da folha (ex: N3-L5) */
  private createSheetLabelSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(18, 20, 24, 0.75)';
    ctx.roundRect(0, 0, 128, 48, 6);
    ctx.fill();

    ctx.strokeStyle = 'rgba(96, 165, 250, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#93c5fd';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 24);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(40, 15, 1);
    return sprite;
  }

  /** Atualiza o anel luminoso da estação da visita ativa */
  public updateStationRange(visit: FieldVisit, stationElevation = 0): void {
    while (this.stationGroup.children.length > 0) {
      const child = this.stationGroup.children[0];
      this.stationGroup.remove(child);
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
    }

    if (!this.showStationRange || !visit) return;

    const rangeTiles = visit.range_tiles || CONFIG.DEFAULT_VISIT_RANGE_TILES;
    const radiusMeters = rangeTiles * CONFIG.TILE_METERS;
    const stationWorldX = visit.station_x * CONFIG.TILE_METERS;
    const stationWorldZ = -visit.station_y * CONFIG.TILE_METERS; // Norte é -Z

    // Círculo de linha com 64 segmentos ligeiramente acima do piso
    const segments = 64;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(
        stationWorldX + Math.cos(angle) * radiusMeters,
        stationElevation + 0.5,
        stationWorldZ + Math.sin(angle) * radiusMeters
      ));
    }

    const circleGeom = new THREE.BufferGeometry().setFromPoints(points);
    const circleMat = new THREE.LineBasicMaterial({
      color: 0x10b981, // Verde esmeralda indicando área de trabalho observada
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const circleLine = new THREE.Line(circleGeom, circleMat);
    this.stationGroup.add(circleLine);

    // Retículo / Cruzeta topográfica sutil no chão no centro da estação (sem obstruir a visão nem modelos 3D)
    const crossSize = 2.0;
    const crossPoints = [
      new THREE.Vector3(stationWorldX - crossSize, stationElevation + 0.1, stationWorldZ),
      new THREE.Vector3(stationWorldX + crossSize, stationElevation + 0.1, stationWorldZ),
      new THREE.Vector3(stationWorldX, stationElevation + 0.1, stationWorldZ - crossSize),
      new THREE.Vector3(stationWorldX, stationElevation + 0.1, stationWorldZ + crossSize),
    ];
    const crossGeom = new THREE.BufferGeometry().setFromPoints(crossPoints);
    const crossMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const crossLines = new THREE.LineSegments(crossGeom, crossMat);
    this.stationGroup.add(crossLines);
  }
}
