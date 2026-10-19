// ==============================================================================
// JACKAL SANDBOX — DEFINIÇÕES DE TIPOS NÚCLEO
// ==============================================================================

/** Estados possíveis de uma célula do relevo */
export enum CellState {
  /** Ninguém observou ainda (preto / hachurado neutro) */
  UNKNOWN = 0,
  /** Água confirmada (nível do mar fixo em exatamente 0m) */
  WATER = 1,
  /** Terra com elevação estimada em metros (>= 0m) */
  LAND = 2,
}

/** Níveis de confiança de observação de uma célula */
export enum ConfidenceLevel {
  /** Uma única visita ou alta divergência */
  SPECULATIVE = 0,
  /** Ao menos 2 visitas ou estações independentes concordantes */
  ESTIMATED = 1,
  /** Pino medido com cota ou marco construído de escala */
  MEASURED = 2,
}

/** Ferramentas de modelagem interativa */
export type ModelingTool =
  | 'raise'    // Pincel positivo (eleva terreno)
  | 'lower'    // Pincel negativo (rebaixa terreno, clamp 0)
  | 'smooth'   // Suavizar (média móvel laplaciana)
  | 'flatten'  // Nivelar a altura alvo
  | 'water'    // Pinta como água (altura estritamente zero)
  | 'eraser'   // Devolve célula para UNKNOWN
  | 'lock'     // Trancar / Destrancar relevo (Cadeado do Cartógrafo)
  | 'pin'      // Criar/editar marco geodésico
  | 'station'  // Definir posição de estação da visita
  | 'place';   // Objetos: colocar/mover/girar/apagar modelos do Wurm (placeables)

/** Papel do usuário no trabalho colaborativo */
export type UserRole = 'scout' | 'explorer' | 'cartographer';

/** Perfil de queda do pincel */
export type BrushFalloff = 'smooth' | 'hard';

/** Tipos de marcos / pinos */
export type PinType = 'tower' | 'pillar' | 'tree' | 'coast' | 'peak' | 'other';

/** Métodos de mensuração de pino */
export type PinMethod = 'spyglass' | 'pixel' | 'contagem' | 'marco_construido';

/** Pino de evidência de campo */
export interface MapPin {
  id: string;
  x: number; // tiles em relação ao spawn (0,0)
  y: number; // tiles em relação ao spawn (0,0)
  z: number | null; // altitude em metros (0 para costa; nulo se desconhecido)
  type: PinType;
  method: PinMethod;
  uncertainty_tiles: number;
  author: string;
  validated: boolean;
  lockAltitude?: boolean; // Se verdadeiro, ancora rigidamente a cota do terreno
  notes?: string;
  created_at: string;
}

/** Registro de Visita de Campo */
export interface FieldVisit {
  id: string;
  station_x: number; // tiles a partir de (0,0)
  station_y: number; // tiles a partir de (0,0)
  heading_deg: number; // Norte = 0°, Leste = 90°
  station_method: PinMethod;
  station_uncertainty: number;
  author: string;
  date: string;
  range_tiles: number; // Padrão: 100 tiles
}

/** Evento atômico de pincelada para replay e histórico */
export interface StrokeEvent {
  id: string;
  visit_id: string;
  tool: ModelingTool;
  brush_size_tiles: number;
  intensity: number;
  falloff: BrushFalloff;
  flatten_height?: number;
  points: Array<{ x: number; y: number }>; // coordenadas em tiles
  timestamp: number;
}

/** Dados brutos de um chunk na memória */
export interface ChunkData {
  chunkX: number;
  chunkY: number;
  /** Altitudes em metros (Float32Array de tamanho S * S) */
  heights: Float32Array;
  /** Estados das células (CellState: UNKNOWN, WATER, LAND) */
  states: Uint8Array;
  /** Níveis de confiança das células (ConfidenceLevel) */
  confidence: Uint8Array;
  /** Células trancadas contra modificação por pincel (0 = livre, 1 = trancado) */
  locked: Uint8Array;
  /** Flags de controle de sujeira para atualização incremental da malha */
  isDirty: boolean;
}

/** Delta de alteração atômica de célula para Undo / Redo */
export interface CellDelta {
  chunkKey: string;
  index: number;
  oldHeight: number;
  newHeight: number;
  oldState: CellState;
  newState: CellState;
  oldConfidence: ConfidenceLevel;
  newConfidence: ConfidenceLevel;
  oldLocked?: boolean;
  newLocked?: boolean;
}

/** Registro de uma ação completa no histórico de Undo / Redo */
export interface UndoAction {
  id: string;
  tool: ModelingTool;
  deltas: CellDelta[];
}

/** Modos de visualização de câmera */
export type CameraMode = 'top' | 'isometric' | 'side' | 'free';

/** Orientação lateral cardeal */
export type CardinalDirection = 'N' | 'S' | 'L' | 'O';

/** Opções de geração de curvas de nível */
export interface ContourOptions {
  intervalMeters: number; // ex: 5, 10, 25 m
  masterEvery: number;     // cota mestra a cada N curvas (padrão: 5)
  showLabels: boolean;
}

/** Snapshot serializado do relevo */
export interface SnapshotMeta {
  id: string;
  name: string;
  created_at: string;
  is_daily: boolean;
  author: string;
  chunk_count: number;
  pin_count: number;
}

export interface SerializedSnapshot {
  meta: SnapshotMeta;
  chunks: Array<{
    chunkX: number;
    chunkY: number;
    // Base64 ou arrays compactados para persistência
    heights: number[];
    states: number[];
    confidence: number[];
    locked?: number[];
  }>;
  pins: MapPin[];
  visit: FieldVisit;
  lockedSheets?: string[];
}

