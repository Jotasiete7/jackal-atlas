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
import { PlaceablesManager } from '../placeables/placeables';
import { RouteManager, calcularSnapWurm, computeRouteDistance } from '../core/routes';
import { RouteMeshManager } from '../renderer/route-mesh';
import { RouteModalUI } from '../ui/route-modal';
import { RouteHUDUI } from '../ui/route-hud';

export class InteractionController {
  private canvas: HTMLCanvasElement;

  private heightfield: HeightfieldManager;
  private pinManager: PinManager;
  private visitManager: VisitManager;
  private storageManager: StorageManager;
  private routeManager: RouteManager;

  private sceneManager: SceneManager;
  private cameraController: CameraController;
  private terrainMesh: TerrainMeshManager;
  private gridMesh: GridMeshManager;
  private brushCursor: BrushCursorManager;
  private pinMesh: PinMeshManager;
  private routeMesh: RouteMeshManager;
  private scaleReference: ScaleReferenceManager;
  private contourRenderer: ContourRenderer;

  private toolbarUI: ToolbarUI;
  private brushPanelUI: BrushPanelUI;
  private layersPanelUI: LayersPanelUI;
  private infoBarUI: InfoBarUI;
  private pinModalUI: PinModalUI;
  private routeModalUI: RouteModalUI;
  private routeHUDUI: RouteHUDUI;
  private placeables: PlaceablesManager;

  private routeDrawingNodes: Array<[number, number]> = [];
  private selectedRouteType: 'road' | 'bridge' | 'tunnel' = 'road';

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
  private rightClickDownPos: { x: number; y: number } | null = null;
  private lastRightClickReleaseTime = 0;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor(deps: {
    canvas: HTMLCanvasElement;
    heightfield: HeightfieldManager;
    pinManager: PinManager;
    visitManager: VisitManager;
    storageManager: StorageManager;
    routeManager: RouteManager;
    sceneManager: SceneManager;
    cameraController: CameraController;
    terrainMesh: TerrainMeshManager;
    gridMesh: GridMeshManager;
    brushCursor: BrushCursorManager;
    pinMesh: PinMeshManager;
    routeMesh: RouteMeshManager;
    scaleReference: ScaleReferenceManager;
    contourRenderer: ContourRenderer;
    toolbarUI: ToolbarUI;
    brushPanelUI: BrushPanelUI;
    layersPanelUI: LayersPanelUI;
    infoBarUI: InfoBarUI;
    pinModalUI: PinModalUI;
    routeModalUI: RouteModalUI;
    routeHUDUI: RouteHUDUI;
    placeables: PlaceablesManager;
  }) {
    this.canvas = deps.canvas;
    this.heightfield = deps.heightfield;
    this.pinManager = deps.pinManager;
    this.visitManager = deps.visitManager;
    this.storageManager = deps.storageManager;
    this.routeManager = deps.routeManager;
    this.sceneManager = deps.sceneManager;
    this.cameraController = deps.cameraController;
    this.terrainMesh = deps.terrainMesh;
    this.gridMesh = deps.gridMesh;
    this.brushCursor = deps.brushCursor;
    this.pinMesh = deps.pinMesh;
    this.routeMesh = deps.routeMesh;
    this.scaleReference = deps.scaleReference;
    this.contourRenderer = deps.contourRenderer;
    this.toolbarUI = deps.toolbarUI;
    this.brushPanelUI = deps.brushPanelUI;
    this.layersPanelUI = deps.layersPanelUI;
    this.infoBarUI = deps.infoBarUI;
    this.pinModalUI = deps.pinModalUI;
    this.routeModalUI = deps.routeModalUI;
    this.routeHUDUI = deps.routeHUDUI;
    this.placeables = deps.placeables;

    this.routeHUDUI.setCallbacks({
      onTypeChange: (type) => {
        this.selectedRouteType = type;
        if (this.routeDrawingNodes.length > 0) {
          this.routeMesh.updatePreview(this.routeDrawingNodes, this.selectedRouteType, 'planned');
        }
      },
      onFinish: () => {
        this.finishRouteDrawing();
      },
      onCancel: () => {
        this.cancelRouteDrawing();
      },
    });

    this.bindEvents();
  }

  public triggerAutosave(): void {
    if (this.autosaveTimeout !== null) {
      window.clearTimeout(this.autosaveTimeout);
    }
    this.autosaveTimeout = window.setTimeout(() => {
      this.storageManager.saveAutosave(this.heightfield, this.pinManager, this.visitManager, this.routeManager);
    }, 1500);
  }

  public cancelRouteDrawing(): void {
    this.routeDrawingNodes = [];
    this.routeMesh.clearPreview();
    if (this.routeHUDUI) {
      this.routeHUDUI.updateState(0, 0);
    }
  }

  public finishRouteDrawing(): void {
    if (this.routeDrawingNodes.length >= 2) {
      const measuredDist = computeRouteDistance(this.routeDrawingNodes);
      const pathCopy = [...this.routeDrawingNodes];
      this.cancelRouteDrawing();
      this.routeModalUI.open(pathCopy, this.selectedRouteType, measuredDist, null);
    }
  }

  public setActiveTool(tool: ModelingTool): void {
    if (this.activeTool === 'route' && tool !== 'route') {
      this.cancelRouteDrawing();
    }
    this.activeTool = tool;
    if (tool === 'route') {
      this.routeHUDUI.setType(this.selectedRouteType);
      const dist = computeRouteDistance(this.routeDrawingNodes);
      this.routeHUDUI.updateState(this.routeDrawingNodes.length, dist);
      this.routeHUDUI.show();
    } else {
      this.routeHUDUI.hide();
    }
    this.placeables.setAtivo(tool === 'place');
    this.brushCursor.setTool(tool);
    this.brushPanelUI.setToolMode(tool);
  }

  public setBrushSettings(settings: BrushSettings): void {
    this.brushSettings = settings;
    this.brushCursor.updateSize(settings.sizeTiles / 2);
  }

  /**
   * Interseção analítica rápida contra a superfície 3D real do relevo.
   * Em vistas anguladas (Isométrico/Livre), usa busca binária em 14 passos no heightfield O(1),
   * eliminando 100% do erro de paralaxe onde o cursor ficava flutuando fora do mouse.
   */
  public getGroundTileAtMouse(e: MouseEvent): { tileX: number; tileY: number; worldX: number; worldZ: number; height: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const activeCamera = this.cameraController.getActiveCamera();
    this.raycaster.setFromCamera(this.mouse, activeCamera);

    const ray = this.raycaster.ray;
    if (Math.abs(ray.direction.y) < 1e-5) return null;

    const exaggeration = this.sceneManager.getVerticalExaggeration();

    // 1. Em vista de Topo ortográfica pura (direção do raio estritamente vertical):
    if (Math.abs(ray.direction.x) < 1e-4 && Math.abs(ray.direction.z) < 1e-4) {
      const worldX = ray.origin.x;
      const worldZ = ray.origin.z;
      const { tileX, tileY } = worldMetersToTile(worldX, worldZ);
      const groundHeight = this.heightfield.getInterpolatedHeightAtTile(tileX, tileY);
      return { tileX, tileY, worldX, worldZ, height: groundHeight };
    }

    // 2. Em vista isométrica, lateral ou livre angular:
    // Calcula o intervalo de 't' entre o teto do relevo e o nível do mar (Y = 0)
    const maxTerrainHeight = 250.0 * exaggeration;
    const tTop = (maxTerrainHeight - ray.origin.y) / ray.direction.y;
    const tBottom = (0.0 - ray.origin.y) / ray.direction.y;

    const tStart = Math.max(0, Math.min(tTop, tBottom));
    const tEnd = Math.max(tTop, tBottom);

    if (tEnd < 0) return null;

    // Busca binária precisa (14 iterações = precisão milimétrica sem custo de CPU)
    let low = tStart;
    let high = tEnd;
    let bestT = tEnd;

    for (let i = 0; i < 14; i++) {
      const mid = (low + high) * 0.5;
      const px = ray.origin.x + mid * ray.direction.x;
      const pz = ray.origin.z + mid * ray.direction.z;
      const py = ray.origin.y + mid * ray.direction.y;

      const { tileX, tileY } = worldMetersToTile(px, pz);
      const h = this.heightfield.getInterpolatedHeightAtTile(tileX, tileY) * exaggeration;

      if (py >= h) {
        // Ponto no raio ainda está no ar acima do relevo
        low = mid;
        bestT = mid;
      } else {
        // Ponto no raio já penetrou sob o relevo
        high = mid;
      }
    }

    const hitX = ray.origin.x + bestT * ray.direction.x;
    const hitZ = ray.origin.z + bestT * ray.direction.z;
    const { tileX, tileY } = worldMetersToTile(hitX, hitZ);
    const groundHeight = this.heightfield.getInterpolatedHeightAtTile(tileX, tileY);

    return {
      tileX,
      tileY,
      worldX: hitX,
      worldZ: hitZ,
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

  public getRouteUnderMouse(e: MouseEvent): string | null {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const activeCamera = this.cameraController.getActiveCamera();
    this.raycaster.setFromCamera(this.mouse, activeCamera);

    const routeTargets = this.routeMesh.getRaycastTargets();
    if (routeTargets.length === 0) return null;

    const hits = this.raycaster.intersectObjects(routeTargets, false);
    if (hits.length > 0) {
      let obj: THREE.Object3D | null = hits[0].object;
      while (obj) {
        if ((obj as any).userData && (obj as any).userData.routeId && !(obj as any).userData.isPreview) {
          return (obj as any).userData.routeId;
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

      if (this.activeTool === 'place') {
        this.brushCursor.hide();
        this.placeables.mouseMove(hit);
        return;
      }

      const surfaceY = hit.height * this.sceneManager.getVerticalExaggeration();
      this.brushCursor.setPosition(hit.worldX, surfaceY, hit.worldZ);

      if (this.activeTool === 'route') {
        if (this.routeDrawingNodes.length > 0) {
          const last = this.routeDrawingNodes[this.routeDrawingNodes.length - 1];
          const stepAngle = this.selectedRouteType === 'bridge' ? 90 : 45;
          const snap = calcularSnapWurm(last[0], last[1], hit.tileX, hit.tileY, e.shiftKey, stepAngle);
          const previewPath: Array<[number, number]> = [...this.routeDrawingNodes, [snap.x2, snap.y2]];
          this.routeMesh.updatePreview(previewPath, this.selectedRouteType, 'planned');
          const dist = computeRouteDistance(previewPath);
          this.routeHUDUI.updateState(previewPath.length, dist);
        }
        return;
      }

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

    // 2. Duplo clique — Finaliza rota ou centraliza a órbita no ponto do terreno
    this.canvas.addEventListener('dblclick', (e) => {
      if (this.activeTool === 'route' && this.routeDrawingNodes.length >= 2) {
        this.finishRouteDrawing();
        return;
      }

      const hit = this.getGroundTileAtMouse(e);
      if (hit) {
        const surfaceY = hit.height * this.sceneManager.getVerticalExaggeration();
        this.cameraController.setReferencePoint(hit.worldX, surfaceY, hit.worldZ);
      }
    });

    // 2.5 ContextMenu (Botão Direito) — Previne menu nativo do navegador sobre o canvas
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // 3. MouseDown
    this.canvas.addEventListener('mousedown', (e) => {
      // Guarda posição do botão direito para diferenciar arrasto de câmera de clique/duplo clique
      if (e.button === 2) {
        this.rightClickDownPos = { x: e.clientX, y: e.clientY };
      }

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

      // Placeables tool: select / drag / place Wurm models (before pins, so objects on top of pins win)
      if (this.activeTool === 'place') {
        this.placeables.mouseDown(e, this.cameraController.getActiveCamera(), this.canvas, this.getGroundTileAtMouse(e));
        return;
      }

      // Prioridade: Clicar em uma Rota 3D existente para abrir modal de inspeção/edição
      if (this.routeDrawingNodes.length === 0) {
        const clickedRouteId = this.getRouteUnderMouse(e);
        if (clickedRouteId) {
          const route = this.routeManager.getById(clickedRouteId);
          if (route) {
            this.selectedRouteType = route.type;
            this.routeHUDUI.setType(route.type);
            const measuredDist = computeRouteDistance(route.path);
            this.routeModalUI.open(route.path, route.type, measuredDist, route);
            return;
          }
        }
      }

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

      if (this.activeTool === 'route') {
        if (this.routeDrawingNodes.length === 0) {
          this.routeDrawingNodes.push([hit.tileX, hit.tileY]);
          this.routeHUDUI.updateState(1, 0);
        } else {
          const last = this.routeDrawingNodes[this.routeDrawingNodes.length - 1];
          const stepAngle = this.selectedRouteType === 'bridge' ? 90 : 45;
          const snap = calcularSnapWurm(last[0], last[1], hit.tileX, hit.tileY, e.shiftKey, stepAngle);
          if (snap.x2 !== last[0] || snap.y2 !== last[1]) {
            this.routeDrawingNodes.push([snap.x2, snap.y2]);
            const dist = computeRouteDistance(this.routeDrawingNodes);
            this.routeHUDUI.updateState(this.routeDrawingNodes.length, dist);
          }
        }
        return;
      }

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
    window.addEventListener('mouseup', (e: MouseEvent) => {
      // Detecção de Duplo Clique com o Botão Direito para cancelar rota (arrastos de câmera são ignorados)
      if (e.button === 2 && this.rightClickDownPos) {
        const dx = e.clientX - this.rightClickDownPos.x;
        const dy = e.clientY - this.rightClickDownPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.rightClickDownPos = null;

        // Se o mouse moveu menos de 6 pixels, foi um clique rápido parado (e não um arrasto de câmera)
        if (dist < 6 && this.activeTool === 'route' && this.routeDrawingNodes.length > 0) {
          const now = performance.now();
          if (now - this.lastRightClickReleaseTime < 380) {
            // DUPLO CLIQUE COM O DIREITO: cancela o traçado elástico!
            this.cancelRouteDrawing();
            this.lastRightClickReleaseTime = 0;
          } else {
            this.lastRightClickReleaseTime = now;
          }
        }
      }

      this.placeables.mouseUp();
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

      // Placeables: rotate / delete / deselect the selected object
      if (this.placeables.keyDown(e)) {
        e.preventDefault();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (this.activeTool === 'route' && this.routeDrawingNodes.length > 0) {
          this.routeDrawingNodes.pop();
          const dist = computeRouteDistance(this.routeDrawingNodes);
          this.routeHUDUI.updateState(this.routeDrawingNodes.length, dist);
          if (this.routeDrawingNodes.length === 0) {
            this.routeMesh.clearPreview();
          }
          return;
        }
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

      // Atalhos específicos da ferramenta Rota
      if (this.activeTool === 'route') {
        if (e.key === 'Backspace' || e.key === 'Delete') {
          if (this.routeDrawingNodes.length > 0) {
            e.preventDefault();
            this.routeDrawingNodes.pop();
            const dist = computeRouteDistance(this.routeDrawingNodes);
            this.routeHUDUI.updateState(this.routeDrawingNodes.length, dist);
            if (this.routeDrawingNodes.length === 0) {
              this.routeMesh.clearPreview();
            }
            return;
          }
        }
        if (e.key === 'Enter' && this.routeDrawingNodes.length >= 2) {
          e.preventDefault();
          this.finishRouteDrawing();
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          if (this.routeDrawingNodes.length > 0) {
            this.cancelRouteDrawing();
          } else {
            this.toolbarUI.setTool('raise');
          }
          return;
        }
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
        b: 'route',
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
      this.routeMesh.refreshHeights();
    }
  }

  public handleUndo(): void {
    const dirtyKeys = this.heightfield.undo();
    if (dirtyKeys.length > 0) {
      this.terrainMesh.updateDirtyChunks();
      this.contourRenderer.triggerDebouncedUpdate(200);
      this.updateScalePosition();
      this.pinMesh.updatePinsElevation();
      this.routeMesh.refreshHeights();
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
      this.routeMesh.refreshHeights();
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
