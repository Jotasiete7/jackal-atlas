// ==============================================================================
// JACKAL SANDBOX — CONTROLADOR DE INTERAÇÃO (MOUSE, TECLADO E RAYCASTING)
// ==============================================================================

import * as THREE from 'three';
import { CONFIG, tileToCell, worldMetersToTile } from '../config';
import { CellState, ModelingTool } from '../core/types';
import { HeightfieldManager } from '../core/heightfield';
import { PinManager } from '../core/pins';
import { VisitManager } from '../core/visits';
import { CameraController } from '../renderer/camera';
import { SceneManager } from '../renderer/scene';
import { TerrainMeshManager } from '../renderer/terrain-mesh';
import { GridMeshManager } from '../renderer/grid-mesh';
import { BrushCursorManager } from '../renderer/brush-cursor';
import { PinMeshManager } from '../renderer/pin-mesh';
import { ScaleReferenceManager } from '../renderer/scale-reference';
import { ContourRenderer } from '../renderer/contour-renderer';
import { ToolbarUI } from '../ui/toolbar';
import { BrushPanelUI, BrushSettings } from '../ui/brush-panel';
import { LayersPanelUI } from '../ui/layers-panel';
import { InfoBarUI } from '../ui/info-bar';
import { PinModalUI } from '../ui/pin-modal';

import { StorageManager } from '../core/storage';

export class InteractionController {
  private canvas: HTMLCanvasElement;

  private heightfield: HeightfieldManager;
  private pinManager: PinManager;
  private visitManager: VisitManager;
  private storageManager: StorageManager;

  private sceneManager: SceneManager;
  private cameraController: CameraController;
  private terrainMesh: TerrainMeshManager;
  private gridMesh: GridMeshManager;
  private brushCursor: BrushCursorManager;
  private pinMesh: PinMeshManager;
  private scaleReference: ScaleReferenceManager;
  private contourRenderer: ContourRenderer;

  private toolbarUI: ToolbarUI;
  private brushPanelUI: BrushPanelUI;
  private layersPanelUI: LayersPanelUI;
  private infoBarUI: InfoBarUI;
  private pinModalUI: PinModalUI;

  private activeTool: ModelingTool = 'raise';
  private brushSettings: BrushSettings = {
    sizeTiles: 20,
    intensity: 1.2,
    falloff: 'smooth',
    flattenTargetZ: 15.0,
  };

  private isMouseDown = false;
  private currentStrokePoints: Array<{ x: number; y: number }> = [];
  private lastStrokeTime = 0;
  private lastTilePos: { tileX: number; tileY: number } | null = null;
  private continuousTimer: number | null = null;
  private autosaveTimeout: number | null = null;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor(deps: {
    canvas: HTMLCanvasElement;
    heightfield: HeightfieldManager;
    pinManager: PinManager;
    visitManager: VisitManager;
    storageManager: StorageManager;
    sceneManager: SceneManager;
    cameraController: CameraController;
    terrainMesh: TerrainMeshManager;
    gridMesh: GridMeshManager;
    brushCursor: BrushCursorManager;
    pinMesh: PinMeshManager;
    scaleReference: ScaleReferenceManager;
    contourRenderer: ContourRenderer;
    toolbarUI: ToolbarUI;
    brushPanelUI: BrushPanelUI;
    layersPanelUI: LayersPanelUI;
    infoBarUI: InfoBarUI;
    pinModalUI: PinModalUI;
  }) {
    this.canvas = deps.canvas;
    this.heightfield = deps.heightfield;
    this.pinManager = deps.pinManager;
    this.visitManager = deps.visitManager;
    this.storageManager = deps.storageManager;
    this.sceneManager = deps.sceneManager;
    this.cameraController = deps.cameraController;
    this.terrainMesh = deps.terrainMesh;
    this.gridMesh = deps.gridMesh;
    this.brushCursor = deps.brushCursor;
    this.pinMesh = deps.pinMesh;
    this.scaleReference = deps.scaleReference;
    this.contourRenderer = deps.contourRenderer;
    this.toolbarUI = deps.toolbarUI;
    this.brushPanelUI = deps.brushPanelUI;
    this.layersPanelUI = deps.layersPanelUI;
    this.infoBarUI = deps.infoBarUI;
    this.pinModalUI = deps.pinModalUI;

    this.bindEvents();
  }

  public triggerAutosave(): void {
    if (this.autosaveTimeout !== null) {
      window.clearTimeout(this.autosaveTimeout);
    }
    this.autosaveTimeout = window.setTimeout(() => {
      this.storageManager.saveAutosave(this.heightfield, this.pinManager, this.visitManager);
    }, 1500);
  }

  public setActiveTool(tool: ModelingTool): void {
    this.activeTool = tool;
    this.brushCursor.setTool(tool);
    this.brushPanelUI.setToolMode(tool);
  }

  public setBrushSettings(settings: BrushSettings): void {
    this.brushSettings = settings;
    this.brushCursor.updateSize(settings.sizeTiles / 2);
  }

  /**
   * Interseção analítica rápida contra o plano base + cota interpolada O(1).
   * Elimina completamente raycast contra a malha de 1.3M triângulos a cada frame!
   */
  public getGroundTileAtMouse(e: MouseEvent): { tileX: number; tileY: number; worldX: number; worldZ: number; height: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const activeCamera = this.cameraController.getActiveCamera();
    this.raycaster.setFromCamera(this.mouse, activeCamera);

    const hitPoint = new THREE.Vector3();
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, hitPoint);
    if (!hit) return null;

    const { tileX, tileY } = worldMetersToTile(hitPoint.x, hitPoint.z);
    const groundHeight = this.heightfield.getInterpolatedHeightAtTile(tileX, tileY);

    return {
      tileX,
      tileY,
      worldX: hitPoint.x,
      worldZ: hitPoint.z,
      height: groundHeight,
    };
  }

  public getPinUnderMouse(e: MouseEvent): string | null {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const activeCamera = this.cameraController.getActiveCamera();
    this.raycaster.setFromCamera(this.mouse, activeCamera);

    const pinTargets = this.pinMesh.getRaycastTargets();
    if (pinTargets.length === 0) return null;

    const hits = this.raycaster.intersectObjects(pinTargets, false);
    if (hits.length > 0) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj) {
        if ((obj as any).userData && (obj as any).userData.pinId) {
          return (obj as any).userData.pinId;
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  public updateScalePosition(): void {
    const pos = this.scaleReference.getPosition();
    const groundY = this.heightfield.getInterpolatedHeightAtTile(pos.tileX, pos.tileY);
    this.scaleReference.setExactY(groundY * this.sceneManager.getVerticalExaggeration());
  }

  private bindEvents(): void {
    // 1. MouseMove — Rastreamento do cursor e aplicação de stroke contínuo
    this.canvas.addEventListener('mousemove', (e) => {
      const hit = this.getGroundTileAtMouse(e);
      if (!hit) {
        this.brushCursor.hide();
        return;
      }

      const { cellX, cellY } = tileToCell(hit.tileX, hit.tileY);
      const cell = this.heightfield.getCell(cellX, cellY);

      this.infoBarUI.updateCoordinates(hit.tileX, hit.tileY, hit.height, cell.state, cell.confidence);

      const surfaceY = hit.height * this.sceneManager.getVerticalExaggeration();
      this.brushCursor.setPosition(hit.worldX, surfaceY, hit.worldZ);

      this.lastTilePos = { tileX: hit.tileX, tileY: hit.tileY };

      if (this.isMouseDown && this.isModelingTool(this.activeTool)) {
        const now = performance.now();
        if (now - this.lastStrokeTime >= 32) {
          this.applyStroke(hit.tileX, hit.tileY);
          this.currentStrokePoints.push({ x: hit.tileX, y: hit.tileY });
          this.lastStrokeTime = now;
        }
      }
    });

    // 2. Duplo clique — Centraliza a órbita no ponto do terreno
    this.canvas.addEventListener('dblclick', (e) => {
      const hit = this.getGroundTileAtMouse(e);
      if (hit) {
        const surfaceY = hit.height * this.sceneManager.getVerticalExaggeration();
        this.cameraController.setReferencePoint(hit.worldX, surfaceY, hit.worldZ);
      }
    });

    // 3. MouseDown
    this.canvas.addEventListener('mousedown', (e) => {
      // Shift + Clique move a Referência de Escala (Torre ou Boneco) para qualquer ponto do terreno!
      if (e.shiftKey && e.button === 0) {
        const hit = this.getGroundTileAtMouse(e);
        if (hit) {
          const surfaceY = hit.height * this.sceneManager.getVerticalExaggeration();
          this.scaleReference.setPosition(hit.tileX, hit.tileY, surfaceY);
          return;
        }
      }

      if (e.button !== 0 || e.altKey || e.ctrlKey || e.shiftKey) return;

      // Prioridade: Clicar em um Pino 3D existente
      const clickedPinId = this.getPinUnderMouse(e);
      if (clickedPinId) {
        const pin = this.pinManager.getById(clickedPinId);
        if (pin) {
          this.cameraController.setReferencePoint(
            pin.x * CONFIG.TILE_METERS,
            (pin.z ?? 0) * this.sceneManager.getVerticalExaggeration(),
            -pin.y * CONFIG.TILE_METERS
          );

          this.pinModalUI.open(
            pin,
            () => {
              this.heightfield.updatePinAnchors(this.pinManager.getAll());
              this.terrainMesh.updateDirtyChunks();
              this.pinMesh.updatePinsElevation();
              this.triggerAutosave();
            },
            this.infoBarUI.getRole() === 'cartographer'
          );
          return;
        }
      }

      const hit = this.getGroundTileAtMouse(e);
      if (!hit) return;

      if (this.activeTool === 'pin') {
        const { cellX, cellY } = tileToCell(hit.tileX, hit.tileY);
        const cell = this.heightfield.getCell(cellX, cellY);
        this.pinModalUI.open(
          {
            x: hit.tileX,
            y: hit.tileY,
            z: cell.state === CellState.LAND ? cell.height : 0,
            type: 'pillar',
            method: 'marco_construido',
            uncertainty_tiles: 2,
            author: this.visitManager.getCurrentVisit().author,
            validated: true,
            lockAltitude: false,
          },
          (savedPin) => {
            this.heightfield.updatePinAnchors(this.pinManager.getAll());
            this.terrainMesh.updateDirtyChunks();
            this.pinMesh.updatePinsElevation();
            this.triggerAutosave();
            this.cameraController.setReferencePoint(
              savedPin.x * CONFIG.TILE_METERS,
              (savedPin.z ?? 0) * this.sceneManager.getVerticalExaggeration(),
              -savedPin.y * CONFIG.TILE_METERS
            );
          },
          this.infoBarUI.getRole() === 'cartographer'
        );
        return;
      }

      if (this.activeTool === 'station') {
        this.visitManager.updateStation(hit.tileX, hit.tileY);
        const stationElevation = hit.height * this.sceneManager.getVerticalExaggeration();
        this.gridMesh.updateStationRange(this.visitManager.getCurrentVisit(), stationElevation);
        this.scaleReference.setPosition(hit.tileX, hit.tileY, stationElevation);
        this.triggerAutosave();
        return;
      }

      if (this.isModelingTool(this.activeTool)) {
        this.isMouseDown = true;
        this.lastTilePos = { tileX: hit.tileX, tileY: hit.tileY };
        this.currentStrokePoints = [{ x: hit.tileX, y: hit.tileY }];
        this.applyStroke(hit.tileX, hit.tileY, e.altKey ? 'unlock' : 'lock');
        this.lastStrokeTime = performance.now();
        this.startContinuousSculpt();
      }
    });

    // 4. MouseUp
    window.addEventListener('mouseup', () => {
      this.stopContinuousSculpt();
      if (this.isMouseDown) {
        this.isMouseDown = false;
        if (this.currentStrokePoints.length > 0) {
          this.visitManager.logStroke({
            id: `stroke-${Date.now()}`,
            visit_id: this.visitManager.getCurrentVisit().id,
            tool: this.activeTool,
            brush_size_tiles: this.brushSettings.sizeTiles,
            intensity: this.brushSettings.intensity,
            falloff: this.brushSettings.falloff,
            flatten_height: this.brushSettings.flattenTargetZ,
            points: [...this.currentStrokePoints],
            timestamp: Date.now(),
          });
          this.currentStrokePoints = [];
          this.contourRenderer.triggerDebouncedUpdate(300);
          this.updateScalePosition();
          this.pinMesh.updatePinsElevation();
          this.triggerAutosave();
        }
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.stopContinuousSculpt();
      this.brushCursor.hide();
    });

    // 5. Atalhos Globais de Teclado
    window.addEventListener('keydown', (e) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) this.handleRedo();
        else this.handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        this.handleRedo();
        return;
      }

      // [C]: Alternar Curvas de Nível
      if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        this.layersPanelUI.toggleContours();
        return;
      }

      // [H]: Alternar Referência de Escala Wurm (Humano -> Torre -> Ocultar)
      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        this.layersPanelUI.cycleScale();
        return;
      }

      // [1] a [5]: Presets de tamanho de pincel
      const presets: Record<string, number> = {
        '1': 5,
        '2': 10,
        '3': 20,
        '4': 50,
        '5': 100,
      };
      if (presets[e.key]) {
        e.preventDefault();
        this.brushPanelUI.setSize(presets[e.key]);
        return;
      }

      // Atalho de Ferramenta Água (Alt+W ou U) para não conflitar com W de navegação WASD
      if ((e.altKey && (e.key === 'w' || e.key === 'W')) || (!e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'u' || e.key === 'U'))) {
        e.preventDefault();
        this.toolbarUI.setTool('water');
        return;
      }

      // Atalhos de seleção de ferramentas (sem chaves WASD para navegação livre)
      const toolShortcuts: Record<string, ModelingTool> = {
        r: 'raise',
        l: 'lower',
        m: 'smooth',
        f: 'flatten',
        e: 'eraser',
        k: 'lock',
        p: 'pin',
        t: 'station',
      };
      const keyLower = e.key.toLowerCase();
      if (!e.altKey && !e.ctrlKey && !e.metaKey && toolShortcuts[keyLower]) {
        this.toolbarUI.setTool(toolShortcuts[keyLower]);
      }
    });
  }

  private isModelingTool(tool: ModelingTool): boolean {
    return ['raise', 'lower', 'smooth', 'flatten', 'water', 'eraser', 'lock'].includes(tool);
  }

  private applyStroke(tileX: number, tileY: number, lockAction: 'lock' | 'unlock' = 'lock'): void {
    const radiusTiles = this.brushSettings.sizeTiles / 2;
    const currentVisit = this.visitManager.getCurrentVisit();
    const enforceRange = this.visitManager.isEnforcingRangeLimit();

    const result = this.heightfield.applyStroke({
      tool: this.activeTool,
      centerTileX: tileX,
      centerTileY: tileY,
      radiusTiles,
      intensity: this.brushSettings.intensity,
      falloff: this.brushSettings.falloff,
      flattenTargetZ: this.brushSettings.flattenTargetZ,
      currentVisit,
      enforceVisitRange: enforceRange,
      protectWater: this.brushPanelUI.isProtectWaterEnabled(),
      lockAction,
      userRole: this.infoBarUI.getRole(),
    });

    if (result.touchedCount > 0) {
      this.terrainMesh.updateDirtyChunks();
      this.updateScalePosition();
      this.pinMesh.updatePinsElevation();
    }
  }

  public handleUndo(): void {
    const dirtyKeys = this.heightfield.undo();
    if (dirtyKeys.length > 0) {
      this.terrainMesh.updateDirtyChunks();
      this.contourRenderer.triggerDebouncedUpdate(200);
      this.updateScalePosition();
      this.pinMesh.updatePinsElevation();
      this.triggerAutosave();
    }
  }

  public handleRedo(): void {
    const dirtyKeys = this.heightfield.redo();
    if (dirtyKeys.length > 0) {
      this.terrainMesh.updateDirtyChunks();
      this.contourRenderer.triggerDebouncedUpdate(200);
      this.updateScalePosition();
      this.pinMesh.updatePinsElevation();
      this.triggerAutosave();
    }
  }

  private startContinuousSculpt(): void {
    this.stopContinuousSculpt();
    this.continuousTimer = window.setInterval(() => {
      if (this.isMouseDown && this.lastTilePos && this.isModelingTool(this.activeTool)) {
        this.applyStroke(this.lastTilePos.tileX, this.lastTilePos.tileY);
        this.currentStrokePoints.push({ x: this.lastTilePos.tileX, y: this.lastTilePos.tileY });
      }
    }, 50);
  }

  private stopContinuousSculpt(): void {
    if (this.continuousTimer !== null) {
      clearInterval(this.continuousTimer);
      this.continuousTimer = null;
    }
  }
}
