// ==============================================================================
// JACKAL SANDBOX — GERENCIADOR DE PINOS E MARCOS DE CAMPO
// Restrições fortes, marcos construídos e pontos de evidência
// ==============================================================================

import { MapPin, PinMethod, PinType } from './types';

export class PinManager {
  private pins: Map<string, MapPin> = new Map();
  private listeners: Array<() => void> = [];

  constructor() {
    this.createInitialPillars();
  }

  /**
   * Inicializa o marco central de spawn (0, 0)
   */
  private createInitialPillars(): void {
    const spawnPin: MapPin = {
      id: 'pin-spawn-zero',
      x: 0,
      y: 0,
      z: 0.0, // Cota ao nível do mar (Origem da Rede 0, 0)
      type: 'pillar',
      method: 'marco_construido',
      uncertainty_tiles: 0,
      author: 'Cartógrafo Chefe',
      validated: true,
      lockAltitude: false, // Terreno livre para esculpir sob o ponto inicial
      notes: 'Pilar Central de Spawn (Origem da Rede 0, 0)',
      created_at: new Date().toISOString(),
    };
    this.pins.set(spawnPin.id, spawnPin);
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

  public getAll(): MapPin[] {
    return Array.from(this.pins.values());
  }

  public getById(id: string): MapPin | undefined {
    return this.pins.get(id);
  }

  public addPin(pinData: Omit<MapPin, 'id' | 'created_at'>): MapPin {
    const id = `pin-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const pin: MapPin = {
      ...pinData,
      id,
      created_at: new Date().toISOString(),
    };

    // Regra da costa: z é estritamente 0
    if (pin.type === 'coast') {
      pin.z = 0;
    }

    this.pins.set(id, pin);
    this.notify();
    return pin;
  }

  public updatePin(id: string, updates: Partial<MapPin>): MapPin | undefined {
    const pin = this.pins.get(id);
    if (!pin) return undefined;

    const updated = { ...pin, ...updates };
    if (updated.type === 'coast') {
      updated.z = 0;
    }

    this.pins.set(id, updated);
    this.notify();
    return updated;
  }

  public savePin(pinData: Partial<MapPin>): MapPin {
    if (pinData.id && this.pins.has(pinData.id)) {
      return this.updatePin(pinData.id, pinData)!;
    }
    return this.addPin({
      x: pinData.x ?? 0,
      y: pinData.y ?? 0,
      z: pinData.z ?? null,
      type: pinData.type ?? 'pillar',
      method: pinData.method ?? 'marco_construido',
      uncertainty_tiles: pinData.uncertainty_tiles ?? 2,
      author: pinData.author ?? 'Cartógrafo',
      validated: pinData.validated ?? false,
      lockAltitude: pinData.lockAltitude ?? false,
      notes: pinData.notes ?? '',
    });
  }

  public deletePin(id: string): boolean {
    const res = this.pins.delete(id);
    if (res) this.notify();
    return res;
  }

  public toggleValidation(id: string, validatorName: string): boolean {
    const pin = this.pins.get(id);
    if (!pin) return false;
    pin.validated = !pin.validated;
    if (pin.validated) {
      pin.notes = (pin.notes ? pin.notes + ' ' : '') + `[Validado por ${validatorName}]`;
    }
    this.notify();
    return true;
  }

  public clear(): void {
    this.pins.clear();
    this.notify();
  }

  public loadPins(pins: MapPin[]): void {
    this.pins.clear();
    for (const p of pins) {
      this.pins.set(p.id, p);
    }
    this.notify();
  }
}

