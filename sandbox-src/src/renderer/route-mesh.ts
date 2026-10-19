// ==============================================================================
// JACKAL SANDBOX — RENDERIZADOR 3D DE ROTAS E GABARITOS DE AFERIÇÃO
// Tiras de estradas que acompanham o relevo, pontes como réguas suspensas e túneis em raio-X
// ==============================================================================

import * as THREE from 'three';
import { CONFIG } from '../config';
import { MapRoute } from '../core/types';
import { RouteManager } from '../core/routes';
import { HeightfieldManager } from '../core/heightfield';

export class RouteMeshManager {
  private parentGroup: THREE.Group;
  private routeManager: RouteManager;
  private heightfield: HeightfieldManager;
  private routeObjects: Map<string, THREE.Group> = new Map();
  public isVisible = true;
  private currentExaggeration = 1.0;

  // Visualização de preview elástico ao vivo durante o desenho
  private previewGroup: THREE.Group;

  constructor(
    parentGroup: THREE.Group,
    routeManager: RouteManager,
    heightfield: HeightfieldManager
  ) {
    this.parentGroup = parentGroup;
    this.routeManager = routeManager;
    this.heightfield = heightfield;

    this.previewGroup = new THREE.Group();
    this.previewGroup.name = 'RoutePreviewGroup';
    this.parentGroup.add(this.previewGroup);

    this.routeManager.subscribe(() => {
      this.rebuildAllRoutes();
    });

    this.rebuildAllRoutes();
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.parentGroup.visible = visible;
  }

  public setVerticalExaggeration(factor: number): void {
    this.currentExaggeration = factor;
    this.rebuildAllRoutes();
  }

  /**
   * Atualização instantânea dos vértices quando o usuário esculpe com pincel
   */
  public refreshHeights(): void {
    for (const [routeId, group] of this.routeObjects.entries()) {
      const route = this.routeManager.getById(routeId);
      if (route && route.type === 'road') {
        // Recria a tira da estrada sobre o relevo atualizado
        this.parentGroup.remove(group);
        this.disposeGroup(group);
        const newGroup = this.createRoute3DObject(route);
        this.parentGroup.add(newGroup);
        this.routeObjects.set(route.id, newGroup);
      }
    }
  }

  public rebuildAllRoutes(): void {
    for (const group of this.routeObjects.values()) {
      this.parentGroup.remove(group);
      this.disposeGroup(group);
    }
    this.routeObjects.clear();

    const routes = this.routeManager.getAll();
    for (const route of routes) {
      const group = this.createRoute3DObject(route);
      this.parentGroup.add(group);
      this.routeObjects.set(route.id, group);
    }
  }

  /**
   * Renderiza a tira elástica em tempo real enquanto o usuário arrasta o mouse
   */
  public updatePreview(
    path: Array<[number, number]>,
    type: 'road' | 'bridge' | 'tunnel',
    status: 'planned' | 'built',
    realLength?: number | null
  ): void {
    this.clearPreview();
    if (!path || path.length < 2) return;

    const dummyRoute: MapRoute = {
      id: 'preview_route',
      name: 'Preview',
      type,
      status,
      path,
      widthTiles: 2,
      realLengthTiles: realLength,
    };

    const previewObj = this.createRoute3DObject(dummyRoute, true);
    this.previewGroup.add(previewObj);
  }

  public clearPreview(): void {
    while (this.previewGroup.children.length > 0) {
      const child = this.previewGroup.children[0];
      this.previewGroup.remove(child);
      this.disposeGroup(child as THREE.Group);
    }
  }

  private createRoute3DObject(route: MapRoute, isPreview = false): THREE.Group {
    const group = new THREE.Group();
    group.name = `Route_${route.id}`;
    (group as any).userData = { routeId: route.id, isPreview };

    switch (route.type) {
      case 'bridge':
        this.buildBridge3D(group, route, isPreview);
        break;
      case 'tunnel':
        this.buildTunnel3D(group, route, isPreview);
        break;
      case 'road':
      default:
        this.buildRoadStrip3D(group, route, isPreview);
        break;
    }

    return group;
  }

  /**
   * 1. ESTRADA: Tira contínua colada aos vértices do relevo (Terrain Ribbon)
   */
  private buildRoadStrip3D(
    group: THREE.Group,
    route: MapRoute,
    isPreview: boolean
  ): void {
    const points = route.path;
    if (points.length < 2) return;

    const isBuilt = route.status === 'built';
    const mainColor = isBuilt ? 0x00e676 : 0xf5a623; // Verde (feita) ou Dourado/Âmbar (planejada)
    const halfWidth = (route.widthTiles * CONFIG.TILE_METERS) / 2;

    // Amostragem densa a cada 1 tile ao longo dos segmentos
    const ribbonVerts: number[] = [];
    const ribbonIndices: number[] = [];

    let vertIndex = 0;

    for (let s = 0; s < points.length - 1; s++) {
      const p1 = points[s];
      const p2 = points[s + 1];
      const dist = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      const steps = Math.max(1, Math.ceil(dist)); // 1 passo por tile

      const dirX = (p2[0] - p1[0]) / (dist || 1);
      const dirY = (p2[1] - p1[1]) / (dist || 1);

      // Normal perpendicular no plano 2D para a largura da fita
      // Nota: no Three.js, worldX = x * 4, worldZ = -y * 4
      const normX = -dirY;
      const normY = dirX;

      const normWorldX = normX * halfWidth;
      const normWorldZ = -normY * halfWidth;

      const startStep = s === 0 ? 0 : 1; // Evita duplicar vértice da junção
      for (let st = startStep; st <= steps; st++) {
        const t = st / steps;
        const curTileX = p1[0] + (p2[0] - p1[0]) * t;
        const curTileY = p1[1] + (p2[1] - p1[1]) * t;

        const wX = curTileX * CONFIG.TILE_METERS;
        const wZ = -curTileY * CONFIG.TILE_METERS;
        const elevation = this.heightfield.getInterpolatedHeightAtTile(curTileX, curTileY);
        const wY = (elevation + 0.12) * this.currentExaggeration; // Levemente acima do chão

        // Vértice esquerdo e direito da fita
        ribbonVerts.push(wX - normWorldX, wY, wZ - normWorldZ);
        ribbonVerts.push(wX + normWorldX, wY, wZ + normWorldZ);

        if (vertIndex >= 2) {
          const v = vertIndex;
          // Dois triângulos por quad
          ribbonIndices.push(v - 2, v - 1, v);
          ribbonIndices.push(v - 1, v + 1, v);
        }
        vertIndex += 2;
      }
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(ribbonVerts, 3));
    if (ribbonIndices.length > 0) {
      geom.setIndex(ribbonIndices);
    }
    geom.computeVertexNormals();

    const mat = new THREE.MeshBasicMaterial({
      color: mainColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: isPreview ? 0.7 : 0.9,
      wireframe: !isBuilt && !isPreview, // Planejada com malha aramada sutil
    });

    const mesh = new THREE.Mesh(geom, mat);
    group.add(mesh);

    // Linha central de contraste
    const linePoints: THREE.Vector3[] = [];
    for (let i = 0; i < ribbonVerts.length; i += 6) {
      const midX = (ribbonVerts[i] + ribbonVerts[i + 3]) / 2;
      const midY = (ribbonVerts[i + 1] + ribbonVerts[i + 4]) / 2 + 0.05;
      const midZ = (ribbonVerts[i + 2] + ribbonVerts[i + 5]) / 2;
      linePoints.push(new THREE.Vector3(midX, midY, midZ));
    }
    if (linePoints.length >= 2) {
      const lineGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
      const lineMat = new THREE.LineBasicMaterial({
        color: isBuilt ? 0xffffff : 0xf5a623,
        linewidth: 2,
      });
      group.add(new THREE.Line(lineGeom, lineMat));
    }

    // Rótulo com total de tiles
    if (!isPreview) {
      this.attachRouteBadge(group, route, '#f5a623', '🛣️');
    }
  }

  /**
   * 2. PONTE: Régua de aferição suspensa entre cotas com escala graduada
   */
  private buildBridge3D(
    group: THREE.Group,
    route: MapRoute,
    isPreview: boolean
  ): void {
    const points = route.path;
    if (points.length < 2) return;

    const pStart = points[0];
    const pEnd = points[points.length - 1];

    const startX = pStart[0] * CONFIG.TILE_METERS;
    const startZ = -pStart[1] * CONFIG.TILE_METERS;
    const startY =
      (this.heightfield.getInterpolatedHeightAtTile(pStart[0], pStart[1]) + 0.2) *
      this.currentExaggeration;

    const endX = pEnd[0] * CONFIG.TILE_METERS;
    const endZ = -pEnd[1] * CONFIG.TILE_METERS;
    const endY =
      (this.heightfield.getInterpolatedHeightAtTile(pEnd[0], pEnd[1]) + 0.2) *
      this.currentExaggeration;

    const isBuilt = route.status === 'built';
    const bridgeColor = isBuilt ? 0x00e676 : 0x38bdf8; // Ciano / Azul vívido para pontes

    // Tabuleiro da ponte (Caixa 3D esticada)
    const midPoint = new THREE.Vector3(
      (startX + endX) / 2,
      (startY + endY) / 2,
      (startZ + endZ) / 2
    );
    const spanVec = new THREE.Vector3(endX - startX, endY - startY, endZ - startZ);
    const lengthMeters = spanVec.length();
    const bridgeWidth = route.widthTiles * CONFIG.TILE_METERS;
    const deckThickness = 0.6 * this.currentExaggeration;

    const deckGeom = new THREE.BoxGeometry(bridgeWidth, deckThickness, lengthMeters);
    const deckMat = new THREE.MeshStandardMaterial({
      color: bridgeColor,
      roughness: 0.6,
      transparent: true,
      opacity: isPreview ? 0.75 : 0.95,
    });
    const deckMesh = new THREE.Mesh(deckGeom, deckMat);
    deckMesh.position.copy(midPoint);
    deckMesh.lookAt(endX, endY, endZ);
    group.add(deckMesh);

    // Pilares verticais automáticos a cada 10 tiles (40m) descendo até o terreno/mar
    const tilesCount = Math.round(lengthMeters / CONFIG.TILE_METERS);
    const pillarInterval = 8; // a cada 8 tiles
    for (let p = pillarInterval; p < tilesCount; p += pillarInterval) {
      const frac = p / tilesCount;
      const pilTileX = pStart[0] + (pEnd[0] - pStart[0]) * frac;
      const pilTileY = pStart[1] + (pEnd[1] - pStart[1]) * frac;
      const pilX = pilTileX * CONFIG.TILE_METERS;
      const pilZ = -pilTileY * CONFIG.TILE_METERS;
      const pilDeckY = (startY + (endY - startY) * frac);
      const groundElev = (this.heightfield.getInterpolatedHeightAtTile(pilTileX, pilTileY)) * this.currentExaggeration;

      const pillarHeight = Math.max(0.5, pilDeckY - groundElev);
      const pillarGeom = new THREE.CylinderGeometry(0.8, 1.2, pillarHeight, 6);
      const pillarMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
      const pillarMesh = new THREE.Mesh(pillarGeom, pillarMat);
      pillarMesh.position.set(pilX, pilDeckY - pillarHeight / 2, pilZ);
      group.add(pillarMesh);
    }

    // Régua / Marcação na ponta final caso tenha Gabarito Real cravado
    if (route.realLengthTiles) {
      const targetPinGeom = new THREE.ConeGeometry(1.4, 3.5, 6);
      targetPinGeom.rotateX(Math.PI); // Apontando para baixo
      const targetPinMat = new THREE.MeshBasicMaterial({ color: 0xf5a623 });
      const targetPin = new THREE.Mesh(targetPinGeom, targetPinMat);
      targetPin.position.set(endX, endY + 3.0, endZ);
      group.add(targetPin);
    }

    if (!isPreview) {
      this.attachRouteBadge(group, route, '#38bdf8', '🌉');
    }
  }

  /**
   * 3. TÚNEL: Tira subterrânea translúcida (Visão Raio-X através da montanha)
   */
  private buildTunnel3D(
    group: THREE.Group,
    route: MapRoute,
    isPreview: boolean
  ): void {
    const points = route.path;
    if (points.length < 2) return;

    const pStart = points[0];
    const pEnd = points[points.length - 1];

    const startX = pStart[0] * CONFIG.TILE_METERS;
    const startZ = -pStart[1] * CONFIG.TILE_METERS;
    const startY =
      (this.heightfield.getInterpolatedHeightAtTile(pStart[0], pStart[1]) + 0.1) *
      this.currentExaggeration;

    const endX = pEnd[0] * CONFIG.TILE_METERS;
    const endZ = -pEnd[1] * CONFIG.TILE_METERS;
    const endY =
      (this.heightfield.getInterpolatedHeightAtTile(pEnd[0], pEnd[1]) + 0.1) *
      this.currentExaggeration;

    const tunnelColor = 0xa855f7; // Roxo elétrico tático

    // Linha tracejada em Raio-X (depthTest = false permite enxergar por dentro da pedra)
    const lineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(startX, startY, startZ),
      new THREE.Vector3(endX, endY, endZ),
    ]);
    const lineMat = new THREE.LineDashedMaterial({
      color: tunnelColor,
      dashSize: 3,
      gapSize: 2,
      depthTest: false, // Efeito Raio-X através das montanhas
      transparent: true,
      opacity: 0.85,
    });
    const tunnelLine = new THREE.Line(lineGeom, lineMat);
    tunnelLine.computeLineDistances();
    group.add(tunnelLine);

    // Portais nos dois extremos (arcos de entrada e saída)
    const portalGeom = new THREE.TorusGeometry(2.0, 0.4, 6, 8, Math.PI);
    const portalMat = new THREE.MeshBasicMaterial({ color: 0xc084fc });

    const p1 = new THREE.Mesh(portalGeom, portalMat);
    p1.position.set(startX, startY + 1.0, startZ);
    group.add(p1);

    const p2 = new THREE.Mesh(portalGeom, portalMat);
    p2.position.set(endX, endY + 1.0, endZ);
    group.add(p2);

    if (!isPreview) {
      this.attachRouteBadge(group, route, '#a855f7', '🚇');
    }
  }

  /**
   * Cria um selo / rótulo flutuante estilizado no centro da rota
   */
  private attachRouteBadge(
    group: THREE.Group,
    route: MapRoute,
    badgeColor: string,
    icon: string
  ): void {
    const points = route.path;
    const midIdx = Math.floor(points.length / 2);
    const midTile = points[midIdx];
    const wX = midTile[0] * CONFIG.TILE_METERS;
    const wZ = -midTile[1] * CONFIG.TILE_METERS;
    const elev = this.heightfield.getInterpolatedHeightAtTile(midTile[0], midTile[1]);
    const wY = (elev + 2.5) * this.currentExaggeration;

    let dist = 0;
    for (let i = 1; i < points.length; i++) {
      dist += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    }
    const distRound = Math.round(dist);

    const labelText = route.realLengthTiles
      ? `${icon} ${route.name} (${route.realLengthTiles}t real)`
      : `${icon} ${route.name} (${distRound}t)`;

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeStyle = badgeColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(4, 4, 248, 56, 8);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, 128, 32);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(wX, wY, wZ);
    sprite.scale.set(16, 4, 1);
    group.add(sprite);
  }

  public getRaycastTargets(): THREE.Object3D[] {
    const targets: THREE.Object3D[] = [];
    for (const group of this.routeObjects.values()) {
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh || (child as THREE.Line).isLine || (child as THREE.Sprite).isSprite) {
          targets.push(child);
        }
      });
    }
    return targets;
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if ((child as THREE.Mesh).geometry) (child as THREE.Mesh).geometry.dispose();
      if ((child as any).material) {
        if (Array.isArray((child as any).material)) {
          (child as any).material.forEach((m: any) => m.dispose());
        } else {
          (child as any).material.dispose();
        }
      }
    });
  }
}

