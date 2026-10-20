// ==============================================================================
// JACKAL SANDBOX — COORDENADOR PRINCIPAL DA APLICAÇÃO (MODULAR & LEVE)
// ==============================================================================

import './style.css';
import { CONFIG } from './config';
import { HeightfieldManager } from './core/heightfield';
import { PinManager } from './core/pins';
import { VisitManager } from './core/visits';
import { StorageManager } from './core/storage';
import { SupabaseSyncManager } from './core/supabase-sync';
import { t } from './i18n';

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
import { RouteModalUI } from './ui/route-modal';
import { PublishModalUI } from './ui/publish-modal';
import { buildReliefCommitName } from './core/relief-naming';
import { RouteHUDUI } from './ui/route-hud';

import { RouteManager } from './core/routes';
import { RouteMeshManager } from './renderer/route-mesh';

import { InteractionController } from './input/interaction-controller';
import { PlaceablesManager } from './placeables/placeables';
import { carregarPilar, wurmDisponivel } from './wurm/models';

class JackalSandboxApp {
  private canvas: HTMLCanvasElement;
  private appContainer: HTMLElement;

  // 1. Núcleo de Dados
  private heightfield: HeightfieldManager;
  private pinManager: PinManager;
  private visitManager: VisitManager;
  private storageManager: StorageManager;
  private supabaseSync: SupabaseSyncManager;
  private routeManager: RouteManager;

  // 2. Renderizadores Three.js
  private sceneManager: SceneManager;
  private cameraController: CameraController;
  private terrainMesh: TerrainMeshManager;
  private gridMesh: GridMeshManager;
  private brushCursor: BrushCursorManager;
  private pinMesh: PinMeshManager;
  private routeMesh: RouteMeshManager;
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
  private routeModalUI!: RouteModalUI;
  private routeHUDUI!: RouteHUDUI;
  private publishModalUI!: PublishModalUI;

  // 4. Controlador de Interação
  private interactionController!: InteractionController;
  private placeables!: PlaceablesManager;

  constructor() {
    this.canvas = document.getElementById('viewport-canvas') as HTMLCanvasElement;
    this.appContainer = document.getElementById('app') as HTMLElement;

    // Núcleo de Estado
    this.heightfield = new HeightfieldManager();
    this.pinManager = new PinManager();
    this.visitManager = new VisitManager();
    this.storageManager = new StorageManager();
    this.supabaseSync = new SupabaseSyncManager(this.storageManager);
    this.routeManager = new RouteManager();

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
    this.routeMesh = new RouteMeshManager(this.sceneManager.overlayGroup, this.routeManager, this.heightfield);
    this.contourRenderer = new ContourRenderer(this.sceneManager.overlayGroup, this.heightfield);
    this.scaleReference = new ScaleReferenceManager(this.sceneManager.overlayGroup);

    // Posicionamento inicial da estação e da escala no marco zero (0, 0)
    this.gridMesh.updateStationRange(this.visitManager.getCurrentVisit());
    const initialGroundZ = this.heightfield.getInterpolatedHeightAtTile(0, 0);
    this.scaleReference.setPosition(0, 0, initialGroundZ);

    // Interface
    this.initUI();

    // Objetos do Wurm (placeables): só aparecem se os modelos foram extraídos localmente (npm run extract-wurm)
    this.placeables = new PlaceablesManager(this.sceneManager, this.heightfield, this.appContainer);
    wurmDisponivel().then(ok => this.toolbarUI.setPlaceablesDisponivel(ok));
    carregarPilar().then(ok => { if (ok) this.pinMesh.rebuildPins(); });

    // Controlador de Interação
    this.interactionController = new InteractionController({
      canvas: this.canvas,
      heightfield: this.heightfield,
      pinManager: this.pinManager,
      visitManager: this.visitManager,
      storageManager: this.storageManager,
      routeManager: this.routeManager,
      sceneManager: this.sceneManager,
      cameraController: this.cameraController,
      terrainMesh: this.terrainMesh,
      gridMesh: this.gridMesh,
      brushCursor: this.brushCursor,
      pinMesh: this.pinMesh,
      routeMesh: this.routeMesh,
      scaleReference: this.scaleReference,
      contourRenderer: this.contourRenderer,
      toolbarUI: this.toolbarUI,
      brushPanelUI: this.brushPanelUI,
      layersPanelUI: this.layersPanelUI,
      infoBarUI: this.infoBarUI,
      pinModalUI: this.pinModalUI,
      routeModalUI: this.routeModalUI,
      routeHUDUI: this.routeHUDUI,
      placeables: this.placeables,
      onPinSaved: (savedPin) => {
        this.supabaseSync.savePinToCloud(savedPin);
      },
    });

    // Restaura Autosave se existir e mescla com o relevo oficial da nuvem
    this.restoreAutosaveIfExists();

    // Inicia Loop de Renderização
    this.animate();
  }

  private async restoreAutosaveIfExists(): Promise<void> {
    try {
      const autosave = await this.storageManager.loadAutosave();
      if (autosave && autosave.chunks && autosave.chunks.length > 0) {
        this.storageManager.restoreSnapshot(autosave, this.heightfield, this.pinManager, this.visitManager, this.routeManager);
        // Mescla de forma não-destrutiva qualquer relevo oficial da nuvem que não esteja no autosave local
        await this.supabaseSync.fetchCloudRelief(this.heightfield, this.pinManager, this.visitManager, true);
        this.terrainMesh.updateDirtyChunks();
        this.contourRenderer.requestUpdate();
        this.pinMesh.rebuildPins();
        this.routeMesh.rebuildAllRoutes();
        this.gridMesh.updateStationRange(this.visitManager.getCurrentVisit());
        const pos = this.scaleReference.getPosition();
        const groundY = this.heightfield.getInterpolatedHeightAtTile(pos.tileX, pos.tileY);
        this.scaleReference.setExactY(groundY);
      } else {
        const cloudRes = await this.supabaseSync.fetchCloudRelief(this.heightfield, this.pinManager, this.visitManager, false);
        if (cloudRes.success) {
          this.terrainMesh.updateDirtyChunks();
          this.contourRenderer.requestUpdate();
          this.pinMesh.rebuildPins();
          const pos = this.scaleReference.getPosition();
          const groundY = this.heightfield.getInterpolatedHeightAtTile(pos.tileX, pos.tileY);
          this.scaleReference.setExactY(groundY);
        }
      }

      // Sincroniza pontos do Atlas 2D (public.points)
      await this.supabaseSync.syncPointsFromCloud(this.pinManager);
      this.heightfield.updatePinAnchors(this.pinManager.getAll());
      this.pinMesh.rebuildPins();

      // Sincroniza rotas e infraestruturas do Atlas 2D (public.routes)
      await this.supabaseSync.syncRoutesFromCloud(this.routeManager);
      this.routeMesh.rebuildAllRoutes();

      // Assina publicações de relevo em tempo real (mescla não-destrutiva para não perder edição em andamento)
      this.supabaseSync.listenToCloudRelief(async (version) => {
        const confirmUpdate = confirm(`Uma nova versão de relevo oficial (v${version}) foi publicada na nuvem por um Oficial. Deseja mesclar com seu trabalho agora?`);
        if (confirmUpdate) {
          const res = await this.supabaseSync.fetchCloudRelief(this.heightfield, this.pinManager, this.visitManager, true);
          if (res.success) {
            this.terrainMesh.updateDirtyChunks();
            this.contourRenderer.requestUpdate();
            this.pinMesh.rebuildPins();
            this.routeMesh.refreshHeights();
          }
        }
      });
    } catch (e) {
      console.warn('Falha na persistência/sincronização inicial:', e);
    }
  }

  private initUI(): void {
    this.cameraBarUI = new CameraBarUI(
      this.appContainer,
      this.cameraController,
      (factor) => {
        this.sceneManager.setVerticalExaggeration(factor);
        this.pinMesh.setVerticalExaggeration(factor);
        this.routeMesh.setVerticalExaggeration(factor);
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
      },
      {
        supabaseSync: this.supabaseSync,
        onCloudPull: async () => {
          const res = await this.supabaseSync.fetchCloudRelief(this.heightfield, this.pinManager, this.visitManager);
          if (res.success) {
            this.terrainMesh.updateDirtyChunks();
            this.contourRenderer.requestUpdate();
            this.pinMesh.rebuildPins();
            this.routeMesh.refreshHeights();
            alert(t('alert_cloud_loaded'));
          } else {
            alert(res.message || 'Falha ao carregar relevo da nuvem.');
          }
        },
        onCloudPublish: async () => {
          const currentVersion = await this.supabaseSync.getLatestReliefVersion();
          const nextVersion = currentVersion + 1;
          const profile = this.supabaseSync.getProfile();
          const author = profile?.nick || profile?.discord_name || 'Oficial';
          const S = CONFIG.CHUNK_SIZE_CELLS;
          const chunkCount = Array.from(this.heightfield.getAllChunks()).filter((c: any) => {
            for (let i = 0; i < S * S; i++) {
              if (c.states[i] !== 0) return true;
            }
            return false;
          }).length;

          this.publishModalUI.open({
            currentVersion,
            nextVersion,
            author,
            chunkCount,
          });
        },
        onSyncPins: async () => {
          const count = await this.supabaseSync.syncPointsFromCloud(this.pinManager);
          this.heightfield.updatePinAnchors(this.pinManager.getAll());
          this.pinMesh.rebuildPins();
          alert(`Sincronizados ${count} pinos com sucesso!`);
        },
        onSyncRoutes: async () => {
          const count = await this.supabaseSync.syncRoutesFromCloud(this.routeManager);
          this.routeMesh.rebuildAllRoutes();
          alert(`Sincronizadas ${count} rotas/obras com sucesso!`);
        },
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
      routeMesh: this.routeMesh,
      routeManager: this.routeManager,
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

    const syncRoleFromProfile = () => {
      const profile = this.supabaseSync.getProfile();
      if (!profile || profile.role === 'pending') {
        this.infoBarUI.setRole('scout', false);
      } else if (profile.role === 'admin' || profile.role === 'officer') {
        this.infoBarUI.setRole('cartographer', true);
      } else {
        this.infoBarUI.setRole('explorer', false);
      }
      if (profile && (profile.nick || profile.discord_name)) {
        this.visitManager.updateVisitDetails({
          author: profile.nick || profile.discord_name,
        });
      }
    };
    syncRoleFromProfile();
    this.supabaseSync.subscribe(syncRoleFromProfile);

    this.pinModalUI = new PinModalUI(this.appContainer, this.pinManager);
    this.pinMesh.setOnPinSelect((pin) => {
      this.pinModalUI.open(
        pin,
        () => {
          this.heightfield.updatePinAnchors(this.pinManager.getAll());
          this.terrainMesh.updateDirtyChunks();
          this.pinMesh.updatePinsElevation();
          this.supabaseSync.savePinToCloud(pin);
          if (this.interactionController) {
            this.interactionController.triggerAutosave();
          }
        },
        this.infoBarUI.getRole() === 'cartographer'
      );
    });

    this.publishModalUI = new PublishModalUI(this.appContainer);
    this.publishModalUI.setOnPublish(async (note) => {
      const res = await this.supabaseSync.publishCloudRelief(
        this.heightfield,
        this.pinManager,
        this.visitManager,
        note
      );
      if (res.success) {
        const commitName = buildReliefCommitName(res.version || 1, note);
        alert(`${t('alert_cloud_published')}\n\n✓ ${commitName}`);
        return true;
      } else {
        alert(res.message || 'Falha ao publicar na nuvem.');
        return false;
      }
    });

    this.routeModalUI = new RouteModalUI(this.appContainer);
    this.routeHUDUI = new RouteHUDUI(this.appContainer);
    this.routeModalUI.setOnSave(async (route) => {
      const oldId = route.id;
      this.routeManager.saveRoute(route);
      const res = await this.supabaseSync.saveRouteToCloud(route);
      if (res.success && route.id !== oldId) {
        this.routeManager.deleteRoute(oldId);
        this.routeManager.saveRoute(route);
      }
      if (this.interactionController) {
        this.interactionController.triggerAutosave();
      }
    });
    this.routeModalUI.setOnDelete(async (id) => {
      this.routeManager.deleteRoute(id);
      await this.supabaseSync.deleteRouteFromCloud(id);
      if (this.interactionController) {
        this.interactionController.triggerAutosave();
      }
    });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    this.cameraController.update();
    this.terrainMesh.updateDirtyChunks();
    this.placeables.atualizarAlturas();
    this.sceneManager.render(this.cameraController.getActiveCamera());
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new JackalSandboxApp();
});
