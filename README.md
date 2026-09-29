# Masterização

Aplicação web para análise, restauração e masterização de áudio diretamente no navegador. O projeto oferece ferramentas de análise forense, ajuste de azimute de fitas, controle de loudness, processamento em lote e exportação de resultados.

> O processamento ocorre localmente no navegador: os arquivos de áudio escolhidos pelo usuário não precisam ser enviados a um servidor.

## Recursos

- Carregamento de arquivos WAV, MP3, FLAC, M4A e formatos de vídeo compatíveis.
- Detecção de formato, taxa de amostragem e profundidade de bits.
- Análise de loudness com métricas baseadas em ITU-R BS.1770-4.
- Análise forense do áudio e visualizações, incluindo espectrograma, escopo de Lissajous e gráfico de artefatos.
- Correção de azimute e balanço entre canais para digitalizações de fita.
- Controles de masterização: redução de aspereza, calor de fita, harmônicos, graves, estéreo, transientes, teto e alvo de LUFS.
- Mixer de stems por faixas de frequência.
- Presets, comparação entre material original e processado, processamento em lote e arquivos de recall.
- Exportação do áudio processado.

## Tecnologias

- React 19 + TypeScript
- Vite
- Web Audio API
- Tailwind CSS
- Lucide React

## Executar localmente

### Pré-requisitos

- Node.js 22 ou superior
- npm 10 ou superior

### Instalação

```bash
git clone https://github.com/hrozenblit-cpu/Masteriza-o.git
cd Masteriza-o
npm install
npm run dev
```

Abra a URL exibida pelo Vite — normalmente `http://localhost:3000`.

## Build de produção

```bash
npm run build
```

Os arquivos estáticos serão gerados em `dist/`.

## Deploy no Cloudflare Pages

Use estas configurações:

| Campo | Valor |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | `22` |

Importante: não use o antigo `package-lock.json` que foi gerado pelo Bun e apenas renomeado. Apague-o antes do deploy. Depois, caso queira travar as versões das dependências, gere um lockfile válido com `npm install` e envie o novo `package-lock.json` ao repositório.

## Scripts disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o ambiente de desenvolvimento na porta 3000. |
| `npm run build` | Gera a versão de produção em `dist/`. |
| `npm run preview` | Visualiza localmente a build de produção. |
| `npm run lint` | Executa a checagem de tipos do TypeScript. |

## Estrutura principal

```text
src/
├── audio/        # Motor de áudio, analisadores, processamento e presets
├── components/   # Componentes da interface e painéis de análise
├── types/        # Tipos TypeScript
├── App.tsx       # Orquestra a experiência de masterização
└── main.tsx      # Ponto de entrada da aplicação
```

## Observação

O resultado do processamento pode variar conforme a qualidade, o formato e as características do arquivo de origem. Faça cópias do material original antes de qualquer fluxo de produção.

## Licença

Ainda não foi definida uma licença para este repositório.
