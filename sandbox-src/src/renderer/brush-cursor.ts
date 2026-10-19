// ==============================================================================
// JACKAL SANDBOX — CURSOR DO PINCEL PROJETADO EM 3D
// Círculo projetado no terreno com raio em tiles reais e cor por ferramenta
// ==============================================================================

import * as THREE from 'three';
import { CONFIG } from '../config';
import { ModelingTool } from '../core/types';

export class BrushCursorManager {
  private cursorMesh: THREE.LineLoop;
  private parentGroup: THREE.Group;
  private currentRadiusMeters = 20;

  constructor(parentGroup: THREE.Group) {
    this.parentGroup = parentGroup;

    const segments = 48;
    const points: THREE.Vector3[] = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
    }
    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      linewidth: 2,
      depthTest: false,
      transparent: true,
      opacity: 0.85,
    });

    this.cursorMesh = new THREE.LineLoop(geom, mat);
    this.cursorMesh.name = 'BrushCursor';
    this.cursorMesh.visible = false;
    this.parentGroup.add(this.cursorMesh);
  }

  public updateSize(radiusTiles: number): void {
    this.currentRadiusMeters = radiusTiles * CONFIG.TILE_METERS;
    this.cursorMesh.scale.set(this.currentRadiusMeters, 1, this.currentRadiusMeters);
  }

  public setTool(tool: ModelingTool): void {
    const mat = this.cursorMesh.material as THREE.LineBasicMaterial;
    switch (tool) {
      case 'raise':
        mat.color.setHex(0xf59e0b); // Ouro
        break;
      case 'lower':
        mat.color.setHex(0xef4444); // Vermelho
        break;
      case 'smooth':
        mat.color.setHex(0x06b6d4); // Ciano
        break;
      case 'flatten':
        mat.color.setHex(0xa855f7); // Violeta
        break;
      case 'water':
        mat.color.setHex(0x3b82f6); // Azul água
        break;
      case 'eraser':
        mat.color.setHex(0xf97316); // Laranja borracha
        break;
      case 'pin':
      case 'station':
        mat.color.setHex(0x10b981); // Verde esmeralda
        break;
    }
  }

  public setPosition(worldX: number, worldY: number, worldZ: number): void {
    this.cursorMesh.position.set(worldX, worldY + 0.3, worldZ);
    this.cursorMesh.visible = true;
  }

  public hide(): void {
    this.cursorMesh.visible = false;
  }

  public setVisible(visible: boolean): void {
    this.cursorMesh.visible = visible;
  }
}
