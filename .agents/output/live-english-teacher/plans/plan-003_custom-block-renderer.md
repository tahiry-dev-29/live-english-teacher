Plan-ID: plan-003

# Plan 003 — Custom Renderer de blocs IA (Web Viewer)

**Projet:** live-english-teacher
**Déclencheur:** le LLM doit produire des widgets interactifs (quiz, diagrammes) au lieu de texte brut
**Date:** 2026-09-28
**Stack:** Angular 20.3.11, `ngx-markdown@22.0.2` + `marked@18.0.11`, NestJS 11
**Règles:** `.agents/rules/stack.md` (canonique), daisyUI tokens, plafond 200 lignes/fichier
**Destination:** fichiers locaux

---

## 1. Current state — ce qui existe déjà

L'audit change le point de départ par rapport à un design « from scratch » :

| Brique | État réel |
|---|---|
| Markdown renderer | **Déjà en place** — `ngx-markdown@22.0.2`, rendu via `<markdown [data]="text()" />` dans `message-ai-bubble.component.ts:26` et `message-user-bubble.component.ts:36` |
| Support mermaid | **Déjà implémenté dans ngx-markdown** — `extendsRendererForMermaid` réécrit ```` ```mermaid ```` en `<div class="mermaid">` (`fesm2022/ngx-markdown.mjs:294`), `renderMermaid` fait `querySelectorAll('.mermaid')` + `mermaid.initialize/run` (ligne 412-417). **Gaté** derrière l'input `mermaid`, jamais activé. Token `MERMAID_OPTIONS` déjà exporté |
| `mermaid` (la lib) | **Pas installée.** Déclarée en *optional peer* par ngx-markdown |
| Registre de composants dynamiques | **Zéro.** Aucun `createComponent`, `NgComponentOutlet`, `ViewContainerRef`, ni directive custom dans tout le repo. Greenfield |
| Point d'entrée du system prompt | **Unique** — `libs/backend/feature-live/src/lib/tutor/tutor-prompt.ts:5` `buildTutorSystemPrompt()`, appelé par les 3 providers (`gemini-live.util.ts:137`, `groq-request.util.ts:28`, `openai-request.util.ts:19`) |
| Persistance | **Texte brut** — `Message.content String @db.Text` (`prisma/schema.prisma:33`). L'historique rejoue des octets identiques via `mapSessionMessages` |
| `ChatMessage` | `{ role, text, audioData?, mimeType?, kind? }` — `models/chat-message.model.ts:1-18`. Aucun champ structuré |
| Streaming | Tokens concaténés `text += token` (`chat-stream.service.ts:170`), réécriture en place par index (`message-mapper.util.ts:30`). Aucune notion de fence |

**Conséquence de design :** le renderer doit être une **fonction pure de `text` + `role` + `isStreaming`**.
Aucune migration de schéma n'est nécessaire, et l'historique existant se ré-affiche correctement.

### 1.1 Défauts à corriger dans le prototype fourni

Le code d'exemple du cahier des charges a trois bugs qui casseraient en production :

1. `FENCE_REGEX` est `static` **avec le flag `g`** → `lastIndex` est conservé entre deux appels à `parse()`.
   Le deuxième message analysé repars de la mauvaise position et perd ou duplique des blocs.
2. `const isComplete = messageText.includes('\n\`\`\`', match.index + match[0].length - 3)` ne
   détecte pas la fermeture réelle du bloc et peut matcher le `\n\`\`\`` d'un **autre** bloc.
3. Le fragment de texte final n'est jamais marqué incomplet : pendant le streaming il serait
   rendu comme du texte stable alors qu'il est encore en train d'arriver.

---

## 2. Target architecture

```text
ChatMessage { text, role }  +  isStreaming (signal)
        │
        ▼
chat-blocks.parser.ts  ── PUR, sans état, sans regex static─g
   parseMessage(text, isStreaming) → ChatBlock[]
        │
        ▼
chat-blocks.component.ts  (le SEUL qui rend)
   ├── @for block
   │     ├── type 'text'    → <markdown [data]="..." />   (ngx-markdown, sanitizé)
   │     └── type 'quiz'    → <ng-container *ngComponentOutlet>  via le registre
   └── type 'mermaid' → PAS de composant ici : laissé au <markdown mermaid>
        │
        ▼
CHAT_BLOCK_REGISTRY : Record<BlockType, Type<unknown>>
   { quiz → QuizWidgetComponent }   (mermaid reste géré par ngx-markdown)
```

**Décision : mermaid ne passe pas par le registre.** `ngx-markdown` le gère déjà, en natif, avec le
Sanitizer d'Angular en place. On l'active avec l'input `mermaid` + l'installation de la lib. Le
registre ne porte que les widgets qu'Angular doit instancier lui-même (interactivité, état).

**Pourquoi un registre et pas un `marked` custom renderer :** un renderer `marked` ne produit que du
HTML. Il ne peut pas créer un composant Angular ni porter un signal d'état. Or un quiz est par
définition interactif. D'où le registre + `NgComponentOutlet`.

---

## 3. Data flow

1. Le LLM répond en Markdown + fences ` ```quiz ` (et ` ```mermaid ` pour les schémas).
2. `buildTutorSystemPrompt()` (backend, 1 seul endroit) impose les règles de format : types de blocs
   autorisés, JSON strictement valide, pas de virgules traînantes, échappement Mermaid.
3. Les tokens arrivent un par un. À chaque frame, `parseMessage()` recalcule la liste de blocs.
4. Un bloc n'est « rendu » (JSON.parse, mermaid.run) **que si sa fence est fermée** (`isComplete`).
   Sinon : squelette.
5. Après persistance, le rechargement de session rejoue le même texte → mêmes blocs, sans état.

---

## 4. API Angular 20

| Besoin | API | Justification |
|---|---|---|
| Parsing du texte | **fonction pure** (pas de Resource) | calcul déterministe, pas d'E/S |
| Rendu texte | `ngx-markdown` `<markdown>` (existant) | déjà en place, sanitizé |
| Rendu quiz | `NgComponentOutlet` + `input()` signals | pas de `createComponent` → pas d'injection dynamic nécessaire |
| `mermaid` | input `[mermaid]` de `<markdown>` | support natif ngx-markdown |
| Estado quiz | `signal()` local au composant | **choix acté** : pas de DB, pas de migration Prisma |

**Note `stack.md` :** aucune Resource API n'est introduite ici. La feature ne fait aucun appel
HTTP. Le transport SSE reste le seul `fetch()` toléré (`chat-stream.service.ts`), inchangé.

---

## 5. Contraintes de performance (identifiées à l'audit)

`ngx-markdown@22.0.2` fait `ngOnChanges() → loadContent() → render()` **inconditionnellement** à
chaque changement de `data` (`fesm2022/ngx-markdown.mjs:512-514`). Il n'existe **pas** d'input
`distinctTimeStamp` dans la v22 — vérifié dans les typings. Deux conséquences :

1. Chaque token déclenche un re-parse markdown complet de tout le message.
2. `renderMermaid` re-rend **tous** les `.mermaid` du document après chaque render.

Mitigations retenues (gating + optimisation, acté) :

- **Gating** : `isComplete` gate le `JSON.parse` du quiz et l'instanciation du widget → aucun
  `JSON.parse` sur du JSON tronqué, aucune erreur parasite pendant le streaming.
- **Clé de `@for` stable** : `track block.id` dérivé de l'offset du texte source → l'instance du
  widget n'est pas recréée à chaque frame, sinon `NgComponentOutlet` détruirait et recréerait le
  composant (perte d'état, answered clignote).
- **Mémo du segment texte** : ne pas réassigner `data` au `<markdown>` si le segment n'a pas changé
  (comparaison de chaîne) → évite le re-parse des segments déjà stables.
- **Mermaid** : ne pas activer `[mermaid]` sur les messages utilisateur ; uniquement sur le
  `<markdown>` de la bulle IA, et seulement si un bloc mermaid est présent.

---

## 6. Sécurité

- Le texte des blocs passe par `ngx-markdown`, qui applique le `DomSanitizer` d'Angular
  (`DEFAULT_SECURITY_CONTEXT = SecurityContext.HTML`, ligne 153 de la lib). Le repo n'active
  nulle part `disableSanitizer` — cette contrainte doit rester vraie.
- Le JSON d'un quiz est validé **avant** d'alimenter un signal : schéma explicite, rejet si
  `type` inconnu, si `question` est vide, ou si `correctAnswer` est hors bornes.
- Ne jamais `bypassSecurityTrustHtml` sur du contenu LLM.
- Mermaid : le prompt impose l'échappement des guillemets dans les labels (`A["Text (Info)"]`),
  ce qui évite la majorité des erreurs de rendu SVG.

---

## 7. Test assertions (Act / Wait / Assert)

**Parser — cas limites**
- Act : `parseMessage('texte', false)` Assert : 1 bloc texte, `isComplete: true`.
- Act : parser 2 messages successifs avec la même instance Assert : aucune fuite de `lastIndex`
  (le bug 1) — le 2e message est analysé depuis 0.
- Act : texte avec ```` ```quiz ```` **non fermé**, `isStreaming: true` Assert : bloc
  `isComplete: false`, `parseQuizPayload` renvoie `null`, aucun throw.
- Act : ```` ```quiz ```` fermé Assert : `isComplete: true`, payload parsée.
- Act : deux blocs quiz + texte entre les deux Assert : 3 blocs dans l'ordre, offsets corrects.
- Act : texte vide Assert : `[]` (pas un bloc vide).
- Act : fence ordinary ```` ```ts ```` Assert : reste du texte, **jamais** un bloc quiz.

**Quiz — validation**
- Act : `parseQuizPayload('{"type":"single-choice",...}')` Assert : objet typé.
- Act : JSON tronqué Assert : `null`, pas d'exception.
- Act : `type: 'unknown-type'` Assert : `null` (rejet, pas de rendu).
- Act : `correctAnswer: 9` avec 3 options Assert : `null` (hors bornes).
- Act : quiz valide Assert : les 4 options rendues, aucune sélection par défaut.
- Act : clicks option 2 puis « Vérifier » Assert : feedback correct + explication visible,
  état `answered: true`, re-render ne réinitialise pas la réponse (la clé `@for` est stable).

**Intégration rendu**
- Act : message IA contenant un quiz Assert : `<markdown>` présent pour le texte, widget quiz présent
  pour le bloc, et **un seul** `innerHTML` markdown (le bloc quiz n'est pas passé au markdown).
- Act : message utilisateur contenant ```` ```mermaid ```` Assert : pas de widget,
  le fence reste du texte.
- Act : historique rechargé depuis `mapSessionMessages` Assert : mêmes blocs qu'en direct.

**Intégration backend**
- Act : `buildTutorSystemPrompt('German')` Assert : contient `quiz`, `mermaid`, la règle JSON
  (pas de virgule traînante), la règle d'échappement Mermaid, et `German` interpolé.
- Act : payload Gemini / Groq / OpenAI-compat Assert : les 3 contiennent le system prompt étendu
  via la **même** fonction.

**Build**
- Act : `nx run-many --target=build --all` ; Wait : terminé ; Assert : exit 0.

---

## 8. Risques et mitigations

- **`mermaid` non compatible Angular 20 / SSR** → vérifier le peer range avant d'installer ; si le
  peer est cassé, charger `mermaid` en import dynamique uniquement quand un bloc mermaid existe.
- **Re-parse markdown à chaque token** → mesuré par la clé `@for` stable + la mémo de segment ; si
  ça reste trop, `distinctUntilChanged` sur le flux de tokens.
- **LLM qui produit du JSON invalide** → `parseQuizPayload` renvoie `null`, le bloc affiche un
  fallback texte + le fence brut, jamais une exception.
- **Quiz cassé par un re-render** → `track block.id` stable (offset source), testé explicitement.
- **Historique existant** → le renderer est une fonction pure de `text` : les anciens messages
  s'affichent sans migration. Vérifié par un test sur `mapSessionMessages`.
- **Sanitizer** → ne jamais activer `disableSanitizer` ; test qui échoue si `provideMarkdown()`
  reçoit cette option.

---

## 9. Definition of done

- [ ] `chat-blocks.parser.ts` est une **fonction pure**, sans regex `static` + `g`, sans état global.
- [ ] `parseMessage()` respecte `isStreaming` : un bloc ouvert n'est jamais rendu.
- [ ] Le registre associe chaque `BlockType` à un composant Angular ; type inconnu → fallback texte.
- [ ] `QuizWidgetComponent` : 3 types (`single-choice`, `multiple-choice`, `fill-in-the-blank`),
      feedback correct/incorrect + explication, état en `signal`, aucun appel HTTP.
- [ ] `mermaid` installé et activé via l'input natif `<markdown mermaid>` — pas de composant custom.
- [ ] `buildTutorSystemPrompt()` étendu : règles des blocs, JSON strict, échappement Mermaid.
      Un seul point de modification, vérifié sur les 3 providers.
- [ ] Aucun `disableSanitizer`, aucun `bypassSecurityTrust*`, aucun `innerHTML` écrit à la main.
- [ ] Specs parser + payload + intégration, tous verts. Build FE+BE exit 0. `pnpm lint` 0.
- [ ] Aucun fichier > 200 lignes.

**Readiness:** 8/10 — l'existant (`ngx-markdown`, mermaid natif, prompt unique, persistance texte)
réduit fortement le périmètre. Le risque principal est la compatibilité du peer `mermaid` avec
Angular 20.3, à vérifier au premier step.
