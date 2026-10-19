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
}

export class SupabaseSyncManager {
  private client: SupabaseClient | null = null;
  private currentProfile: UserProfile | null = null;
  private storage: StorageManager;
  private isConnected = false;
  private listeners: Array<() => void> = [];

  constructor(storage: StorageManager) {
    this.storage = storage;
    this.initClient();
  }

  private initClient(): void {
    const cfg = (window as any).JACKAL_CONFIG || {};
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
        .select('*')
        .eq('id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Aviso ao carregar perfil:', error.message);
      }

      if (profile) {
        this.currentProfile = profile as UserProfile;
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

  public getProfile(): UserProfile | null {
    return this.currentProfile;
  }

  public isOfficerOrAdmin(): boolean {
    if (!this.currentProfile) return false;
    return this.currentProfile.role === 'admin' || this.currentProfile.role === 'officer';
  }

  /**
   * Carrega o estado oficial do relevo 3D da nuvem
   */
  public async fetchCloudRelief(
    heightfield: HeightfieldManager,
    pins: PinManager,
    visits: VisitManager
  ): Promise<{ success: boolean; version?: number; message?: string }> {
    if (!this.client) return { success: false, message: 'Supabase não inicializado' };

    try {
      const { data, error } = await this.client
        .from('relief_state')
        .select('*')
        .eq('id', 'jackal_r2_main')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, message: 'Nenhum relevo oficial publicado ainda' };
        }
        throw error;
      }

      if (!data || !data.heightmap) {
        return { success: false, message: 'Estado de relevo vazio' };
      }

      // Descompactar JSON das chunks do relevo
      const parsed = JSON.parse(data.heightmap);
      if (parsed && Array.isArray(parsed.chunks)) {
        this.storage.restoreSnapshot(
          {
            meta: {
              id: `cloud-${data.version}`,
              name: `Relevo Oficial v${data.version}`,
              created_at: data.updated_at,
              is_daily: false,
              author: data.metadata?.author || 'Oficial',
              chunk_count: parsed.chunks.length,
              pin_count: pins.getAll().length,
            },
            chunks: parsed.chunks,
            pins: pins.getAll(),
            visit: visits.getCurrentVisit(),
            lockedSheets: data.metadata?.lockedSheets || [],
          },
          heightfield,
          pins,
          visits
        );
        return { success: true, version: data.version };
      }

      return { success: false, message: 'Formato inválido de relevo' };
    } catch (err: any) {
      console.error('Erro ao buscar relevo da nuvem:', err);
      return { success: false, message: err.message || 'Falha ao carregar' };
    }
  }

  /**
   * Publica o relevo atual na nuvem como a versão oficial compartilhada
   * (Apenas Oficiais e Administradores: Jotasiete, Calvos, Mitchel)
   */
  public async publishCloudRelief(
    heightfield: HeightfieldManager,
    pins: PinManager,
    visits: VisitManager,
    commitMessage: string = 'Atualização topográfica de campo'
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
        commitMessage,
        false
      );

      // 1. Obter versão atual
      const { data: current } = await this.client
        .from('relief_state')
        .select('version')
        .eq('id', 'jackal_r2_main')
        .single();

      const nextVersion = (current?.version || 0) + 1;
      const heightmapJson = JSON.stringify({ chunks: snapshot.chunks });
      const statemapJson = JSON.stringify({ lockedSheets: snapshot.lockedSheets });
      const authorId = this.currentProfile?.id || null;

      // 2. Atualizar ou inserir estado ativo
      const { error: stateError } = await this.client
        .from('relief_state')
        .upsert({
          id: 'jackal_r2_main',
          version: nextVersion,
          resolution: 128,
          scale_meters: 4.0,
          bounds: { minX: -2048, maxX: 2048, minY: -2048, maxY: 2048 },
          heightmap: heightmapJson,
          statemap: statemapJson,
          stations: [visits.getCurrentVisit()],
          metadata: {
            author: this.currentProfile?.nick || this.currentProfile?.discord_name || 'Oficial',
            commit_message: commitMessage,
            lockedSheets: snapshot.lockedSheets,
          },
          updated_by: authorId,
          updated_at: new Date().toISOString(),
        });

      if (stateError) throw stateError;

      // 3. Salvar no histórico de commits
      await this.client.from('relief_commits').insert({
        version: nextVersion,
        message: commitMessage,
        heightmap: heightmapJson,
        statemap: statemapJson,
        stations: [visits.getCurrentVisit()],
        metadata: {
          lockedSheets: snapshot.lockedSheets,
        },
        author: authorId,
      });

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

    try {
      const isOfficer = this.isOfficerOrAdmin();
      const kind = pin.type === 'tower' ? 'tower' : (pin.type === 'pillar' ? 'landmark' : 'landmark');

      const payload = {
        id: pin.id.startsWith('pin-') ? undefined : pin.id,
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

      const { data, error } = await this.client
        .from('points')
        .upsert(payload)
        .select()
        .single();

      if (error) throw error;
      if (data && data.id) {
        pin.id = data.id;
      }
      return { success: true };
    } catch (err: any) {
      console.warn('Erro ao salvar pino na nuvem:', err);
      return { success: false, message: err.message };
    }
  }

  /**
   * Assina mudanças em tempo real no relevo oficial publicado
   */
  public listenToCloudRelief(onUpdate: (version: number) => void): () => void {
    if (!this.client) return () => {};

    const channel = this.client
      .channel('relief_state_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'relief_state', filter: 'id=eq.jackal_r2_main' },
        (payload) => {
          if (payload.new && payload.new.version) {
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
