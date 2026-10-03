# 🚀 RECEITA 05: CHECKLIST DE TRANSIÇÃO PARA O MAPA OFICIAL FINAL

> **Objetivo:** Procedimento passo a passo para o dia do lançamento do servidor Jackal, quando o mapa oficial definitivo for divulgado. Permite atualizar 100% da cartografia do site em menos de 2 minutos.

---

## 📅 O Cenário do Dia do Lançamento

Sabemos que o mapa atualmente em uso é uma versão de testes / referência para calibração.  
No dia do lançamento oficial, um novo mapa será divulgado.  
Graças à infraestrutura que construímos, **nenhuma linha de código precisa ser reescrita**.

Siga o checklist de 4 passos abaixo:

---

## ✅ Passo 1: Salvar os Novos Arquivos Brutos

Copie os novos arquivos do servidor oficial para a pasta:  
`Jackal-Atlas/maps/raw/`

Substitua os arquivos mantendo os nomes padrão:
1. `jackal_original_terrain_4096.png`
2. `jackal_original_topo_4096.png`
3. `jackal_original_iso_4096.png`

*(Se vierem em tiles web, rode a [Receita 01](file:///c:/Users/Metalgear/Documents/antigravity/fervent-lovelace/Jackal-Atlas/maps/recipes/RECEITA_01_EXTRACAO_E_STITCHING.md) para montar os 4096px automaticamente).*

---

## ✅ Passo 2: Verificação Rápida de Paleta (10 segundos)

Execute o analisador de paleta para confirmar se as cores de Jackal permaneceram as mesmas ou se surgiram novos tipos de terreno:

```bash
python Jackal-Atlas/maps/tools/analyze_jackal_palette.py \
  -i Jackal-Atlas/maps/raw/jackal_original_terrain_4096.png \
  -o Jackal-Atlas/maps/palettes/palette_jackal_raw.json
```

Se o servidor introduziu alguma cor exótica, basta adicioná-la em `Jackal-Atlas/maps/palettes/palette_jackal_swisstopo.json`. Na imensa maioria dos casos, as cores são as mesmas e o passo 3 já pode ser executado diretamente.

---

## ✅ Passo 3: Executar o Pipeline Mestre com Fatiamento (30 segundos)

Rode o gerador mestre com fatiamento direto:

```bash
python Jackal-Atlas/maps/tools/build_jackal_map.py \
  -i Jackal-Atlas/maps/raw/jackal_original_terrain_4096.png \
  -t Jackal-Atlas/maps/raw/jackal_original_topo_4096.png \
  -s Jackal-Atlas/maps/raw/jackal_original_iso_4096.png \
  -p Jackal-Atlas/maps/palettes/palette_jackal_swisstopo.json \
  -o Jackal-Atlas/maps/processed/jackal_swisstopo_4096.png \
  -r 45 \
  --tiles-dir Jackal-Atlas/tiles_custom
```

---

## ✅ Passo 4: Atualizar o Navegador e Pronto!

1. Abra o site ou atualize a página no navegador com `Ctrl + F5` para limpar o cache dos tiles antigos.
2. O novo mapa oficial estará no ar, com:
   - Cores nobres estilo Swisstopo.
   - Destaque nítido entre áreas corrompidas e clareiras de Beacons onde deeds podem ser construídas.
   - Relevo sombreado 3D.
   - Curvas de nível de 1px desenhadas à perfeição.
   - Todas as coordenadas dos marcadores de minas, pontes e deeds 100% alinhadas.
