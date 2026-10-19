// ==============================================================================
// JACKAL SANDBOX — RENDERIZADOR DE TERRENO 3D (CONTINUOUS HEIGHTFIELD)
// Geometria única contígua (Zero Seams) e atualização de buffers de alta performance
// ==============================================================================

import * as THREE from 'three';
import { CONFIG } from '../config';
import { CellState, ConfidenceLevel } from '../core/types';
import { HeightfieldManager } from '../core/heightfield';
import { TERRAIN_VERTEX_SHADER, TERRAIN_FRAGMENT_SHADER } from './shaders/terrain.glsl';

export class TerrainMeshManager {
  private heightfield: HeightfieldManager;
  private parentGroup: THREE.Group;
  private continuousMesh!: THREE.Mesh;
  private continuousGeom!: THREE.PlaneGeometry;
  private terrainShaderMat!: THREE.ShaderMaterial;
  private basePositions!: Float32Array;

  public readonly gridCells: number;
  public readonly extentMeters: number;

  constructor(heightfield: HeightfieldManager, parentGroup: THREE.Group) {
    this.heightfield = heightfield;
    this.parentGroup = parentGroup;

    this.gridCells = Math.ceil(CONFIG.MAP_SIZE_TILES / CONFIG.CELL_SIZE_TILES);
    this.extentMeters = this.gridCells * CONFIG.CELL_SIZE_TILES * CONFIG.TILE_METERS;

    this.initContinuousMesh();
  }

  private initContinuousMesh(): void {
    const segments = this.gridCells;
    const vertexCount = (segments + 1) * (segments + 1);

    this.continuousGeom = new THREE.PlaneGeometry(
      this.extentMeters,
      this.extentMeters,
      segments,
      segments
    );
    this.continuousGeom.rotateX(-Math.PI / 2); // Alinha no plano XZ (Y para cima)
    this.basePositions = new Float32Array(this.continuousGeom.getAttribute('position').array);

    // Atributo customizado de 3 canais: x = isKnown, y = isWater, z = confidence
    const stateConfArray = new Float32Array(vertexCount * 3);
    this.continuousGeom.setAttribute('aStateConf', new THREE.BufferAttribute(stateConfArray, 3));

    const sunDir = new THREE.Vector3(-1.0, 1.2, 1.0).normalize();

    this.terrainShaderMat = new THREE.ShaderMaterial({
      vertexShader: TERRAIN_VERTEX_SHADER,
      fragmentShader: TERRAIN_FRAGMENT_SHADER,
      uniforms: {
        uShowGrid: { value: 1.0 },
        uShowContours: { value: 1.0 },
        uShowHillshade: { value: 1.0 },
        uContourInterval: { value: 5.0 },
        uMasterEvery: { value: 5.0 },
        uShowConfidence: { value: 0.0 },
        uTileMeters: { value: CONFIG.TILE_METERS },
        uSunDirection: { value: sunDir },
      },
      side: THREE.DoubleSide,
    });

    this.continuousMesh = new THREE.Mesh(this.continuousGeom, this.terrainShaderMat);
    this.continuousMesh.name = 'ContinuousTerrainMesh';
    this.continuousMesh.position.set(0, 0, 0);

    this.parentGroup.add(this.continuousMesh);
  }

  public setGridVisible(visible: boolean): void {
    this.terrainShaderMat.uniforms.uShowGrid.value = visible ? 1.0 : 0.0;
  }

  public setContoursVisible(visible: boolean): void {
    this.terrainShaderMat.uniforms.uShowContours.value = visible ? 1.0 : 0.0;
  }

  public setHillshadeVisible(visible: boolean): void {
    this.terrainShaderMat.uniforms.uShowHillshade.value = visible ? 1.0 : 0.0;
  }

  public setContourInterval(interval: number): void {
    this.terrainShaderMat.uniforms.uContourInterval.value = interval;
  }

  public setConfidenceMode(active: boolean): void {
    this.terrainShaderMat.uniforms.uShowConfidence.value = active ? 1.0 : 0.0;
  }

  public setWireframe(active: boolean): void {
    this.terrainShaderMat.wireframe = active;
  }

  /**
   * Atualização seletiva e rápida de vértices modificados.
   * Evita transferir o mapa inteiro a cada pincelada!
   */
  public updateDirtyChunks(): void {
    const posAttr = this.continuousGeom.getAttribute('position') as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;

    const normalAttr = this.continuousGeom.getAttribute('normal') as THREE.BufferAttribute;
    const normalArray = normalAttr.array as Float32Array;

    const stateConfAttr = this.continuousGeom.getAttribute('aStateConf') as THREE.BufferAttribute;
    const stateConfArray = stateConfAttr.array as Float32Array;

    const S = this.gridCells;
    const halfS = S / 2;
    const rowStride = S + 1;
    const cellMeters = CONFIG.CELL_SIZE_TILES * CONFIG.TILE_METERS;

    let hasChanges = false;
    let minModifiedIndex = Infinity;
    let maxModifiedIndex = -Infinity;

    for (const chunk of this.heightfield.getAllChunks()) {
      if (!chunk.isDirty) continue;

      hasChanges = true;
      const chunkCellSize = CONFIG.CHUNK_SIZE_CELLS;
      const startCellX = chunk.chunkX * chunkCellSize;
      const startCellY = chunk.chunkY * chunkCellSize;

      for (let ly = 0; ly < chunkCellSize; ly++) {
        const cy = startCellY + ly;
        const gridY = cy + halfS;
        if (gridY < 0 || gridY > S) continue;

        const geomRow = S - gridY;

        for (let lx = 0; lx < chunkCellSize; lx++) {
          const cx = startCellX + lx;
          const gridX = cx + halfS;
          if (gridX < 0 || gridX > S) continue;

          const vIdx = geomRow * rowStride + gridX;
          const chunkDataIdx = ly * chunkCellSize + lx;

          const state = chunk.states[chunkDataIdx] as CellState;
          const height = chunk.heights[chunkDataIdx];
          const conf = chunk.confidence[chunkDataIdx] as ConfidenceLevel;

          const vertY = state === CellState.LAND ? Math.max(0.0, height) : 0.0;
          posArray[vIdx * 3 + 1] = vertY;

          const tileX = cx * CONFIG.CELL_SIZE_TILES;
          const tileY = cy * CONFIG.CELL_SIZE_TILES;
          const sheet = this.heightfield.isSheetLocked(`${tileY >= 0 ? 'N' : 'S'}${Math.floor(Math.abs(tileY) / 100)}-${tileX >= 0 ? 'L' : 'O'}${Math.floor(Math.abs(tileX) / 100)}`);
          const isLocked = chunk.locked[chunkDataIdx] === 1 || sheet;

          stateConfArray[vIdx * 3] = state !== CellState.UNKNOWN ? 1.0 : 0.0;
          stateConfArray[vIdx * 3 + 1] = state === CellState.WATER ? 1.0 : 0.0;
          stateConfArray[vIdx * 3 + 2] = isLocked ? 3.0 : conf;

          if (vIdx < minModifiedIndex) minModifiedIndex = vIdx;
          if (vIdx > maxModifiedIndex) maxModifiedIndex = vIdx;

          // Cálculo direto e instantâneo de normal do vértice por derivadas locais (zero custo global de CPU)
          const leftAlt = this.heightfield.getCell(cx - 1, cy).height;
          const rightAlt = this.heightfield.getCell(cx + 1, cy).height;
          const downAlt = this.heightfield.getCell(cx, cy - 1).height;
          const upAlt = this.heightfield.getCell(cx, cy + 1).height;

          const dzdx = (rightAlt - leftAlt) / (2 * cellMeters);
          const dzdy = (upAlt - downAlt) / (2 * cellMeters);

          const nx = -dzdx;
          const ny = 1.0;
          const nz = -dzdy;
          const len = Math.hypot(nx, ny, nz) || 1.0;

          normalArray[vIdx * 3] = nx / len;
          normalArray[vIdx * 3 + 1] = ny / len;
          normalArray[vIdx * 3 + 2] = nz / len;
        }
      }

      chunk.isDirty = false;
    }

    if (hasChanges && minModifiedIndex <= maxModifiedIndex) {
      posAttr.needsUpdate = true;
      normalAttr.needsUpdate = true;
      stateConfAttr.needsUpdate = true;
    }
  }

  public getRaycastTargets(): THREE.Object3D[] {
    return [this.continuousMesh];
  }

  public clear(): void {
    const posAttr = this.continuousGeom.getAttribute('position') as THREE.BufferAttribute;
    const normalAttr = this.continuousGeom.getAttribute('normal') as THREE.BufferAttribute;
    const stateConfAttr = this.continuousGeom.getAttribute('aStateConf') as THREE.BufferAttribute;

    const pArr = posAttr.array as Float32Array;
    const sArr = stateConfAttr.array as Float32Array;

    // Restaura as coordenadas originais X e Z do plano e reseta a elevação Y para zero
    if (this.basePositions) {
      pArr.set(this.basePositions);
    } else {
      for (let i = 1; i < pArr.length; i += 3) {
        pArr[i] = 0;
      }
    }
    sArr.fill(0);

    posAttr.needsUpdate = true;
    normalAttr.needsUpdate = true;
    stateConfAttr.needsUpdate = true;
    this.continuousGeom.computeVertexNormals();
  }
}
