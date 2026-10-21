import { buildReliefCommitName, formatReliefVersion } from './relief-naming';
// ==============================================================================
// JACKAL SANDBOX — SINCRONIZAÇÃO NUVEM & SUPABASE (ROUND 2)
// Gerencia autenticação Discord, publicação oficial de relevo e pinos compartilhados
// ==============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { HeightfieldManager } from './heightfield';
import { PinManager } from './pins';
import { VisitManager } from './visits';
import { StorageManager } from './storage';
import { MapPin, PinType, PinMethod, CellState, ConfidenceLevel } from './types';
import { CONFIG } from '../config';

export interface UserProfile {
  id: string;
  discord_id?: string;
  nick?: string;
  role: 'pending' | 'member' | 'officer' | 'admin';
  discord_name?: string;
  discord_avatar?: string;
  guild_id?: string;
  guild?: {
    id: string;
    name: string;
    tag: string;
    color: string;
    outpost?: 'north' | 'west' | 'east';
  };
}

export class SupabaseSyncManager {
  private client: SupabaseClient | null = null;
  private currentProfile: UserProfile | null = null;
  private storage: StorageManager;
  private isConnected = false;
  private lastPublishedVersion = 0;
  private listeners: Array<() => void> = [];

  constructor(storage: StorageManager) {
    this.storage = storage;
    this.initClient();
  }

  private initClient(): void {
    const cfg = (typeof window !== 'undefined' ? (window as any).JACKAL_CONFIG : null) || {};
    const supabaseUrl = cfg.supabaseUrl || 'https://ndeepjongrkeldzrssis.supabase.co';
    const supabaseKey = cfg.publishableKey || cfg.supabaseKey || 'sb_publishable_sX4zAXSzEqRHWSHT28Tzvw_PJOyn_mo';

    if (supabaseUrl && supabaseKey) {
      try {
        this.client = createClient(supabaseUrl, supabaseKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            storageKey: 'sb-ndeepjongrkeldzrssis-auth-token',
          },
        });
        this.isConnected = true;
        this.loadProfile();
      } catch (err) {
        console.warn('Erro ao inicializar cliente Supabase no Sandbox:', err);
      }
    }
  }

  public subscribe(fn: () => void): () => void {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private notify(): void {
    for (const l of this.listeners) l();
  }

  public async loadProfile(): Promise<UserProfile | null> {
    if (!this.client) return null;
    try {
      const { data: { session } } = await this.client.auth.getSession();
      if (!session || !session.user) {
        this.currentProfile = null;
        this.notify();
        return null;
      }

      const { data: profile, error } = await this.client
        .from('profiles')
        .select('*, guilds(*)')
        .eq('id', session.user.id)
        .maybeSingle(); // no row is a normal case, not an error

      if (error && error.code !== 'PGRST116') {
        console.warn('Aviso ao carregar perfil:', error.message);
      }

      if (profile) {
        this.currentProfile = {
          ...profile,
          guild: (profile as any).guilds || undefined,
        } as UserProfile;
      } else {
        // Fallback do usuário autenticado
        this.currentProfile = {
          id: session.user.id,
          role: 'pending',
          discord_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'Scout',
          discord_avatar: session.user.user_metadata?.avatar_url || '',
        };
      }
      this.notify();
      return this.currentProfile;
    } catch (e) {
      console.warn('Exceção ao buscar perfil do usuário:', e);
      return null;
    }
  }

  public getUserOutpost(): 'north' | 'west' | 'east' {
    if (this.currentProfile?.guild?.outpost) {
      const op = this.currentProfile.guild.outpost.toLowerCase();
      if (op === 'north' || op === 'west' || op === 'east') {
        return op as 'north' | 'west' | 'east';
      }
    }
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('jackal_sandbox_active_crystal');
      if (saved === 'north' || saved === 'west' || saved === 'east') {
        return saved as 'north' | 'west' | 'east';
      }
    }
    return 'east';
  }

  public getProfile(): UserProfile | null {
    return this.currentProfile;
  }

  public isOfficerOrAdmin(): boolean {
    if (!this.currentProfile) return false;
    return this.currentProfile.role === 'admin' || this.currentProfile.role === 'officer';
  }

  public isApprovedMember(): boolean {
    if (!this.currentProfile) return false;
    return (
      this.currentProfile.role === 'admin' ||
      this.currentProfile.role === 'officer' ||
      this.currentProfile.role === 'member'
    );
  }

  /**
   * Carrega o estado oficial do relevo 3D da nuvem.
   * Se mergeWithLocal = true, mescla de forma não-destrutiva com o rascunho local.
   */
  public async fetchCloudRelief(
    heightfield: HeightfieldManager,
    pins: PinManager,
    visits: VisitManager,
    mergeWithLocal = false
  ): Promise<{ success: boolean; version?: number; message?: string }> {
    if (!this.client) return { success: false, message: 'Supabase não inicializado' };

    try {
      let { data, error } = await this.client
        .from('relief_state')
        .select('*')
        .eq('id', 'jackal_r2_main')
        .maybeSingle();

      if (!data) {
        const alt = await this.client
          .from('relief_state')
          .select('*')
          .eq('id', 'main')
          .maybeSingle();
        data = alt.data;
        error = alt.error;
      }

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, message: 'Nenhum relevo oficial publicado ainda' };
        }
        throw error;
      }

      if (!data) {
        return { success: false, message: 'Nenhum relevo oficial publicado ainda' };
      }

      let cloudChunks: any[] = [];
      if (Array.isArray(data.chunks) && data.chunks.length > 0) {
        cloudChunks = data.chunks;
      } else if (data.heightmap) {
        const parsed = JSON.parse(data.heightmap);
        if (parsed && Array.isArray(parsed.chunks)) {
          cloudChunks = parsed.chunks;
        }
      }

      if (cloudChunks.length === 0) {
        return { success: false, message: 'Estado de relevo vazio' };
      }

      const localSnap = this.storage.serializeCurrentState(
        heightfield,
        pins,
        visits,
        'Backup Local (Pré-Sincronização)',
        false
      );

      // Se o usuário pediu substituição completa mas tinha trabalho local, salva um backup automático no IndexedDB
      if (!mergeWithLocal && localSnap.chunks.length > 0) {
        localSnap.meta.id = `backup-local-pre-pull-${Date.now()}`;
        await this.storage.saveSnapshot(localSnap);
      }

      const erasedMap = heightfield.getErasedCells();
      const finalChunks = mergeWithLocal
        ? this.storage.mergeChunksNonDestructive(cloudChunks, localSnap.chunks, false, erasedMap)
        : cloudChunks;

      const cloudLockedSheets: string[] = data.metadata?.lockedSheets || [];
      const finalLockedSheets = mergeWithLocal
        ? Array.from(new Set([...cloudLockedSheets, ...(localSnap.lockedSheets || [])]))
        : cloudLockedSheets;

      this.storage.restoreSnapshot(
        {
          meta: {
            id: `cloud-${data.version}`,
            name: `Relevo Oficial v${data.version}`,
            created_at: data.updated_at,
            is_daily: false,
            author: data.metadata?.author || 'Oficial',
            chunk_count: finalChunks.length,
            pin_count: pins.getAll().length,
          },
          chunks: finalChunks,
          pins: pins.getAll(),
          visit: visits.getCurrentVisit(),
          lockedSheets: finalLockedSheets,
          baseCloudVersion: data.version,
          erased: mergeWithLocal ? localSnap.erased : undefined,
        },
        heightfield,
        pins,
        visits
      );
      if (!mergeWithLocal) {
        heightfield.clearErased();
      }
      return { success: true, version: data.version };
    } catch (err: any) {
      console.error('Erro ao buscar relevo da nuvem:', err);
      return { success: false, message: err.message || 'Falha ao carregar' };
    }
  }

  /**
   * Publica o relevo atual na nuvem como a versão oficial compartilhada
   * (Apenas Oficiais e Administradores: Jota7, Calvos, Mitchel)
   * Inclui proteção anti-perda:
   * 1. Bloqueia publicação de mapa vazio sobre mapa populado.
   * 2. Salva backup local automático da versão anterior da nuvem no IndexedDB.
   * 3. Mescla de forma não-destrutiva chunks/células da nuvem que não foram editados localmente.
   * 4. Registra snapshot imutável na tabela append-only public.relief_commits.
   */
  /**
   * Consulta a versão mais recente do relevo na nuvem para pré-visualização no modal
   */
  public async getLatestReliefVersion(): Promise<number> {
    if (!this.client) return 0;
    try {
      const { data, error } = await this.client
        .from('relief_state')
        .select('version')
        .eq('id', 'jackal_r2_main')
        .maybeSingle();
      if (error || !data) return 0;
      return Number(data.version) || 0;
    } catch {
      return 0;
    }
  }

  public async publishCloudRelief(
    heightfield: HeightfieldManager,
    pins: PinManager,
    visits: VisitManager,
    note?: string
  ): Promise<{ success: boolean; version?: number; message?: string }> {
    if (!this.client) return { success: false, message: 'Supabase não conectado' };
    if (!this.isOfficerOrAdmin()) {
      return { success: false, message: 'Permissão negada. Apenas Oficiais e Admins podem publicar o relevo oficial.' };
    }

    try {
      const snapshot = this.storage.serializeCurrentState(
        heightfield,
        pins,
        visits,
        'Publicação Oficial',
        false
      );

      // 1. Obter estado e versão atual da nuvem para mesclagem segura e backup
      const { data: current } = await this.client
        .from('relief_state')
        .select('*')
        .eq('id', 'jackal_r2_main')
        .maybeSingle();

      let cloudChunks: any[] = [];
      let cloudLockedSheets: string[] = [];
      if (current) {
        if (Array.isArray(current.chunks) && current.chunks.length > 0) {
          cloudChunks = current.chunks;
        } else if (current.heightmap) {
          try {
            const parsed = JSON.parse(current.heightmap);
            if (parsed && Array.isArray(parsed.chunks)) {
              cloudChunks = parsed.chunks;
            }
          } catch {}
        }
        cloudLockedSheets = current.metadata?.lockedSheets || [];
      }

      // Proteção contra publicação de mapa em branco
      if (snapshot.chunks.length === 0) {
        return {
          success: false,
          message: 'Proteção anti-perda: Seu relevo local não possui células esculpidas para publicar.',
        };
      }

      // Salva backup automático da versão anterior da nuvem no IndexedDB local
      if (current && cloudChunks.length > 0) {
        await this.storage.saveSnapshot({
          meta: {
            id: `backup-cloud-v${current.version}`,
            name: `Backup ${formatReliefVersion(current.version)} (pre-publish)`,
            created_at: current.updated_at || new Date().toISOString(),
            is_daily: false,
            author: current.metadata?.author || 'Oficial',
            chunk_count: cloudChunks.length,
            pin_count: snapshot.pins.length,
          },
          chunks: cloudChunks,
          pins: snapshot.pins,
          visit: snapshot.visit,
          lockedSheets: cloudLockedSheets,
        });
      }

      // Mescla não-destrutiva com tombstones aplicados
      const erasedMap = heightfield.getErasedCells();
      const mergedChunks = this.storage.mergeChunksNonDestructive(cloudChunks, snapshot.chunks, true, erasedMap);
      const mergedLockedSheets = Array.from(
        new Set([...cloudLockedSheets, ...(snapshot.lockedSheets || [])])
      );

      const nextVersion = (current?.version || 0) + 1;
      this.lastPublishedVersion = nextVersion;
      const commitMessage = buildReliefCommitName(nextVersion, note);
      const heightmapJson = JSON.stringify({ chunks: mergedChunks });
      const statemapJson = JSON.stringify({ lockedSheets: mergedLockedSheets });
      const authorId = this.currentProfile?.id || null;
      const nowIso = new Date().toISOString();

      // Verificação de concorrência: impede sobrescrita caso outro time tenha publicado nesse intervalo
      const { data: latestCheck } = await this.client
        .from('relief_state')
        .select('version')
        .eq('id', 'jackal_r2_main')
        .maybeSingle();

      if (latestCheck && latestCheck.version !== (current?.version || 0)) {
        return {
          success: false,
          message: `Conflito de publicação concorrente: Outra equipe acabou de publicar a versão v${latestCheck.version}! Recarregue os dados da nuvem para mesclar antes de reenviar.`,
        };
      }

      // 2. Atualizar ou inserir estado ativo (compatível com V1 e V2)
      const { error: stateError } = await this.client
        .from('relief_state')
        .upsert({
          id: 'jackal_r2_main',
          version: nextVersion,
          resolution: 128,
          scale_meters: 4.0,
          tile_scale_m: 4.0,
          chunk_size: CONFIG.CHUNK_SIZE_CELLS,
          bounds: { minX: -2048, maxX: 2048, minY: -2048, maxY: 2048 },
          heightmap: heightmapJson,
          statemap: statemapJson,
          chunks: mergedChunks,
          sheets: mergedLockedSheets,
          pins: snapshot.pins,
          stations: [visits.getCurrentVisit()],
          metadata: {
            author: this.currentProfile?.nick || this.currentProfile?.discord_name || 'Oficial',
            commit_message: commitMessage,
            lockedSheets: mergedLockedSheets,
          },
          updated_by: authorId,
          updated_at: nowIso,
        });

      if (stateError) throw stateError;

      // 3. Salvar no histórico imutável de commits (append-only)
      await this.client.from('relief_commits').insert({
        version: nextVersion,
        message: commitMessage,
        heightmap: heightmapJson,
        statemap: statemapJson,
        tile_scale_m: 4.0,
        chunk_size: CONFIG.CHUNK_SIZE_CELLS,
        chunks: mergedChunks,
        sheets: mergedLockedSheets,
        pins: snapshot.pins,
        stations: [visits.getCurrentVisit()],
        metadata: {
          author: this.currentProfile?.nick || this.currentProfile?.discord_name || 'Oficial',
          lockedSheets: mergedLockedSheets,
        },
        author: authorId,
      });

      // Atualiza o estado local com o resultado oficial, limpa tombstones e crava a nova versão-base
      heightfield.clearErased();
      heightfield.setBaseCloudVersion(nextVersion);

      this.storage.restoreSnapshot(
        {
          ...snapshot,
          chunks: mergedChunks,
          lockedSheets: mergedLockedSheets,
          baseCloudVersion: nextVersion,
          erased: undefined,
        },
        heightfield,
        pins,
        visits
      );
      await this.storage.saveAutosave(heightfield, pins, visits);

      return { success: true, version: nextVersion };
    } catch (err: any) {
      console.error('Erro ao publicar relevo na nuvem:', err);
      return { success: false, message: err.message || 'Falha na publicação' };
    }
  }

  /**
   * Sincroniza pontos do Atlas 2D (public.points) para o Sandbox 3D
   */
  public async syncPointsFromCloud(pinManager: PinManager): Promise<number> {
    if (!this.client) return 0;
    try {
      const { data, error } = await this.client
        .from('points')
        .select('*');

      if (error) throw error;
      if (!data || !Array.isArray(data)) return 0;

      let syncedCount = 0;
      for (const p of data) {
        let x = Number(p.x);
        let y = Number(p.y);

        // Se o ponto veio no antigo formato 0..4096, converte para centrado em (0,0)
        if (x > 1024 && y > 1024 && x <= 4096 && y <= 4096) {
          x = Math.round(x - 2048);
          y = Math.round(y - 2048);
        }

        const pinType: PinType = ['tower', 'pillar', 'coast', 'peak'].includes(p.kind)
          ? (p.kind as PinType)
          : (p.kind === 'beacon' ? 'pillar' : 'other');

        pinManager.savePin({
          id: p.id,
          x,
          y,
          z: p.z !== null && p.z !== undefined ? Number(p.z) : null,
          type: pinType,
          method: 'marco_construido',
          uncertainty_tiles: p.confirmed ? 0 : 2,
          author: p.name || 'Atlas',
          validated: !!p.confirmed,
          notes: `${p.name || p.kind} [${p.faction || 'neutro'}]`,
          created_at: p.created_at || new Date().toISOString(),
        });
        syncedCount++;
      }

      return syncedCount;
    } catch (err) {
      console.warn('Erro ao sincronizar pontos do banco:', err);
      return 0;
    }
  }

  /**
   * Salva um marco do Sandbox 3D diretamente na tabela public.points do Atlas 2D
   */
  public async savePinToCloud(pin: MapPin): Promise<{ success: boolean; message?: string }> {
    if (!this.client) return { success: false, message: 'Supabase não conectado' };
    if (!this.isApprovedMember()) {
      return {
        success: false,
        message: 'Apenas membros aprovados (Member, Officer ou Admin) podem enviar marcos para a nuvem.',
      };
    }

    try {
      const isOfficer = this.isOfficerOrAdmin();
      const kind = pin.type === 'tower' ? 'tower' : 'pillar';
      const isNewPin = pin.id.startsWith('pin-');

      const basePayload = {
        kind,
        name: pin.notes || `${pin.type.toUpperCase()} (${pin.x}, ${pin.y})`,
        x: pin.x,
        y: pin.y,
        z: pin.z,
        confirmed: isOfficer,
        faction: 'neutral',
        attrs: {
          method: pin.method,
          uncertainty: pin.uncertainty_tiles,
          author: pin.author,
          origin: 'sandbox_3d',
        },
      };

      if (isNewPin) {
        const { data, error } = await this.client
          .from('points')
          .insert(basePayload)
          .select()
          .single();

        if (error) throw error;
        if (data && data.id) {
          pin.id = data.id;
        }
      } else {
        const { error } = await this.client
          .from('points')
          .update(basePayload)
          .eq('id', pin.id);

        if (error) throw error;
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Erro ao salvar pino na nuvem:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Sincroniza rotas do Atlas 2D (public.routes) para o Sandbox 3D
   */
  public async syncRoutesFromCloud(routeManager: any): Promise<number> {
    if (!this.client) return 0;
    try {
      const { data, error } = await this.client.from('routes').select('*');
      if (error) throw error;
      if (!data || !Array.isArray(data)) return 0;

      let syncedCount = 0;
      for (const r of data) {
        if (!Array.isArray(r.path) || r.path.length < 2) continue;

        // Converte coordenadas do path de [0..4096] para centrado em [0, 0] se necessário
        const convertedPath: Array<[number, number]> = r.path.map((pt: [number, number]) => {
          let px = Number(pt[0]);
          let py = Number(pt[1]);
          if (px > 1024 && py > 1024 && px <= 4096 && py <= 4096) {
            px = Math.round(px - 2048);
            py = Math.round(py - 2048);
          }
          return [px, py];
        });

        const kind = String(r.kind || '');
        const color = String(r.color || '').toLowerCase();
        const isBuilt = kind.endsWith('_built');
        let rType: 'road' | 'bridge' | 'tunnel' = 'road';
        if (kind.startsWith('bridge')) rType = 'bridge';
        else if (kind.startsWith('tunnel') || color === '#a855f7' || color === '#c084fc') rType = 'tunnel';

        // Recupera medida aferida se presente na coluna distance ou no sufixo [NNt] do nome
        let rawName = String(r.name || 'Rota');
        let realLen: number | null = r.distance ? Math.round(Number(r.distance)) : null;
        const matchCalib = rawName.match(/\s*\[(\d+)t\]$/i);
        if (matchCalib) {
          realLen = parseInt(matchCalib[1], 10);
          rawName = rawName.replace(/\s*\[(\d+)t\]$/i, '').trim();
        }

        routeManager.saveRoute({
          id: r.id,
          name: rawName || 'Rota',
          type: rType,
          status: isBuilt ? 'built' : 'planned',
          path: convertedPath,
          widthTiles: Number(r.width) || 2,
          realLengthTiles: realLen,
          author: r.created_by,
          created_at: r.created_at,
        });
        syncedCount++;
      }
      return syncedCount;
    } catch (err) {
      console.warn('Erro ao sincronizar rotas da nuvem:', err);
      return 0;
    }
  }

  /**
   * Salva uma rota do Sandbox 3D diretamente na tabela public.routes do Supabase
   */
  public async saveRouteToCloud(route: any): Promise<{ success: boolean; message?: string }> {
    if (!this.client) return { success: false, message: 'Supabase não conectado' };
    if (!this.isApprovedMember()) {
      return {
        success: false,
        message: 'Apenas membros aprovados podem salvar rotas na nuvem.',
      };
    }

    try {
      const isBuilt = route.status === 'built';
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(route.id || ''));

      // Converte coordenadas centradas em (0,0) para o padrão 0..4096 do Atlas 2D
      const path2D = route.path.map((pt: [number, number]) => [pt[0] + 2048, pt[1] + 2048]);

      const color =
        route.type === 'tunnel'
          ? '#a855f7'
          : route.type === 'bridge'
          ? isBuilt
            ? '#00e676'
            : '#38bdf8'
          : isBuilt
          ? '#00e676'
          : '#f5a623';

      const cleanName = String(route.name || 'Rota').replace(/\s*\[(\d+)t\]$/i, '').trim();
      const dbName = route.realLengthTiles ? `${cleanName} [${route.realLengthTiles}t]` : cleanName;

      // Usa kind compatível com o enum route_kind do banco (tunnel usa road_* + color '#a855f7' caso o enum ainda não tenha tunnel_*)
      const preferredKind =
        route.type === 'bridge'
          ? isBuilt
            ? 'bridge_built'
            : 'bridge_planned'
          : isBuilt
          ? 'road_built'
          : 'road_planned';

      const basePayload = {
        name: dbName,
        kind: preferredKind,
        color,
        width: route.widthTiles || 2,
        path: path2D,
      };

      if (!isUuid) {
        const { data, error } = await this.client
          .from('routes')
          .insert(basePayload)
          .select()
          .single();

        if (error) throw error;
        if (data && data.id) {
          route.id = data.id;
        }
      } else {
        const { error } = await this.client
          .from('routes')
          .update(basePayload)
          .eq('id', route.id);

        if (error) throw error;
      }

      return { success: true };
    } catch (err: any) {
      console.warn('Erro ao salvar rota na nuvem:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Remove uma rota da tabela public.routes do Supabase
   */
  public async deleteRouteFromCloud(id: string): Promise<{ success: boolean; message?: string }> {
    if (!this.client) return { success: false, message: 'Supabase não conectado' };
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ''));
    if (!isUuid) return { success: true }; // Rota apenas local

    try {
      const { error } = await this.client.from('routes').delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.warn('Erro ao deletar rota na nuvem:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Assina mudanças em tempo real no relevo oficial publicado
   */
  /**
   * Consulta os commits oficiais históricos gravados no banco de dados
   */
  public async fetchReliefCommits(limit = 10): Promise<Array<{
    version: number;
    message: string;
    created_at: string;
    author: string;
    chunk_count: number;
    pin_count: number;
  }>> {
    if (!this.client) return [];
    try {
      const { data, error } = await this.client
        .from('relief_commits')
        .select('version, message, created_at, metadata, chunks, pins')
        .order('version', { ascending: false })
        .limit(limit);

      if (error || !data) return [];
      return data.map((d: any) => ({
        version: Number(d.version),
        message: d.message || `Versão ${d.version}`,
        created_at: d.created_at || '',
        author: d.metadata?.author || 'Oficial',
        chunk_count: Array.isArray(d.chunks) ? d.chunks.length : 0,
        pin_count: Array.isArray(d.pins) ? d.pins.length : 0,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Restaura um commit histórico da nuvem como a nova versão oficial
   */
  public async rollbackToCommit(
    version: number,
    heightfield: HeightfieldManager,
    pins: PinManager,
    visits: VisitManager
  ): Promise<{ success: boolean; newVersion?: number; message?: string }> {
    if (!this.client) return { success: false, message: 'Supabase não conectado' };
    if (!this.isOfficerOrAdmin()) {
      return { success: false, message: 'Permissão negada. Apenas Oficiais podem restaurar versões.' };
    }

    try {
      // 1. Busca os dados daquele commit específico
      const { data: targetCommit, error: fetchError } = await this.client
        .from('relief_commits')
        .select('*')
        .eq('version', version)
        .maybeSingle();

      if (fetchError || !targetCommit) {
        return { success: false, message: `Commit v${version} não encontrado.` };
      }

      // 2. Extrai os chunks do commit
      let targetChunks: any[] = [];
      if (Array.isArray(targetCommit.chunks) && targetCommit.chunks.length > 0) {
        targetChunks = targetCommit.chunks;
      } else if (targetCommit.heightmap) {
        try {
          const parsed = JSON.parse(targetCommit.heightmap);
          if (parsed && Array.isArray(parsed.chunks)) {
            targetChunks = parsed.chunks;
          }
        } catch {}
      }

      const targetSheets: string[] = targetCommit.sheets || targetCommit.metadata?.lockedSheets || [];

      // 3. Salva backup de segurança da versão atual no IndexedDB antes do rollback
      const currentSnap = this.storage.serializeCurrentState(
        heightfield,
        pins,
        visits,
        `Backup Pré-Rollback (para v${version})`,
        false
      );
      await this.storage.saveSnapshot(currentSnap);

      // 4. Cria a nova versão de publicação baseada no commit antigo restaurado
      const latestVer = await this.getLatestReliefVersion();
      const nextVersion = latestVer + 1;
      const rollbackMsg = `Rollback oficial para v${version} · (Publicado como v${nextVersion})`;
      const heightmapJson = JSON.stringify({ chunks: targetChunks });
      const statemapJson = JSON.stringify({ lockedSheets: targetSheets });
      const authorId = this.currentProfile?.id || null;
      const nowIso = new Date().toISOString();

      // Atualiza relief_state
      const { error: stateError } = await this.client
        .from('relief_state')
        .upsert({
          id: 'jackal_r2_main',
          version: nextVersion,
          resolution: 128,
          scale_meters: 4.0,
          tile_scale_m: 4.0,
          chunk_size: CONFIG.CHUNK_SIZE_CELLS,
          bounds: { minX: -2048, maxX: 2048, minY: -2048, maxY: 2048 },
          heightmap: heightmapJson,
          statemap: statemapJson,
          chunks: targetChunks,
          sheets: targetSheets,
          pins: targetCommit.pins || [],
          stations: targetCommit.stations || [visits.getCurrentVisit()],
          metadata: {
            author: this.currentProfile?.nick || this.currentProfile?.discord_name || 'Oficial',
            commit_message: rollbackMsg,
            lockedSheets: targetSheets,
            restored_from: version,
          },
          updated_by: authorId,
          updated_at: nowIso,
        });

      if (stateError) throw stateError;

      // Registra no histórico imutável relief_commits
      await this.client.from('relief_commits').insert({
        version: nextVersion,
        message: rollbackMsg,
        heightmap: heightmapJson,
        statemap: statemapJson,
        tile_scale_m: 4.0,
        chunk_size: CONFIG.CHUNK_SIZE_CELLS,
        chunks: targetChunks,
        sheets: targetSheets,
        pins: targetCommit.pins || [],
        stations: targetCommit.stations || [visits.getCurrentVisit()],
        metadata: {
          author: this.currentProfile?.nick || this.currentProfile?.discord_name || 'Oficial',
          lockedSheets: targetSheets,
          restored_from: version,
        },
        author: authorId,
      });

      this.lastPublishedVersion = nextVersion;

      // Restaura na memória local
      heightfield.clearErased();
      heightfield.setBaseCloudVersion(nextVersion);
      this.storage.restoreSnapshot(
        {
          meta: {
            id: `cloud-${nextVersion}`,
            name: rollbackMsg,
            created_at: nowIso,
            is_daily: false,
            author: 'Oficial',
            chunk_count: targetChunks.length,
            pin_count: (targetCommit.pins || []).length,
          },
          chunks: targetChunks,
          pins: targetCommit.pins || [],
          visit: visits.getCurrentVisit(),
          lockedSheets: targetSheets,
          baseCloudVersion: nextVersion,
        },
        heightfield,
        pins,
        visits
      );
      await this.storage.saveAutosave(heightfield, pins, visits);

      return { success: true, newVersion: nextVersion };
    } catch (err: any) {
      console.error('Erro no rollback:', err);
      return { success: false, message: err.message || 'Falha ao restaurar versão' };
    }
  }

  public listenToCloudRelief(onUpdate: (version: number) => void): () => void {
    if (!this.client) return () => {};

    const channel = this.client
      .channel('relief_state_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'relief_state', filter: 'id=eq.jackal_r2_main' },
        (payload) => {
          if (payload.new && payload.new.version) {
            if (payload.new.version <= this.lastPublishedVersion) return;
            onUpdate(payload.new.version);
          }
        }
      )
      .subscribe();

    return () => {
      this.client?.removeChannel(channel);
    };
  }
}

