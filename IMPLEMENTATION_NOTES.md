# Mise en place de l'historique du chat et sélection automatique de la voix

## Changements implémentés

### Backend (NestJS + Prisma)

#### 1. Schéma de base de données (Prisma)
- **Modèle `Session`** : Stocke les sessions de chat avec :
  - `id` : Identifiant unique
  - `title` : Titre de la conversation (généré automatiquement à partir du premier message)
  - `learningLanguage` : Langue d'apprentissage (ex: 'en', 'fr', 'es')
  - `createdAt` / `updatedAt` : Horodatages
  - `userId` : Lien vers l'utilisateur (optionnel pour l'instant)
  - `messages` : Relation avec les messages

- **Modèle `Message`** : Stocke les messages individuels avec :
  - `id` : Identifiant unique
  - `role` : 'user' ou 'model'
  - `content` : Contenu du message
  - `createdAt` : Horodatage
  - `sessionId` : Lien vers la session

#### 2. Service ChatHistory
- `createSession()` : Crée une nouvelle session avec la langue d'apprentissage
- `getSession()` : Récupère une session avec tous ses messages
- `getAllSessions()` : Récupère toutes les sessions
- `addMessage()` : Ajoute un message à une session
- `getSessionHistory()` : Récupère l'historique formaté pour Gemini
- `deleteSession()` : Supprime une session

#### 3. Resolver GraphQL mis à jour
- **Queries** :
  - `getSessions` : Récupère la liste de toutes les sessions
  - `getSession(sessionId)` : Récupère une session spécifique avec ses messages
  
- **Mutations** :
  - `chat()` : Modifiée pour créer automatiquement une session si elle n'existe pas et retourner le `sessionId`
  - `deleteSession(sessionId)` : Supprime une session

### Frontend (Angular 20)

#### 1. Modèles TypeScript
- Interface `Session` : Type pour les sessions
- Interface `SessionDetail` : Type pour les détails d'une session
- Interface `Message` : Type pour les messages

#### 2. Composant App
- **Ajout de la query GraphQL** `GET_SESSIONS_QUERY` pour récupérer les sessions
- **Méthode `loadSessions()`** : Charge les sessions depuis le backend
- **Méthode `loadSession(sessionId)`** : Charge une session spécifique (à compléter)
- **Mise à jour de `sendMessage()` et `handleAudioRecorded()`** :
  - Récupère le `sessionId` retourné par le backend
  - Recharge la liste des sessions après chaque message

#### 3. Composant Sidebar
- **Input `sessions`** : Reçoit la liste des sessions du parent
- **Output `sessionSelected`** : Émet l'ID de la session sélectionnée
- **Sélection automatique de la voix** :
  - Utilise `effect()` pour surveiller les changements de langue
  - Méthode `selectVoiceForLanguage()` : Sélectionne automatiquement une voix correspondant à la langue d'apprentissage
  - Exemple : Si la langue est 'fr', sélectionne une voix française

## Configuration requise

### 1. Base de données PostgreSQL
Créez un fichier `.env` à la racine du projet avec :
```env
DATABASE_URL="postgresql://user:password@localhost:5432/live_english_teacher?schema=public"
GEMINI_API_KEY="votre-clé-api-gemini"
```

### 2. Migration de la base de données
```bash
# Générer le client Prisma
pnpm prisma generate

# Créer et appliquer la migration
pnpm prisma migrate dev --name add_session_and_message_models
```

## Fonctionnalités

### ✅ Historique persistant
- Les conversations sont sauvegardées en base de données
- Chaque session a un titre généré automatiquement
- Les messages sont liés à leur session

### ✅ Sélection automatique de la voix
- Lorsque vous changez la langue d'apprentissage dans la sidebar
- La voix de synthèse vocale est automatiquement mise à jour
- Exemple : Français → Voix française, Anglais → Voix anglaise

### ✅ Liste des conversations
- Affichage de toutes les sessions dans la sidebar
- Clic sur une session pour la charger (à compléter)
- Création de nouvelles conversations

## À faire (TODO)

1. **Charger les messages d'une session** : Implémenter la query GraphQL pour récupérer les messages d'une session et les afficher
2. **Authentification** : Lier les sessions à des utilisateurs authentifiés
3. **Suppression de sessions** : Ajouter un bouton pour supprimer des sessions
4. **Recherche** : Ajouter une fonctionnalité de recherche dans l'historique
5. **Export** : Permettre l'export des conversations

## Architecture

```
Backend (NestJS)
├── Prisma Schema (Session, Message, User)
├── ChatHistoryService (Gestion des sessions)
└── LiveResolver (GraphQL API)

Frontend (Angular 20)
├── Models (Session, Message)
├── App Component (Gestion des sessions)
└── Sidebar Component (Affichage et sélection)
```

## Notes techniques

- **Angular 20** : Utilisation des nouveaux signals et de la syntaxe `@for`, `@if`
- **Zoneless** : L'application utilise le mode sans zone
- **GraphQL** : Communication via Apollo Client
- **TTS** : Utilisation de l'API Web Speech Synthesis du navigateur
