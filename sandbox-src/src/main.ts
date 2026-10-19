// ==============================================================================
// JACKAL SANDBOX — COORDENADOR PRINCIPAL DA APLICAÇÃO (MODULAR & LEVE)
// ==============================================================================

import './style.css';
import { CONFIG } from './config';
import { HeightfieldManager } from './core/heightfield';
import { PinManager } from './core/pins';
import { VisitManager } from './core/visits';
import { StorageManager } from './core/storage';

import { SceneManager } from './renderer/scene';
import { CameraController } from './renderer/camera';
import { TerrainMeshManager } from './renderer/terrain-mesh';
import { GridMeshManager } from './renderer/grid-mesh';
import { BrushCursorManager } from './renderer/brush-cursor';
import { PinMeshManager } from './renderer/pin-mesh';
import { ContourRenderer } from './renderer/contour-renderer';
import { ScaleReferenceManager } from './renderer/scale-reference';

import { CameraBarUI } from './ui/camera-bar';
import { ToolbarUI } from './ui/toolbar';
import { BrushPanelUI } from './ui/brush-panel';
import { LayersPanelUI } from './ui/layers-panel';
import { ConfidenceLegendUI } from './ui/confidence-legend';
import { InfoBarUI } from './ui/info-bar';
import { PinModalUI } from './ui/pin-modal';

import { InteractionController } from './input/interaction-controller';

class JackalSandboxApp {
  private canvas: HTMLCanvasElement;
  private appContainer: HTMLElement;

  // 1. Núcleo de Dados
  private heightfield: HeightfieldManager;
  private pinManager: PinManager;
  private visitManager: VisitManager;
  private storageManager: StorageManager;

  // 2. Renderizadores Three.js
  private sceneManager: SceneManager;
  private cameraController: CameraController;
  private terrainMesh: TerrainMeshManager;
  private gridMesh: GridMeshManager;
  private brushCursor: BrushCursorManager;
  private pinMesh: PinMeshManager;
  private contourRenderer: ContourRenderer;
  private scaleReference: ScaleReferenceManager;

  // 3. Componentes de Interface
  private cameraBarUI!: CameraBarUI;
  private toolbarUI!: ToolbarUI;
  private brushPanelUI!: BrushPanelUI;
  private layersPanelUI!: LayersPanelUI;
  private confidenceLegendUI!: ConfidenceLegendUI;
  private infoBarUI!: InfoBarUI;
  private pinModalUI!: PinModalUI;

  // 4. Controlador de Interação
  private interactionController!: InteractionController;

  constructor() {
    this.canvas = document.getElementById('viewport-canvas') as HTMLCanvasElement;
    this.appContainer = document.getElementById('app') as HTMLElement;

    // Núcleo de Estado
    this.heightfield = new HeightfieldManager();
    this.pinManager = new PinManager();
    this.visitManager = new VisitManager();
    this.storageManager = new StorageManager();

    // Sincroniza pinos iniciais (marco de spawn)
    this.heightfield.updatePinAnchors(this.pinManager.getAll());

    // Cena e Câmeras
    this.sceneManager = new SceneManager(this.canvas);
    this.cameraController = new CameraController(this.canvas);

    // Sub-malhas gráficas
    this.terrainMesh = new TerrainMeshManager(this.heightfield, this.sceneManager.terrainGroup);
    this.gridMesh = new GridMeshManager(this.sceneManager.overlayGroup);
    this.brushCursor = new BrushCursorManager(this.sceneManager.overlayGroup);
    this.pinMesh = new PinMeshManager(this.sceneManager.pinsGroup, this.pinManager, this.heightfield);
    this.contourRenderer = new ContourRenderer(this.sceneManager.overlayGroup, this.heightfield);
    this.scaleReference = new ScaleReferenceManager(this.sceneManager.overlayGroup);

    // Posicionamento inicial da estação e da escala
    this.gridMesh.updateStationRange(this.visitManager.getCurrentVisit());
    const initialGroundZ = this.heightfield.getInterpolatedHeightAtTile(2, 0);
    this.scaleReference.setPosition(2, 0, initialGroundZ);

    // Interface
    this.initUI();

    // Controlador de Interação
    this.interactionController = new InteractionController({
      canvas: this.canvas,
      heightfield: this.heightfield,
      pinManager: this.pinManager,
      visitManager: this.visitManager,
      storageManager: this.storageManager,
      sceneManager: this.sceneManager,
      cameraController: this.cameraController,
      terrainMesh: this.terrainMesh,
      gridMesh: this.gridMesh,
      brushCursor: this.brushCursor,
      pinMesh: this.pinMesh,
      scaleReference: this.scaleReference,
      contourRenderer: this.contourRenderer,
      toolbarUI: this.toolbarUI,
      brushPanelUI: this.brushPanelUI,
      layersPanelUI: this.layersPanelUI,
      infoBarUI: this.infoBarUI,
      pinModalUI: this.pinModalUI,
    });

    // Restaura Autosave se existir
    this.restoreAutosaveIfExists();

    // Inicia Loop de Renderização
    this.animate();
  }

  private async restoreAutosaveIfExists(): Promise<void> {
    try {
      const autosave = await this.storageManager.loadAutosave();
      if (autosave && autosave.chunks && autosave.chunks.length > 0) {
        this.storageManager.restoreSnapshot(autosave, this.heightfield, this.pinManager, this.visitManager);
        this.terrainMesh.updateDirtyChunks();
        this.contourRenderer.requestUpdate();
        this.pinMesh.rebuildPins();
        this.gridMesh.updateStationRange(this.visitManager.getCurrentVisit());
        const pos = this.scaleReference.getPosition();
        const groundY = this.heightfield.getInterpolatedHeightAtTile(pos.tileX, pos.tileY);
        this.scaleReference.setExactY(groundY);
      }
    } catch (e) {
      console.warn('Falha ao restaurar autosave:', e);
    }
  }

  private initUI(): void {
    this.cameraBarUI = new CameraBarUI(
      this.appContainer,
      this.cameraController,
      (factor) => {
        this.sceneManager.setVerticalExaggeration(factor);
        this.pinMesh.setVerticalExaggeration(factor);
        this.contourRenderer.setVerticalExaggeration(factor);
        if (this.interactionController) {
          this.interactionController.updateScalePosition();
        }
      },
      () => {
        const visit = this.visitManager.getCurrentVisit();
        this.cameraController.setReferencePoint(
          visit.station_x * CONFIG.TILE_METERS,
          0,
          -visit.station_y * CONFIG.TILE_METERS
        );
      }
    );

    this.toolbarUI = new ToolbarUI(this.appContainer, {
      onToolChange: (tool) => {
        if (this.interactionController) {
          this.interactionController.setActiveTool(tool);
        }
      },
      onUndo: () => {
        if (this.interactionController) {
          this.interactionController.handleUndo();
        }
      },
      onRedo: () => {
        if (this.interactionController) {
          this.interactionController.handleRedo();
        }
      },
    });

    this.brushPanelUI = new BrushPanelUI(this.appContainer, (settings) => {
      if (this.interactionController) {
        this.interactionController.setBrushSettings(settings);
      }
    });

    this.layersPanelUI = new LayersPanelUI(this.appContainer, {
      terrainMesh: this.terrainMesh,
      gridMesh: this.gridMesh,
      pinMesh: this.pinMesh,
      scaleReference: this.scaleReference,
      contourRenderer: this.contourRenderer,
      visitManager: this.visitManager,
      storageManager: this.storageManager,
      heightfield: this.heightfield,
      pinManager: this.pinManager,
      rendererCanvas: this.canvas,
    });

    this.confidenceLegendUI = new ConfidenceLegendUI(this.appContainer);

    this.infoBarUI = new InfoBarUI(this.appContainer, {
      onRoleChange: (role) => {
        this.toolbarUI.setRole(role);
      },
      onToggleSheetLock: (sheetId) => {
        const isLocked = this.heightfield.toggleSheetLock(sheetId);
        this.terrainMesh.updateDirtyChunks();
        if (this.interactionController) {
          this.interactionController.triggerAutosave();
        }
        return isLocked;
      },
      isCurrentSheetLocked: (sheetId) => {
        return this.heightfield.isSheetLocked(sheetId);
      },
    });
    this.sceneManager.setOnFpsUpdate((fps) => this.infoBarUI.updateFps(fps));

    this.pinModalUI = new PinModalUI(this.appContainer, this.pinManager);
    this.pinMesh.setOnPinSelect((pin) => {
      this.pinModalUI.open(
        pin,
        () => {
          this.heightfield.updatePinAnchors(this.pinManager.getAll());
          this.terrainMesh.updateDirtyChunks();
          this.pinMesh.updatePinsElevation();
          if (this.interactionController) {
            this.interactionController.triggerAutosave();
          }
        },
        this.infoBarUI.getRole() === 'cartographer'
      );
    });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.cameraController.update();
    this.terrainMesh.updateDirtyChunks();
    this.sceneManager.render(this.cameraController.getActiveCamera());
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new JackalSandboxApp();
});
