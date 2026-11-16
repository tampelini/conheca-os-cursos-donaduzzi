# Conheça os Cursos Donaduzzi

Quiz para o totem touchscreen da Faculdade Donaduzzi (Android na vertical, referência 1080 × 1920) que mede **o quanto
os colaboradores conhecem os cursos e a instituição**: grau, duração, turno e coordenação dos cursos, CPA, missão,
visão, valores, metodologia e pós-graduação. Funciona **100% offline**, como **APK Android** ou como **PWA** no Chrome.

Feito a partir do [Desafio Tech Donaduzzi](https://github.com/tampelini/desafio-tech-donaduzzi) (mesma identidade
visual, painel administrativo, estatísticas e base técnica). É um app separado (`br.edu.donaduzzi.cursos`), que pode
ficar instalado no mesmo totem ao lado do Desafio Tech.

- React 18 + TypeScript + Vite + Tailwind CSS + Framer Motion + Lucide
- IndexedDB (perguntas, configurações, estatísticas anônimas)
- PWA com Service Worker (Workbox) e APK via Capacitor 8
- 60 perguntas ativas (10 por tema) + 5 pendentes de confirmação; partidas de 10 com distribuição 2/3/2/1/1/1

## Fluxo

1. **Início**: toque para começar.
2. **Como funciona**: regras em uma tela, com o aviso de que é anônimo.
3. **Perfil anônimo**: um toque em *Docente · Técnico-administrativo · Estudante · Visitante* (só a categoria é
   guardada; pode ser editado ou desligado no painel).
4. **Pesquisa rápida** (pode ser pulada ou desligada): "O quanto você conhece os cursos?" e "O quanto você conhece a CPA?".
5. **10 perguntas** sorteadas. Depois de cada resposta, o totem mostra a alternativa certa e uma explicação curta.
6. **Resultado**: pontos, acertos, tempo e a comparação entre o que a pessoa disse saber da CPA e o que acertou.
7. **Cursos**: os 10 cursos de graduação com grau, duração, turno e coordenação, e o QR Code da página oficial.

Sem toques, o totem volta sozinho à tela inicial (60 s durante a partida, 30 s na tela de cursos; configurável).

## Conteúdo e fontes

Todas as perguntas ativas foram conferidas em <https://faculdadedonaduzzi.com.br/> (páginas *Institucional*,
*Metodologia*, *Graduação*, *Pós-Graduação* e a página de cada curso), em novembro de 2026. Nada foi inventado:
vagas, carga horária total e portarias não aparecem no site e por isso não viraram pergunta.

| Tema (categoria) | ID | Assuntos |
|---|---|---|
| A Faculdade | `institucional` | localização, missão, visão, valores, fundadores, Educação 5.0, PDI, NAE |
| CPA e Avaliação | `cpa` | o que é a CPA, Lei nº 10.861/2004, SINAES, composição, eixos e dimensões, coordenação |
| Cursos de Tecnologia | `tecnologia` | ADS, Ciência de Dados, Engenharia de Software, Inteligência Artificial |
| Saúde e Biociências | `saude` | Farmácia, Psicologia, Engenharia de Bioprocessos e Biotecnologia |
| Gestão, Educação e Direito | `gestao` | Administração, Pedagogia, Direito |
| Metodologia e Pós-graduação | `metodologia` | "Aprender fazendo", professores-mentores, pós e MBAs |

### Perguntas pendentes (dados que o site não confirma)

Cinco perguntas já vêm escritas, mas **inativas** e marcadas como **"A confirmar"**, porque o site não informa o dado
ou se contradiz:

| ID | Pergunta | Situação no site |
|---|---|---|
| `pend-psi-coord` | Quem coordena Psicologia? | a página do curso não informa |
| `pend-dir-coord` | Quem coordena Direito? | a página do curso não informa |
| `pend-ped-coord` | Quem coordena Pedagogia? | a página mostra o coordenador de Ciência de Dados e IA (provável erro) |
| `pend-bio-coord` | Quem coordena Eng. de Bioprocessos? | mostra Joel Cordeiro Júnior na seção "Coordenação", sem dizer que é deste curso (já vem preenchida: só conferir) |
| `pend-far-turno` | Qual é o turno de Farmácia? | "matutino" em um trecho e "noturno" em outro |

Para liberar uma delas: *Painel → Perguntas → Ver pendentes → Editar*, troque o texto **PREENCHER** pelo dado correto
(alternativa A e explicação), marque *Pergunta ativa* e salve. Enquanto o texto "PREENCHER" existir, a pergunta não
pode ser ativada nem sorteada. Os mesmos dados faltam na descrição dos cursos (aba *Cursos*).

## Scripts

| Comando | O que faz |
|---|---|
| `npm install` | instala as dependências (uma vez) |
| `npm run dev` | servidor de desenvolvimento (`http://localhost:5173`) |
| `npm run build` | verificação de tipos + build de produção em `dist/` |
| `npm run preview` | serve o build em `http://localhost:4173` (com Service Worker) |
| `npm test` | testes automatizados (Vitest) |
| `npm run verify:offline` | confere se o build pré-cacheia tudo o que o modo offline precisa |
| `npm run android:apk` | build web + sincronização + APK de depuração |
| `npm run android:open` | abre o projeto Android no Android Studio |

Requisitos: Node 20 ou mais recente. Para o APK: Android SDK (Android Studio) e **JDK 21**.

## Gerar o APK (instalação local)

O APK já gerado está em `android/app/build/outputs/apk/debug/app-debug.apk`.

Para gerar de novo após qualquer alteração:

```bash
# Windows (Git Bash). Aponte JAVA_HOME para um JDK 21.
export JAVA_HOME="$HOME/.jdks/jbr-21.0.11"
npm run android:apk
```

> O Gradle 8.14 usado pelo Capacitor não roda com o JDK 25 embutido no Android Studio mais recente. Use um JDK 21
> (em Android Studio: *Settings → Build Tools → Gradle → Gradle JDK*).

`android/local.properties` aponta para o SDK desta máquina (`sdk.dir=...`). Em outro computador, ajuste ou apague o
arquivo e abra o projeto no Android Studio.

**APK de depuração x APK de versão:** o `app-debug.apk` é assinado com a chave de depuração e serve para instalar
manualmente nos totens. Para distribuir pela Play Store ou por MDM, gere uma versão assinada em
*Android Studio → Build → Generate Signed App Bundle / APK* e guarde a chave em local seguro: atualizações
precisam da mesma chave.

### Instalar no totem

1. No Android, habilite *Configurações → Segurança → Instalar apps desconhecidos* para o gerenciador de arquivos.
2. Copie o `app-debug.apk` (cabo USB, pendrive ou e-mail) e toque nele para instalar. Ou, com depuração USB:
   `adb install -r app-debug.apk`.
3. Abra **Conheça os Cursos**. O app abre em tela cheia, na vertical, com a tela sempre ligada e o botão "voltar" desativado.

O que o APK faz de diferente da versão web:
- tela cheia imersiva (barras do sistema ocultas; reaparecem só com gesto de deslizar);
- orientação travada em retrato e tela que não apaga;
- botão "voltar" do Android ignorado;
- exportações (CSV/JSON) abrem a folha de compartilhamento do Android (salvar no Drive, enviar por e-mail etc.);
- os dados ficam no armazenamento do app; desinstalar o app **apaga as estatísticas** (exporte antes).
- atualizar = instalar um APK mais novo por cima (mantém os dados). Antes, aumente `versionCode` em
  `android/app/build.gradle`.

## Modo quiosque (importante)

Nenhum app ou página web consegue, sozinho, impedir que o visitante saia dele. Para bloquear o totem:

- **Fixação de tela (qualquer Android):** *Configurações → Segurança → Fixar app*. Abra o Conheça os Cursos, toque no ícone
  do app na tela de recentes e escolha *Fixar*. Para sair é preciso o gesto/PIN do aparelho.
- **Quiosque gerenciado (recomendado em eventos):** um MDM (Android Enterprise, Google Workspace, Scalefusion, Hexnode
  etc.) em modo *dedicated device / single-app kiosk* com o pacote `br.edu.donaduzzi.cursos`.
- Desative notificações, suspensão automática e atualizações automáticas do sistema durante eventos.

## Versão web / PWA (alternativa ao APK)

O jogo está hospedado gratuitamente no **GitHub Pages**: <https://tampelini.github.io/conheca-os-cursos-donaduzzi/>
(painel: `…/#/admin`). Cada `git push` na branch `main` roda os testes, gera o build e publica a nova versão
automaticamente (`.github/workflows/deploy.yml`). Para usar um domínio próprio da faculdade, configure em
*Settings → Pages → Custom domain* do repositório.

Os dados (perguntas editadas, configurações, estatísticas) ficam **em cada aparelho**, não no servidor: o site só
entrega os arquivos do jogo.

Para hospedar em outro lugar:

1. `npm run build` e publique a pasta `dist/` em qualquer servidor **HTTPS** (o Service Worker exige HTTPS ou
   `localhost`).
2. No Chrome do Android, abra o endereço e use *Menu → Instalar app / Adicionar à tela inicial*.
3. Abra uma vez com internet: depois disso funciona offline. Novas versões são baixadas em segundo plano e só são
   aplicadas quando o jogo está na tela inicial, nunca no meio de uma partida.

Sugestões para o Chrome: desligue a tradução automática e mantenha o app instalado (abre sem barra de endereço).

## Painel administrativo

- Acesso: toque **5 vezes em 3 segundos no canto superior esquerdo** da tela (área invisível, funciona em qualquer
  tela do jogo, inclusive a final) ou acesse `…/#/admin`. Nas demais telas o logotipo pode ocupar esse canto e abrir o site no primeiro toque.
- **PIN padrão: `1234`. Troque-o na aba *Segurança* antes do primeiro evento.**
- A sessão fecha após 5 min sem uso; 5 PINs errados bloqueiam o acesso por 1 minuto.
- O PIN é uma barreira contra visitantes, não segurança forte: quem tiver o aparelho desbloqueado e ferramentas de
  desenvolvedor pode apagar os dados locais.

Abas:
- **Perguntas:** filtrar por categoria/status, buscar, criar, editar, ativar/desativar, excluir, importar/exportar
  JSON (mesclar ou substituir) e restaurar as originais. Tudo é validado antes de salvar. O filtro *A confirmar
  (pendentes)* mostra as perguntas que aguardam um dado.
- **Cursos:** habilitar, editar (grau, duração, turno, coordenação), reordenar, adicionar e remover cursos da tela final.
- **Configurações:** nomes e textos, logotipo, cores, perguntas por partida e por categoria, pontos, tempo por pergunta
  (ou desativado), inatividade, som, tela cheia, URL do QR Code, mensagens de resultado, o **perfil do participante**
  (ligar/desligar, pergunta e opções) e a pesquisa inicial (ligar/desligar, permitir pular, textos e categoria usada
  na comparação).
- **Estatísticas:** participantes (partidas iniciadas e concluídas), **acerto por tema** (mostra o que as pessoas
  sabem ou não de cada assunto), **participantes e acerto por perfil**, relatório da **pesquisa** (quantos responderam
  e pularam, distribuição e média, % de acerto por resposta dada), média de pontos, tempo médio, histograma,
  desempenho **por pergunta, da menos acertada para a mais acertada**, com as alternativas escolhidas, e histórico com
  data e hora. Exportação em CSV (`;`, UTF-8, abre no Excel): partidas (com perfil), por pergunta e por tema/perfil.
  Nenhum dado pessoal é coletado.

## Identidade visual

Segue o site <https://faculdadedonaduzzi.com.br/>: telas brancas com títulos vinho e rótulos em carmim, alternadas com
telas de destaque (início e resultado) em vinho, como as faixas do site, com detalhes em creme e dourado. Os botões
são em formato de pílula e os cartões, cinza-claro.

| Token | Cor | Uso |
|---|---|---|
| `brand` | `#541822` vinho | faixas, telas de destaque, títulos |
| `primary` | `#A31938` carmim | botões, rótulos, números |
| `accent` | `#CC3366` rosa | degradê dos botões |
| `cream` / `gold` | `#F7EBB5` / `#E9B949` | destaques nas telas vinho, pontuação |
| `surface` | `#F1F1F1` | cartões |

Fontes: **Sora** nos títulos (a mesma do site, licença livre, embutida) e **Inter** no texto. O site usa também a
fonte *Sarun*, que não foi embutida por não ter licença confirmada; se a faculdade tiver o arquivo e a licença,
basta adicioná-la em `src/styles` e em `tailwind.config.js`.

O logotipo oficial está em `public/assets/logo-donaduzzi.png` (copiado do site institucional). Nas telas vinho ele
aparece numa cápsula branca; se houver uma versão do logotipo para fundo escuro, cadastre-a no painel.

## Personalização

- **Logotipo:** já vem o oficial. Para trocar: *Configurações → Identidade* (colorido para telas brancas e, opcional,
  versão para fundo vinho).
- **Link do logotipo:** tocar no logotipo (no topo de todas as telas) abre
  <https://faculdadedonaduzzi.com.br/cursos-de-graduacao/> em outra aba; o jogo continua aberto na aba original e
  volta sozinho à tela inicial por inatividade. No APK, o link abre no navegador do aparelho. Troque ou desative
  (campo vazio) em *Configurações → Identidade → Link ao tocar no logotipo*. Com a fixação de tela/modo quiosque do
  Android ativa, o sistema pode impedir a abertura do navegador.
- **Cores:** *Configurações → Cores*, com os códigos do manual da marca. Os padrões ficam em
  `src/data/defaultSettings.ts`.
- **QR Code:** vem com a página oficial <https://faculdadedonaduzzi.com.br/cursos-de-graduacao/>. Troque em
  *Configurações → Tela de cursos e QR Code*; sem URL, o QR Code não aparece. O código é gerado no aparelho, sem
  serviço externo.
- **Cursos:** pela aba *Cursos* ou, como padrão de fábrica, em `src/data/courses.ts`. Vêm os 10 cursos de graduação
  com grau, duração, modalidade, turno e coordenação conferidos no site (onde o site não confirma, o dado fica de
  fora). A lista rola com o dedo e mostra o aviso "Deslize para ver os N cursos". Não informe vagas, carga horária ou
  autorização sem dados institucionais confirmados.
- **Perguntas padrão:** `src/data/questions.ts`. Formato de importação JSON (lista):

```json
[{ "id": "inst-11", "category": "institucional", "prompt": "Enunciado?",
   "options": [{"id":"a","text":"…"},{"id":"b","text":"…"},{"id":"c","text":"…"},{"id":"d","text":"…"}],
   "correctOptionId": "b", "explanation": "Explicação curta.", "active": true }]
```

Categorias: `institucional`, `cpa`, `tecnologia`, `saude`, `gestao`, `metodologia`.

- **Ícones do app:** substitua `public/assets/icon-192.png` / `icon-512.png` (PWA) e os ícones em
  `android/app/src/main/res/mipmap-*` (APK; use *Android Studio → New → Image Asset*). Os atuais são genéricos.
- **Nome/ID do APK:** `capacitor.config.ts` (`appName`, `appId`).

## Privacidade

Nenhum dado pessoal é pedido ou guardado. Cada partida registra apenas: data e hora, perfil escolhido (categoria),
notas da pesquisa, respostas, pontuação e duração. Tudo fica **no próprio aparelho** (IndexedDB), funciona sem
internet e só sai dele quando o administrador exporta o CSV. Com mais de um totem, exporte o CSV de cada um e junte
as planilhas.

## Pesquisa antes das perguntas

Depois do perfil, o participante responde com um toque **"O quanto você conhece os cursos da Faculdade Donaduzzi?"** e
**"O quanto você conhece a CPA?"**, numa escala de 1 a 5: *Nunca ouvi falar · Já ouvi falar · Conheço um pouco ·
Conheço bem · Conheço muito bem*. O botão COMEÇAR libera quando as duas são respondidas; "Pular e começar" pode ser
desligado no painel.

No resultado, o jogo compara a resposta sobre a CPA com os acertos nas perguntas dessa categoria (ex.: "Você disse
'Já ouvi falar' sobre a CPA e acertou 3 de 3 perguntas… Você conhece mais do que imaginava!"). Em *Estatísticas*, o
mesmo cruzamento aparece para todos os participantes.

## Regras do jogo implementadas

- 10 perguntas sorteadas por partida: 2 A Faculdade, 3 CPA, 2 Tecnologia, 1 Saúde e Biociências, 1 Gestão, Educação
  e Direito, 1 Metodologia e Pós (configurável).
- Sem repetição na partida; perguntas e alternativas embaralhadas. A resposta correta é guardada pelo ID da
  alternativa (não pela posição) e nunca fica na mesma posição 3 vezes seguidas.
- Perguntas das últimas 3 partidas são evitadas enquanto houver alternativas (configurável).
- Acerto = 100 pontos; erro ou tempo esgotado = 0; máximo 1000. Sem bônus de velocidade. O tempo total da partida é
  registrado.
- 20 s por pergunta (configurável ou desativável). Sem toque por 60 s durante a partida ou 30 s na tela de cursos,
  o jogo volta à tela inicial e limpa a partida.
- Toques repetidos são ignorados (o fluxo é um reducer que descarta ações fora de contexto, e os botões têm trava
  contra toque duplo). Erros inesperados mostram um aviso e reiniciam o app sozinhos.

## Estrutura

```
src/
  data/        perguntas, cursos, categorias e configurações padrão
  game/        sorteio, embaralhamento e pontuação (puros, testados)
  store/       reducer do jogo e contexto de dados/tema
  services/    IndexedDB, repositório, estatísticas/CSV, PIN, som, PWA, arquivos
  hooks/       inatividade e contagem regressiva
  components/  botões, temporizador, QR Code, fundo animado, confete…
  screens/     Início, Instruções, Perfil, Pesquisa, Pergunta, Resultado, Cursos
  admin/       painel administrativo
  test/        testes automatizados
android/       projeto nativo (Capacitor)
scripts/       geração de ícones e verificação offline
```

## Acessibilidade e desempenho

- Interface em `rem` escalada pela largura útil de um palco 9:16: 1080 × 1920 e telas menores, sem rolagem (só a
  lista de cursos rola). Perguntas com muito texto usam letras menores depois da resposta, para o botão de avançar
  nunca sair da tela; ao criar perguntas, prefira explicações de até 2 linhas.
- Botões com no mínimo 48 px (a maioria acima de 70 px), texto em alto contraste, acerto/erro indicados também por
  ícone e texto (não só por cor), rótulos para leitores de tela.
- Respeita "reduzir movimento" do sistema. Em aparelhos muito lentos, abra a versão web com `?noanim` para desligar
  as animações.
- Animações só com `transform`/`opacity`; fundo de circuitos em CSS puro.

## Testes

`npm test` roda 68 testes: banco de perguntas (60 ativas, IDs únicos, gabarito, pendentes inativas), sorteio (10 perguntas, distribuição,
sem duplicatas, embaralhamento preservando a correta, posições variadas, inativas excluídas, anti-repetição),
pontuação e faixas de mensagem, tempo esgotado, conclusão, reinício por inatividade (partida e tela de cursos),
persistência no IndexedDB, estatísticas/CSV (por pergunta, por tema e por perfil), perfil anônimo, pesquisa (fluxo,
comparação, relatório), PIN e fluxos completos do jogo e do painel administrativo.
`npm run verify:offline` confere o pré-cache do Service Worker.
