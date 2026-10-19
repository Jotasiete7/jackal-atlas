// ==============================================================================
// JACKAL SANDBOX — MODAL DE GUIA COMPLETO, TUTORIAL E ATALHOS (TABS)
// ==============================================================================

import { i18n } from '../i18n';
import { Tour3DManager } from './tool-help';

export class HelpModalUI {
  private backdrop: HTMLElement;
  private isOpen = false;
  private activeTab: 'overview' | 'tools' | 'roles' | 'shortcuts' = 'overview';
  private tourManager = new Tour3DManager();

  constructor(parent: HTMLElement) {
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'modal-backdrop';
    this.backdrop.style.display = 'none';
    parent.appendChild(this.backdrop);

    // Fechar ao clicar fora ou pressionar ESC
    this.backdrop.addEventListener('click', (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (this.isOpen && e.key === 'Escape') {
        this.close();
      }
    });
  }

  public open(initialTab?: 'overview' | 'tools' | 'roles' | 'shortcuts'): void {
    if (initialTab) this.activeTab = initialTab;
    this.isOpen = true;
    this.render();
    this.backdrop.style.display = 'flex';
  }

  public close(): void {
    this.isOpen = false;
    this.backdrop.style.display = 'none';
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private render(): void {
    const isPt = i18n.getLang() === 'pt';

    this.backdrop.innerHTML = `
      <div class="glass-panel modal-content" style="max-width: 580px; width: 92%; max-height: 88vh; display: flex; flex-direction: column;">
        
        <!-- Cabeçalho -->
        <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 8px; margin-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">🎓</span>
            <strong style="color: #f1f5f9; font-size: 13.5px; letter-spacing: 0.5px;">
              ${isPt ? 'TUTORIAL E GUIA TÁTICO — JACKAL SANDBOX 3D' : 'TUTORIAL & TACTICAL GUIDE — JACKAL 3D SANDBOX'}
            </strong>
          </div>
          <button id="btn-help-close" class="btn" style="padding: 2px 8px; font-size: 14px; color: var(--text-dim); background: transparent;">✕</button>
        </div>

        <!-- Abas -->
        <div class="jk-modal-tabs">
          <button class="jk-modal-tab-btn ${this.activeTab === 'overview' ? 'active' : ''}" data-tab="overview">
            🗺️ ${isPt ? 'Visão Geral & Tour' : 'Overview & Tour'}
          </button>
          <button class="jk-modal-tab-btn ${this.activeTab === 'tools' ? 'active' : ''}" data-tab="tools">
            ⛰️ ${isPt ? 'Ferramentas' : 'Tools'}
          </button>
          <button class="jk-modal-tab-btn ${this.activeTab === 'roles' ? 'active' : ''}" data-tab="roles">
            🛡️ ${isPt ? 'Permissões' : 'Permissions'}
          </button>
          <button class="jk-modal-tab-btn ${this.activeTab === 'shortcuts' ? 'active' : ''}" data-tab="shortcuts">
            ⌨️ ${isPt ? 'Atalhos' : 'Shortcuts'}
          </button>
        </div>

        <!-- Conteúdo Rolável -->
        <div style="flex: 1; overflow-y: auto; padding-right: 4px; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
          ${this.renderTabContent(isPt)}
        </div>

        <!-- Rodapé -->
        <div class="modal-footer" style="margin-top: 14px; border-top: 1px solid var(--border-color); padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
          <button id="btn-start-tour" class="btn" style="background: rgba(245, 166, 35, 0.15); color: var(--accent-gold); border: 1px solid rgba(245, 166, 35, 0.4); font-size: 11px; font-weight: 700;">
            🚀 ${isPt ? 'Iniciar Tour Spotlight 3D' : 'Start 3D Spotlight Tour'}
          </button>
          <button id="btn-help-ok" class="btn btn-gold" style="padding: 4px 16px; font-size: 11px;">
            ${isPt ? 'Entendido' : 'Got it'}
          </button>
        </div>

      </div>
    `;

    // Eventos
    this.backdrop.querySelector('#btn-help-close')?.addEventListener('click', () => this.close());
    this.backdrop.querySelector('#btn-help-ok')?.addEventListener('click', () => this.close());

    this.backdrop.querySelectorAll('.jk-modal-tab-btn[data-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.getAttribute('data-tab') as any;
        this.render();
      });
    });

    this.backdrop.querySelector('#btn-start-tour')?.addEventListener('click', () => {
      this.close();
      this.tourManager.start();
    });
  }

  private renderTabContent(isPt: boolean): string {
    switch (this.activeTab) {
      case 'overview':
        return `
          <div style="display:flex; flex-direction:column; gap:12px;">
            <p>
              ${isPt
                ? 'O <strong>Jackal 3D Sandbox</strong> é a estação oficial de engenharia topográfica da guilda para o <strong>Wurm Online</strong>. Ele permite reproduzir com precisão matemática o relevo do jogo antes de mover montanhas ou abrir estradas no servidor.'
                : 'The <strong>Jackal 3D Sandbox</strong> is the guild\'s official topographic engineering station for <strong>Wurm Online</strong>. It allows high-precision mathematical terrain modeling before terraforming or building roads on the live server.'}
            </p>

            <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: 6px; padding: 10px;">
              <div style="font-weight: 700; color: var(--accent-gold); margin-bottom: 4px;">
                ${isPt ? '📐 Escala e Geodésia Wurm:' : '📐 Wurm Geodesy & Scale:'}
              </div>
              <ul style="padding-left: 18px; margin: 0; display:flex; flex-direction:column; gap:4px;">
                <li>${isPt ? '<strong>1 Tile = 4 metros</strong> em escala métrica real do jogo.' : '<strong>1 Tile = 4 meters</strong> in true game metric scale.'}</li>
                <li>${isPt ? '<strong>Spawn (0,0)</strong> é o ponto central de referência para cálculo geodésico e alinhamento de folhas.' : '<strong>Spawn (0,0)</strong> is the central survey origin point for tile coordinates and sheet alignment.'}</li>
                <li>${isPt ? '<strong>Curvas de Nível [C]:</strong> geradas em intervalos configuráveis de 5m a 20m para visualização de declives.' : '<strong>Contour Lines [C]:</strong> generated in configurable 5m to 20m intervals for instant slope reading.'}</li>
              </ul>
            </div>

            <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 6px; padding: 10px;">
              <div style="font-weight: 700; color: #38bdf8; margin-bottom: 4px;">
                ${isPt ? '💡 Dicas Rápidas de Navegação:' : '💡 Quick Navigation Tips:'}
              </div>
              <div>• ${isPt ? 'Gire a câmera com o <strong>Botão Direito do Mouse</strong> ou Alt+Arrastar.' : 'Rotate camera using <strong>Right Mouse Button</strong> or Alt+Drag.'}</div>
              <div>• ${isPt ? 'Arraste o mapa (pan) com o <strong>Botão do Meio (Scroll)</strong> ou Ctrl+Arrastar.' : 'Pan map using <strong>Middle Mouse Button</strong> or Ctrl+Drag.'}</div>
              <div>• ${isPt ? 'Posicione a Torre / Boneco de Escala pressionando <strong>Shift + Clique Esquerdo</strong> no terreno.' : 'Reposition Scale Tower / Human by pressing <strong>Shift + Left Click</strong> on terrain.'}</div>
            </div>
          </div>
        `;

      case 'tools':
        return `
          <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; flex-direction:column; gap:8px;">
              
              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <strong style="color:#fff;">⬆️ ${isPt ? 'Pincel Positivo' : 'Positive Brush'} [R]</strong>
                  <span class="role-badge member">${isPt ? 'Membro+' : 'Member+'}</span>
                </div>
                <div style="font-size:11px;">${isPt ? 'Eleva montanhas e morros continuamente com queda suave ou dura.' : 'Progressively elevates terrain hills and peaks with configurable falloff.'}</div>
              </div>

              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <strong style="color:#fff;">⬇️ ${isPt ? 'Pincel Negativo' : 'Negative Brush'} [L]</strong>
                  <span class="role-badge member">${isPt ? 'Membro+' : 'Member+'}</span>
                </div>
                <div style="font-size:11px;">${isPt ? 'Rebaixa vales e depressões até o nível mínimo do mar (0m).' : 'Lowers terrain into valleys down to sea level minimum (0m).'}</div>
              </div>

              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <strong style="color:#fff;">〰️ ${isPt ? 'Suavizar Relevo' : 'Smooth Relief'} [M]</strong>
                  <span class="role-badge member">${isPt ? 'Membro+' : 'Member+'}</span>
                </div>
                <div style="font-size:11px;">${isPt ? 'Aplica filtro laplaciano para alisar encostas bruscas e declives intransponíveis.' : 'Applies Laplacian filter to soften steep slopes and rough jagged cliffs.'}</div>
              </div>

              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <strong style="color:#fff;">➖ ${isPt ? 'Nivelar Platô' : 'Flatten Plateau'} [F]</strong>
                  <span class="role-badge member">${isPt ? 'Membro+' : 'Member+'}</span>
                </div>
                <div style="font-size:11px;">${isPt ? 'Aplaina na cota métrica definida no painel (ideal para deeds e fundações).' : 'Flattens area to target elevation set in properties panel (ideal for deeds).'}</div>
              </div>

              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <strong style="color:#fff;">💧 ${isPt ? 'Carimbo de Água' : 'Water Stamp'} [U / Alt+W]</strong>
                  <span class="role-badge member">${isPt ? 'Membro+' : 'Member+'}</span>
                </div>
                <div style="font-size:11px;">${isPt ? 'Carimba o nível 0m do mar e fixa o estado da célula permanentemente como água.' : 'Stamps sea level 0m and locks cell state permanently as water.'}</div>
              </div>

              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <strong style="color:#fff;">🔒 ${isPt ? 'Cadeado de Relevo' : 'Relief Lock'} [K]</strong>
                  <span class="role-badge officer">${isPt ? 'Oficial / Cartógrafo' : 'Officer / Cartographer'}</span>
                </div>
                <div style="font-size:11px;">${isPt ? 'Protege áreas auditadas contra alterações. Alt+Clique destranca.' : 'Protects audited areas against accidental edits. Alt+Click unlocks.'}</div>
              </div>

              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); border-radius: 6px; padding: 8px 10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                  <strong style="color:#fff;">📍 ${isPt ? 'Marco Geodésico' : 'Geodetic Pin'} [P]</strong>
                  <span class="role-badge pending">${isPt ? 'Todos' : 'All'}</span>
                </div>
                <div style="font-size:11px;">${isPt ? 'Adiciona pontos de observação, torres de guarda ou cumes com metadados e fotos.' : 'Places survey pins, guard towers or mountain summits with metadata.'}</div>
              </div>

            </div>
          </div>
        `;

      case 'roles':
        return `
          <div style="display:flex; flex-direction:column; gap:12px;">
            <p>
              ${isPt
                ? 'Para garantir a integridade do mapa comunitário e evitar perda de dados, o Atlas e Sandbox aplicam permissões baseadas nos cargos verificados do <strong>Discord Oficial da Jackal</strong>:'
                : 'To ensure map integrity and prevent accidental data loss, the Atlas and Sandbox enforce role-based permissions verified via the <strong>Official Jackal Discord</strong>:'}
            </p>

            <div style="display:flex; flex-direction:column; gap:8px;">
              <div style="background: rgba(0,230,118,0.05); border: 1px solid rgba(0,230,118,0.3); border-radius: 6px; padding: 10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                  <strong style="color:#00e676;">🧭 ${isPt ? 'Batedor / Scout (Deslogado ou Visitante)' : 'Scout / Visitor'}</strong>
                  <span class="role-badge pending">Scout</span>
                </div>
                <div style="font-size:11px;">
                  ${isPt
                    ? '• Pode navegar livremente em 2D e 3D.<br>• Pode adicionar anotações provisórias e pinos de campo.<br>• <strong>Não</strong> pode modificar relevo oficial nem publicar.'
                    : '• Free navigation in 2D and 3D.<br>• Can drop provisional pins and field notes.<br>• <strong>Cannot</strong> modify official terrain or publish.'}
                </div>
              </div>

              <div style="background: rgba(56,189,248,0.05); border: 1px solid rgba(56,189,248,0.3); border-radius: 6px; padding: 10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                  <strong style="color:#38bdf8;">⛏️ ${isPt ? 'Membro / Modelador (Explorer)' : 'Member / Modeler (Explorer)'}</strong>
                  <span class="role-badge member">Member</span>
                </div>
                <div style="font-size:11px;">
                  ${isPt
                    ? '• Acesso a todos os pincéis de modelagem (elevar, rebaixar, suavizar, nivelar, água).<br>• Pode traçar estradas e pontes planejadas no 2D Atlas.<br>• Pode salvar snapshots locais e exportar arquivos (GeoJSON, SVG).'
                    : '• Access to all terrain sculpting brushes (raise, lower, smooth, flatten, water).<br>• Can trace planned roads and bridges in 2D Atlas.<br>• Can save local snapshots and export files (GeoJSON, SVG).'}
                </div>
              </div>

              <div style="background: rgba(245,166,35,0.08); border: 1px solid rgba(245,166,35,0.4); border-radius: 6px; padding: 10px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                  <strong style="color:var(--accent-gold);">👑 ${isPt ? 'Oficial / Cartógrafo (Cartographer & Admin)' : 'Officer / Cartographer (Admin)'}</strong>
                  <span class="role-badge admin">Officer / Admin</span>
                </div>
                <div style="font-size:11px;">
                  ${isPt
                    ? '• Pode <strong>Publicar</strong> novas versões do relevo oficial na Nuvem (Supabase).<br>• Pode <strong>Trancar / Destrancar [K]</strong> células de relevo definitivo.<br>• Aprovação e auditoria de pontos estratégicos e metas de guilda.'
                    : '• Can <strong>Publish</strong> new official terrain versions to Cloud (Supabase).<br>• Can <strong>Lock / Unlock [K]</strong> approved terrain cells.<br>• Approval and audit of strategic points and guild objectives.'}
                </div>
              </div>
            </div>
          </div>
        `;

      case 'shortcuts':
        return `
          <div style="display:flex; flex-direction:column; gap:10px;">
            <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
              <thead>
                <tr style="border-bottom:1px solid var(--border-color); text-align:left; color:var(--accent-gold);">
                  <th style="padding:4px 6px;">${isPt ? 'Atalho' : 'Key'}</th>
                  <th style="padding:4px 6px;">${isPt ? 'Ação' : 'Action'}</th>
                  <th style="padding:4px 6px;">${isPt ? 'Contexto' : 'Context'}</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:4px 6px; font-family:var(--font-mono); color:#38bdf8;">WASD / Setas</td>
                  <td style="padding:4px 6px;">${isPt ? 'Movimentar câmera pelo mapa' : 'Pan camera across terrain'}</td>
                  <td style="padding:4px 6px; color:var(--text-dim);">Câmera 3D</td>
                </tr>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:4px 6px; font-family:var(--font-mono); color:#38bdf8;">Botão Direito</td>
                  <td style="padding:4px 6px;">${isPt ? 'Órbita / Rotação 3D' : 'Rotate 3D orbit'}</td>
                  <td style="padding:4px 6px; color:var(--text-dim);">Câmera 3D</td>
                </tr>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:4px 6px; font-family:var(--font-mono); color:#38bdf8;">Shift + Clique</td>
                  <td style="padding:4px 6px;">${isPt ? 'Mover Objeto de Escala (Torre/Boneco)' : 'Move Scale Object'}</td>
                  <td style="padding:4px 6px; color:var(--text-dim);">Medição</td>
                </tr>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:4px 6px; font-family:var(--font-mono); color:#38bdf8;">H</td>
                  <td style="padding:4px 6px;">${isPt ? 'Alternar Torre (24m) / Boneco (1.8m) / Pilar (4m)' : 'Cycle Tower (24m) / Human (1.8m) / Pillar'}</td>
                  <td style="padding:4px 6px; color:var(--text-dim);">Escala Real</td>
                </tr>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:4px 6px; font-family:var(--font-mono); color:#38bdf8;">C</td>
                  <td style="padding:4px 6px;">${isPt ? 'Ligar / Desligar Curvas de Nível' : 'Toggle Contour Lines'}</td>
                  <td style="padding:4px 6px; color:var(--text-dim);">Visual</td>
                </tr>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:4px 6px; font-family:var(--font-mono); color:#38bdf8;">1 a 5</td>
                  <td style="padding:4px 6px;">${isPt ? 'Presets de Diâmetro (5 a 100 tiles)' : 'Brush Presets (5 to 100 tiles)'}</td>
                  <td style="padding:4px 6px; color:var(--text-dim);">Pincel</td>
                </tr>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:4px 6px; font-family:var(--font-mono); color:#38bdf8;">R, L, M, F, U, E, K</td>
                  <td style="padding:4px 6px;">${isPt ? 'Selecionar Ferramentas de Relevo' : 'Select Sculpting Tools'}</td>
                  <td style="padding:4px 6px; color:var(--text-dim);">Barra Lateral</td>
                </tr>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:4px 6px; font-family:var(--font-mono); color:#38bdf8;">P, T</td>
                  <td style="padding:4px 6px;">${isPt ? 'Marco Geodésico (P) e Estação (T)' : 'Geodetic Pin (P) and Station (T)'}</td>
                  <td style="padding:4px 6px; color:var(--text-dim);">Campo</td>
                </tr>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:4px 6px; font-family:var(--font-mono); color:#38bdf8;">Ctrl+Z / Ctrl+Y</td>
                  <td style="padding:4px 6px;">${isPt ? 'Desfazer / Refazer Pinceladas' : 'Undo / Redo strokes'}</td>
                  <td style="padding:4px 6px; color:var(--text-dim);">Histórico</td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
    }
  }
}
