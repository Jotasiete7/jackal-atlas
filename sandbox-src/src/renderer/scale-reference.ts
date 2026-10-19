// ==============================================================================
// JACKAL SANDBOX — REFERÊNCIA DE ESCALA EM DIMENSÕES REAIS DO WURM ONLINE
// Boneco humano (1.8m) e Torre de Guarda (1 tile = 4x4m, 12m de altura)
// ==============================================================================

import * as THREE from 'three';
import { CONFIG } from '../config';
import { i18n, t } from '../i18n';

export type ScaleReferenceMode = 'human' | 'tower' | 'none';

export class ScaleReferenceManager {
  private parentGroup: THREE.Group;
  private container: THREE.Group;
  private humanGroup: THREE.Group;
  private towerGroup: THREE.Group;
  private humanLabel?: THREE.Sprite;
  private towerLabel?: THREE.Sprite;

  public currentMode: ScaleReferenceMode = 'human';
  private currentElevation = 0;
  private currentTileX = 0;
  private currentTileY = 0;
  private currentWorldX = 0;
  private currentWorldZ = 0;

  constructor(parentGroup: THREE.Group) {
    this.parentGroup = parentGroup;

    this.container = new THREE.Group();
    this.container.name = 'ScaleReferenceContainer';
    this.parentGroup.add(this.container);

    this.humanGroup = this.createHumanFigure();
    this.towerGroup = this.createGuardTower();

    this.container.add(this.humanGroup);
    this.container.add(this.towerGroup);

    this.setMode('human');
    this.setPosition(2, 0, 0);

    i18n.subscribe(() => {
      this.updateLabels();
    });
  }

  public setMode(mode: ScaleReferenceMode): void {
    this.currentMode = mode;
    this.humanGroup.visible = mode === 'human';
    this.towerGroup.visible = mode === 'tower';
    this.container.visible = mode !== 'none';
  }

  public cycleMode(): ScaleReferenceMode {
    if (this.currentMode === 'human') this.setMode('tower');
    else if (this.currentMode === 'tower') this.setMode('none');
    else this.setMode('human');
    return this.currentMode;
  }

  public getPosition(): { worldX: number; worldZ: number; tileX: number; tileY: number; elevation: number } {
    return {
      worldX: this.currentWorldX,
      worldZ: this.currentWorldZ,
      tileX: this.currentTileX,
      tileY: this.currentTileY,
      elevation: this.currentElevation,
    };
  }

  public setPosition(tileX: number, tileY: number, elevationMeters = 0): void {
    this.currentTileX = tileX;
    this.currentTileY = tileY;
    this.currentElevation = elevationMeters;

    this.currentWorldX = tileX * CONFIG.TILE_METERS;
    this.currentWorldZ = -tileY * CONFIG.TILE_METERS; // Norte é -Z

    this.container.position.set(this.currentWorldX, elevationMeters, this.currentWorldZ);
  }

  public setWorldPosition(worldX: number, worldZ: number, surfaceY = 0): void {
    this.currentWorldX = worldX;
    this.currentWorldZ = worldZ;
    this.currentTileX = Math.round(worldX / CONFIG.TILE_METERS);
    this.currentTileY = Math.round(-worldZ / CONFIG.TILE_METERS);
    this.currentElevation = surfaceY;

    this.container.position.set(worldX, surfaceY, worldZ);
  }

  public setExactY(surfaceY: number): void {
    this.currentElevation = surfaceY;
    this.container.position.y = surfaceY;
  }

  /**
   * Constrói figura humana em escala real do Wurm Online:
   * Altura total: exatamente 1.80m (~0.45 tile de largura nos ombros)
   * Acompanha picareta de topógrafo apontando para o Norte!
   */
  private createHumanFigure(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'WurmHumanFigure';

    // Materiais táteis com contraste e excelente leitura 3D
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf5d0b0, roughness: 0.5 });
    const clothesMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 }); // Túnica azul vibrante
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.6 }); // Botas/Cinto
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.2 }); // Picareta de aço

    // Base de apoio / plinto sutil para destacar sobre qualquer relevo
    const baseDiskGeom = new THREE.CylinderGeometry(0.55, 0.6, 0.08, 16);
    const baseDiskMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const baseDisk = new THREE.Mesh(baseDiskGeom, baseDiskMat);
    baseDisk.position.set(0, 0.04, 0);
    group.add(baseDisk);

    // 1. Pernas e Botas (0.08m a 0.93m)
    const legGeom = new THREE.CylinderGeometry(0.12, 0.14, 0.85, 8);
    const leftLeg = new THREE.Mesh(legGeom, leatherMat);
    leftLeg.position.set(-0.18, 0.50, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeom, leatherMat);
    rightLeg.position.set(0.18, 0.50, 0);
    group.add(rightLeg);

    // 2. Tronco / Túnica (0.93m a 1.53m)
    const torsoGeom = new THREE.BoxGeometry(0.52, 0.6, 0.3);
    const torso = new THREE.Mesh(torsoGeom, clothesMat);
    torso.position.set(0, 1.23, 0);
    group.add(torso);

    // 3. Cabeça (1.53m a 1.80m)
    const headGeom = new THREE.SphereGeometry(0.17, 12, 12);
    const head = new THREE.Mesh(headGeom, skinMat);
    head.position.set(0, 1.68, 0);
    group.add(head);

    // Chapéu de explorador / capacete
    const hatGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.06, 12);
    const hat = new THREE.Mesh(hatGeom, leatherMat);
    hat.position.set(0, 1.82, 0);
    group.add(hat);

    // 4. Picareta de Topógrafo na mão (cabeça = Norte, regra do Wurm!)
    const shaftGeom = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6);
    shaftGeom.rotateZ(Math.PI / 4);
    const shaft = new THREE.Mesh(shaftGeom, leatherMat);
    shaft.position.set(0.42, 0.95, 0);
    group.add(shaft);

    const pickHeadGeom = new THREE.ConeGeometry(0.09, 0.45, 6);
    pickHeadGeom.rotateX(-Math.PI / 2); // Apontando para o Norte (-Z)
    const pickHead = new THREE.Mesh(pickHeadGeom, metalMat);
    pickHead.position.set(0.75, 1.35, -0.15);
    group.add(pickHead);

    // 5. Rótulo flutuante proporcional
    this.humanLabel = this.createLabelSprite(t('label_human'), '#38bdf8');
    this.humanLabel.position.set(0, 2.5, 0);
    group.add(this.humanLabel);

    return group;
  }

  /**
   * Constrói Torre de Guarda na altura do modelo real do Wurm (structures/Towers/freedomTower.wom):
   * cerca de 24 m acima do solo. A forma simples (base de pedra, andar de madeira, parapeito,
   * telhado e estandarte) é desenhada com topo em 15.6 m e escalada uniformemente para 24 m.
   */
  private createGuardTower(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'WurmGuardTower';
    const ALTURA_REAL = 24.0;   // altura do modelo real do Wurm acima do solo
    const TOPO_FORMA = 15.6;    // topo do estandarte na forma abaixo
    const corpo = new THREE.Group();
    corpo.scale.setScalar(ALTURA_REAL / TOPO_FORMA);
    group.add(corpo);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 }); // Cantaria de pedra clara
    const woodMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65 });  // Madeira rica
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });   // Telhas cerâmicas vermelhas

    // 1. Base de cantaria de pedra (exatamente 4.0m × 4.0m, altura 5.0m)
    const baseGeom = new THREE.BoxGeometry(CONFIG.TILE_METERS, 5.0, CONFIG.TILE_METERS);
    const base = new THREE.Mesh(baseGeom, stoneMat);
    base.position.set(0, 2.5, 0);
    corpo.add(base);

    // Porta da torre
    const doorGeom = new THREE.BoxGeometry(1.2, 2.2, 0.2);
    const door = new THREE.Mesh(doorGeom, woodMat);
    door.position.set(0, 1.1, -2.05); // Face Norte
    corpo.add(door);

    // 2. Segundo andar de madeira com balcão (3.6m × 3.6m, altura 4.0m)
    const midGeom = new THREE.BoxGeometry(3.6, 4.0, 3.6);
    const mid = new THREE.Mesh(midGeom, woodMat);
    mid.position.set(0, 7.0, 0);
    corpo.add(mid);

    // Parapeito com ameias (4.2m × 4.2m)
    const parapetGeom = new THREE.BoxGeometry(4.2, 0.8, 4.2);
    const parapet = new THREE.Mesh(parapetGeom, stoneMat);
    parapet.position.set(0, 9.4, 0);
    corpo.add(parapet);

    // 3. Telhado cônico / piramidal com pináculo (altura 4.0m -> topo em 13.5m)
    const roofGeom = new THREE.ConeGeometry(3.0, 4.0, 4);
    roofGeom.rotateY(Math.PI / 4); // Alinha faces com a base quadrada
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.set(0, 11.8, 0);
    corpo.add(roof);

    // Estandarte / Galhardete da Guilda no topo
    const poleGeom = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6);
    const pole = new THREE.Mesh(poleGeom, woodMat);
    pole.position.set(0, 14.5, 0);
    corpo.add(pole);

    const bannerGeom = new THREE.PlaneGeometry(1.4, 0.8);
    const bannerMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, side: THREE.DoubleSide });
    const banner = new THREE.Mesh(bannerGeom, bannerMat);
    banner.position.set(0.7, 15.2, 0);
    corpo.add(banner);

    // 4. Rótulo com dimensões
    this.towerLabel = this.createLabelSprite(t('label_tower'), '#f59e0b');
    this.towerLabel.position.set(0, ALTURA_REAL + 2.0, 0);
    group.add(this.towerLabel);

    return group;
  }

  public updateLabels(): void {
    if (this.humanLabel) {
      this.updateSpriteTexture(this.humanLabel, t('label_human'), '#38bdf8');
    }
    if (this.towerLabel) {
      this.updateSpriteTexture(this.towerLabel, t('label_tower'), '#f59e0b');
    }
  }

  private drawToCanvas(canvas: HTMLCanvasElement, text: string, accentColor: string): void {
    canvas.width = 240;
    canvas.height = 48;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.roundRect(0, 0, 240, 48, 6);
    ctx.fill();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 120, 24);
  }

  private updateSpriteTexture(sprite: THREE.Sprite, text: string, accentColor: string): void {
    const canvas = (sprite as any)._canvas as HTMLCanvasElement;
    if (canvas) {
      this.drawToCanvas(canvas, text, accentColor);
      if (sprite.material.map) {
        sprite.material.map.needsUpdate = true;
      }
    }
  }

  private createLabelSprite(text: string, accentColor: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    this.drawToCanvas(canvas, text, accentColor);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    (sprite as any)._canvas = canvas;
    sprite.scale.set(5.5, 1.2, 1);
    return sprite;
  }
}
