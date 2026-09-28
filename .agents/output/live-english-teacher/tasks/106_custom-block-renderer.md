# Task 106 — Custom Renderer de blocs IA (quiz interactif + mermaid)

**Status:** TODO
**Plan:** plan-003
**Priority:** 🟠 High
**Stack:** Angular 20.3.11, `ngx-markdown@22.0.2`, `marked@18.0.11`, `NgComponentOutlet`, NestJS 11
**Règles:** `.agents/rules/stack.md` (canonique), daisyUI tokens uniquement, plafond 200 lignes/fichier

## Goal

Faire en sorte que le LLM produise des **widgets interactifs** au lieu de texte brut, façon
ChatGPT/Gemini : un bloc ```` ```quiz ```` devient un composant Angular cliquable, un bloc
```` ```mermaid ```` devient un diagramme rendu. Le tout **pendant le streaming**, sans jamais
crasher ni faire clignoter.

Le LLM reste maître de la forme de sa réponse ; le frontend n'interprète rien d'autre que le texte.

## 2. Current state

- Markdown déjà rendu : `ngx-markdown` via `<markdown [data]="text()" />` dans
  `message-ai-bubble.component.ts:26` et `message-user-bubble.component.ts:36`
- **Mermaid déjà supporté par la lib** (`extendsRendererForMermaid` + `renderMermaid`), mais gaté
  derrière l'input `mermaid` jamais activé, et `mermaid` n'est pas installée
- **Aucun** registre de composants dynamiques dans le repo (zéro `NgComponentOutlet`,
  `ViewContainerRef`, `createComponent`, zéro directive custom)
- System prompt unique : `libs/backend/feature-live/src/lib/tutor/tutor-prompt.ts:5`, consommé par
  les 3 providers → une seule modification
- Persistance texte brut (`Message.content String @db.Text`) → le renderer est une fonction pure
  de `text`, **aucune migration de schéma**

## 3. Cible

```text
chat-blocks.parser.ts (PUR)  →  ChatBlock[] { id, type, content, isComplete }
        │
        ▼
chat-blocks.component.ts  (OnPush, zoneless, signals)
   ├── 'text'    → <markdown [data]>        (sanitizé, existant)
   ├── 'quiz'    → NgComponentOutlet        (CHAT_BLOCK_REGISTRY)
   └── 'mermaid' → rien ici : <markdown mermaid> le gère en natif
```

`mermaid` **ne passe pas** par le registre : ngx-markdown le rend déjà, avec le Sanitizer d'Angular.
Le registre ne porte que ce qu'Angular doit instancier (interactivité, état).

### 3.1 Angular best practices (skill `angular-best-practices`)

Contexte vérifié : l'app est **zoneless** (`app.config.ts:25` `provideZonelessChangeDetection()`),
`message-ai-bubble.component.ts:12` est déjà `OnPush`, `NgComponentOutlet` est exporté par
`@angular/common`. Zéro pipe custom dans le repo. Ces règles s'appliquent :

| Règle | Application concrète ici |
|---|---|
| **OnPush** sur chaque nouveau composant | `changeDetection: ChangeDetectionStrategy.OnPush` sur `chat-blocks`, `quiz-widget`. Sans OnPush en zoneless, le CD ne se déclenche que via les signals — donc les `input()` seuls ne suffisent pas |
| **`signal`/`input`/`output`, jamais de champ mutable** | `text = input<string>('')` (au lieu de `@Input()`), `isStreaming = input(false)`. Aucun `ngOnChanges` handwritten |
| **`inject()` jamais le constructeur** | `readonly #notify = inject(NotificationService)` si besoin |
| **`computed()` pour tout dérivé** | `blocks = computed(() => parseMessage(this.text(), this.isStreaming()))`, `hasMermaid = computed(() => this.blocks().some(isMermaidBlock))`, `canSubmit = computed(...)` dans le widget. **Zéro méthode appelée dans le template** |
| **`linkedSignal` quand l'utilisateur doit pouvoir écraser un dérivé** | `answer` du quiz est éditable alors qu'il dérive de `payload` → `linkedSignal`, pas un `signal` + `effect` (interdit par `stack.md`) |
| **`@for … track`, jamais `trackBy`** | `track block.id` (offset source stable). `track $index` proscrit : il recrée le widget à chaque frame |
| **Contrôle de flux moderne** | `@if` / `@for` / `@switch` uniquement. `*ngIf`/`*ngFor` interdits (`stack.md`). Import direct de `NgComponentOutlet` depuis `@angular/common` — **pas** de `CommonModule` |
| **Zéro méthode dans le template** | pas de `blockComponent(block.type)` appelé depuis le template : le registre est résolu en `computed()` |
| **Bundle : pas de barrel re-export** | le skill interdit les barrels qui cassent le tree-shaking. **Ne pas** ajouter d'exports dans `features/chat/index.ts` ; importer les fichiers profonds (`./chat-blocks/chat-blocks.component`). `shared/ui/index.ts` est d'ailleurs inutilisé dans le repo |
| **Lib lourde en import dynamique** | `mermaid` ~800 KB → `await import('mermaid')` dans un service, **pas** un import statique. Jamais dans le bundle initial |
| **`@defer` pour les composants lourds** | le widget quiz est léger, mais le rendu mermaid part dans un `@defer (on idle)` pour ne pas bloquer le premier paint |
| **`takeUntilDestroyed` / pas d'abonnement** | tout est en signals, donc **zéro** `subscribe()`. Aucun `DestroyRef` nécessaire — c'est le but |
| **Cleanup mémoire** | aucun `setTimeout`/`addEventListener` dans nos composants ; si un listener est ajouté, `DestroyRef.onDestroy` |

### 3.2 Le problème `ngOnChanges() → loadContent() → render()`

`ngx-markdown@22.0.2` fait `ngOnChanges() → loadContent() → render()` **inconditionnellement** à
chaque changement de `data` (`fesm2022/ngx-markdown.mjs:512-514`). Il n'existe **pas** d'input
`distinctTimeStamp` dans la v22 — vérifié dans les typings ET dans le bundle. Chaque token du
streaming déclencherait donc un re-parse markdown complet de tout le message.

**Ce n'est pas un problème de Change Detection Angular** : c'est `ngx-markdown` qui re-rend
décisionnellement. Aucun signal, aucun `OnPush`, aucune computed ne peut l'empêcher. La correction
est donc architecturale — **ne pas réassigner `[data]`** quand le contenu n'a pas changé :

| Mécanisme | Rôle |
|---|---|
| **`blockId(offset, type)`** | `id` dérivé de l'offset dans le texte source, pas d'un compteur ni d'un hash du contenu → stable entre deux frames |
| **`@for … track block.id`** | l'instance du widget n'est pas détruite/recréée quand le texte grandit après le bloc. Sans ça, la réponse cochée disparaît à chaque token |
| **Mémo du segment texte** | un `computed()` ne réémet que si sa valeur **change**. Comme le contenu d'un segment déjà fermé ne bouge plus, `<markdown>` ne reçoit pas de nouvelle valeur → `ngOnChanges` ne se déclenche pas. C'est la correction principale |
| **`hasMermaid` computed** | n'active `[mermaid]` que si un diagramme existe, sinon chaque `render()`scan tous les `.mermaid` du document pour rien |

Conséquence à assumer : le **dernier** segment (celui en cours de streaming) est re-parsé à chaque
token — c'est inévitable et correct, `ngx-markdown` est asynchrone et le texte n'est pas fini. Seuls
les segments déjà clos sont économisés. Le gain est donc proportionnel au nombre de blocs.

## 4. Files to create/modify
### Nouveau — modèle & parsing
- `features/chat/message-item/chat-blocks/chat-blocks.model.ts` —
  `BlockType = 'text' | 'quiz'`, `interface ChatBlock { id; type; content; isComplete }`
- `features/chat/message-item/chat-blocks/chat-blocks.parser.ts` — **pur** : `parseMessage(text, isStreaming)`,
  `hasMermaidBlock(blocks)`. Zéro état global, **regex locale au `g` (jamais `static` + `g` — sinon
  `lastIndex` fuit entre les appels)**
- `features/chat/message-item/chat-blocks/chat-blocks.parser.spec.ts` — tous les cas limites du plan

### Nouveau — registre & rendu
- `features/chat/message-item/chat-blocks/chat-block-registry.ts` — `Record<BlockType, Type<unknown>>`,
  `resolveBlockComponent(type)`
- `features/chat/message-item/chat-blocks/chat-blocks.component.ts` + `.html` — `OnPush`, `inject()`,
  `input()`, `computed()`. Le seul composant qui rend (`@for (block of blocks(); track block.id)`,
  `NgComponentOutlet` pour les blocs interactifs, mémo du segment texte)
- `features/chat/message-item/chat-blocks/chat-blocks.util.ts` — **pur** : `blockId(offset, type)`,
  `isTextBlock(block)`, `isMermaidBlock(block)`
- `features/chat/message-item/chat-blocks/chat-blocks.util.spec.ts`

### Nouveau — widget quiz
- `features/chat/message-item/quiz/quiz-payload.model.ts` —
  `QuizType = 'single-choice' | 'multiple-choice' | 'fill-in-the-blank'`,
  `interface QuizPayload { id; type; question; options?; correctAnswer: number | number[] | string; explanation }`
- `features/chat/message-item/quiz/quiz-payload.util.ts` — **pur** : `parseQuizPayload(raw)` (try/catch
  JSON + validation schéma + rejet hors bornes), `isCorrect(payload, answer)`
- `features/chat/message-item/quiz/quiz-widget.component.ts` + `.html` — `OnPush`, état en
  `signal`/`linkedSignal` (`answer`, `answered`, `revealed`), 3 types, feedback + explication,
  daisyUI tokens, `linkedSignal` pour `answer` (éditable mais dérivé du payload)
- `features/chat/message-item/quiz/quiz-payload.util.spec.ts`

### Nouveau — service mermaid (import dynamique)
- `features/chat/message-item/chat-blocks/mermaid-loader.service.ts` — `providedIn: 'root'`,
  `load(): Promise<typeof import('mermaid')>` mémoïsé (`resource` ou signal de promesse) pour
  charger `mermaid` **une seule fois** et **à la demande** (skill : « Dynamic Import Third-Party
  Libraries »). Aucune API HTTP → **aucune Resource API** ici

### Modifié
- `features/chat/message-item/message-ai-bubble.component.ts:26` — remplacer
  `<markdown [data]="text()" />` par `<app-chat-blocks [text]="text()" [isStreaming]="isStreaming()" />`
  et lister `[mermaid]` sur le `<markdown>` interne piloté par un `hasMermaid` **computed**
  (jamais une méthode)
- `features/chat/message-item/message-ai-bubble.component.ts` — l'input `isStreaming` existe déjà
  (ligne 54) : le câbler sans ajouter d'API
- `libs/backend/feature-live/src/lib/tutor/tutor-prompt.ts` — ajouter les règles des blocs
  (`quiz`, `mermaid`), JSON strictement valide, échappement des labels Mermaid, workflow pédagogique
- `libs/backend/feature-live/src/lib/tutor/tutor-prompt.spec.ts` — assertions sur ces règles
- `package.json` — ajouter `mermaid` (vérifier le peer range Angular 20.3 avant)
- `app.config.ts` — `provideMarkdown()` : ne **rien** ajouter ici. Le `mermaid` est chargé par le
  service, pas par une option globale

### Non touché (documenté)
- `chat-stream.service.ts` — le transport SSE reste le seul `fetch()` toléré
- `prisma/schema.prisma` — **aucune migration**, `Message.content` reste du texte brut
- `message-user-bubble.component.ts` — l'utilisateur n'a pas de blocs interactifs
- `genkit-flow.ts` — pipeline mort (port 3400, non branché), hors scope
- `features/chat/index.ts` — **pas d'export ajouté** (le skill interdit les barrels qui cassent le
  tree-shaking ; le repo n'utilise déjà aucun barrel de feature)

## 5. Steps

1. **Vérifier le peer `mermaid`** — `mermaid` accepte-t-il Angular 20.3 ? Si non ou si le bundle est
   trop lourd : import dynamique via `mermaid-loader.service.ts` (choix par défaut, voir §3.1).
2. **`chat-blocks.model.ts` + `chat-blocks.parser.ts`** — fonction pure, regex locale, gestion correcte
   de `isComplete` sur bloc ouvert/fermé. C'est la fondation : les steps 3, 4 et 9 en dépendent.
3. **`chat-blocks.parser.spec.ts`** — cas limites : 2 parses successifs (anti-fuite `lastIndex`),
   fence non fermée, 2 blocs + texte intercalé, texte vide, fence non enregistré (```` ```ts ````).
4. **`chat-block-registry.ts` + `chat-blocks.component.ts`/`.html`** — `OnPush`, `input()`,
   `computed()`, `NgComponentOutlet`, `track block.id`, mémo du segment.
5. **`quiz-payload.model.ts` + `quiz-payload.util.ts` + spec** — validation stricte, rejet hors bornes.
6. **`quiz-widget.component.ts`/`.html`** — `OnPush`, `linkedSignal` pour la réponse, les 3 types,
   feedback, explication.
7. **`mermaid-loader.service.ts` + `package.json`** — import dynamique mémoïsé ; `[mermaid]` conditionnel
   dans la bulle IA, piloté par un `computed()`.
8. **Étendre `tutor-prompt.ts`** + spec — règles de format des blocs côté LLM.
9. **Tests d'intégration** — historique rechargé, blocs non passés au markdown, non-réinitialisation
   de la réponse au re-render, mémo du segment.
10. **Audit best practices** — `ChangeDetectionStrategy.OnPush` sur chaque nouveau composant, zéro
    méthode dans le template, zéro `subscribe()`, zéro import de barrel, zéro `CommonModule`.
11. **Validation** — `tsc`, `pnpm lint`, builds FE+BE, specs FE, specs BE, `format:check`, guard themes.

## 6. Test assertions (Act / Wait / Assert)

**Parser**
- Act : `parseMessage('texte', false)` Assert : 1 bloc texte `isComplete: true`.
- Act : 2 appels successifs sur 2 messages différents Assert : aucune fuite de `lastIndex` (bug du
  prototype), le 2e message est analysé depuis 0.
- Act : ```` ```quiz ```` non fermé + `isStreaming: true` Assert : `isComplete: false`,
  `parseQuizPayload` → `null`, **aucun throw**.
- Act : ```` ```quiz ```` fermé Assert : `isComplete: true`, payload parsée.
- Act : quiz + texte + quiz Assert : 3 blocs, `type` et offsets dans l'ordre.
- Act : `''` Assert : `[]`.
- Act : ```` ```ts ```` Assert : reste du texte, jamais un bloc quiz.

**Quiz payload**
- Act : JSON valide `single-choice` Assert : objet typé, `options.length === 4`.
- Act : `'{"type":"quiz"` (tronqué) Assert : `null`, pas d'exception.
- Act : `type: 'unknown-type'` Assert : `null`.
- Act : `correctAnswer: 9` avec 3 options Assert : `null`.
- Act : `question: ''` Assert : `null`.

**Widget**
- Act : clic option 2 puis « Vérifier » Assert : `answered: true`, feedback vert, explication visible.
- Act : mauvais choix Assert : feedback rouge + explication, `answered` reste `true`.
- Act : re-render du parent Assert : la réponse sélectionnée **survit** (clé `track` stable).
- Act : 0 option sélectionnée + « Vérifier » Assert : bouton désactivé, aucune action.

**Intégration rendu**
- Act : message IA avec quiz Assert : `<markdown>` rendu pour le texte, widget pour le bloc, et
  **un seul** markdown `innerHTML` — le quiz n'est jamais passé au markdown.
- Act : message utilisateur avec ```` ```mermaid ```` Assert : aucun widget, fence restant du texte.
- Act : message IA avec mermaid Assert : `[mermaid]` actif, `.mermaid` rendu.
- Act : `mapSessionMessages` sur un contenu persisté Assert : mêmes blocs qu'en streaming.
- Act : message IA **sans** mermaid Assert : `[mermaid]` inactif (pas de coût mermaid).

**Perf (le cœur du sujet)**
- Act : 20 tokens identiques sur un segment texte déjà stable Assert : le `<markdown>` ne reçoit pas
  de nouvelle valeur (mémo), pas de re-parse.
- Act : streaming d'un quiz ouvert Assert : aucun `JSON.parse` appelé, squelette affiché.
- Act : `blocks()` recalculé à chaque token Assert : les `id` des blocs **déjà clos** sont inchangés
  (offset source), donc `track` ne détruit pas leurs instances.
- Act : un message de 500 mots avec 2 quiz Assert : le 1er segment markdown ne re-rend pas quand seul
  le 2e bloc grandit.

**Best practices Angular (audit automatisable)**
- Act : lire la source des nouveaux composants Assert : `ChangeDetectionStrategy.OnPush` présent sur
  `chat-blocks.component` et `quiz-widget.component`.
- Act : lire les templates Assert : **0** appel de méthode (`{{ x() }}` oui, `{{ x() }}()` non),
  `@if`/`@for`/`@switch` uniquement, **0** `*ngIf`/`*ngFor`.
- Act : `imports` de `chat-blocks.component` Assert : `NgComponentOutlet` importé depuis
  `@angular/common`, **pas** de `CommonModule`, pas de `*ngIf`/`*ngFor` legacy.
- Act : grep `apps/frontend/src/app/features/chat/message-item/` Assert : **0** `subscribe(`,
  **0** `implements OnDestroy`, **0** `ngOnChanges` écrit à la main dans nos fichiers.
- Act : grep Assert : **0** import depuis un barrel (`from '.../index'`) dans les nouveaux fichiers.
- Act : `answer` du quiz Assert : c'est un `linkedSignal` (dérivé de `payload`, éditable), pas un
  `signal` resynchronisé par un `effect`.
- Act : `blocks` / `hasMermaid` / `canSubmit` Assert : ce sont des `computed()`, pas des getters
  ni des méthodes appelées depuis le template.
- Act : `mermaid-loader.service.ts` Assert : `await import('mermaid')` — **pas** d'import statique
  en tête de fichier (le skill « Dynamic Import Third-Party Libraries »).

**Backend**
- Act : `buildTutorSystemPrompt('German')` Assert : contient `quiz`, `mermaid`, la règle JSON
  (pas de virgule traînante), la règle d'échappement Mermaid, et `German` interpolé.
- Act : payloads Gemini / Groq / OpenAI-compat Assert : les 3 contiennent le prompt étendu via la
  **même** fonction (un seul point de modification).

**Sécurité**
- Act : lire `app.config.ts` Assert : `provideMarkdown()` sans `disableSanitizer`.
- Act : grep du code Assert : 0 occurrence de `bypassSecurityTrust` et de `innerHTML=` écrit à la main.

**Build**
- Act : `nx run-many --target=build --all` Wait : terminé Assert : exit 0.

## 7. Acceptance criteria

- [ ] `chat-blocks.parser.ts` est une fonction pure : pas de regex `static` + `g`, pas d'état global,
      testée sur 2 appels successifs.
- [ ] Un bloc dont la fence n'est pas fermée n'est **jamais** rendu (`isComplete: false`) et ne lève
      aucune erreur.
- [ ] `CHAT_BLOCK_REGISTRY` associe chaque `BlockType` à un composant ; type inconnu → fallback texte
      propre, pas d'erreur.
- [ ] **Chaque nouveau composant est `OnPush`.** Vérifiable par grep sur `chat-blocks.component` et
      `quiz-widget.component`.
- [ ] **Zéro méthode dans les templates** — tout dérivé est un `computed()` (`blocks`, `hasMermaid`,
      `canSubmit`, `resolvedComponent`).
- [ ] **`answer` est un `linkedSignal`** (dérivé du payload, éditable par l'utilisateur), pas un
      `signal` resynchronisé par un `effect` — interdit par `stack.md`.
- [ ] **Zéro `subscribe()`** dans les nouveaux fichiers, donc zéro `DestroyRef`/`OnDestroy`.
- [ ] **Zéro import de barrel** : `NgComponentOutlet` vient de `@angular/common` directement,
      `CommonModule` n'est pas importé, rien n'est ajouté à `features/chat/index.ts`.
- [ ] `mermaid` chargé par **import dynamique** dans `mermaid-loader.service.ts` — jamais en import
      statique, jamais dans le bundle initial.
- [ ] `QuizWidgetComponent` gère `single-choice`, `multiple-choice`, `fill-in-the-blank`, avec feedback
      correct/incorrect + explication. État en `signal`, **aucun appel HTTP, aucune migration Prisma**.
- [ ] La réponse à un quiz **survit** à un re-render (clé `track block.id` stable) — testé.
- [ ] Le segment de texte déjà rendu n'est pas re-parsé à chaque token (mémo) — testé.
- [ ] `mermaid` installé et rendu via l'input natif `<markdown mermaid>` — **aucun composant mermaid
      custom**. `[mermaid]` conditionnel (actif seulement si un bloc mermaid est présent).
- [ ] `buildTutorSystemPrompt()` étendu avec les règles des blocs — **une seule** modification,
      vérifiée sur les 3 providers.
- [ ] `ChatMessage` inchangé, `Message.content` inchangé, **aucune migration Prisma**.
- [ ] `message-user-bubble.component.ts` inchangé (pas de blocs chez l'utilisateur).
- [ ] 0 `bypassSecurityTrust*`, 0 `innerHTML=` manuel, `provideMarkdown()` sans `disableSanitizer`.
- [ ] daisyUI tokens uniquement (`base-100`, `primary`, `success`, `error`, `base-content/…`) —
      0 couleur codée en dur, `check-theme-tokens.mjs` OK.
- [ ] Specs parser + payload + intégration vertes. `pnpm lint` 0, builds FE+BE exit 0,
      specs backend vertes, `format:check` propre, aucun fichier > 200 lignes.

## 8. Risques et mitigations

- **`ngx-markdown` re-rend inconditionnellement** (`ngOnChanges → loadContent → render`, pas de
  `distinctTimeStamp` dans la v22) → **ce n'est pas corrigeable par le Change Detection Angular**
  (signals, `OnPush`, `computed` n'y changent rien : la lib réagit à la *référence* de `data`).
  Correction architecturale : `blockId(offset, type)` + `track block.id` + mémo du segment, pour que
  `[data]` ne soit **pas réassigné** quand le contenu est identique. Limite assumée : le dernier
  segment est re-parsé à chaque token, c'est inévitable.
- **Peer `mermaid` incompatible Angular 20.3** → vérifié au step 1 ; par défaut import dynamique
  chargé seulement si un bloc mermaid est présent, ce qui limite aussi le coût de bundle.
- **`mermaid.run()` re-rend tous les `.mermaid` du document** → n'activer `[mermaid]` que sur la
  bulle IA qui contient effectivement un diagramme (`hasMermaid` computed).
- **App zoneless** (`app.config.ts:25`) → sans `OnPush`, un composant ne se rafraîchit qu'à travers
  ses signals. Tout nouveau composant doit être `OnPush` + signals, sinon rendu partiel.
- **LLM produit du JSON invalide** → `parseQuizPayload` → `null`, fallback texte + fence brut, jamais
  d'exception. C'est le cas le plus fréquent en production.
- **Quiz réinitialisé à chaque frame** → `track block.id` sur offset source ; test dédié.
- **Widget recréé par `NgComponentOutlet`** → ne jamais résoudre le composant via une méthode appelée
  dans le template ; le résoudre dans un `computed()` pour que la référence soit stable.
- **Sanitizer** → ne jamais activer `disableSanitizer` ; test qui échoue s'il apparaît.
- **Prompt trop long** → les règles de blocs ajoutent ~40 lignes au system prompt ; surveiller le
  `max_tokens: 1024` déjà hardcodé (`openai-compat.service.ts:48,100`) — un diagramme + un quiz
  peuvent le saturer, donc **ne pas fixer un nombre de blocs** dans le prompt.

## 9. Hors scope

- **Persistance des réponses aux quiz** (choix acté : signal en mémoire, pas de DB). Ouvrir une task
  si le besoin de progression apparaît.
- **Notifier l'IA de la réponse** au tour suivant (via le contexte invisible) — non implémenté ici.
- Autres types de blocs (`flashcard`, `vocab-card`, `chart`) — le registre les supportera, mais
  seul `quiz` est livré.
- Migration des autres prompts : `genkit-flow.ts:58,110` (pipeline mort, port 3400) garde son
  system prompt inline.
- Rendu mermaid côté user bubble.
- Preuve de performance chiffrée (profiling) — la mémo est implémentée et testée, pas benchmarkée.
