# Correção e Calibração de Precisão do Módulo de Tape Dropouts

Restauração precisa, audível e transparente de quedas de sinal (*dropouts*) causadas por perda de espaçamento de fita (*Wallace spacing loss*), descamação de óxido (*oxide flake*) e danos de borda em fitas de rolo e cassete.

## Resumo e Diagnóstico da Falha

> [!IMPORTANT]
> **Causa do "parecendo não ter atuado":**
> 1. **Ganho de recomposição excessivamente travado (+3.5 dB max):** Quando ocorria um dropout típico de fita de -12 dB a -16 dB, o algoritmo limitava a compensação a meros +3.5 dB (fator 1.45x), deixando um buraco de -8 dB a -12 dB praticamente intocado.
> 2. **Thresholds de detecção hiper-restritivos:** A checagem exigia simultaneamente três condições extremas (`dipDbL > threshold`, `lrRatioDb > 5.0 dB` e `dipHfDbL > 1.25x`), descartando quedas parciais de canal e trechos abaixo de -46 dBFS.
> 3. **Fórmula do Método 2 (spline Hermite):** O termo de derivada multiplicava por `gapLen`, gerando instabilidade em vazios de áudio.

---

## Decisões Críticas de Restauração

- **Modo Padrão Inteligente:** Manter o modo de reconstrução independente estereofônica (`stereo_independent`) para preservar a imagem estéreo de gravações normais sem misturar canais, e o modo cruzado (`ampex_fulltrack_cross`) estritamente quando for fita mono de pista cheia confirmada.
- **Restauração de Ganho Proporcional à Profundidade Real:** Em vez de travar em +3.5 dB, o ganho de envelope acompanhará a atenuação real medida do defeito (suportando até +16 dB de compensação suave) com taper Hann nas bordas e limitador analógico transparente (*tanh soft tape saturation*).
- **Restauração de Agudos Wallace (HF Tilt Recovery):** Pela física de fitas magnéticas ($54.6 \cdot d / \lambda$), os agudos caem mais que os graves. Aplicar compensação de altas frequências durante o intervalo do dropout para devolver a presença e ar do instrumento.

---

## 1. Visão Geral da Arquitetura

```
┌────────────────────────────────────────────────────────┐
│             ANÁLISE DE DROPOUTS DA FITA               │
│  - Envelope Hilbert Multi-Escala (3ms a 45ms)          │
│  - Rastreamento Wallace HF (> 3.5 kHz) vs Graves       │
│  - Detecção de Canal L, Canal R ou Bilateral           │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│            MÁQUINA DE RECONSTRUÇÃO DSP                 │
│  1. Snapping em Zero-Crossing (elimina estalos DC)     │
│  2. Curva Hann de Ganho Proporcional (até +16 dB)      │
│  3. Reconstituição HF Wallace Spacing Loss             │
│  4. Interpolação Segura para Flocos de Óxido (Vazios) │
│  5. Proteção de Tanh Soft Saturation (zero clipping)   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│          MONITORAMENTO & DELTA SOLO AUDITION           │
│  - Telemetria de Dropouts Reparados (ms e dB de ganho) │
│  - Modo Solo Delta: ouve exatamente o que foi reparado │
└────────────────────────────────────────────────────────┘
```

---

## 2. Mudanças Planejadas no Código

### A. Calibração da Detecção (`analyzeTapeDropouts` em `tapeDropoutEngine.ts`)
- Ajustar o piso mínimo de áudio para -60 dBFS (em vez de -46 dBFS), permitindo detectar falhas em passagens suaves, introduções e dedilhados acústicos.
- Rebalancear a sensibilidade da detecção de assimetria estereofônica e colapso de altas frequências para capturar dropouts clássicos de 6 dB a 24 dB com precisão.

### B. Algoritmo de Reconstrução Transparente (`repairSingleChannelDropout`)
- **Método 1 (Espaçamento / Afinamento de Óxido - 95%+ dos casos):**
  - Calcular o envelope saudável antes e depois do defeito.
  - Aplicar ganho adaptativo que compensa a profundidade real do dropout até +16 dB (fator 6.3x) de forma gradual.
  - Janelamento Hann estendido de transição (3ms a 5ms) garantindo continuidade $C^1$ absoluta e zero descontinuidade de fase.
  - Equalização dinâmica de agudos para reverter a perda de Wallace.
- **Método 2 (Descamação / Floco com perda total):**
  - Corrigir a interpolação cúbica com continuidade de valor e derivada amortecida, evitando qualquer sobrelevação (*overshoot*) numérica.

### C. Sincronização e Telemetria no Console
- Exibir claramente no console de Dropouts a quantidade exata de falhas detectadas e restauradas com profundidade (ex: `12 dropouts corrigidos (+8.5 dB a +14.2 dB)`).
- Garantir que o botão *Restaurar Dropouts* aplique a reconstrução imediatamente ao player e re-renderize o buffer de masterização.

---

## 3. Verificação e Testes
- Compilar com `compile_applet` e validar com `lint_applet`.
- Verificar o comportamento do áudio ao ativar o dropout em arquivos com falhas de canal para confirmar atuação audível, suave e sem nenhum ruído espúrio.
