// ==============================================================================
// JACKAL SANDBOX — GERADOR DE NOMES VERSIONADOS DE RELEVO (RELIEF NAMING)
// Padrão padronizado em inglês: Jackal R2 Relief · v0007 [— Nota Opcional]
// ==============================================================================

export const RELIEF_NAME_PREFIX = 'Jackal R2 Relief';

/**
 * Formata um número de versão com padding de no mínimo 4 dígitos (ex: 7 -> "v0007", 12 -> "v0012")
 */
export function formatReliefVersion(version: number): string {
  const safeVer = Math.max(0, Math.floor(version || 0));
  return `v${String(safeVer).padStart(4, '0')}`;
}

/**
 * Monta o nome oficial do commit de relevo para a nuvem.
 *
 * Exemplo sem nota:
 *   "Jackal R2 Relief · v0007"
 *
 * Exemplo com nota:
 *   "Jackal R2 Relief · v0007 — cleaned outside ring"
 */
export function buildReliefCommitName(version: number, note?: string): string {
  const verTag = formatReliefVersion(version);
  const cleanNote = (note || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 100)
    .trim();

  if (!cleanNote) {
    return `${RELIEF_NAME_PREFIX} · ${verTag}`;
  }

  return `${RELIEF_NAME_PREFIX} · ${verTag} — ${cleanNote}`;
}
