// ==============================================================================
// JACKAL SANDBOX — GERENCIADOR DE VISITAS E SESSÕES DE CAMPO
// Registro de estações de observação, alcance de pincelada e logs de eventos
// ==============================================================================

import { CONFIG } from '../config';
import { FieldVisit, StrokeEvent } from './types';

export class VisitManager {
  private currentVisit: FieldVisit;
  private strokeLog: StrokeEvent[] = [];
  private listeners: Array<() => void> = [];
  private ghostVisible = true;
  private enforceRangeLimit = true;

  constructor() {
    this.currentVisit = {
      id: `visit-${Date.now()}`,
      station_x: 0,
      station_y: 0,
      heading_deg: 0, // Olhando para o Norte
      station_method: 'marco_construido',
      station_uncertainty: 0,
      author: 'Explorador 1',
      date: new Date().toISOString().split('T')[0],
      range_tiles: CONFIG.DEFAULT_VISIT_RANGE_TILES,
    };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public getCurrentVisit(): FieldVisit {
    return { ...this.currentVisit };
  }

  public updateStation(x: number, y: number, headingDeg?: number): void {
    this.currentVisit.station_x = Math.round(x);
    this.currentVisit.station_y = Math.round(y);
    if (headingDeg !== undefined) {
      this.currentVisit.heading_deg = Math.round(headingDeg) % 360;
    }
    this.notify();
  }

  public updateVisitDetails(details: Partial<FieldVisit>): void {
    this.currentVisit = { ...this.currentVisit, ...details };
    this.notify();
  }

  public startNewVisit(author: string, stationX = 0, stationY = 0): FieldVisit {
    this.currentVisit = {
      id: `visit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      station_x: Math.round(stationX),
      station_y: Math.round(stationY),
      heading_deg: 0,
      station_method: 'contagem',
      station_uncertainty: 5,
      author: author || 'Explorador',
      date: new Date().toISOString().split('T')[0],
      range_tiles: CONFIG.DEFAULT_VISIT_RANGE_TILES,
    };
    this.notify();
    return this.currentVisit;
  }

  public logStroke(stroke: StrokeEvent): void {
    this.strokeLog.push(stroke);
  }

  public getStrokeCount(): number {
    return this.strokeLog.length;
  }

  public getStrokeLog(): StrokeEvent[] {
    return [...this.strokeLog];
  }

  public setGhostVisible(visible: boolean): void {
    this.ghostVisible = visible;
    this.notify();
  }

  public isGhostVisible(): boolean {
    return this.ghostVisible;
  }

  public setEnforceRangeLimit(enforce: boolean): void {
    this.enforceRangeLimit = enforce;
    this.notify();
  }

  public isEnforcingRangeLimit(): boolean {
    return this.enforceRangeLimit;
  }
}
