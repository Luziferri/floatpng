<p align="center">
  <img src="build/icon.png" width="120" alt="Ícone do FloatPNG">
</p>

<h1 align="center">FloatPNG</h1>

<p align="center">
  Põe qualquer PNG a flutuar por cima de todas as janelas e arrasta-o para onde quiseres.<br>
  Funciona em <b>Mac</b> e <b>Windows</b>.
</p>

---

## ⬇️ Descarregar

| Computador | Ficheiro |
|---|---|
| 🍎 Mac com chip Apple (M1, M2, M3, M4) | [**FloatPNG-mac-arm64.dmg**](https://github.com/Luziferri/floatpng/releases/latest/download/FloatPNG-mac-arm64.dmg) |
| 🍎 Mac com Intel | [**FloatPNG-mac-x64.dmg**](https://github.com/Luziferri/floatpng/releases/latest/download/FloatPNG-mac-x64.dmg) |
| 🪟 Windows (instalar) | [**FloatPNG-Setup-windows.exe**](https://github.com/Luziferri/floatpng/releases/latest/download/FloatPNG-Setup-windows.exe) |
| 🪟 Windows (sem instalar) | [**FloatPNG-windows-portable.exe**](https://github.com/Luziferri/floatpng/releases/latest/download/FloatPNG-windows-portable.exe) |

> **Não sabes que Mac tens?** Clica no  (canto superior esquerdo) → **Acerca deste Mac**. Se em "Chip" aparecer **Apple M…**, escolhe o primeiro. Se aparecer **Intel**, escolhe o segundo.

---

## 🍎 Instalar no Mac

1. **Descarrega** o ficheiro `.dmg` da tabela acima.
2. **Abre** o ficheiro descarregado (faz duplo clique nele, na pasta Transferências).
3. Na janela que aparece, **arrasta o ícone do FloatPNG para a pasta Aplicações**.
4. Abre a pasta **Aplicações** e faz **duplo clique** no FloatPNG.

### Aparece um aviso a dizer que a app não pode ser aberta?

É normal: a app não está registada na Apple (custa dinheiro). Para a abrires na mesma:

1. Carrega em **OK** / **Concluído** no aviso.
2. Abre **Definições do Sistema** → **Privacidade e Segurança**.
3. Desce até ao fim e carrega em **Abrir na mesma** ao lado de "FloatPNG".
4. Confirma com a tua palavra-passe e carrega em **Abrir**.

Só tens de fazer isto uma vez.

### Atualizar para uma versão nova

Descarrega o `.dmg` novo e arrasta o FloatPNG para Aplicações outra vez (escolhe **Substituir**). Os teus bonecos e as posições ficam guardados.

### Diz que a app "está danificada"?

Abre o **Terminal** (procura "Terminal" no Spotlight, com ⌘ + Espaço), cola esta linha e carrega em Enter:

```bash
xattr -cr /Applications/FloatPNG.app
```

Depois abre o FloatPNG outra vez.

---

## 🪟 Instalar no Windows

### Opção A: instalar (recomendado)

1. **Descarrega** o `FloatPNG-Setup-windows.exe`.
2. **Abre** o ficheiro descarregado.
3. Se aparecer um ecrã azul a dizer *"O Windows protegeu o seu PC"*:
   - carrega em **Mais informações**;
   - depois em **Executar mesmo assim**.
4. Segue o instalador (**Seguinte** → **Instalar** → **Concluir**).
5. O FloatPNG fica no **Menu Iniciar** e no ambiente de trabalho.

### Opção B: sem instalar

1. **Descarrega** o `FloatPNG-windows-portable.exe`.
2. Põe-no onde quiseres (por exemplo, no ambiente de trabalho) e faz **duplo clique**.
3. Se aparecer o ecrã azul, faz o mesmo da opção A: **Mais informações** → **Executar mesmo assim**.

---

## 🎮 Como usar

1. Abre o FloatPNG. Aparece um pequeno painel.
2. Carrega em **Adicionar PNG** e escolhe uma imagem. Também podes **arrastar** a imagem para o painel.
3. A imagem aparece a flutuar no ecrã. **Arrasta-a** para onde quiseres.

| Ação | O que faz |
|---|---|
| Arrastar o boneco | Muda o boneco de sítio |
| Clique rápido | O boneco dá um salto |
| Roda do rato por cima | Aumenta ou diminui o tamanho aos saltos (de 10% a 800%) |
| Botão direito → **Redimensionar…** (ou o botão no painel) | Aparecem pegas nos cantos, como no Word. Arrasta uma pega para o tamanho exato que quiseres. Clica fora, carrega em Enter ou Esc para terminar |
| Botão direito no boneco | Mais opções: redimensionar, tamanho, brilho, opacidade, espelhar, fixar, duplicar, esconder, remover |

**Dicas**

- Usa PNGs com **fundo transparente** para o boneco ficar recortado. As partes transparentes deixam passar os cliques para o que está por baixo.
- Os bonecos ficam no mesmo sítio quando fechas e voltas a abrir a app.
- Fechar o painel **não fecha** a app. Ela continua num pequeno ícone:
  - **Mac:** na barra de menus, em cima à direita;
  - **Windows:** junto ao relógio (pode estar escondido na setinha **^**).
- Para fechar de vez, clica nesse ícone → **Sair do FloatPNG**.
- Liga **Abrir ao iniciar sessão** no painel para os bonecos aparecerem sempre que ligas o computador.

---

## 🛠️ Para programadores

<details>
<summary>Correr o código e gerar os instaladores</summary>

Precisas do [Node.js](https://nodejs.org) instalado. Corre os comandos **dentro da pasta do projeto** (onde está o `package.json`):

```bash
git clone https://github.com/Luziferri/floatpng.git
cd floatpng
npm install
npm start
```

Gerar os instaladores (ficam na pasta `dist/`):

```bash
npm run dist:mac   # .dmg para Apple Silicon e Intel
npm run dist:win   # instalador .exe e versão portátil
```

</details>
