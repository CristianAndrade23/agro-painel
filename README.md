# AgroPainel

Painel administrativo para uma plataforma de gestão agrícola: controle de assinaturas dos produtores, análise de custos das lavouras e montagem de **grupos de comparação de safra**.

**[▶ Ver demonstração](https://cristianandrade23.github.io/agro-painel/)** — usuário `admin`, senha `admin123`.

![Dashboard](docs/screenshots/dashboard.png)

> Projeto de portfólio. Nasceu como o painel interno de um produto real (Angular 8) e foi **reescrito em Angular 22** com componentes standalone, signals e change detection zoneless. A marca, os dados e o backend originais foram removidos: todos os dados são fictícios e servidos por uma API mock em memória, então o projeto roda sozinho, sem backend.

## Funcionalidades

| Tela | O que faz |
|---|---|
| **Início** | Indicadores de planos ativos, receita, vencimentos próximos e grupos. |
| **Usuários** | Lista paginada com busca e filtro por status; ativa ou desativa o plano com confirmação. |
| **Planos a vencer** | Abas "a vencer" e "vencidos", ordenadas por urgência, com badges e alteração da data de vencimento (inclui atalho "+1 ano"). |
| **Análise de lavouras** | Busca de produtores (autocomplete acessível); custos diretos, indiretos e administrativos em cenário estimado ou efetivo; receita e margem; habilitar ou desabilitar lavouras em lote para comparação. |
| **Grupos de comparação** | CRUD de grupos por cultura e safra, com validação reativa, e vínculo de lavouras aptas compatíveis. A exclusão é bloqueada enquanto houver lavouras vinculadas. |

| | |
|---|---|
| ![Análise de lavouras](docs/screenshots/analise-lavouras.png) | ![Grupos](docs/screenshots/grupos.png) |
| ![Planos a vencer](docs/screenshots/planos-a-vencer.png) | ![Login](docs/screenshots/login.png) |

## Stack e decisões técnicas

- **Angular 22**: 100% **standalone components**, sem `NgModule`.
- **Signals em todo o estado**: `signal`, `computed`, `linkedSignal` (por exemplo, a página volta para 1 quando o filtro muda), `input()`, `output()` e `model()`.
- **`rxResource`** para carregamento de dados, com estados de loading, erro e reload declarativos.
- **Zoneless**: sem `zone.js`; a detecção de mudanças é guiada por signals, com `OnPush` em todos os componentes.
- **Nova sintaxe de template**: `@if`, `@for`, `@let`.
- **Rotas com lazy loading** (`loadComponent`), **guards** e **interceptors** funcionais.
- **API mock via `HttpInterceptorFn`**: implementa o mesmo contrato REST do backend original, com latência simulada, erros 401, 404 e 409 e persistência em `localStorage`. Para usar um backend real, basta trocar `useMockApi` em [`src/app/core/config.ts`](src/app/core/config.ts).
- **Componentes de UI próprios, sem bibliotecas**: modal sobre `<dialog>` nativo, autocomplete com navegação por teclado e ARIA, paginação e toasts.
- **CSS próprio** com design tokens e **tema escuro** automático (`prefers-color-scheme`).
- **Testes unitários com Vitest**, o runner padrão do Angular 22.
- **Testes end-to-end com Cypress**: 37 cenários cobrindo login, guards, as cinco telas, CRUD, validações e layout mobile. Os dados esperados vêm do mesmo seed da API mock, então nenhum nome fica fixo no código dos testes.
- **CI/CD com GitHub Actions**: testes unitários e E2E, build e deploy no GitHub Pages.

### Estrutura

```
src/app
├── core/                 # regras independentes de tela
│   ├── api/              # serviços HTTP por domínio (planos, lavouras, grupos)
│   ├── auth/             # sessão (signals), interceptor de token, guards
│   ├── mock/             # API mock + seed determinístico de dados fictícios
│   ├── models.ts         # contratos da API
│   └── dates.ts          # datas da API ([ano, mês, dia]) e textos relativos
├── shared/               # UI reutilizável: modal, autocomplete, paginator, toast, ícones
└── features/             # uma pasta por tela (lazy loaded)
    ├── login/  shell/  home/  users/  expiring-plans/
    ├── farming-analysis/ # página + painel do produtor + card de lavoura
    └── groups/           # página + formulário + vínculo de lavouras
```

### O que mudou em relação à versão original (Angular 8)

- `NgModule` + `ngx-bootstrap` + `jQuery` + `moment` + Bootstrap 3 → standalone + signals, sem dependências de UI de terceiros.
- Navegação por "abas" controladas por número → rotas reais, com lazy loading e títulos de página.
- Componentes duplicados (`lavouras` e `pendentes`) → um único `FarmingCard`.
- Validações imperativas em `ngDoCheck` → erros derivados com `computed()`.
- Datas tratadas fatiando strings do moment.js → `Intl.RelativeTimeFormat` com funções puras e testadas.
- Bundle inicial de cerca de 90 kB transferidos, e cada tela carregada sob demanda.

## Como rodar

Pré-requisito: **Node.js 22 ou mais recente**.

```bash
npm install
npm start          # http://localhost:4200
```

Entre com `admin` / `admin123` (o botão **Preencher** na tela de login completa os campos). As alterações ficam salvas no navegador; use **Restaurar dados demo** no menu lateral para voltar ao estado inicial.

```bash
npm test           # testes unitários (Vitest)
npm run build      # build de produção em dist/agro-painel
```

### Testes end-to-end (Cypress)

```bash
npm run e2e        # sobe o app, roda todos os cenários no Chrome headless e encerra
npm run e2e:open   # mesma coisa, mas na interface interativa do Cypress
```

Com o app já rodando (`npm start`), também dá para usar `npm run cy:run` ou `npm run cy:open` diretamente.

| Spec | Cobre |
|---|---|
| `auth.cy.ts` | login válido e inválido, guards, sessão após reload, logout |
| `dashboard.cy.ts` | indicadores, navegação pelo menu e pelos cards |
| `users.cy.ts` | paginação, busca sem acento, filtro de status, ativar e desativar com persistência |
| `expiring-plans.cy.ts` | abas, ordenação por urgência, validação de data, renovação |
| `farming-analysis.cy.ts` | autocomplete por teclado, custos estimado e efetivo, habilitar e desabilitar em lote |
| `groups.cy.ts` | validações, nome duplicado, criar, editar e excluir, regras de grupos com lavouras, vínculo de lavouras |
| `responsive.cy.ts` | menu mobile |

> Os scripts usam [`scripts/cypress.mjs`](scripts/cypress.mjs), que remove a variável `ELECTRON_RUN_AS_NODE` herdada do terminal do VS Code. Sem isso, o Cypress falha com `bad option: --smoke-test`.

## Deploy

O workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) roda os testes unitários e os E2E e só publica o build no **GitHub Pages**, a cada push na branch principal, se tudo passar. Para ativar, vá em *Settings → Pages → Source: GitHub Actions*.

## Licença

[MIT](LICENSE)
