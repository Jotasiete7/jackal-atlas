# 📖 Manual de Operações & Tutorial Completo — Jackal Atlas
*Guia oficial de campo para batedores, oficiais e comandantes de A Guilda • Wurm Online Jackal Round 2*

---

## 🧭 1. Introdução & Filosofia Visual

O **Jackal Atlas** (`https://jackal-atlas.pages.dev`) foi concebido como a central cartográfica e tática definitiva da guilda para o servidor Jackal. Sua interface segue os padrões do **Swiss Design System (Dark Swiss)**:
- **Minimalismo informativo**: Apenas dados essenciais em tela para não obstruir o reconhecimento de terreno.
- **Precisão militar**: Coordenadas tabulares em fonte monoespaçada e cálculo exato de quadrantes padrão YAGA (B7 a Z26).
- **Tempo real**: Sincronização instantânea via WebSockets com banco de dados Supabase.

---

## 🔐 2. Acesso & Permissões

1. Acesse o portal em **[https://jackal-atlas.pages.dev](https://jackal-atlas.pages.dev)**.
2. Clique no botão **Entrar com Discord** na barra lateral esquerda (ou acesse diretamente `login.html`).
3. Autorize o aplicativo Discord.
4. **Hierarquia de Cargos**:
   - **`pending` (Pendente)**: Novo recruta aguardando liberação de um Oficial ou Administrador.
   - **`member` (Membro)**: Visualização completa do mapa, camadas, objetivos e envio de novos pontos/eventos para moderação.
   - **`officer` (Oficial)**: Aprovação imediata de pontos, criação direta de objetivos e gerenciamento de membros.
   - **`admin` (Comando Geral)**: Acesso irrestrito a aprovações, promoção de oficiais e exclusão de infraestruturas e pontos.

> 💡 **Nota de Administrador**: O primeiro administrador do sistema possui acesso automático ao **Painel de Oficiais (`admin.html`)** para aprovar novos membros com um clique.

---

## 🗺️ 3. Navegação Cartográfica & Sistema de Coordenadas

### 3.1 Bases de Terreno
No acordeom **Base Cartográfica**, alterne entre três visões do relevo de Jackal:
- **Terrain**: Visão aérea de vegetação, solo, areia e água.
- **Isométrico**: Representação tridimensional clássica para reconhecimento de declives e vales.
- **Topográfico**: Curvas de nível precisas para planejamento de subidas e rotas viárias.

### 3.2 Grade de Quadrantes Wurm (YAGA)
Ative a opção **Grade de Quadrantes Wurm** para sobrepor as linhas tracejadas e rótulos de quadrantes (ex: `M15`, `K20`, `L12`).
O HUD inferior (`sw-coord-hud-bar`) exibe constantemente as coordenadas exatas `X • Y`, o quadrante e o nível de zoom sob a posição do mouse.

---

## 🔍 4. Busca Inteligente com Autocomplete

No topo da barra lateral esquerda, use o campo de busca com suporte a múltiplos critérios:
- **Por Quadrante**: Digite `M15`, `b7` ou `k20` para iluminar instantaneamente o quadrante inteiro com um contorno ciano luminoso e centralizar a câmera.
- **Por Deed / Vila**: Digite o nome da vila ou o nome do **Prefeito (Mayor)**. O sistema encontra e lista a Deed com distintivo da facção.
- **Por Ponto de Interesse**: Digite nomes ou tipos de beacons, cavernas, recursos minerais ou marcos.
- **Navegação Imediata**: Ao clicar em qualquer item do dropdown, o mapa realiza um voo suave (`flyTo`) e abre automaticamente o popup detalhado com todas as ações.

---

## 🖱️ 5. Menu de Contexto Tático (Botão Direito no Mapa)

Clique com o **botão direito do mouse** em qualquer ponto do terreno para abrir o menu contextual escuro:
- 📍 **Adicionar Ponto / Deed aqui**: Abre o modal já com as coordenadas exatas daquele pixel preenchidas.
- 📋 **Copiar comando `/vamp`**: Gera e copia para a área de transferência o comando pronto para o chat do jogo (ex: `/vamp 2048 1850`), com notificação de confirmação visual.
- 🔍 **Centralizar Mapa aqui**: Centraliza suavemente a visualização naquele ponto.

---

## 🛣️ 6. Modo Foco & Traçado de Infraestrutura (Estradas & Pontes)

Para mapear e planejar rodovias e travessias:

1. No acordeom **Infraestrutura**, clique em **Traçar Estrada** ou **Traçar Ponte**.
2. A interface entra em **Modo Foco**:
   - A barra inferior se transforma na **`sw-focus-bar`**.
   - O cursor vira mira (`crosshair`).
3. **Clique no mapa sequencialmente** para traçar a rota nó a nó.
   - A extensão total da obra é **calculada dinamicamente em tiles de Wurm** em tempo real.
   - Marcadores visuais indicam o ponto de início (verde), nós intermediários e o final (vermelho).
4. **Controles Rápidos**:
   - **↩ Desfazer**: Remove o último nó traçado se você errar o clique.
   - **✓ Salvar Obra**: Abre a janela para nomear a rodovia/ponte e escolher se é *Planejada* (linha tracejada) ou *Pavimentada/Concluída* (linha contínua). A obra é gravada permanentemente no Supabase e sincronizada para toda a guilda.
   - **✕ Cancelar** (ou tecla **ESC**): Cancela a edição sem salvar.

---

## 🏘️ 7. Cadastro e Gestão de Deeds e Pontos

### 7.1 Cadastrar Novo Ponto
1. Clique no botão **Adicionar Ponto no Mapa** ou use o botão direito do mouse no mapa.
2. Um distintivo flutuante (**Crosshair Tracker**) acompanha a mira do mouse mostrando as coordenadas ao vivo.
3. Clique no local exato para abrir o formulário.
4. Escolha o tipo de elemento:
   - 🏘️ **Deed / Vila**: Libera o campo adicional **👑 Prefeito / Responsável (Mayor)**.
   - 🔴 **Beacon**: Vincula ao sistema de influência territorial.
   - 🪨 **Lodestone**, 🕳️ **Caverna Natural**, ⛏️ **Recurso Mineral**, ✨ **Idol / Plinth** ou 📦 **Suprimentos**.
5. Selecione a facção (**Jackal**, **Freedom**, **Neutro** ou **Desconhecido**).

### 7.2 Editar ou Excluir Pontos Existentes
- Clique no marcador no mapa para abrir o popup.
- Se você for o criador do ponto, um **Oficial** ou **Admin**, aparecerão os botões:
  - ✏️ **Editar**: Permite renomear, alterar o tipo, facção ou atualizar o Prefeito da Deed.
  - 🗑️ **Excluir**: Remove o ponto do banco de dados após confirmação.
- No popup há também o botão rápido **📋 /vamp** para copiar o comando de teleporte/inspeção direto para o chat do jogo.

---

## ⚔️ 8. Central Tática (HUD Militar Direito)

A barra lateral direita reúne a inteligência de combate:
- **Radar de Influência Territorial**: Gráfico dinâmico proporcional à posse dos beacons ativos na ilha (Freedom vs Jackal vs Neutro).
- **Primeiro Marco Comunitário**: Monitora a meta de controle (20% Freedom) necessária para liberação de Idols e Plinths de Jackal.
- **Ações Rápidas de Campo**:
  - Selecione um beacon no mapa para habilitar os botões táticos:
    - 💥 **Limpei!** (marca como Neutro).
    - 🏳️ **Converti** (reivindica para Freedom).
    - ⬆️ **Reforcei (+1)** (adiciona camada de fortificação, até 2x).
    - 🚨 **Sob Ataque!** (emite alerta geral de incursão inimiga).
- **Linha do Tempo de Guerra**: Feed de eventos em tempo real transmitindo as ocorrências na ilha.

---

## 🛡️ 9. Painel Administrativo de Oficiais (`admin.html`)

Acessível para usuários com cargo `officer` ou `admin`:
1. **Fila de Moderação Militar**:
   - Pontos e relatos de membros recrutas entram como pendentes.
   - Oficiais podem aprovar com 1 clique (publicando para toda a guilda) ou rejeitar.
2. **Quadro de Membros da Guilda**:
   - Lista todos os usuários autenticados via Discord.
   - Permite alterar cargos: Promover a Oficial, rebaixar ou banir usuários indevidos.
3. **Status de Sincronia**: Monitora o canal WebSocket ao vivo e o status de resposta do banco de dados.

---

## ⌨️ 10. Atalhos de Teclado & Dicas Pro

| Tecla / Atalho | Ação |
| :--- | :--- |
| **`ESC`** | Fecha modais abertos, fecha o menu de contexto, cancela o traçado de rotas e o modo de adição de ponto. |
| **Botão Direito** | Abre o menu de contexto com `/vamp`, adição de ponto e centralização. |
| **`Ctrl + F5`** | Força a atualização do navegador e limpa o cache dos tiles e do script. |
| **`LocalStorage`** | Suas preferências de camadas ligadas/desligadas são salvas automaticamente no seu navegador. |

---

*Jackal Atlas — Tecnologia cartográfica forjada para A Guilda.*
