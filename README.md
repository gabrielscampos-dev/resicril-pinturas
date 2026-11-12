# Resicril Pinturas

Site institucional em português para **pintura de edifícios, revestimentos e resinas em interiores e exteriores, e acabamentos em gesso e estuque em São Paulo**, desenvolvido com HTML, CSS e JavaScript puro. Não exige compilação, framework ou banco de dados. A única dependência externa é o CSS do Font Awesome Free 6.7.2 e suas fontes, carregados por CDN.

## Dados comerciais

Os dados foram confirmados pelo proprietário e estão aplicados no conteúdo e nos contatos:

| Campo | Valor |
| --- | --- |
| Empresa | Resicril Pinturas |
| Responsável | Roberto Gamero |
| WhatsApp | (11) 99422-6176 |
| Número dos links | 5511994226176 |
| E-mail | resicrilpinturas@gmail.com |
| Localização | Vila Carrão, São Paulo/SP |
| Serviços | Pintura de edifícios em geral; aplicação de revestimentos e resinas em interiores e exteriores; obras de acabamento em gesso e estuque |

A seção Serviços apresenta três grupos confirmados: **Pintura de edifícios**, **Revestimentos e resinas** e **Gesso e estuque**. A grade tem uma coluna abaixo de 900 px e três a partir desse ponto. Não foram acrescentadas garantias, certificações, tempo de experiência ou condições comerciais.

## Estrutura e execução local

```text
resicril-pinturas/
├── assets/
│   ├── imagens/       # Fotografia original e máscara alfa do simulador
│   ├── Logo/          # Logotipos, ícones e imagem de compartilhamento
│   └── trabalhos/     # Fotografias do portfólio
├── css/style.css      # Identidade, componentes, movimentos e responsividade
├── js/main.js         # Menu, leque, simulador, galeria e comparador
├── index.html         # Conteúdo, contatos e metadados
├── scripts/           # Verificações de navegador
└── README.md
```

Execute na raiz, com Python instalado:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Abra `http://127.0.0.1:8000` e encerre o servidor com `Ctrl+C`. Use HTTP para carregar a máscara PNG do simulador. A abertura por `file://` utiliza o recorte de fallback e exibe um aviso.

O site permanece estático. Ao hospedar, mantenha `index.html`, `css/`, `js/` e `assets/`, seus caminhos relativos e a capitalização dos nomes. A hospedagem não faz parte desta tarefa. A pasta `.qa/`, ignorada pelo Git, contém cópias e materiais locais de conferência; ela não integra o site.

## Identidade, ícones e compartilhamento

Os logotipos originais foram preservados. O cabeçalho usa `assets/Logo/Logo.png`, de 1448 × 1086 px, e o rodapé usa `assets/Logo/Logo colorido Resicril Pinturas.png`, de 2063 × 762 px. As variáveis de cor ficam no início de `css/style.css`; os textos usam fontes do sistema.

Os ícones foram gerados nas dimensões reais e vinculados no HTML com os formatos e tamanhos correspondentes:

| Arquivo em `assets/Logo/` | Formato e dimensões finais | Antes | Depois |
| --- | --- | ---: | ---: |
| `favicon-16x16.png` | PNG transparente, 16 × 16 px | 740.160 B | 711 B |
| `favicon-32x32.png` | PNG transparente, 32 × 32 px | 735.005 B | 1.733 B |
| `favicon.ico` | ICO válido com imagens DIB de 16, 32 e 48 px | 741.463 B | 15.086 B |
| `apple-touch-icon.png` | PNG com fundo claro opaco, 180 × 180 px | 693.049 B | 28.542 B |
| **Total dos quatro ícones** | | **2.909.677 B** | **46.072 B** |

A redução total foi de **2.863.605 bytes, ou 98,42%**. O ICO contém uma estrutura real de ícone, em lugar do PNG com extensão trocada. O Apple Touch Icon tem fundo claro opaco para exibição no iOS; os favicons PNG mantêm transparência.

A imagem `assets/Logo/compartilhamento.png` usa a identidade existente, tem **1200 × 630 px**, formato PNG e **179.110 bytes**. As descrições alternativas e os metadados de formato e dimensões estão no `<head>`. As URLs de compartilhamento dependem do domínio, conforme a seção de publicação.

### Font Awesome

O HTML carrega a folha abaixo antes de `css/style.css`, com `integrity`, `crossorigin="anonymous"` e `referrerpolicy="no-referrer"`:

```text
https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css
```

Mantenha a classe `.icon`, a família `fa-solid` ou `fa-brands` e `aria-hidden="true"` em ícones decorativos. Preserve textos visíveis e descrições `.sr-only`. O tamanho é definido por `font-size` no CSS.

Ao atualizar a versão, substitua também o hash de integridade pelo correspondente à nova folha e confira as fontes. Se a hospedagem adotar CSP, permita `https://cdnjs.cloudflare.com` em `style-src` e `font-src`. Sem acesso ao CDN, os textos e links continuam disponíveis; o botão do menu usa linhas em CSS.

## Conteúdo, contatos e acessibilidade

Edite os textos em `index.html`. Preserve as seções `#inicio`, `#sobre`, `#servicos`, `#trabalhos` e `#contato`, ou atualize seus links internos em conjunto. Mantenha um único `h1`, a hierarquia de títulos, os atributos `aria-*`, o link para pular a navegação e os identificadores utilizados pelo JavaScript.

Os cinco links do WhatsApp mantêm o número `5511994226176` e suas duas mensagens existentes: quatro solicitam orçamento e um apresenta o interesse em conhecer os serviços e conversar sobre o projeto. Os links abrem a mensagem pronta; o visitante decide enviá-la. O e-mail usa `mailto:resicrilpinturas@gmail.com`. Para atualizar o telefone, altere todas as ocorrências no HTML e o texto formatado. Mensagens novas precisam ser codificadas com `encodeURIComponent` no parâmetro `?text=`.

O menu móvel é ativado abaixo de 900 px, informa o estado por `aria-expanded` e fecha por navegação, clique fora ou Escape. Escape devolve o foco ao botão. Sem JavaScript, os links do menu permanecem visíveis. Há foco visível, compensação das âncoras para o cabeçalho e áreas de toque nos controles. O site não possui formulário, analytics ou cookies próprios.

As grades se adaptam a partir de 600, 900 e 1200 px. `prefers-reduced-motion: reduce` desativa as animações e a rolagem suave, preservando conteúdo, seleção e navegação. Os estilos de impressão mostram o conteúdo sem as camadas decorativas.

## Leque e animações

O leque usa HTML e CSS, com sete lâminas e cinco tons por família. As paletas são ilustrativas e não representam um catálogo de fabricante. Os nomes e a seleção ficam na ficha abaixo da arte; o hexadecimal vem de `--tone-3`, e o fundo mistura 70% dessa cor com 30% de branco. Leque e simulador são independentes.

A abertura dura 1,5 segundo. Depois, um ciclo de 8 segundos combina inclinação, expansão discreta e onda entre as lâminas. Mouse e foco reduzem gradualmente o movimento; clique, toque, Enter ou Espaço mantêm a amostra selecionada. O JavaScript usa um único `requestAnimationFrame` para o ambiente e pausa fora da tela, com a aba oculta, na impressão ou com movimento reduzido.

As responsabilidades são separadas para evitar conflito de transformações:

- `.hero-art`: perspectiva e variáveis `--fan-*`.
- `.color-composition`: inclinação pelo cursor.
- `.fan-ambient`: oscilação do conjunto.
- `.fan-blade`: geometria e abertura.
- `.fan-blade-motion`: expansão e onda.
- `.fan-sheet`: hover, foco e seleção.

Preserve a origem comum das lâminas ao alterar suas dimensões. As principais regulagens são `--fan-open-time`, `--fan-duration`, `--fan-sway-x`, `--fan-sway-y`, `--fan-spread` e `--fan-selected-depth`. Os ajustes abaixo de 900 px reduzem as amplitudes. Sem JavaScript, o leque abre por CSS e permanece estático, com botões desabilitados.

O título possui revelação única por máscaras CSS e pigmento decorativo. As fotografias e faixas entram quando ficam visíveis; os estados finais e os fallbacks evitam conteúdo permanentemente oculto. As fitas do fundo são decorativas e desaparecem com movimento reduzido e na impressão.

## Simulador: fotografia, máscara e cores

A fotografia original `assets/imagens/ambiente-simulador.png` e a máscara `assets/imagens/ambiente-mascara.png` mantêm **1156 × 650 px** e o mesmo enquadramento. A fotografia foi preservada; é ilustrativa e não é apresentada como trabalho realizado.

A máscara recebeu recorte localizado nos limites do teto e da parede lateral, além de antialias nas bordas de plantas, sofá, poltrona e luminária. O refinamento atua no alfa, sem desfoque geral nem alteração da fotografia. O PNG final tem **13.404 bytes**, ante **446.451 bytes**.

### Integração e acabamento

O caminho da máscara fica em `data-wall-mask-src` no elemento `.paint-simulator`. Após carregar os arquivos, o JavaScript confere as dimensões naturais. A classe `has-png-mask` aplica `--wall-mask-image` e substitui integralmente o recorte poligonal nesse modo.

O **canal alfa** define a cobertura: 0 preserva a fotografia, 255 recolore a parede e os valores intermediários suavizam as bordas. O RGB transparente não recebe tinta. A camada usa `mask-image`, `-webkit-mask-image` e `mask-mode: alpha`, com a máscara em `100% 100%`, sem repetição. Foto, luz e máscara ocupam a mesma área; não há corte diferente no celular.

A cor fica sob uma cópia neutra da fotografia com `grayscale(1) contrast(.9) brightness(1.22)` e `mix-blend-mode: hard-light`. Assim, a iluminação, as sombras e a textura modulam a nova pintura. As variáveis existentes são `--wall-contrast: .9`, `--wall-light: 1.22` e `--wall-opacity: 1`; reduzir a opacidade reintroduz a cor original. A simulação não equivale a uma tinta física: tela e iluminação alteram a percepção.

| Cor | HEX |
| --- | --- |
| Branco Gelo | `#edf0ed` |
| Areia Clara | `#dfcfb3` |
| Azul Sereno | `#9bbdd3` |
| Verde Sálvia | `#9aaa91` |
| Cinza Suave | `#bfc4c5` |
| Azul Profundo | `#28547a` |

A seleção atualiza `aria-pressed` e o nome anunciado. A revelação dura 0,65 segundo, com temporizador de segurança de 850 ms. Trocas rápidas consolidam a última escolha; movimento reduzido aplica a cor imediatamente.

### Fallback e manutenção

Se o PNG falhar, estiver ausente, tiver dimensões incompatíveis ou não houver suporte a máscaras, o simulador informa o problema e usa o recorte anterior, restrito à URL e às dimensões desta fotografia. Esse fallback pode ter limitações nas bordas. Se nenhum recorte seguro estiver disponível, a fotografia permanece visível e os controles são desativados, sem pintar a imagem inteira. Sem JavaScript, a fotografia aparece com os controles ocultos.

Para trocar a fotografia, forneça outra máscara alfa com enquadramento e dimensões correspondentes e atualize `src`, `alt`, `width`, `height` e `data-wall-mask-src`. A cópia de luz recebe a URL automaticamente. Não reutilize o recorte desta sala em outra imagem.

Ao editar a máscara, mantenha transparência nos móveis, objetos, piso, rodapé e demais paredes. A área recolorida deve incluir as sombras projetadas sobre a parede, para preservar a modulação da luz. Confira os contornos em 100% e ampliados, usando suavização localizada. Uma imagem preta e branca totalmente opaca não serve como máscara alfa. Para alterar a paleta, edite `data-paint-color` e `.paint-color-name`, preservando `type="button"` e `aria-pressed`.

## Galeria e comparador

A galeria contém duas fotografias independentes de **720 × 1280 px**, preservadas em `assets/trabalhos/`: `trabalho-vila.jpeg` e `trabalho.jpeg`. As legendas usam a identificação neutra “Projeto realizado”. As fotografias não são um par de antes e depois.

O layout mantém a proporção das imagens. A inclinação responde ao mouse a partir de 900 px, com ponteiro preciso e movimento reduzido desativado. O diálogo de ampliação usa `object-fit: contain`, mostra a foto inteira e oferece Anterior/Próxima, setas, Home/End, contador e gesto horizontal por toque. Fechar, Escape ou clique fora encerram o diálogo e devolvem o foco ao link de origem. Tab e Shift+Tab permanecem nos controles da ampliação. Há estados de carregamento e erro e um link para o original. Sem JavaScript ou suporte ao diálogo, o link abre a fotografia diretamente.

Para adicionar uma foto, copie todo o wrapper `.gallery-entry[data-gallery-entry]` do `<template id="modelo-trabalho">` para `.work-gallery`, fora do template. Preencha `href`, `src`, `alt`, `width`, `height`, número e `aria-label` com os dados reais. Preserve `.gallery-image-wrap`, `.gallery-zoom`, a legenda, `loading="lazy"` e `decoding="async"`. A entrada participa automaticamente da navegação ampliada na ordem do HTML. Não há carrossel automático.

O `<template id="modelo-comparador">` também permanece **inerte**, sem fotos fictícias nem downloads. Para usá-lo:

1. Escolha um par real do mesmo ambiente com enquadramento, perspectiva, orientação e proporção equivalentes.
2. Copie `figure.comparison` para `.work-gallery`, fora do template, e informe os caminhos, descrições, dimensões e legenda reais.
3. Preserve `data-comparison`, `[data-before]`, `[data-after]`, os rótulos Antes/Depois e o range de 0 a 100, inicialmente em 50.
4. Mantenha o controle com `hidden` e o range com `disabled`. O JavaScript só os libera após carregar ambas as fotos com proporções equivalentes, tolerando diferença de até 0,1%.

O comparador recorta a foto de Antes para revelar Depois sem redimensionar as camadas. O range aceita mouse, toque e teclado, com foco visível e `aria-valuetext`. Falha de imagem, incompatibilidade de proporções, falta de suporte ou ausência de JavaScript mantém as duas fotos completas e empilhadas. Não envolva comparadores em links `data-lightbox` nem acrescente `gallery-card` ao componente.

## Metadados e preparação do GitHub

Título, descrição, Open Graph e Twitter descrevem os três grupos de serviços em São Paulo. **Não foi encontrado domínio definitivo no projeto.** O `<head>` identifica precisamente os quatro metadados ainda dependentes dessa informação:

| Metadado | Valor a preencher após receber o domínio |
| --- | --- |
| `link rel="canonical"` | URL absoluta real da página inicial |
| `meta property="og:url"` | A mesma URL absoluta da página inicial |
| `meta property="og:image"` | URL absoluta real de `/assets/Logo/compartilhamento.png` |
| `meta name="twitter:image"` | A mesma URL absoluta da imagem de compartilhamento |

Não use um domínio inventado, `localhost` ou caminhos relativos nesses campos. Os dados comerciais e os serviços já estão confirmados; a pendência de informação é o domínio.

O repositório é **público**, chamado `resicril-pinturas`, na conta `gabrielscampos-dev`: https://github.com/gabrielscampos-dev/resicril-pinturas. Os materiais temporários de QA não fazem parte do repositório. O domínio definitivo e a publicação na hospedagem são etapas separadas; assim que o endereço for definido, preencha os quatro metadados indicados acima.

## Validação desta revisão — 10/11/2026

Foram executados e passaram:

```powershell
node --check js/main.js
node --check scripts/validate-browser.mjs
```

O script `scripts/validate-browser.mjs` executou o site por **HTTP local no Microsoft Edge 157 em modo headless**, usando Node.js 24.19 e um perfil isolado, com o sandbox do navegador ativado. A execução principal concluiu **319 verificações, todas aprovadas**, sem exceções de JavaScript ou falhas de recursos locais nos cenários normais.

A rodada complementar `node scripts/validate-browser.mjs --simulator-only` concluiu **92 verificações, todas aprovadas**, nas mesmas seis larguras. Ela confirmou também o RGB efetivo das seis cores e gerou capturas do simulador após a fotografia ficar visível e a troca de cor terminar.

| Verificação executada | Cobertura e resultado |
| --- | --- |
| Layout e imagens | 320, 375, 600, 768, 900 e 1440 px; sem rolagem horizontal, imagens carregadas e conteúdo principal presente |
| Menu | Abertura/fechamento, Escape, clique externo, navegação e mudança entre larguras móvel/desktop |
| Leque | Sete amostras, Enter e Espaço, seleção exclusiva, nome e hexadecimal |
| Simulador | Seis cores, seleção exclusiva, máscara PNG ativa e ausência do aviso de fallback no cenário normal |
| Galeria ampliada | Duas fotografias, Anterior/Próxima, setas, Home/End, fechamento por botão/Escape/fundo e retorno do foco |
| Teclado e foco | Tab e Shift+Tab no diálogo, foco visível e contorno computado nos controles do menu, leque, paleta e ampliação |
| Movimento reduzido | Animações desativadas e leque, simulador e galeria funcionais em 375 px |
| Sem JavaScript | Menu visível, fotografia original, aviso de ativação do simulador e links da galeria disponíveis em 375 px |
| Sem IntersectionObserver | Conteúdo visível e seleção do leque funcional em 375 px |
| Máscara ausente | Falha 404 provocada no teste; recorte de fallback, aviso e troca de cor funcionaram em 1440 px |
| Contatos e navegação | Âncoras válidas, cinco links WhatsApp e e-mail; nenhuma mensagem enviada |

Uma conferência HTTP independente verificou **13 recursos locais**, todos com resposta 200 e conteúdo idêntico ao arquivo em disco. Foram conferidos os números e as mensagens exatas dos cinco links WhatsApp, o e-mail, os identificadores únicos, as âncoras, as dimensões e os cabeçalhos PNG e as três entradas DIB do ICO. Os favicons PNG têm transparência; o Apple Touch Icon tem alfa opaco em todos os pixels.

No navegador, o CSS do Font Awesome e as fontes `fa-brands-400.woff2` e `fa-solid-900.woff2` também responderam 200 pelo CDN. `document.fonts.check` confirmou as duas famílias em cada largura testada.

As capturas de Branco Gelo, Areia Clara e Azul Profundo foram inspecionadas visualmente, assim como a imagem de compartilhamento em tamanho reduzido, os contornos de foco e seções em larguras estreitas. A fotografia original, os logotipos, os móveis, os objetos e a textura permanecem preservados. Capturas da página inteira podem registrar elementos fora da tela antes da animação de entrada; a conferência do simulador usa capturas após rolagem e estabilização.

Relatórios e capturas ficam em `.qa/browser-results.json`, `.qa/simulator-results.json`, `.qa/http-results.json` e `.qa/screenshots/`, ignorados no Git. O único erro de rede esperado na execução principal é o 404 intencional da máscara, registrado separadamente do uso normal.

Para repetir o teste de navegador em Windows com Node.js e Edge instalados:

```powershell
node scripts/validate-browser.mjs
```

O script cria seu próprio servidor HTTP e encerra o navegador de teste ao terminar. Use a variável `QA_EDGE_PATH` se o executável do navegador estiver em outro caminho. As verificações não acessam o perfil pessoal do navegador.

Não foram testados aparelhos físicos, outros navegadores ou o gesto de toque em uma tela real. A validação dos metadados por URLs públicas e a prévia em redes sociais dependem do domínio definitivo e da futura hospedagem.
