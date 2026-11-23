# FloatPNG

Deixa qualquer PNG (com fundo transparente) a flutuar por cima de todas as janelas, em Mac e Windows. Arrasta-o para onde quiseres; ele fica lá, mesmo depois de reiniciar.

## Usar

- **Adicionar PNG** no painel, ou arrasta ficheiros para o painel.
- **Arrastar** o boneco no ecrã para o mudar de sítio.
- **Clique rápido**: o boneco dá um salto.
- **Roda do rato** por cima do boneco: muda o tamanho.
- **Botão direito** no boneco: tamanho, brilho (lilás, branco, dourado, ciano, sombra), opacidade, flutuar, espelhar, pixel art nítido, fixar posição, duplicar, esconder, remover.
- As partes transparentes do PNG deixam passar os cliques para as janelas de baixo.
- Fechar o painel não fecha a app; ela fica no ícone da barra de menus (Mac) ou junto ao relógio (Windows). "Sair do FloatPNG" está aí.
- "Abrir ao iniciar sessão" no painel faz a app arrancar com o computador, já com os bonecos no sítio.

As imagens são copiadas para a pasta de dados da app, por isso podes apagar o original.

## Desenvolver

Corre os comandos dentro da pasta do projeto (onde está o `package.json`):

```bash
git clone https://github.com/Luziferri/floatpng.git
cd floatpng
npm install
npm start
```

## Gerar a app

```bash
npm run dist:mac   # dist/FloatPNG-1.0.0-arm64.dmg (Apple Silicon) e FloatPNG-1.0.0.dmg (Intel)
npm run dist:win   # dist/FloatPNG Setup 1.0.0.exe (instalador) e FloatPNG 1.0.0.exe (portátil)
```

As builds não estão assinadas. No Mac, na primeira vez: clique direito na app → Abrir. No Windows, o SmartScreen pode avisar: "Mais informações" → "Executar mesmo assim".
