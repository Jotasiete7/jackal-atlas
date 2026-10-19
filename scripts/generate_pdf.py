import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#718096"))
        page_text = f"Página {self._pageNumber} de {page_count}"
        self.drawRightString(612 - 54, 36, page_text)
        self.drawString(54, 36, "DeedPlanner & Wurm Online — Manual de Engenharia e Prompt-Mestre para IA")
        self.setStrokeColor(colors.HexColor("#CBD5E0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 612 - 54, 48)
        self.restoreState()

def generate_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    primary_color = colors.HexColor("#1A365D")   # Deep navy
    secondary_color = colors.HexColor("#2B6CB0") # Medium blue
    accent_color = colors.HexColor("#C53030")    # Deep red
    text_color = colors.HexColor("#2D3748")      # Dark charcoal
    bg_light = colors.HexColor("#F7FAFC")
    code_bg = colors.HexColor("#EDF2F7")
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=secondary_color,
        spaceAfter=15
    )
    
    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=primary_color,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )
    
    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=secondary_color,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )
    
    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=text_color,
        spaceAfter=6
    )
    
    bullet_style = ParagraphStyle(
        'Bullet',
        parent=body_style,
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=4
    )
    
    code_style = ParagraphStyle(
        'CodeSnippet',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10.5,
        textColor=colors.HexColor("#1A202C")
    )
    
    callout_style = ParagraphStyle(
        'Callout',
        parent=body_style,
        fontName='Helvetica-Oblique',
        fontSize=9.5,
        leading=13.5,
        textColor=colors.HexColor("#2C5282")
    )

    table_header = ParagraphStyle(
        'TH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )
    
    table_cell = ParagraphStyle(
        'TC',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=text_color
    )

    table_cell_code = ParagraphStyle(
        'TCC',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=8,
        leading=10,
        textColor=primary_color
    )

    story = []
    
    # --- HEADER / CAPA ---
    story.append(Paragraph("MANUAL DE ENGENHARIA DEEDPLANNER & WURM ONLINE", title_style))
    story.append(Paragraph("Guia Técnico, Especificação de XML (.MAP), Boas Práticas e Prompt-Mestre para IAs (Claude Code, ChatGPT, Gemini)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=primary_color, spaceAfter=14))
    
    # --- INTRODUÇÃO ---
    story.append(Paragraph("1. Visão Geral e Arquitetura", h1_style))
    story.append(Paragraph(
        "Este manual documenta o funcionamento interno do <b>DeedPlanner 3D</b> (ferramenta de projeto de assentamentos e construções para o jogo <i>Wurm Online / Wurm Unlimited</i>) e estabelece as regras e o prompt necessários para que qualquer Modelo de Linguagem de Larga Escala (LLM) — como Claude Code, GPT-4 ou Gemini — possa conceber, dimensionar e exportar projetos arquitetônicos complexos diretamente para arquivos nativos <b>.MAP</b>.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Diferença Crucial de Abordagem:</b> Uma IA não precisa (e não deve) controlar a interface gráfica via cliques de mouse. A abordagem ideal é a <b>geração procedural e direta do arquivo XML (.map)</b>, que é imediatamente carregado no DeedPlanner com precisão milimétrica.",
        body_style
    ))
    
    # --- REGRAS DO WURM ONLINE ---
    story.append(Paragraph("2. Mecânica de Escala e Construção do Wurm Online", h1_style))
    story.append(Paragraph("Para projetar algo construível e visualmente correto, a IA deve obedecer a 4 restrições fundamentais da mecânica do jogo:", body_style))
    
    story.append(Paragraph("• <b>Escala de 1 Tile = 1 Módulo de Parede:</b> Cada tile no jogo mede 4×4 metros. Na arquitetura do Wurm, cada aresta de 1 tile comporta exatamente <b>1 elemento estrutural</b> (1 parede cega, 1 janela ou 1 porta). Nunca projete fachadas com múltiplas janelas espremidas no mesmo tile.", bullet_style))
    story.append(Paragraph("• <b>Sem Curvas Verdadeiras:</b> O jogo opera numa malha ortogonal pura. Curvas históricas (como absides semicirculares ou cúpulas) devem ser reinterpretadas como <b>aproximações poligonais facetadas em degraus</b> (segmentos retos avançando/recuando em tiles).", bullet_style))
    story.append(Paragraph("• <b>Sustentação e Pé-Direito Duplo:</b> O jogo exige suporte de pisos para pavimentos superiores. Para criar a sensação de 'pé-direito duplo' ou atrium monumental, cria-se um andar mezanino onde os tiles centrais <i>não recebem piso</i> (&lt;floor&gt;), sendo delimitados apenas por parapeitos (&lt;msPar&gt; ou &lt;sPar&gt;) ao redor do vazio.", bullet_style))
    story.append(Paragraph("• <b>Hierarquia Vertical de Materiais:</b> Edifícios clássicos exigem base mais pesada/clara (ex: Mármore Branco nos pisos inferiores) e transição para cantaria nobre (Pedra cinza / Ardósia) nos andares superiores.", bullet_style))

    # --- ESPECIFICAÇÃO DO XML ---
    story.append(Spacer(1, 8))
    story.append(Paragraph("3. Especificação do Arquivo .MAP (Estrutura XML)", h1_style))
    story.append(Paragraph(
        "Os arquivos do DeedPlanner são gravados na pasta <code>DeedPlanner_Data/</code> com codificação UTF-8 limpa. A estrutura básica do arquivo é:",
        body_style
    ))
    
    xml_code = (
        "&lt;map width=\"42\" height=\"32\" exporter=\"DeedPlanner 3.4.3 EA\" name=\"Nome_Do_Projeto\"&gt;<br/>"
        "&nbsp;&nbsp;&lt;tile x=\"0\" y=\"0\" height=\"100\" caveHeight=\"0\" caveSize=\"0\"&gt;<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&lt;ground id=\"gr\" /&gt;<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&lt;level value=\"0\"&gt;<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;floor id=\"mFloor\" orientation=\"DOWN\" /&gt;<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;hWall id=\"mbWall\" reversed=\"false\" /&gt;<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;vWall id=\"mbWall\" reversed=\"false\" /&gt;<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;roof id=\"sRoof\" /&gt;<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&lt;object x=\"2.0\" y=\"2.0\" id=\"mBrazier\" rotation=\"0.0\" /&gt;<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;&lt;/level&gt;<br/>"
        "&nbsp;&nbsp;&lt;/tile&gt;<br/>"
        "&lt;/map&gt;"
    )
    
    t_box = Table([[Paragraph(xml_code, code_style)]], colWidths=[504])
    t_box.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), code_bg),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E0")),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_box)
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>Convenção Crítica dos Eixos de Paredes (hWall vs vWall):</b>", h2_style))
    story.append(Paragraph("• <b>&lt;hWall&gt; (Parede Horizontal):</b> Fica situada na <b>borda NORTE</b> do tile <code>(x, y)</code>, separando a célula <code>y</code> da célula <code>y - 1</code>.", bullet_style))
    story.append(Paragraph("• <b>&lt;vWall&gt; (Parede Vertical):</b> Fica situada na <b>borda OESTE</b> do tile <code>(x, y)</code>, separando a célula <code>x</code> da célula <code>x - 1</code>.", bullet_style))
    story.append(Paragraph("• <b>Fórmula para Fechar um Cômodo Retangular [x1..x2] × [y1..y2]:</b>", bullet_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;- Parede Norte: <code>&lt;hWall&gt;</code> no tile <code>(x, y1)</code> para todo <code>x ∈ [x1..x2]</code>", body_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;- Parede Sul: <code>&lt;hWall&gt;</code> no tile <code>(x, y2 + 1)</code> para todo <code>x ∈ [x1..x2]</code>", body_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;- Parede Oeste: <code>&lt;vWall&gt;</code> no tile <code>(x1, y)</code> para todo <code>y ∈ [y1..y2]</code>", body_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;- Parede Leste: <code>&lt;vWall&gt;</code> no tile <code>(x2 + 1, y)</code> para todo <code>y ∈ [y1..y2]</code>", body_style))

    # --- CATÁLOGO DE MATERIAIS ---
    story.append(PageBreak())
    story.append(Paragraph("4. Catálogo de IDs de Materiais do DeedPlanner", h1_style))
    story.append(Paragraph("Tabela de consulta com as principais peças registradas no motor do DeedPlanner:", body_style))

    mat_data = [
        [Paragraph("Categoria", table_header), Paragraph("ID no XML", table_header), Paragraph("Nome da Peça", table_header), Paragraph("Aplicação Recomendada", table_header)],
        [Paragraph("Pisos", table_cell), Paragraph("mFloor", table_cell_code), Paragraph("Marble slab floor", table_cell), Paragraph("Térreo, pórticos e salões nobres", table_cell)],
        [Paragraph("Pisos", table_cell), Paragraph("sbFloor", table_cell_code), Paragraph("Stone brick floor", table_cell), Paragraph("Pavimentos superiores e terraços", table_cell)],
        [Paragraph("Pisos", table_cell), Paragraph("wFloor", table_cell_code), Paragraph("Wooden plank floor", table_cell), Paragraph("Interiores de bibliotecas e salas de estudo", table_cell)],
        [Paragraph("Escadas", table_cell), Paragraph("spbStair", table_cell_code), Paragraph("Spiral staircase c/ corrimão", table_cell), Paragraph("Acesso vertical compacto dentro das torres", table_cell)],
        [Paragraph("Escadas", table_cell), Paragraph("wsStair", table_cell_code), Paragraph("Wide staircase", table_cell), Paragraph("Escadarias monumentais de honra", table_cell)],
        [Paragraph("Mármore", table_cell), Paragraph("mbWall", table_cell_code), Paragraph("Marble wall", table_cell), Paragraph("Cantos maciços e pilares estruturais", table_cell)],
        [Paragraph("Mármore", table_cell), Paragraph("mbWindow", table_cell_code), Paragraph("Marble window", table_cell), Paragraph("Janelas clássicas do pavimento térreo", table_cell)],
        [Paragraph("Mármore", table_cell), Paragraph("mbnWindow", table_cell_code), Paragraph("Marble narrow window", table_cell), Paragraph("Janelas estreitas/fendas elegantes", table_cell)],
        [Paragraph("Mármore", table_cell), Paragraph("mbdDoor", table_cell_code), Paragraph("Marble double door", table_cell), Paragraph("Portal monumental de entrada principal", table_cell)],
        [Paragraph("Mármore", table_cell), Paragraph("mbArch", table_cell_code), Paragraph("Marble arched wall", table_cell), Paragraph("Arcos centrais plenos e corredores", table_cell)],
        [Paragraph("Mármore", table_cell), Paragraph("mblArch / mbrArch", table_cell_code), Paragraph("Left / Right arched wall", table_cell), Paragraph("Arcos pareados para colunatas de entrada", table_cell)],
        [Paragraph("Mármore", table_cell), Paragraph("mbOriel", table_cell_code), Paragraph("Marble oriel", table_cell), Paragraph("Sacada saliente 3D (quebra a parede plana)", table_cell)],
        [Paragraph("Mármore", table_cell), Paragraph("msPar", table_cell_code), Paragraph("Marble parapet", table_cell), Paragraph("Balaustrada de mezaninos e platibandas", table_cell)],
        [Paragraph("Pedra", table_cell), Paragraph("sWall", table_cell_code), Paragraph("Stone wall", table_cell), Paragraph("Paredes dos andares superiores", table_cell)],
        [Paragraph("Pedra", table_cell), Paragraph("sWindow", table_cell_code), Paragraph("Stone window", table_cell), Paragraph("Janelas nobres dos andares superiores", table_cell)],
        [Paragraph("Pedra", table_cell), Paragraph("psnWindow", table_cell_code), Paragraph("Plain stone narrow window", table_cell), Paragraph("Janelas estreitas do ático/torres", table_cell)],
        [Paragraph("Pedra", table_cell), Paragraph("sArch", table_cell_code), Paragraph("Stone arched wall", table_cell), Paragraph("Galerias / Loggias do último pavimento", table_cell)],
        [Paragraph("Pedra", table_cell), Paragraph("sOriel", table_cell_code), Paragraph("Stone oriel", table_cell), Paragraph("Sacadas de pedra nos eixos centrais", table_cell)],
        [Paragraph("Pedra", table_cell), Paragraph("sPar", table_cell_code), Paragraph("Stone parapet", table_cell), Paragraph("Platibandas de coroamento e terraços", table_cell)],
        [Paragraph("Telhados", table_cell), Paragraph("sRoof", table_cell_code), Paragraph("Slate shingle roof", table_cell), Paragraph("Telhas escuras de ardósia (estilo clássico)", table_cell)],
        [Paragraph("Telhados", table_cell), Paragraph("wRoof", table_cell_code), Paragraph("Wood shingle roof", table_cell), Paragraph("Telhas de madeira rústica", table_cell)],
        [Paragraph("Mobiliário", table_cell), Paragraph("hBook / lBook", table_cell_code), Paragraph("High / Low bookshelf", table_cell), Paragraph("Estantes de livros altas e baixas", table_cell)],
        [Paragraph("Mobiliário", table_cell), Paragraph("recMTable", table_cell_code), Paragraph("Rectangular marble table", table_cell), Paragraph("Mesas de leitura e banquetes", table_cell)],
        [Paragraph("Mobiliário", table_cell), Paragraph("vynarch", table_cell_code), Paragraph("Statue of Vynora", table_cell), Paragraph("Estátua da deusa da sabedoria do Wurm", table_cell)],
        [Paragraph("Mobiliário", table_cell), Paragraph("lionarch", table_cell_code), Paragraph("Statue of lion", table_cell), Paragraph("Leões guardiões na esplanada de entrada", table_cell)],
        [Paragraph("Mobiliário", table_cell), Paragraph("mBrazier", table_cell_code), Paragraph("Marble brazier pillar", table_cell), Paragraph("Pilares de fogo e iluminação monumental", table_cell)],
    ]
    
    t_mat = Table(mat_data, colWidths=[65, 85, 145, 209])
    t_mat.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E0")),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, bg_light]),
    ]))
    story.append(t_mat)

    # --- REGRAS DE OURO DOS CONSTRUTORES VETERANOS ---
    story.append(Spacer(1, 10))
    story.append(Paragraph("5. As 4 Regras de Ouro dos Construtores Veteranos", h1_style))

    story.append(Paragraph("<b>Regra 1: Evitar Janelas Adjacentes (Ritmo Neoclássico Real)</b>", h2_style))
    story.append(Paragraph(
        "No Wurm, colocar janelas coladas em tiles consecutivos gera um aspecto artificial de estufa. A cantaria clássica exige pilastras de suporte. Numa ala de 5 tiles, o padrão deve ser rigorosamente: <code>[Parede, Janela, Parede, Janela, Parede]</code>. Em torres de 3 tiles: <code>[Parede, Janela/Sacada, Parede]</code>. Os cantos das quinas devem ser sempre maciços.",
        body_style
    ))

    story.append(Paragraph("<b>Regra 2: A Solução Definitiva para a 'Oca' (Telhado Piramidal Indesejado)</b>", h2_style))
    story.append(Paragraph(
        "Quando um quadrado fechado (3×3 ou 5×5) é preenchido com <code>&lt;roof&gt;</code>, o algoritmo do DeedPlanner sobe inclinações de todos os lados e converge numa ponta aguda central alta (a 'oca'). Para resolver isso:<br/>"
        "• <b>Em volumes 3×3 (Torres):</b> Coloque telhado apenas nas 8 células do perímetro e defina o <b>tile central como piso plano (&lt;floor&gt;)</b> com balaustrada (&lt;sPar&gt;). O algoritmo trunca a ponta e gera uma mansarda palaciana perfeita.<br/>"
        "• <b>Em alas largas (5×5):</b> Utilize <b>Platibandas (&lt;sPar&gt;)</b> no perímetro com terraço plano, colocando no miolo apenas uma cumeeira longitudinal de 2 águas (1 linha de telhado) para quebrar a dureza sem formar pirâmide.",
        body_style
    ))

    story.append(Paragraph("<b>Regra 3: Entrada Monumental em Colunata de Arcos Triplos</b>", h2_style))
    story.append(Paragraph(
        "Em pórticos de 3 tiles de largura, utilize na fachada frontal a combinação <code>[mblArch, mbArch, mbrArch]</code> (arco esquerdo, arco pleno e arco direito). Recue a porta dupla monumental (<code>mbdDoor</code>) 1 tile para o interior. Isso cria um nártex com sombra e profundidade tridimensional.",
        body_style
    ))

    story.append(Paragraph("<b>Regra 4: Hierarquia Vertical de Fachada</b>", h2_style))
    story.append(Paragraph(
        "Distribua as aberturas respeitando o cânone clássico:<br/>"
        "• <i>Térreo (Piano Rustico):</i> Mármore branco, arcos na entrada e janelas com moldura maciça.<br/>"
        "• <i>1º Andar (Mezanino):</i> Janelas estreitas de cantaria fina (<code>mbnWindow</code>).<br/>"
        "• <i>2º Andar (Piano Nobile):</i> Janelas nobres de pedra (<code>sWindow</code>) e sacadas salientes (<code>sOriel</code>).<br/>"
        "• <i>3º Andar (Ático / Loggia):</i> Galeria contínua de arcos clássicos (<code>sArch</code>) coroada por platibanda.",
        body_style
    ))

    # --- PROMPT-MESTRE PARA LLMs ---
    story.append(PageBreak())
    story.append(Paragraph("6. Prompt-Mestre para Inserção Direta em LLMs", h1_style))
    story.append(Paragraph(
        "Copie e cole o texto delimitado abaixo no <b>Claude Code</b>, <b>ChatGPT</b> ou <b>Gemini</b> sempre que quiser solicitar a criação de um novo edifício para Wurm Online:",
        body_style
    ))

    prompt_content = (
        "Você é um Arquiteto Especialista em Wurm Online e no software DeedPlanner (v3.x).<br/>"
        "Sua função é gerar arquivos de mapa nativos (.map em formato XML) prontos para abrir em 3D.<br/><br/>"
        "REGRAS DE CONSTRUÇÃO OBRIGATÓRIAS:<br/>"
        "1. ESCALA: 1 tile do Wurm = 1 elemento de parede/janela/porta. Não comprima múltiplas aberturas no mesmo tile.<br/>"
        "2. EIXOS XML: &lt;hWall&gt; é a parede NORTE do tile (x, y). &lt;vWall&gt; é a parede OESTE do tile (x, y). Para fechar um cômodo [x1..x2] × [y1..y2], a parede Sul fica em (x, y2+1) e a Leste em (x2+1, y).<br/>"
        "3. RITMO DE JANELAS: NUNCA coloque janelas em tiles adjacentes. Alterne sempre [Parede, Janela, Parede, Janela, Parede]. Cantos estruturais devem ser sempre paredes sólidas.<br/>"
        "4. TELHADOS SEM 'OCA': Nunca preencha blocos 3x3 ou 5x5 inteiros com &lt;roof&gt;. Em 3x3, deixe o tile central como &lt;floor&gt; com &lt;sPar&gt; para criar mansarda truncada. Em alas largas, use Platibandas (&lt;sPar&gt;/&lt;msPar&gt;) com terraço e pequenas cumeeiras centrais.<br/>"
        "5. ENTRADA TRIPLA: Em pórticos de 3 tiles, use [mblArch, mbArch, mbrArch] na fachada e recue a porta dupla (mbdDoor) 1 tile para trás.<br/>"
        "6. MATERIAIS: Térreo em mármore (mFloor, mbWall, mbWindow, mbdDoor, mbArch). Andares superiores em pedra (sbFloor, sWall, sWindow, sArch, sOriel, sPar). Cobertura em ardósia (sRoof).<br/>"
        "7. SAÍDA EXIGIDA: Escreva um script em Python que cria o XML com todas as coordenadas, níveis (level 0 a 5) e salve o arquivo com extensão .map na pasta DeedPlanner_Data/."
    )

    t_prompt = Table([[Paragraph(prompt_content, code_style)]], colWidths=[504])
    t_prompt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FFF4")),
        ('BOX', (0,0), (-1,-1), 1.5, colors.HexColor("#38A169")),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
    ]))
    story.append(t_prompt)

    # --- SCRIPT PYTHON TEMPLATE ---
    story.append(Spacer(1, 10))
    story.append(Paragraph("7. Template Python para Automação de Projetos", h1_style))
    story.append(Paragraph(
        "Abaixo está o esqueleto de código em Python para a IA gerar qualquer construção no padrão correto:",
        body_style
    ))

    py_template = (
        "import xml.etree.ElementTree as ET<br/>"
        "from xml.dom import minidom<br/><br/>"
        "def build_deed_map(filename, width=42, height=32, name='Projeto'):<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;root = ET.Element('map', {'width': str(width), 'height': str(height), 'exporter': 'DeedPlanner 3.4.3 EA', 'name': name})<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;# Inicializa grid, aplica pisos, paredes (hWall/vWall), telhados (roof) e objetos...<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;xml_str = ET.tostring(root, encoding='utf-8')<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;clean = '\\n'.join([l for l in minidom.parseString(xml_str).toprettyxml(indent='&nbsp;&nbsp;').split('\\n') if l.strip() and not l.startswith('&lt;?xml')])<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;with open(filename, 'w', encoding='utf-8') as f: f.write(clean)<br/>"
        "&nbsp;&nbsp;&nbsp;&nbsp;print(f'Mapa salvo em {filename}')"
    )

    t_py = Table([[Paragraph(py_template, code_style)]], colWidths=[504])
    t_py.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), code_bg),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E0")),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_py)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF generated successfully at {filename}")

if __name__ == '__main__':
    target_pdf = r"D:\Downloads D\Guia_DeedPlanner_Wurm_Online.pdf"
    generate_pdf(target_pdf)
