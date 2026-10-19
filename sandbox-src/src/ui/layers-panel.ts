import { i18n } from '../i18n';
import { ContourRenderer } from '../renderer/contour-renderer';
import { GridMeshManager } from '../renderer/grid-mesh';
import { TerrainMeshManager } from '../renderer/terrain-mesh';
import { PinMeshManager } from '../renderer/pin-mesh';
import { ScaleReferenceManager, ScaleReferenceMode } from '../renderer/scale-reference';
import { VisitManager } from '../core/visits';
import { StorageManager } from '../core/storage';
import { HeightfieldManager } from '../core/heightfield';
import { PinManager } from '../core/pins';

import { MapLayersSectionUI } from './panels/map-layers-section';
import { ExportSectionUI } from './panels/export-section';
import { VisitSectionUI } from './panels/visit-section';
import { SnapshotsSectionUI } from './panels/snapshots-section';

export class LayersPanelUI {
  private container: HTMLElement;

  private mapLayersSection: MapLayersSectionUI;
  private exportSection: ExportSectionUI;
  private visitSection: VisitSectionUI;
  private snapshotsSection: SnapshotsSectionUI;

  constructor(
    parent: HTMLElement,
    deps: {
      terrainMesh: TerrainMeshManager;
      gridMesh: GridMeshManager;
      pinMesh: PinMeshManager;
      scaleReference: ScaleReferenceManager;
      contourRenderer: ContourRenderer;
      visitManager: VisitManager;
      storageManager: StorageManager;
      heightfield: HeightfieldManager;
      pinManager: PinManager;
      rendererCanvas: HTMLCanvasElement;
    }
  ) {
    this.container = document.createElement('div');
    this.container.className = 'glass-panel sidebar-right';
    parent.appendChild(this.container);

    this.mapLayersSection = new MapLayersSectionUI(this.container, {
      terrainMesh: deps.terrainMesh,
      gridMesh: deps.gridMesh,
      pinMesh: deps.pinMesh,
      contourRenderer: deps.contourRenderer,
      scaleReference: deps.scaleReference,
    });

    this.exportSection = new ExportSectionUI(this.container, deps.contourRenderer);

    this.visitSection = new VisitSectionUI(this.container, deps.visitManager, deps.gridMesh);

    this.snapshotsSection = new SnapshotsSectionUI(this.container, {
      storageManager: deps.storageManager,
      heightfield: deps.heightfield,
      pinManager: deps.pinManager,
      visitManager: deps.visitManager,
      terrainMesh: deps.terrainMesh,
      contourRenderer: deps.contourRenderer,
      pinMesh: deps.pinMesh,
      gridMesh: deps.gridMesh,
      scaleReference: deps.scaleReference,
    });

    i18n.subscribe(() => {
      this.refreshLanguage();
    });
  }

  public toggleContours(): boolean {
    return this.mapLayersSection.toggleContours();
  }

  public cycleScale(): ScaleReferenceMode {
    return this.mapLayersSection.cycleScale();
  }

  public updateScaleButtons(mode: ScaleReferenceMode): void {
    this.mapLayersSection.updateScaleButtons(mode);
  }

  public refreshLanguage(): void {
    this.mapLayersSection.render();
    this.exportSection.render();
    this.visitSection.render();
    this.snapshotsSection.render();
    this.snapshotsSection.loadSnapshotList();
  }
}
