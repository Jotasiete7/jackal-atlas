// ==============================================================================
// JACKAL SANDBOX — SISTEMA DE INTERROGAÇÃO (?) E AJUDA CONTEXTUAL TÁTICA
// ==============================================================================

import { i18n } from '../i18n';

export interface ToolHelpItem {
  titlePt: string;
  titleEn: string;
  role: 'all' | 'member' | 'officer' | 'admin';
  roleLabelPt: string;
  roleLabelEn: string;
  whatPt: string;
  whatEn: string;
  howPt: string;
  howEn: string;
  shortcut: string;
}

export const TOOL_HELP_DATA: Record<string, ToolHelpItem> = {
  raise: {
    titlePt: 'Pincel Positivo (Elevar)',
    titleEn: 'Positive Brush (Raise)',
    role: 'member',
    roleLabelPt: 'Membro / Modelador+',
    roleLabelEn: 'Member / Modeler+',
    whatPt: 'Eleva a cota de relevo progressivamente, adicionando altura aos tiles em metros com base no raio e intensidade.',
    whatEn: 'Progressively elevates terrain altitude, adding height in meters based on brush radius and intensity.',
    howPt: 'Clique ou mantenha pressionado o botão esquerdo do mouse sobre o terreno para subir montanhas e colinas.',
    howEn: 'Left-click or drag on terrain to sculpt hills and mountains.',
    shortcut: 'R'
  },
  lower: {
    titlePt: 'Pincel Negativo (Rebaixar)',
    titleEn: 'Negative Brush (Lower)',
    role: 'member',
    roleLabelPt: 'Membro / Modelador+',
    roleLabelEn: 'Member / Modeler+',
    whatPt: 'Reduz a altitude do relevo de forma contínua até a cota mínima do mar (0m). Nunca escava abaixo de zero.',
    whatEn: 'Reduces terrain altitude continuously down to sea level minimum (0m). Never digs below zero.',
    howPt: 'Clique ou arraste com o botão esquerdo para esculpir vales, trincheiras e depressões naturais.',
    howEn: 'Left-click or drag to sculpt valleys, trenches and natural depressions.',
    shortcut: 'L'
  },
  smooth: {
    titlePt: 'Suavizar Relevo (Laplaciano)',
    titleEn: 'Smooth Relief (Laplacian)',
    role: 'member',
    roleLabelPt: 'Membro / Modelador+',
    roleLabelEn: 'Member / Modeler+',
    whatPt: 'Aplica média ponderada entre vértices vizinhos, eliminando quinas bruscas, penhascos pontiagudos e ruído.',
    whatEn: 'Applies weighted averaging between neighboring vertices, smoothing jagged cliffs and noise.',
    howPt: 'Passe o pincel sobre transições duras para criar encostas graduais e colinas suaves navegáveis.',
    howEn: 'Brush over harsh transitions to generate gradual slopes and passable rolling hills.',
    shortcut: 'M'
  },
  flatten: {
    titlePt: 'Nivelar Terreno (Platô)',
    titleEn: 'Flatten Terrain (Plateau)',
    role: 'member',
    roleLabelPt: 'Membro / Modelador+',
    roleLabelEn: 'Member / Modeler+',
    whatPt: 'Força todos os tiles atingidos para a cota exata (em metros) definida no painel lateral de propriedades.',
    whatEn: 'Forces all targeted tiles to the exact target elevation (in meters) specified in the properties panel.',
    howPt: 'Ajuste a "Cota Alvo" no painel e passe o pincel para criar platôs, estradas niveladas ou fundações.',
    howEn: 'Set "Target Elevation" in the panel and brush to create flat plateaus, leveled roads or foundations.',
    shortcut: 'F'
  },
  water: {
    titlePt: 'Carimbo de Água / Mar (0m)',
    titleEn: 'Water Stamp / Sea Level (0m)',
    role: 'member',
    roleLabelPt: 'Membro / Modelador+',
    roleLabelEn: 'Member / Modeler+',
    whatPt: 'Carimba a cota estrita do nível do mar (0m) e marca o estado da célula permanentemente como Água.',
    whatEn: 'Stamps strict sea level elevation (0m) and marks the cell state permanently as Water.',
    howPt: 'Clique nas margens, praias ou áreas oceânicas para delimitar linhas de costa oficiais confiáveis.',
    howEn: 'Click on coastlines, shores or open ocean to delimit reliable official shorelines.',
    shortcut: 'U (ou Alt+W)'
  },
  eraser: {
    titlePt: 'Borracha de Relevo',
    titleEn: 'Relief Eraser',
    role: 'member',
    roleLabelPt: 'Membro / Modelador+',
    roleLabelEn: 'Member / Modeler+',
    whatPt: 'Reseta as células selecionadas de volta para o estado "Desconhecido" (cinza translúcido sem dados).',
    whatEn: 'Resets selected cells back to "Unknown" state (translucent dark grid without elevation data).',
    howPt: 'Passe o pincel sobre dados de exploração incorretos, testes provisórios ou além da fronteira mapeada.',
    howEn: 'Brush over erroneous survey data, temporary drafts or unconfirmed frontier territories.',
    shortcut: 'E'
  },
  lock: {
    titlePt: 'Trava de Relevo (Cadeado)',
    titleEn: 'Relief Lock (Padlock)',
    role: 'officer',
    roleLabelPt: 'Oficial / Cartógrafo',
    roleLabelEn: 'Officer / Cartographer',
    whatPt: 'Tranca a área de relevo contra qualquer edição acidental de outros membros. Vértices trancados ficam imutáveis.',
    whatEn: 'Locks terrain against accidental edits by other members. Locked vertices become immutable to brushes.',
    howPt: 'Clique com o pincel para trancar (destaque vermelho). Pressione Alt+Clique com o pincel para destrancar.',
    howEn: 'Left-click to lock vertices (red highlight). Alt+Left-click with brush to unlock.',
    shortcut: 'K'
  },
  pin: {
    titlePt: 'Marco Geodésico (Pino)',
    titleEn: 'Geodetic Marker (Pin)',
    role: 'all',
    roleLabelPt: 'Todos (Batedores+)',
    roleLabelEn: 'All (Scouts+)',
    whatPt: 'Insere ou inspeciona marcos 3D (Torres de guarda, Pilares, Picos, Encostas) com coordenadas reais do Wurm.',
    whatEn: 'Inserts or inspects 3D geodetic pins (Guard Towers, Pillars, Peaks, Shorelines) with Wurm coordinates.',
    howPt: 'Clique em qualquer ponto do relevo para abrir o modal de dados (autor, tipo de marco, cota e notas).',
    howEn: 'Click anywhere on the terrain to open metadata modal (author, marker type, elevation, notes).',
    shortcut: 'P'
  },
  station: {
    titlePt: 'Estação de Observação',
    titleEn: 'Observation Station',
    role: 'all',
    roleLabelPt: 'Todos (Batedores+)',
    roleLabelEn: 'All (Scouts+)',
    whatPt: 'Define a posição geográfica de onde a equipe visualizou o terreno e limita o raio da sessão de campo.',
    whatEn: 'Defines observer geographic standpoint and bounds the survey radius for the field session.',
    howPt: 'Clique no relevo para fixar o ponto de observação e visualizar o círculo de alcance da luneta.',
    howEn: 'Click on terrain to set the vantage point and visualize spyglass sight circle.',
    shortcut: 'T'
  },
  place: {
    titlePt: 'Objetos 3D (Modelos Wurm)',
    titleEn: '3D Placeables (Wurm Models)',
    role: 'member',
    roleLabelPt: 'Membro / Modelador+',
    roleLabelEn: 'Member / Modeler+',
    whatPt: 'Posiciona modelos 3D do Wurm (árvores, construções, paliçadas) extraídos localmente.',
    whatEn: 'Places extracted 3D Wurm models (trees, buildings, palisades) on the terrain.',
    howPt: 'Selecione o modelo desejado e clique no terreno para posicionar.',
    howEn: 'Select target model and click on terrain to place.',
    shortcut: 'O'
  },
  route: {
    titlePt: 'Infraestrutura & Aferição (Estrada, Ponte, Túnel)',
    titleEn: 'Infrastructure & Calibration (Road, Bridge, Tunnel)',
    role: 'all',
    roleLabelPt: 'Todos (Batedores+)',
    roleLabelEn: 'All (Scouts+)',
    whatPt: 'Traça estradas coladas ao relevo, pontes como réguas suspensas e túneis em raio-X. Permite cravar a medida real de tiles do jogo para aferir e corrigir o mapa.',
    whatEn: 'Traces roads draped on terrain, bridges as suspended rulers, and tunnels in X-ray. Enables setting true in-game tile counts to calibrate and correct the terrain.',
    howPt: 'Escolha Estrada, Ponte ou Túnel no painel flutuante. Clique no relevo para fixar pontos (0°/45°/90°; segure Shift para livre). Conclua com Enter ou duplo-clique. Cancele com Botão Direito ou Esc.',
    howEn: 'Select Road, Bridge or Tunnel in floating panel. Click terrain to set points (0°/45°/90°; hold Shift for free). Finish with Enter or double-click. Cancel with Right-Click or Esc.',
    shortcut: 'B'
  },
  undo: {
    titlePt: 'Desfazer Alteração',
    titleEn: 'Undo Action',
    role: 'member',
    roleLabelPt: 'Membro / Modelador+',
    roleLabelEn: 'Member / Modeler+',
    whatPt: 'Reverte o último traço de pincel ou alteração de relevo executada na sessão atual.',
    whatEn: 'Reverts the last brush stroke or elevation change performed in the current session.',
    howPt: 'Clique no botão ou pressione Ctrl+Z a qualquer momento.',
    howEn: 'Click the button or press Ctrl+Z at any time.',
    shortcut: 'Ctrl+Z'
  },
  redo: {
    titlePt: 'Refazer Alteração',
    titleEn: 'Redo Action',
    role: 'member',
    roleLabelPt: 'Membro / Modelador+',
    roleLabelEn: 'Member / Modeler+',
    whatPt: 'Reaplica a alteração anteriormente desfeita.',
    whatEn: 'Re-applies the previously undone action.',
    howPt: 'Clique no botão ou pressione Ctrl+Y.',
    howEn: 'Click the button or press Ctrl+Y.',
    shortcut: 'Ctrl+Y'
  }
};

let activePopover: HTMLElement | null = null;
let activeBackdrop: HTMLElement | null = null;

export function closeActiveHelpPopover(): void {
  if (activePopover) {
    activePopover.remove();
    activePopover = null;
  }
}

export function showToolHelp(toolKey: string, anchorEl: HTMLElement): void {
  closeActiveHelpPopover();

  const isPt = i18n.getLang() === 'pt';
  const data = TOOL_HELP_DATA[toolKey];
  if (!data) return;

  const popover = document.createElement('div');
  popover.className = 'jk-help-popover';

  const title = isPt ? data.titlePt : data.titleEn;
  const roleLabel = isPt ? data.roleLabelPt : data.roleLabelEn;
  const what = isPt ? data.whatPt : data.whatEn;
  const how = isPt ? data.howPt : data.howEn;

  popover.innerHTML = `
    <div class="jk-help-title">
      <span>${title}</span>
      <span class="jk-help-perm ${data.role}">${roleLabel}</span>
    </div>
    <div class="jk-help-body">
      <div style="margin-bottom: 6px;">
        <strong style="color: var(--accent-gold);">${isPt ? 'O que faz:' : 'What it does:'}</strong> ${what}
      </div>
      <div>
        <strong style="color: var(--accent-blue);">${isPt ? 'Como usar:' : 'How to use:'}</strong> ${how}
      </div>
    </div>
    <div class="jk-help-footer">
      <span>${isPt ? 'Atalho:' : 'Shortcut:'}</span>
      <span class="jk-help-shortcut">[${data.shortcut}]</span>
    </div>
  `;

  document.body.appendChild(popover);
  activePopover = popover;

  // Posicionamento inteligente
  const rect = anchorEl.getBoundingClientRect();
  const popoverWidth = 300;
  const popoverHeight = popover.offsetHeight || 180;

  // Posição padrão: à direita da âncora
  let left = rect.right + 12;
  let top = rect.top + (rect.height / 2) - (popoverHeight / 2);

  // Evitar transbordamento da tela
  if (left + popoverWidth > window.innerWidth - 10) {
    left = Math.max(10, rect.left - popoverWidth - 12);
  }
  if (top < 10) top = 10;
  if (top + popoverHeight > window.innerHeight - 10) {
    top = window.innerHeight - popoverHeight - 10;
  }

  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;

  // Auto-fechar ao clicar fora ou pressionar ESC
  const dismissHandler = (e: MouseEvent) => {
    if (activePopover && !activePopover.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) {
      closeActiveHelpPopover();
      document.removeEventListener('pointerdown', dismissHandler);
    }
  };
  setTimeout(() => {
    document.addEventListener('pointerdown', dismissHandler);
  }, 10);
}

// ==============================================================================
// SPOTLIGHT TOUR INTERATIVO 3D
// ==============================================================================

export interface TourStep {
  targetSelector: string;
  titlePt: string;
  titleEn: string;
  descPt: string;
  descEn: string;
}

export const TOUR_STEPS_3D: TourStep[] = [
  {
    targetSelector: '.top-bar',
    titlePt: 'Bem-vindo ao Jackal 3D Sandbox!',
    titleEn: 'Welcome to Jackal 3D Sandbox!',
    descPt: 'Aqui você modela a altimetria e relevo real do Wurm Online com precisão cartográfica métrica, curvas de nível e iluminação solar.',
    descEn: 'Here you sculpt Wurm Online real terrain and elevation with metric cartographic precision, contour lines and solar hillshading.'
  },
  {
    targetSelector: '.toolbar-left',
    titlePt: 'Ferramentas de Escultura',
    titleEn: 'Sculpting & Survey Tools',
    descPt: 'Eleve (R), rebaixe (L), suavize encostas (M), nivele platôs (F), carimbe água em 0m e marque pontos geodésicos (P). Cada botão tem seu balão de ajuda com [?].',
    descEn: 'Raise (R), lower (L), smooth (M), flatten plateaus (F), stamp sea water at 0m, and place geodetic pins (P). Each tool includes a contextual [?] help bubble.'
  },
  {
    targetSelector: '.brush-panel',
    titlePt: 'Painel de Pincel e Diâmetros',
    titleEn: 'Brush & Diameter Controls',
    descPt: 'Ajuste o diâmetro de 5 a 100 tiles pelos presets [1 a 5] ou slider contínuo. Use "Proteger Água" para evitar que o pincel invada a linha da costa.',
    descEn: 'Adjust brush diameter from 5 to 100 tiles using keys [1 to 5] or slider. Toggle "Protect Water" to preserve existing shorelines.'
  },
  {
    targetSelector: '#cardinal-group',
    titlePt: 'Câmeras e Rotações Cardeais',
    titleEn: 'Camera Views & Cardinal Rotations',
    descPt: 'Alterne entre visão de Topo, Isométrica ou Livre. Rotacione nos 4 pontos cardeais em 90° (N, L, S, O) para alinhar com o horizonte do jogo.',
    descEn: 'Switch between Top, Isometric and Free cameras. Step-rotate in 90° cardinal headings (N, E, S, W) to match game perspectives.'
  },
  {
    targetSelector: '.cloud-actions',
    titlePt: 'Nuvem e Sincronização Oficial',
    titleEn: 'Cloud & Official Sync',
    descPt: 'Baixe o relevo oficial compartilhado da guilda (Supabase), sincronize pinos e marcos do Atlas 2D e publique suas aprovações com segurança.',
    descEn: 'Pull shared guild official relief from Supabase, sync markers from the 2D Atlas, and publish approved surveys securely.'
  }
];

export class Tour3DManager {
  private currentStep = 0;
  private backdropEl: HTMLElement | null = null;
  private cardEl: HTMLElement | null = null;

  public start(): void {
    this.currentStep = 0;
    this.renderStep();
  }

  public next(): void {
    if (this.currentStep < TOUR_STEPS_3D.length - 1) {
      this.currentStep++;
      this.renderStep();
    } else {
      this.finish();
    }
  }

  public prev(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep();
    }
  }

  public finish(): void {
    if (this.backdropEl) {
      this.backdropEl.remove();
      this.backdropEl = null;
    }
    if (this.cardEl) {
      this.cardEl.remove();
      this.cardEl = null;
    }
    try {
      localStorage.setItem('jackal_tour_3d_completed', 'true');
    } catch (e) {}
  }

  private renderStep(): void {
    const isPt = i18n.getLang() === 'pt';
    const step = TOUR_STEPS_3D[this.currentStep];

    if (!this.backdropEl) {
      this.backdropEl = document.createElement('div');
      this.backdropEl.className = 'jk-tour-backdrop';
      document.body.appendChild(this.backdropEl);
      this.backdropEl.addEventListener('click', (e) => {
        if (e.target === this.backdropEl) this.finish();
      });
    }

    if (!this.cardEl) {
      this.cardEl = document.createElement('div');
      this.cardEl.className = 'jk-tour-card';
      document.body.appendChild(this.cardEl);
    }

    const title = isPt ? step.titlePt : step.titleEn;
    const desc = isPt ? step.descPt : step.descEn;
    const stepNumber = `${this.currentStep + 1} / ${TOUR_STEPS_3D.length}`;

    this.cardEl.innerHTML = `
      <div class="jk-tour-step">TUTORIAL 3D • ${stepNumber}</div>
      <div class="jk-tour-title">${title}</div>
      <div class="jk-tour-desc">${desc}</div>
      <div class="jk-tour-nav">
        <button id="btn-tour-close" style="color: #94a3b8;">${isPt ? 'Pular' : 'Skip'}</button>
        <div style="display:flex; gap:6px;">
          ${this.currentStep > 0 ? `<button id="btn-tour-prev">${isPt ? '◀ Anterior' : '◀ Prev'}</button>` : ''}
          <button id="btn-tour-next" class="primary">${this.currentStep === TOUR_STEPS_3D.length - 1 ? (isPt ? 'Concluir ✓' : 'Finish ✓') : (isPt ? 'Próximo ▶' : 'Next ▶')}</button>
        </div>
      </div>
    `;

    this.cardEl.querySelector('#btn-tour-close')?.addEventListener('click', () => this.finish());
    this.cardEl.querySelector('#btn-tour-prev')?.addEventListener('click', () => this.prev());
    this.cardEl.querySelector('#btn-tour-next')?.addEventListener('click', () => this.next());

    // Highlight target element
    const target = document.querySelector(step.targetSelector) as HTMLElement;
    if (target) {
      const rect = target.getBoundingClientRect();
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      // Posiciona card
      let cardLeft = rect.left + 20;
      let cardTop = rect.bottom + 15;

      if (cardLeft + 350 > window.innerWidth) {
        cardLeft = window.innerWidth - 360;
      }
      if (cardTop + 200 > window.innerHeight) {
        cardTop = Math.max(20, rect.top - 210);
      }
      if (cardLeft < 10) cardLeft = 10;
      if (cardTop < 10) cardTop = 10;

      this.cardEl.style.left = `${cardLeft}px`;
      this.cardEl.style.top = `${cardTop}px`;
    } else {
      // Centro se não achar o alvo
      this.cardEl.style.left = '50%';
      this.cardEl.style.top = '50%';
      this.cardEl.style.transform = 'translate(-50%, -50%)';
    }
  }
}
