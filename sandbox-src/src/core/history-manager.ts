// ==============================================================================
// JACKAL SANDBOX — GERENCIADOR DE HISTÓRICO (UNDO / REDO)
// ==============================================================================

import { UndoAction } from './types';

export class HistoryManager {
  private undoStack: UndoAction[] = [];
  private redoStack: UndoAction[] = [];
  private maxUndoSteps: number;

  constructor(maxUndoSteps = 80) {
    this.maxUndoSteps = maxUndoSteps;
  }

  public pushAction(action: UndoAction): void {
    if (action.deltas.length === 0) return;
    this.undoStack.push(action);
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Nova ação invalida histórico de redo
  }

  public popUndo(): UndoAction | undefined {
    const action = this.undoStack.pop();
    if (action) {
      this.redoStack.push(action);
    }
    return action;
  }

  public popRedo(): UndoAction | undefined {
    const action = this.redoStack.pop();
    if (action) {
      this.undoStack.push(action);
    }
    return action;
  }

  public clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }
}
