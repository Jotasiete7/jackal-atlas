// ==============================================================================
// JACKAL SANDBOX — GRADE CARTOGRÁFICA 100/10 TILES E MARCAÇÃO DE FOLHAS
// Rótulos de folhas (ex: N3-L5), cruz central (0,0) e círculo de alcance da estação
// As linhas de grade 10/100 tiles são renderizadas via GLSL diretamente no relevo!
// ==============================================================================

import * as THREE from 'three';
import { CONFIG, getTileSheetName, CRYSTAL_BASES, CrystalBase } from '../config';
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

    // Renderiza os 3 Cristais Oficiais com marcos de referência 3D
    for (const baseKey of Object.keys(CRYSTAL_BASES) as Array<keyof typeof CRYSTAL_BASES>) {
      const base = CRYSTAL_BASES[baseKey];
      const marker = this.createCrystalMarker(base);
      this.gridGroup.add(marker);
    }

    const tileMeters = CONFIG.TILE_METERS;
    const addedSheets = new Set<string>();

    // Gera rótulos de quadrículas focados ao redor do spawn e das 3 bases
    const anchorPoints = [
      { x: 0, y: 0, radius: 400 },
      { x: CRYSTAL_BASES.north.tileX, y: CRYSTAL_BASES.north.tileY, radius: 400 },
      { x: CRYSTAL_BASES.west.tileX, y: CRYSTAL_BASES.west.tileY, radius: 400 },
      { x: CRYSTAL_BASES.east.tileX, y: CRYSTAL_BASES.east.tileY, radius: 400 },
    ];

    for (const anchor of anchorPoints) {
      for (let tX = anchor.x - anchor.radius; tX <= anchor.x + anchor.radius; tX += 100) {
        for (let tY = anchor.y - anchor.radius; tY <= anchor.y + anchor.radius; tY += 100) {
          const sheetKey = Math.floor(tX / 100) + ',' + Math.floor(tY / 100);
          if (addedSheets.has(sheetKey)) continue;
          addedSheets.add(sheetKey);

          const sheetName = getTileSheetName(tX + 50, tY + 50);
          const sprite = this.createSheetLabelSprite(sheetName);
          sprite.position.set((tX + 50) * tileMeters, 0.8, -(tY + 50) * tileMeters);
          this.gridGroup.add(sprite);
          this.labelSprites.push(sprite);
        }
      }
    }
  }

  /** Cria sprite de texto bitmap para o nome da folha (ex: N3-L5) no estilo da página principal */
  private createSheetLabelSprite(text: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 40;
    const ctx = canvas.getContext('2d')!;

    // Fundo escuro sutil idêntico à página principal
    ctx.fillStyle = 'rgba(13, 17, 23, 0.82)';
    ctx.roundRect(0, 0, 128, 40, 4);
    ctx.fill();

    // Borda fina em Âmbar Jackal
    ctx.strokeStyle = 'rgba(245, 166, 35, 0.65)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tipografia JetBrains Mono em Âmbar
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.fillStyle = '#f5a623';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 64, 20);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(32, 10, 1);
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

  private createCrystalLabelSprite(text: string, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(13, 17, 23, 0.90)';
    ctx.roundRect(0, 0, 256, 64, 8);
    ctx.fill();

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(64, 16, 1);
    return sprite;
  }

  private createCrystalMarker(base: CrystalBase): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Crystal_' + base.id;

    const worldX = base.tileX * CONFIG.TILE_METERS;
    const worldZ = -base.tileY * CONFIG.TILE_METERS;
    group.position.set(worldX, 0, worldZ);

    const crystalGeom = new THREE.OctahedronGeometry(6.0, 0);
    const crystalMat = new THREE.MeshBasicMaterial({
      color: base.hexColor,
      wireframe: false,
    });
    const crystalMesh = new THREE.Mesh(crystalGeom, crystalMat);
    crystalMesh.position.y = 8.0;
    crystalMesh.scale.set(1.0, 2.2, 1.0);
    group.add(crystalMesh);

    const ringGeom = new THREE.RingGeometry(8.0, 11.0, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: base.hexColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const ringMesh = new THREE.Mesh(ringGeom, ringMat);
    ringMesh.position.y = 0.5;
    group.add(ringMesh);

    // Círculo de Visada / Alcance de 100 tiles do Posto Oficial (400 metros de raio)
    const rangeTiles = CONFIG.DEFAULT_VISIT_RANGE_TILES; // 100 tiles
    const radiusMeters = rangeTiles * CONFIG.TILE_METERS; // 400.0m
    const circleSegments = 64;
    const circlePoints: THREE.Vector3[] = [];
    for (let i = 0; i <= circleSegments; i++) {
      const angle = (i / circleSegments) * Math.PI * 2;
      circlePoints.push(new THREE.Vector3(
        Math.cos(angle) * radiusMeters,
        0.5,
        Math.sin(angle) * radiusMeters
      ));
    }
    const rangeGeom = new THREE.BufferGeometry().setFromPoints(circlePoints);
    const rangeMat = new THREE.LineBasicMaterial({
      color: base.hexColor,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const rangeCircle = new THREE.Line(rangeGeom, rangeMat);
    rangeCircle.name = 'RangeCircle_' + base.id;
    group.add(rangeCircle);

    const sprite = this.createCrystalLabelSprite(base.icon + ' ' + base.namePt, base.color);
    sprite.position.set(0, 24.0, 0);
    group.add(sprite);

    return group;
  }
}
