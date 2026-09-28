# Angular v20 HTTP API Skill

> ## ⚠️ READ FIRST — project override
>
> This skill is the upstream reference. **In `live-english-teacher`, the canonical rule is
> `.agents/rules/stack.md` § "HTTP Frontend — Resource APIs obligatoires".** It already matches this
> file's Purpose (GET → `httpResource()`, mutations → `rxResource()`), so the two are aligned.
>
> Sections of this file that **contradict** the project rule and must not be followed as
> convention are marked `⚠️ SUPERSEDED`:
> - "Standard Observable HTTP" (raw `HttpClient` Observables) — superseded
> - "Why Not Use `rxResource()` for Every Action?" — superseded
> - "API Selection Matrix" / "Final Agent Rule" — superseded by the matrix override box
>
> In this project: `fetch()` and native-`Promise` HTTP are **forbidden** in `features/**` (only the
> SSE transport keeps `fetch()`), `HttpClient` is never injected outside a service, and backend
> outbound HTTP uses **axios**, never `fetch()`.

## Purpose

Use this skill when implementing API/data-access layers in **Angular 20** using the experimental Resource APIs.

This skill establishes the project's convention:

- **`httpResource()` for all GET/read HTTP requests**
- **`rxResource()` for ACTIONS/mutations and existing RxJS-based API flows**
- **`resource()` for generic asynchronous read operations that are not directly handled by `httpResource()`**
- Keep API/data-access logic in dedicated services.
- Do not put API calls directly in components.
- Prefer Angular Signals and standalone APIs.
- Target **Angular 20 syntax**, not Angular 22+ stable syntax.

> Important: In Angular 20, Resource APIs are experimental. Do not silently apply Angular 22+ API syntax to an Angular 20 project.

## Angular 20 API Policy

### 1. GET / read requests → `httpResource()`

Use `httpResource()` for HTTP GET operations that retrieve server state.

Examples:

- Get one user
- Get a user list
- Search users
- Get a profile
- Get dashboard data
- Get configuration
- Get paginated resources

### 2. ACTIONS / mutations → `rxResource()`

Use `rxResource()` for application actions such as:

- POST
- PUT
- PATCH
- DELETE
- Login
- Logout
- Create
- Update
- Delete
- Trigger server-side actions
- Existing RxJS-based workflows

The action should remain explicitly triggered. Do not model a mutation as an automatically reactive GET resource.

### 3. Generic async reads → `resource()`

Use `resource()` when the asynchronous operation is not naturally an HTTP GET through `HttpClient`, for example:

- browser APIs
- async SDK calls
- Promise-based clients
- non-HTTP asynchronous data sources

Do not use `resource()` merely because an HTTP endpoint exists. For normal GET HTTP calls, prefer `httpResource()`.

---

# Angular 20 Syntax Rules

Angular 20 uses the experimental Resource API.

For `resource()` and `rxResource()`, use the Angular 20 API shape supported by the project's installed Angular 20 version.

Do **not** copy Angular 22+ examples blindly.

Angular 20 Resource APIs may use the `request` terminology in the resource configuration, while later stable Angular APIs use `params`.

### Angular 20 pattern

```ts
resource({
  request: () => ({
    id: this.userId()
  }),

  loader: async ({ request, abortSignal }) => {
    // ...
  }
});
```

For an Angular 20 project, preserve the API shape provided by the Angular 20 type definitions installed in the project.

### Do not replace Angular 20 `request` with Angular 22 `params` unless the project has actually been migrated to the corresponding API version.

---

# Recommended Architecture

Use this structure:

```text
Component
    │
    │ inject()
    ▼
Feature API Service
    │
    ├── httpResource()   → GET / reads
    │
    ├── rxResource()     → actions / mutations
    │
    └── resource()       → generic async reads
            │
            ▼
        Backend / SDK
```

The component should consume signals/resources from the service.

Avoid:

```ts
@Component({...})
export class UserComponent {
  private readonly http = inject(HttpClient);

  // Avoid API calls directly in components.
}
```

Prefer:

```ts
@Component({...})
export class UserComponent {
  protected readonly userApi = inject(UserApiService);
}
```

---

# Example: User API Service

## Models

```ts
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}
```

## Service

```ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { httpResource } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class UserApiService {
  private readonly http = inject(HttpClient);

  private readonly selectedUserId = signal<number | undefined>(undefined);

  // GET /users/:id
  readonly user = httpResource<User>(() => {
    const id = this.selectedUserId();

    return id === undefined
      ? undefined
      : `/api/users/${id}`;
  });

  selectUser(id: number): void {
    this.selectedUserId.set(id);
  }

  // ACTION: POST /users
  readonly createUser = rxResource({
    request: () => undefined,

    loader: () => {
      throw new Error(
        'Create action must be triggered explicitly; do not make mutations automatically reactive.'
      );
    }
  });

  create(request: CreateUserRequest) {
    return this.http.post<User>('/api/users', request);
  }

  update(id: number, request: UpdateUserRequest) {
    return this.http.patch<User>(`/api/users/${id}`, request);
  }

  delete(id: number) {
    return this.http.delete<void>(`/api/users/${id}`);
  }
}
```

## Important mutation rule

Do not create an automatically executing resource for POST/PUT/PATCH/DELETE merely because the API can technically return an Observable.

Mutations represent **commands/actions**, not reactive server-state reads.

For example:

```ts
create(request: CreateUserRequest) {
  return this.http.post<User>('/api/users', request);
}
```

The component or an orchestration layer can explicitly subscribe/convert the action according to the application's architecture.

If the project has a standardized explicit action-resource abstraction, use that abstraction consistently rather than inventing a new pattern per service.

---

# GET with Reactive Parameters

For a GET whose URL depends on a Signal:

```ts
private readonly userId = signal<number | undefined>(undefined);

readonly user = httpResource<User>(() => {
  const id = this.userId();

  return id === undefined
    ? undefined
    : `/api/users/${id}`;
});
```

When:

```ts
this.userId.set(42);
```

the HTTP resource reacts to the changed URL and fetches the corresponding user.

Prefer this over manually subscribing to `HttpClient.get()` for ordinary GET server-state reads.

---

# GET with Query Parameters

Use the HTTP request configuration when query parameters, headers, or other request options are required.

```ts
readonly users = httpResource<User[]>(() => ({
  url: '/api/users',
  method: 'GET',
  params: {
    page: this.page(),
    size: this.pageSize(),
    search: this.search()
  }
}));
```

Keep reactive request values inside the reactive request factory.

---

# Loading, Error, and Value

A resource exposes reactive state.

Typical consumption:

```ts
resource.value()
resource.isLoading()
resource.error()
resource.status()
```

Example:

```ts
@if (userApi.user.isLoading()) {
  <p>Loading...</p>
}

@if (userApi.user.error(); as error) {
  <p>Failed to load user.</p>
}

@if (userApi.user.value(); as user) {
  <h2>{{ user.name }}</h2>
  <p>{{ user.email }}</p>
}
```

Do not create redundant component state such as:

```ts
isLoading = signal(false);
user = signal<User | null>(null);
error = signal<unknown>(null);
```

when the Resource already owns those states.

---

# Service Boundary

API services should own:

- endpoint definitions
- HTTP request construction
- request parameters
- resource definitions
- API DTOs
- API-specific transformations
- API actions

Components should own:

- UI state
- presentation state
- user interaction
- view composition

Example:

```text
user-api.service.ts
    ├── User DTOs
    ├── GET resources
    └── API actions

user.component.ts
    ├── inject(UserApiService)
    ├── UI signals
    └── template interaction
```

---

# Naming Convention

Use names that describe the resource or action.

Good:

```ts
readonly user = httpResource<User>(...);

readonly users = httpResource<User[]>(...);

readonly currentProfile = httpResource<Profile>(...);

createUser(...);

updateUser(...);

deleteUser(...);
```

Avoid vague names:

```ts
readonly data = ...;

readonly request = ...;

readonly response = ...;

readonly api = ...;
```

---

# `httpResource()` Rules

Use `httpResource()` when:

```text
HTTP
 +
GET
 +
server-state read
```

Examples:

```ts
readonly user = httpResource<User>(...);

readonly users = httpResource<User[]>(...);

readonly profile = httpResource<Profile>(...);

readonly dashboard = httpResource<DashboardData>(...);
```

Do not use it as a generic replacement for every `HttpClient` call.

---

# `rxResource()` Rules

Use `rxResource()` when RxJS is the actual data-source abstraction and the operation is appropriate for the Resource model.

For Angular 20:

```ts
import { rxResource } from '@angular/core/rxjs-interop';
```

The RxJS-based resource uses an RxJS loader/stream according to the Angular 20 type definitions.

Do not assume Angular 22's stable API shape when working on Angular 20.

---

# `resource()` Rules

Use `resource()` for generic asynchronous reads:

```ts
readonly data = resource({
  request: () => ({
    key: this.key()
  }),

  loader: async ({ request, abortSignal }) => {
    return someAsyncOperation(
      request.key,
      abortSignal
    );
  }
});
```

Do not use `resource()` for ordinary HTTP GET if `httpResource()` is appropriate.

---

# Actions vs Resources

Use this mental model:

```text
RESOURCE
---------
"What is the current server state?"

GET /users/42
GET /users
GET /profile
GET /dashboard


ACTION
------
"Do this operation."

POST /users
PUT /users/42
PATCH /users/42
DELETE /users/42
POST /login
POST /logout
POST /users/42/activate
```

Resources are primarily for reactive reads.

Actions are explicit commands.

This distinction prevents accidental mutations caused by reactive dependency changes.

---

# Do Not Do This

## Do not put API calls in components

```ts
export class UserComponent {
  private readonly http = inject(HttpClient);

  loadUser() {
    this.http.get<User>('/api/users/1').subscribe();
  }
}
```

## Do not manually subscribe for ordinary GET resources

```ts
this.http.get<User>('/api/users/1').subscribe(user => {
  this.user.set(user);
});
```

Prefer:

```ts
readonly user = httpResource<User>(
  () => '/api/users/1'
);
```

## Do not use a mutation as an automatic reactive resource

Avoid patterns where changing a Signal accidentally triggers:

```text
Signal change
    ↓
POST
    ↓
database mutation
```

unless the behavior is explicitly intentional and architecturally required.

---

# Angular 20 vs Angular 22 Warning

This skill targets **Angular 20**.

Angular's Resource APIs evolved after Angular 20 and became stable in Angular 22.

Therefore, when the agent sees examples such as:

```ts
resource({
  params: () => ...
})
```

it must first verify the project's Angular version.

For an Angular 20 project, do not automatically migrate the code to the Angular 22 stable API.

Likewise, do not claim that Angular 20 and Angular 22 have identical Resource syntax.

---

# Version Verification

Before generating Resource API code, inspect:

```json
{
  "dependencies": {
    "@angular/core": "...",
    "@angular/common": "..."
  }
}
```

or run:

```bash
ng version
```

If Angular 20 is detected:

```text
Target Angular 20 API syntax.
```

If Angular 22+ is detected:

```text
Use the stable API documented for that version.
```

Never mix API syntax from different Angular major versions in the same implementation.

---

# Decision Matrix

| Requirement | Angular 20 API |
|---|---|
| GET user | `httpResource()` |
| GET users | `httpResource()` |
| Search users | `httpResource()` |
| GET dashboard | `httpResource()` |
| GET profile | `httpResource()` |
| Promise-based async read | `resource()` |
| Non-HTTP async read | `resource()` |
| Existing Observable-based API flow | `rxResource()` |
| POST create | explicit action / mutation flow |
| PUT update | explicit action / mutation flow |
| PATCH update | explicit action / mutation flow |
| DELETE | explicit action / mutation flow |
| Login | explicit action / mutation flow |
| Logout | explicit action / mutation flow |

---

# Agent Implementation Checklist

Before generating code:

1. Detect the Angular major version.
2. If Angular 20, use Angular 20 Resource API syntax.
3. Keep API logic in a dedicated service.
4. Use `httpResource()` for GET/read HTTP requests.
5. Use `resource()` for generic asynchronous reads.
6. Use `rxResource()` where an RxJS-based resource abstraction is appropriate.
7. Treat POST/PUT/PATCH/DELETE as explicit actions/mutations.
8. Do not place `HttpClient` API calls directly in components.
9. Prefer Signals over duplicated loading/data/error state.
10. Make reactive GET parameters dependencies of the resource.
11. Avoid mixing Angular 20 and Angular 22 Resource syntax.
12. Check the installed Angular typings when an API signature is uncertain.

---

# Complete Example: User API

The following example is the reference pattern for an Angular 20 application.

## User model

```ts
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}
```

## User API service

```ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export interface CreateUserRequest {
  name: string;
  email: string;
  role: 'admin' | 'user';
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: 'admin' | 'user';
}

@Injectable({
  providedIn: 'root'
})
export class UserApiService {
  private readonly http = inject(HttpClient);

  private readonly userId = signal<number | undefined>(undefined);

  /*
   * GET /api/users/:id
   *
   * All GET requests should use httpResource().
   */
  readonly user = httpResource<User>(() => {
    const id = this.userId();

    return id === undefined
      ? undefined
      : `/api/users/${id}`;
  });

  selectUser(id: number): void {
    this.userId.set(id);
  }

  /*
   * ACTION: POST /api/users
   *
   * Mutations are explicit commands.
   */
  createUser(request: CreateUserRequest) {
    return this.http.post<User>('/api/users', request);
  }

  /*
   * ACTION: PATCH /api/users/:id
   */
  updateUser(id: number, request: UpdateUserRequest) {
    return this.http.patch<User>(
      `/api/users/${id}`,
      request
    );
  }

  /*
   * ACTION: DELETE /api/users/:id
   */
  deleteUser(id: number) {
    return this.http.delete<void>(
      `/api/users/${id}`
    );
  }
}
```

## Component

The component does not inject `HttpClient`.

```ts
import { Component, inject } from '@angular/core';
import { UserApiService } from './user-api.service';

@Component({
  selector: 'app-user',
  standalone: true,
  template: `
    @if (userApi.user.isLoading()) {
      <p>Loading user...</p>
    }

    @if (userApi.user.error(); as error) {
      <p>Unable to load user.</p>
    }

    @if (userApi.user.value(); as user) {
      <section>
        <h2>{{ user.name }}</h2>
        <p>{{ user.email }}</p>
        <p>{{ user.role }}</p>
      </section>
    }

    <button type="button" (click)="loadUser(42)">
      Load user
    </button>
  `
})
export class UserComponent {
  protected readonly userApi = inject(UserApiService);

  loadUser(id: number): void {
    this.userApi.selectUser(id);
  }
}
```

---

# Complete Example: GET Collection

For a collection endpoint:

```http
GET /api/users
```

Use `httpResource()`.

```ts
private readonly page = signal(1);
private readonly pageSize = signal(20);

readonly users = httpResource<User[]>(() => ({
  url: '/api/users',
  method: 'GET',
  params: {
    page: this.page(),
    size: this.pageSize()
  }
}));
```

Changing:

```ts
this.page.set(2);
```

changes the resource dependencies and causes the GET request to be refreshed.

---

# Complete Example: GET Search

For:

```http
GET /api/users?search=kevin
```

use:

```ts
private readonly search = signal('');

readonly users = httpResource<User[]>(() => ({
  url: '/api/users',
  method: 'GET',
  params: {
    search: this.search()
  }
}));

setSearch(value: string): void {
  this.search.set(value);
}
```

The search value is reactive and belongs to the GET resource.

---

# Complete Example: GET by ID

```ts
private readonly userId = signal<number | undefined>(undefined);

readonly user = httpResource<User>(() => {
  const id = this.userId();

  if (id === undefined) {
    return undefined;
  }

  return {
    url: `/api/users/${id}`,
    method: 'GET'
  };
});
```

Use:

```ts
loadUser(id: number): void {
  this.userId.set(id);
}
```

Do not manually subscribe to the GET request.

---

# Complete Example: GET with Headers

```ts
readonly profile = httpResource<User>(() => ({
  url: '/api/profile',
  method: 'GET',
  headers: {
    'X-Client-Version': '1.0'
  }
}));
```

If the header depends on reactive state:

```ts
private readonly clientVersion = signal('1.0');

readonly profile = httpResource<User>(() => ({
  url: '/api/profile',
  method: 'GET',
  headers: {
    'X-Client-Version': this.clientVersion()
  }
}));
```

---

# Complete Example: Generic `resource()`

Use `resource()` when the operation is asynchronous but is not naturally an HTTP GET handled by `httpResource()`.

```ts
import { Injectable, signal } from '@angular/core';
import { resource } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ConfigurationService {
  private readonly configurationKey = signal('application');

  readonly configuration = resource({
    request: () => ({
      key: this.configurationKey()
    }),

    loader: async ({ request, abortSignal }) => {
      return loadConfiguration(
        request.key,
        abortSignal
      );
    }
  });
}
```

The important Angular 20 pattern is:

```ts
resource({
  request: () => ...,

  loader: async ({ request, abortSignal }) => ...
});
```

Do not automatically rewrite this to the Angular 22+ `params` API when the project is Angular 20.

---

# Complete Example: `rxResource()`

Use `rxResource()` when the operation is based on an Observable and the Resource abstraction is appropriate.

Example:

```ts
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class UserSearchService {
  private readonly http = inject(HttpClient);

  private readonly search = signal('');

  readonly users = rxResource({
    request: () => ({
      search: this.search()
    }),

    loader: ({ request }) => {
      return this.http.get<User[]>(
        '/api/users',
        {
          params: {
            search: request.search
          }
        }
      );
    }
  });

  setSearch(value: string): void {
    this.search.set(value);
  }
}
```

Use this pattern when RxJS is intentionally part of the resource abstraction.

For a normal Angular 20 HTTP GET, however, prefer:

```ts
httpResource()
```

instead of introducing `rxResource()` unnecessarily.

---

# Complete Example: POST Action

A POST is a command.

```ts
createUser(request: CreateUserRequest) {
  return this.http.post<User>(
    '/api/users',
    request
  );
}
```

The action is explicitly executed by the caller:

```ts
saveUser(request: CreateUserRequest): void {
  this.userApi.createUser(request).subscribe({
    next: user => {
      console.log('Created:', user);
    },
    error: error => {
      console.error('Creation failed:', error);
    }
  });
}
```

Do not make a POST execute automatically because a Signal changed.

---

# Complete Example: PATCH Action

```ts
updateUser(
  id: number,
  request: UpdateUserRequest
) {
  return this.http.patch<User>(
    `/api/users/${id}`,
    request
  );
}
```

Usage:

```ts
saveChanges(
  id: number,
  request: UpdateUserRequest
): void {
  this.userApi.updateUser(id, request).subscribe({
    next: user => {
      console.log(user);
    }
  });
}
```

---

# Complete Example: DELETE Action

```ts
deleteUser(id: number) {
  return this.http.delete<void>(
    `/api/users/${id}`
  );
}
```

Usage:

```ts
removeUser(id: number): void {
  this.userApi.deleteUser(id).subscribe({
    next: () => {
      console.log('User deleted');
    }
  });
}
```

---

# Complete CRUD Architecture

For a complete User feature:

```text
UserComponent
      │
      ▼
UserApiService
      │
      ├── GET /users
      │      └── httpResource()
      │
      ├── GET /users/:id
      │      └── httpResource()
      │
      ├── POST /users
      │      └── explicit action
      │
      ├── PATCH /users/:id
      │      └── explicit action
      │
      └── DELETE /users/:id
             └── explicit action
```

Reference implementation:

```ts
@Injectable({
  providedIn: 'root'
})
export class UserApiService {
  private readonly http = inject(HttpClient);

  private readonly userId = signal<number | undefined>(undefined);

  readonly users = httpResource<User[]>(() => ({
    url: '/api/users',
    method: 'GET'
  }));

  readonly user = httpResource<User>(() => {
    const id = this.userId();

    return id === undefined
      ? undefined
      : `/api/users/${id}`;
  });

  selectUser(id: number): void {
    this.userId.set(id);
  }

  createUser(request: CreateUserRequest) {
    return this.http.post<User>(
      '/api/users',
      request
    );
  }

  updateUser(
    id: number,
    request: UpdateUserRequest
  ) {
    return this.http.patch<User>(
      `/api/users/${id}`,
      request
    );
  }

  deleteUser(id: number) {
    return this.http.delete<void>(
      `/api/users/${id}`
    );
  }
}
```

This is the default architecture an AI agent should generate for an Angular 20 CRUD API unless the project explicitly requires another pattern.

---


# Standard Observable HTTP

> ⚠️ **SUPERSEDED for `live-english-teacher`.** Project rule (`stack.md`): a standalone
> `HttpClient` Observable is not a service-level API. Wrap it in `rxResource()` (`stream` loader) for
> mutations, or use `httpResource()` for reactive GET. The only tolerated exception is a one-off GET
> fired by a user action. Kept below as upstream rationale.

Use the standard `HttpClient` Observable pattern when the operation is a command/action or when the application explicitly needs an Observable.

This is an important fourth option alongside:

```text
httpResource()
resource()
rxResource()
HttpClient Observable
```

## Standard GET Observable

For a standard Observable GET:

```ts
readonly user$ = this.http.get<User>(
  `/api/users/${id}`
);
```

Consume it with the `async` pipe when appropriate:

```html
@if (user$ | async; as user) {
  <h2>{{ user.name }}</h2>
  <p>{{ user.email }}</p>
}
```

Do not convert every Observable GET into a Resource automatically.

Use the standard Observable approach when:

- the application already uses RxJS extensively;
- the result is naturally a stream;
- operators such as `switchMap`, `debounceTime`, `combineLatest`, `catchError`, or `shareReplay` are central to the flow;
- the request is part of an RxJS pipeline;
- the operation does not need the Resource state model.

## Standard Observable POST

For actions/mutations, the standard Observable pattern is often the clearest:

```ts
createUser(request: CreateUserRequest) {
  return this.http.post<User>(
    '/api/users',
    request
  );
}
```

Usage:

```ts
this.userApi.createUser(request).subscribe({
  next: user => {
    console.log('Created user:', user);
  },
  error: error => {
    console.error('Create failed:', error);
  }
});
```

## Standard Observable PATCH

```ts
updateUser(
  id: number,
  request: UpdateUserRequest
) {
  return this.http.patch<User>(
    `/api/users/${id}`,
    request
  );
}
```

## Standard Observable DELETE

```ts
deleteUser(id: number) {
  return this.http.delete<void>(
    `/api/users/${id}`
  );
}
```

## Standard Observable with RxJS Pipeline

Use standard Observables when the API request is part of a larger reactive pipeline.

Example: search users with debouncing:

```ts
readonly search$ = this.searchControl.valueChanges.pipe(
  debounceTime(300),
  distinctUntilChanged(),
  switchMap(search =>
    this.http.get<User[]>(
      '/api/users',
      {
        params: { search }
      }
    )
  )
);
```

This is a valid reason to use standard Observable HTTP rather than introducing a Resource only for the sake of using a Resource.

---

# API Selection Matrix

> **PROJECT OVERRIDE (2026-09-28)** — `.agents/rules/stack.md` § "HTTP Frontend — Resource APIs
> obligatoires" is canonical and **contradicts parts of this file**. In this repo:
> - **GET** → `httpResource()`
> - **Mutation / action (POST, PUT, PATCH, DELETE)** → `rxResource()` — **not** a raw
>   `HttpClient` Observable. `HttpClient` may only appear *inside* a Resource loader/stream, or
>   for a GET triggered by a one-off user action.
> - `fetch()` and native `Promise` HTTP calls are **forbidden** in `features/**`
>   (only the SSE transport in `chat-stream.service.ts` keeps `fetch()`).
> - Backend outbound HTTP → `axios` only, never `fetch()`.
>
> The "Standard Observable HTTP" and "Why Not Use `rxResource()` for Every Action?" sections
> below are kept as **background rationale only** and must not be followed as project convention.
> Where this file and `stack.md` disagree, `stack.md` wins.

The agent must choose the API according to the actual requirement.

| Requirement | Project API (canonical) |
|---|---|
| Reactive GET server state | `httpResource()` |
| GET depending on Signals | `httpResource()` |
| GET collection | `httpResource()` |
| GET by ID | `httpResource()` |
| GET search with reactive parameters | `httpResource()` |
| POST action / mutation | `rxResource()` (stream loader) |
| PUT / PATCH / DELETE | `rxResource()` (stream loader) |
| Login / Logout | `rxResource()` (stream loader) |
| File upload | `rxResource()` (stream loader) |
| Generic async operation (non-HTTP) | `resource()` |
| Existing RxJS resource flow | `rxResource()` |
| One-off GET on a user action (not view state) | `HttpClient` Observable via `firstValueFrom()`, documented |
| Any HTTP call in a component | **never** — service only |

`rxResource()` is mandatory for mutations in this project. A mutation must never auto-execute
because a Signal changed: its `request` must depend on an intent Signal that user interaction sets.


---

# Complete Service Example

```ts
import { Injectable, inject, signal } from '@angular/core';
import {
  HttpClient,
  httpResource
} from '@angular/common/http';

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserApiService {
  private readonly http = inject(HttpClient);

  private readonly userId = signal<number | undefined>(
    undefined
  );

  // ----------------------------------------
  // GET → httpResource()
  // ----------------------------------------

  readonly user = httpResource<User>(() => {
    const id = this.userId();

    return id === undefined
      ? undefined
      : `/api/users/${id}`;
  });

  readonly users = httpResource<User[]>(() => ({
    url: '/api/users',
    method: 'GET'
  }));

  selectUser(id: number): void {
    this.userId.set(id);
  }

  // ----------------------------------------
  // ACTION → standard Observable
  // ----------------------------------------

  createUser(request: CreateUserRequest) {
    return this.http.post<User>(
      '/api/users',
      request
    );
  }

  updateUser(
    id: number,
    request: UpdateUserRequest
  ) {
    return this.http.patch<User>(
      `/api/users/${id}`,
      request
    );
  }

  deleteUser(id: number) {
    return this.http.delete<void>(
      `/api/users/${id}`
    );
  }
}
```

This is the preferred default for a normal Angular 20 CRUD feature.

---

# Why Not Use `rxResource()` for Every Action?

> ⚠️ **SUPERSEDED for `live-english-teacher`.** Project rule (`stack.md`): mutations use
> `rxResource()` with a `stream` loader. `HttpClient` is allowed only *inside* that loader, never as
> a standalone Observable returned from a service method. Kept below as upstream rationale.

Do not force every mutation into `rxResource()`.

For example, this:

```ts
createUser(request: CreateUserRequest) {
  return this.http.post<User>(
    '/api/users',
    request
  );
}
```

is already:

```text
explicit command
      ↓
Observable
      ↓
HttpClient
```

That is usually clearer than creating a Resource whose only purpose is to execute a one-shot POST.

Use `rxResource()` when the operation genuinely benefits from the Resource lifecycle/state model and its RxJS stream-based loader.

---

# Standard Observable vs Resource

## Standard Observable

```ts
readonly user$ = this.http.get<User>(
  `/api/users/${id}`
);
```

The developer manages the Observable lifecycle and composition.

```text
Observable
   │
   ├── pipe()
   ├── map()
   ├── switchMap()
   ├── catchError()
   └── subscribe() / async pipe
```

## `httpResource()`

```ts
readonly user = httpResource<User>(
  () => `/api/users/${id}`
);
```

Angular manages the Resource state:

```text
Resource
   │
   ├── value()
   ├── isLoading()
   ├── error()
   └── status()
```

Choose according to the application's data-flow requirements, not because one API is universally better.

---

# Final Decision Rule

For Angular 20 API code generation:

```text
                 HTTP operation
                       │
             ┌─────────┴─────────┐
             │                   │
            GET                ACTION
             │                   │
             ▼                   ▼
      Is it reactive?       POST/PUT/PATCH/
             │              DELETE/etc.
       ┌─────┴─────┐             │
       │           │             ▼
      YES          NO       Standard Observable
       │           │
       ▼           ▼
httpResource()  HttpClient
                Observable
```

For non-HTTP async work:

```text
Generic async operation
        │
        ▼
   resource()
```

For an RxJS-native Resource:

```text
Observable-based Resource
        │
        ▼
   rxResource()
```

## Agent Priority

1. **GET + reactive server state → `httpResource()`**
2. **Explicit action/mutation → standard `HttpClient` Observable**
3. **Complex RxJS pipeline → standard `HttpClient` Observable**
4. **Generic async operation → `resource()`**
5. **RxJS-native Resource lifecycle → `rxResource()`**
6. Never introduce a Resource merely to replace a simple Observable.

# Final Agent Rule

When generating Angular 20 API code:

```text
GET
  ↓
httpResource()

Generic async read
  ↓
resource()

RxJS-based resource
  ↓
rxResource()

POST / PUT / PATCH / DELETE
  ↓
Explicit action / mutation
  ↓
HttpClient Observable
```

Keep the implementation inside services.

Keep components focused on UI and interaction.

Never mix Angular 20 Resource syntax with Angular 22+ stable Resource syntax without an explicit migration.
