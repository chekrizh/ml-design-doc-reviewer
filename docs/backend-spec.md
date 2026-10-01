# Backend Spec (M2)

Как устроены серверная часть M2 и её связь с клиентом. Продуктовые решения — `docs/mvp-spec.md` (M2); решения с альтернативами — `docs/decisions.md` (D14–D20, D21–D27); проверки — `docs/acceptance-tests.md` (AT-22–AT-43).

Агент реализует по этому документу. Если реализация требует отступить от него, это вопрос в `open-questions.md`, а не тихое изменение.

## 0. Принципы

- **Минимум своего серверного кода.** Данные клиент читает и пишет через PostgREST под RLS. Edge functions нужны только там, где есть секрет (ключ OpenRouter) или где нельзя доверять клиенту (запись находок).
- **Секрет живёт только на сервере.** Полный ключ OpenRouter не возвращается клиенту ни одним запросом и не пишется в логи.
- **История не теряется.** Каждый запуск ревью хранится со снимком дизайна. Находки при повторном запуске не удаляются, а помечаются заменёнными. У дизайна есть номер версии.
- **Тесты не ходят во внешний мир.** Локальный Supabase, тестовый вход, мок OpenRouter, перехват Google в браузере.

## 1. Компоненты

```
Браузер (Vite SPA, Vercel)
 ├─ Supabase Auth (Google OAuth; тестовый вход по паролю только локально)
 ├─ PostgREST под RLS: designs, review_runs (чтение, отмена), findings (чтение, статус), user_settings (модель)
 ├─ Edge functions: review, openrouter-key, openrouter-models ──► OpenRouter API
 └─ Google Identity Services + Drive API (экспорт в Google Docs, без бэкенда)
```

Гость работает без Supabase: дизайн в IndexedDB, как в M1. Если Supabase недоступен, гостевой сценарий не ломается.

## 2. Раскладка файлов

```
supabase/
  config.toml                  локальная конфигурация: auth, функции, [edge_runtime.secrets] без секретов
  seed.sql                     тестовые пользователи (только локально)
  migrations/<ts>_*.sql        схема, RLS, гранты, функции svc_*
  tests/*.sql                  pgTAP: RLS и гранты (`supabase test db`)
  functions/
    _shared/
      review/                  чистый TS без Deno и Node API; его же импортирует приложение
        schema.ts              JSON-схема ответа модели, валидатор, типы находок
        serialize.ts           дизайн → текст для модели с метками полей
        anchors.ts             метка поля → anchor (kind, id, label, value)
        prompt.ts              сборка messages для OpenRouter
        errors.ts              коды ошибок и HTTP-статусы
      skill.generated.ts       SKILL.md + references, собирается скриптом, коммитится
      openrouter.ts            HTTP-клиент OpenRouter (base URL из env)
      http.ts                  CORS, JSON-ответы, ошибки
      supabase.ts              клиент пользователя (его JWT) и сервисный клиент
    review/index.ts
    openrouter-key/index.ts
    openrouter-models/index.ts
scripts/gen-skill.ts           vendor/ml-system-design-review → skill.generated.ts
src/backend/                   клиент Supabase, вход, репозитории designs / findings / settings, вызовы функций
src/review/                    слой UI ревью (store, производные состояния)
e2e/mocks/openrouter/          мок-сервер OpenRouter и записанные ответы
e2e/mocks/google/              заглушка GIS-скрипта и перехват Drive
```

- **Общий код** лежит в `supabase/functions/_shared/review/`, потому что при деплое функции собираются только из `supabase/functions/` (D24). Приложение импортирует его через алиас Vite и `paths` в tsconfig. Vitest гоняет его тесты вместе с остальными.
- **`skill.generated.ts`** собирает `pnpm gen:skill` из `vendor/ml-system-design-review/`. Unit-тест проверяет, что файл совпадает с vendor: забытая пересборка ломает `pnpm check`.

## 3. Схема БД

Всё в одной миграции M2. Для времени — `timestamptz`, для `id` — `uuid` с `gen_random_uuid()`.

### 3.1 `designs`

| Колонка | Тип | Смысл |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid not null → `auth.users` on delete cascade, default `auth.uid()` | владелец |
| `client_id` | uuid null | id локального дизайна гостя; `unique (user_id, client_id)` делает перенос при входе идемпотентным |
| `origin` | text not null, check in (`blank`, `task`, `example`) | происхождение (чип в списке) |
| `source_id` | text null | id элемента Library, например `retail-demand-forecasting` |
| `title` | text not null default `''` | дублирует `data.title` для списка |
| `data` | jsonb not null | модель `Design` из M1 |
| `data_schema` | int not null default 1 | версия формата `data`, для будущих миграций модели |
| `summary` | jsonb not null | для списка без загрузки `data`: `{ filledSections: SectionId[], tradeoffs: number, mlTask: string \| null }`, пишет клиент чистой функцией |
| `last_export` | jsonb null | `{ url, at }` последнего экспорта в Google Docs |
| `version` | int not null default 1 | растёт на 1 при каждом изменении `data` или `title` |
| `created_at`, `updated_at` | timestamptz default now() | |

- Индекс `(user_id, updated_at desc)`.
- Триггер `before update`: если изменились `data` или `title`, то `version = old.version + 1` и `updated_at = now()`. Изменение одного `last_export` версию не трогает, иначе экспорт ломал бы автосохранение.
- Клиент сохраняет так: `update designs set data, title, summary where id = :id and version = :seen returning version`. Ноль строк значит конфликт (D23).

### 3.2 `review_runs` — история запусков

| Колонка | Тип | Смысл |
|---|---|---|
| `id` | uuid PK | генерирует клиент: им же отменяют запуск |
| `design_id` | uuid not null → `designs` on delete cascade | |
| `user_id` | uuid not null → `auth.users` on delete cascade | |
| `scope` | text not null | `design` или `SectionId` |
| `model` | text not null | id модели OpenRouter |
| `status` | text not null default `running`, check in (`running`, `succeeded`, `failed`, `canceled`) | |
| `error_code` | text null | код из §6.4 |
| `design_version` | int not null | `designs.version`, который проверяли |
| `design_snapshot` | jsonb not null | дизайн на момент запуска без бинарных файлов диаграмм (`files`) |
| `started_at` | timestamptz default now() | |
| `finished_at` | timestamptz null | |

Индексы: `(user_id, started_at desc)` и `(design_id, started_at desc)`.

### 3.3 `findings`

| Колонка | Тип | Смысл |
|---|---|---|
| `id` | uuid PK | |
| `run_id` | uuid not null → `review_runs` on delete cascade | какой запуск нашёл |
| `design_id` | uuid not null → `designs` on delete cascade | денормализовано для RLS и запросов |
| `user_id` | uuid not null | |
| `position` | int not null | порядок в ответе модели |
| `severity` | text check in (`critical`, `major`, `minor`) | |
| `dimension` | text not null | измерение рубрики скилла |
| `section` | text null | `SectionId`; `null` — дизайн целиком |
| `anchor_kind` | text check in (`key_property`, `rationale`, `tradeoff_option`, `design`) | |
| `anchor_id` | text null | `KeyProperty.id` или `TradeOffOption.id` |
| `anchor_label` | text not null | подпись поля на момент ревью: «Key Metric», имя варианта, «Rationale» |
| `anchor_value` | text not null default `''` | текст поля на момент ревью, по нему считается stale (§5.6) |
| `title`, `evidence`, `why`, `fix` | text not null | |
| `status` | text not null default `open`, check in (`open`, `resolved`, `dismissed`) | |
| `status_changed_at` | timestamptz null | |
| `replaced_by_run_id` | uuid null → `review_runs` on delete set null | `null` — находка актуальна; иначе её заменил этот запуск |
| `created_at` | timestamptz default now() | |

Индекс `(design_id) where replaced_by_run_id is null`.

**Актуальные находки** — `replaced_by_run_id is null`. Заменённые остаются в базе: это история для M3.

### 3.4 `user_settings`

| Колонка | Тип | Смысл |
|---|---|---|
| `user_id` | uuid PK → `auth.users` on delete cascade | |
| `model` | text null | выбранная модель; `null` — по умолчанию |
| `key_secret_id` | uuid null | id секрета в Vault |
| `key_last4` | text null | последние 4 символа ключа |
| `key_added_at` | timestamptz null | |
| `updated_at` | timestamptz default now() | |

### 3.5 Представление `design_open_findings`

`create view design_open_findings with (security_invoker = true) as select design_id, severity, count(*) from findings where replaced_by_run_id is null and status = 'open' group by 1, 2`. Нужно для счётчика открытых находок в «Your designs». RLS действует через `security_invoker`.

## 4. Доступ: RLS и гранты

RLS включён на всех четырёх таблицах. В политиках `(select auth.uid())`, а не `auth.uid()`: так Postgres вычисляет его один раз на запрос.

| Таблица | Роль `authenticated` может | Всё остальное |
|---|---|---|
| `designs` | select, insert, update, delete своих (`user_id = auth.uid()`, insert и update с тем же `with check`) | |
| `review_runs` | select своих; update **только колонки `status`** (column grant), политика `using (user_id = auth.uid() and status = 'running') with check (status = 'canceled')` — это отмена | insert и прочее — сервисная роль |
| `findings` | select своих; update **только `status`, `status_changed_at`** (column grant), только своих | insert и `replaced_by_run_id` — сервисная роль |
| `user_settings` | select **только `user_id, model, key_last4, key_added_at`** (column grant, `key_secret_id` не виден); insert и update **только `user_id, model`**, только своей строки | ключ — только через функции `svc_*` |

У `anon` нет доступа ни к одной таблице.

Колоночные гранты значат, что `select('*')` из `user_settings` и `review_runs` упадёт. Клиент всегда перечисляет колонки явно.

### 4.1 Сервисные SQL-функции

Лежат в `public`, чтобы сервисная роль вызывала их через RPC. Каждая: `security definer`, `set search_path = ''`, `revoke execute ... from public, anon, authenticated`, `grant execute ... to service_role`. pgTAP-тест проверяет, что `authenticated` вызвать их не может.

| Функция | Что делает |
|---|---|
| `svc_set_openrouter_key(p_user uuid, p_key text) returns text` | есть `key_secret_id` → `vault.update_secret`, иначе `vault.create_secret(p_key, 'openrouter:' \|\| p_user)`; upsert `user_settings` (`key_secret_id`, `key_last4`, `key_added_at`); возвращает `key_last4` |
| `svc_get_openrouter_key(p_user uuid) returns text` | `decrypted_secret` из `vault.decrypted_secrets` или `null` |
| `svc_delete_openrouter_key(p_user uuid) returns void` | удаляет секрет из `vault.secrets`, обнуляет ключевые колонки `user_settings` |
| `svc_complete_review_run(p_run uuid, p_findings jsonb) returns text` | одна транзакция, `select ... for update` по запуску. Статус не `running` → вернуть его, ничего не менять. Иначе: (1) актуальным находкам дизайна в скоупе ставит `replaced_by_run_id = p_run`; скоуп `design` — все актуальные, скоуп секции — только с `section` этой секции; (2) вставляет новые находки; (3) `status = 'succeeded'`, `finished_at = now()`; вернуть `succeeded` |
| `svc_fail_review_run(p_run uuid, p_code text) returns void` | `status = 'failed'`, `error_code`, `finished_at`, только если запуск ещё `running` |

Находки дизайна целиком (`section is null`) заменяет только запуск со скоупом `design`.

## 5. Клиент

### 5.1 Подключение

`createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } })`. Без сессии приложение работает как гость. Клиент создаётся лениво и не ломает гостя, если переменные не заданы.

### 5.2 Маршруты (History API, без зависимости, D27)

| Путь | Экран |
|---|---|
| `/` | главный экран |
| `/d/:id` | облачный дизайн (только залогиненный) |
| `/local` | дизайн гостя из IndexedDB |
| `/library/:itemId` | пример или задача из Library, ещё не сохранённые (только залогиненный; первая правка создаёт дизайн и заменяет URL на `/d/:id` через `replaceState`) |

Гость открывает элемент Library сразу в `/local`: после подтверждения перезаписи, если там уже есть работа.

### 5.3 Дизайны

- **Список:** `select id, title, origin, summary, updated_at from designs order by updated_at desc` плюс `design_open_findings`.
- **New design:** сразу `insert` с `origin = 'blank'`, переход на `/d/:id`.
- **Start task:** сразу `insert` с `origin = 'task'` и `source_id`.
- **Пример:** при первой правке `insert` с `origin = 'example'`.
- **Автосохранение:** debounce 800 мс, update с проверкой `version` (§3.1). Статусы Saving / Saved / error как в M1. При конфликте показывается баннер «изменено в другом месте» с перезагрузкой, автосохранение этого дизайна останавливается до перезагрузки.
- **`summary`** считает чистая функция из `src/model`: заполненные секции по `sectionEmpty`, число полных trade-offs по `tradeoffsComplete`, значение ключа «ML Task» в Problem Space.
- **Delete:** `delete from designs where id`. Запуски и находки уходят каскадом.

### 5.4 Гость и вход

- В IndexedDB рядом с дизайном хранится `meta = { id, origin, sourceId, lastExport }`. Запись M1 без `meta` при первом чтении получает `meta` с новым `id` и `origin = 'blank'`.
- **Перенос при `SIGNED_IN`:** если локальный дизайн не пустой (хотя бы одна секция не `sectionEmpty` или задано название), `insert ... on conflict (user_id, client_id) do nothing` с `client_id = meta.id`. Только после успеха очищается IndexedDB. Повторный вход после сбоя очистки не создаст дубль.

### 5.5 Ревью на клиенте

- **Состояние открытого дизайна:**
  - актуальные находки: `select ... from findings where design_id = :id and replaced_by_run_id is null order by position`;
  - последние запуски: `select scope, status, model, started_at, finished_at, error_code from review_runs where design_id = :id order by started_at desc limit 20`.
- **«Секция проверена»** — есть `succeeded` запуск со скоупом `design` или этой секции. Это серый индикатор против цветного.
- **Запуск:**
  1. Клиент генерирует `runId` и растеризует непустые диаграммы в PNG (§8.1).
  2. Вызывает `review` (§6.4).
  3. Пока идёт запрос, UI в состоянии «Reviewing».
  4. Ответ 200 → находки скоупа заменяются на присланные. Ошибка → прежние находки не трогаются, показывается ошибка (§6.4).
- **Cancel:**
  1. `abort()` у fetch.
  2. `update review_runs set status = 'canceled' where id = :runId`.
  3. Если обновилось 0 строк, сервер уже успел закончить → клиент перечитывает находки.
- **Смена статуса:** сначала оптимистично в store, затем `update findings set status, status_changed_at = now() where id`. Ошибка → откат и уведомление. Один store питает панель, редактор и документ, поэтому синхронность — одно состояние (AT-34).

### 5.6 Stale без записей в базу (D25)

Чистая функция из находки и текущего дизайна:
- `design` — никогда не stale.
- Поле (`anchor_id` для Key Property и варианта, rationale секции) не найдено → находка показывается в «Whole design» с меткой «Field removed».
- Текущий текст поля ≠ `anchor_value` → «Field changed since review».

Текст поля:
- Key Property — `value`;
- вариант — `name` и ячейки по порядку критериев, через ` | `;
- Rationale — плоский текст TipTap-документа: блоки через `\n`.

Сериализатор §6.7 использует ту же функцию, чтобы сравнение было честным.

## 6. Edge functions

### 6.1 Общее

- Только `POST`, тело JSON. Заголовок `Authorization: Bearer <JWT пользователя>`, `verify_jwt = true` (по умолчанию).
- Пользователь определяется через `auth.getUser()` клиентом с его JWT. Запись — сервисным клиентом из `SUPABASE_SECRET_KEYS` (или legacy `SUPABASE_SERVICE_ROLE_KEY`).
- CORS: только origin из `APP_ORIGINS` (через запятую), ответ на `OPTIONS`.
- Ошибка: HTTP-статус из §6.4 и тело `{ "error": { "code": "...", "message": "..." } }`.
- Логи: код результата, длительность, `run_id`. **Никогда** заголовки, тела запросов и ответов, ключи. Unit-тест проверяет вывод логгера на тестовом ключе.

### 6.2 `openrouter-key`

| Запрос | Поведение |
|---|---|
| `{ "action": "save", "key": "sk-or-v1-..." }` | 1) формат `^sk-or-v1-[A-Za-z0-9_-]{8,}$`, иначе `invalid_key_format` (400); 2) `GET {OPENROUTER_BASE_URL}/key` с `Bearer <key>` — бесплатный запрос: 200 → дальше, 401 → `key_rejected` (422), прочее → `provider_error` (502); 3) `svc_set_openrouter_key` → `200 { "last4": "a3f9", "addedAt": "..." }` |
| `{ "action": "delete" }` | `svc_delete_openrouter_key` → `200 {}` |

### 6.3 `openrouter-models`

`{}` → `GET {OPENROUTER_BASE_URL}/models?supported_parameters=structured_outputs`. Остаются модели, у которых `architecture.input_modalities` содержит `image`. Ответ `200 { "models": [{ "id", "name" }], "default": "<id>" }`:
- `default` = `RECOMMENDED_MODEL`, если он в списке, иначе первая модель;
- рекомендуемая — первой, остальные по `name`;
- цен нет;
- ответ кэшируется в памяти функции на 1 час.

Выбор модели клиент пишет сам: `user_settings.model`.

### 6.4 `review`

**Запрос:**
```json
{
  "runId": "uuid",
  "designId": "uuid",
  "scope": "design | <SectionId>",
  "design": { "...": "Design без diagram.files" },
  "images": [{ "section": "<SectionId>", "png": "<base64 без префикса>" }]
}
```
Лимиты: тело ≤ 6 МБ, картинок ≤ 9, каждая ≤ 1,5 МБ. Нарушение → `payload_too_large` (413).

**Шаги:**
1. Пользователь → `unauthenticated` (401).
2. Дизайн через клиент пользователя (RLS) → нет → `not_found` (404). Берётся `version`.
3. Ключ `svc_get_openrouter_key` → нет → `no_key` (409). Модель: `user_settings.model` или `RECOMMENDED_MODEL`.
4. Лимиты:
   - есть свой запуск `running` моложе 3 минут → `review_in_progress` (409);
   - запуски `running` старше 3 минут при этом помечаются `failed/timeout`;
   - 20 и больше запусков за последний час → `too_many_reviews` (429).
5. `insert review_runs` (сервисный клиент) с `id = runId`, `scope`, `model`, `design_version`, `design_snapshot = design`.
6. Запрос к OpenRouter `POST {OPENROUTER_BASE_URL}/chat/completions`:
   - `model`, `max_tokens: 8000`, `provider: { "require_parameters": true }`;
   - `response_format: { "type": "json_schema", "json_schema": { "name": "findings", "strict": true, "schema": <§6.5> } }`;
   - `messages`:
     - `system`: инструкция (§6.6) + текст скилла; у части со скиллом `cache_control: { "type": "ephemeral" }` — провайдеры без кэша его игнорируют;
     - `user`: сначала текст дизайна (§6.7), затем по каждой картинке пара: текст `Diagram of section <name> [section:<id>]` и `{ "type": "image_url", "image_url": { "url": "data:image/png;base64,..." } }`. Текст перед картинками — так рекомендует OpenRouter.
   - Таймаут 120 с через `AbortSignal`: функция обязана ответить до 150 с idle timeout Supabase.
7. Ответ провайдера → код ошибки:

| Провайдер | Код | HTTP | Текст в UI (панель Review) | Действие |
|---|---|---|---|---|
| 401 | `key_rejected` | 502 | OpenRouter rejected your key | Replace key |
| 402 | `no_credits` | 502 | Your OpenRouter key is out of credits | Run again |
| 429 | `provider_rate_limited` | 502 | OpenRouter is limiting requests | Run again |
| 404 / 400 / 503 с упоминанием image, modality или supported parameters | `model_unsupported` | 502 | `<model>` cannot read diagrams | Choose model |
| 408, таймаут 120 с | `timeout` | 504 | The review took longer than 2 minutes | Run again |
| прочие 4xx/5xx, сеть | `provider_error` | 502 | OpenRouter did not answer | Run again |
| ответ не JSON или не по схеме | `bad_output` | 502 | The model's answer could not be read | Run again |
| — (шаг 3) | `no_key` | 409 | Add your OpenRouter key | Add key |
| — (шаг 4) | `review_in_progress` | 409 | A review is already running | — |
| — (шаг 4) | `too_many_reviews` | 429 | 20 reviews in the last hour; try again later | — |

8. Каждую находку разрешить в anchor (§6.8). Для скоупа секции находки других секций и дизайна целиком отбрасываются. Больше 40 находок → оставить 40 самых серьёзных.
9. `svc_complete_review_run(runId, findings)`. Вернул `canceled` → `409 { code: "canceled" }`, клиент это игнорирует. Иначе `200 { "runId", "findings": [строки как в базе] }`.
10. Любая ошибка после шага 5 → `svc_fail_review_run(runId, code)`.

### 6.5 Схема ответа модели

`strict: true`: все поля обязательны, `additionalProperties: false`, null-поля задаются как `["string", "null"]`.

```json
{
  "type": "object", "additionalProperties": false, "required": ["findings"],
  "properties": {
    "findings": { "type": "array", "items": {
      "type": "object", "additionalProperties": false,
      "required": ["severity", "dimension", "section", "anchor", "title", "evidence", "why", "fix"],
      "properties": {
        "severity":  { "type": "string", "enum": ["critical", "major", "minor"] },
        "dimension": { "type": "string", "enum": ["<10 измерений базовой рубрики скилла>", "Modern AI"] },
        "section":   { "type": ["string", "null"], "enum": ["<9 SectionId>", null] },
        "anchor":    { "type": ["string", "null"] },
        "title":     { "type": "string" },
        "evidence":  { "type": "string" },
        "why":       { "type": "string" },
        "fix":       { "type": "string" }
      } } }
  }
}
```

Названия измерений берутся из таблицы «Base MLSD Gradecard» в `references/rubrics.md`, генератор скилла кладёт их в `skill.generated.ts`. `anchor` — метка из текста дизайна (§6.7): `kp:<id>`, `opt:<id>`, `rationale` или `null`. Длина `title` ограничивается в инструкции (≤ 90 символов); сервер обрезает всё, что длиннее 120.

### 6.6 Инструкция модели

Короткая, перед скиллом:
- Режим скилла: doc-only, stage: design doc. Проверяется только присланный документ, без репозитория и кода.
- Не выдавать scorecard, gradecard, вердикт, похвалу и план исправлений. Только находки по схеме.
- Каждая находка — одна проблема. `evidence` — что сказано в дизайне (или чего нет), `why` — почему это важно, `fix` — конкретное действие.
- `section` и `anchor` — самое узкое поле, к которому относится находка. Если у измерения нет секции, `section` и `anchor` — `null`.
- Problem Space — условие задачи.
- Для скоупа секции: оценивать только секцию `<id>`, остальной дизайн — контекст.
- Язык находок — английский, как интерфейс.

### 6.7 Дизайн как текст

Сериализатор из `_shared/review/serialize.ts`, детерминированный: unit-тест сравнивает со снапшотом на примере.

```
# <title>

## Problem Space [section:problem-space]
Key properties:
- [kp:<id>] Domain: Retail, grocery chain
- [kp:<id>] ML Task: (empty)
Rationale [rationale]:
<плоский текст; списки — строками «- …»>
Trade-offs (criteria: Groups independent | Enough units for power):
- [opt:<id>] Split by store: No, stores share a distribution center | Yes
- [opt:<id>] Split by distribution center (chosen): Yes | Enough with matched store subsets
Diagram: attached as image [section:validation]   ← только если диаграмма непустая
```

Пустые секции выводятся строкой «(not filled)»: отсутствие решения — тоже материал для ревью.

### 6.8 Разрешение anchor

| `section` | `anchor` | Результат |
|---|---|---|
| `null` | любой | `design`, `section = null` |
| секция | `kp:<id>`, ключ есть в снимке | `key_property`, `anchor_id`, `anchor_label = key`, `anchor_value = value` |
| секция | `opt:<id>`, вариант есть | `tradeoff_option`, `anchor_label = name`, `anchor_value` по §5.6 |
| секция | `rationale` или `null` | `rationale` этой секции, `anchor_label = 'Rationale'`, `anchor_value` по §5.6 |
| секция | метка не найдена | `rationale` этой секции (модель ошиблась с меткой, но не с секцией) |

## 7. Вход

- **Google:** `signInWithOAuth({ provider: 'google', options: { redirectTo: <текущий URL> } })`. Scope только базовые; Drive — отдельно при экспорте (§8).
- **Тестовый вход:**
  - `seed.sql` создаёт пользователей `test-a@example.test` и `test-b@example.test` с паролем `test-password`;
  - в `config.toml` вход по паролю включён, регистрация по email выключена;
  - кнопка «Sign in as test user» существует только при `import.meta.env.VITE_TEST_SIGNIN === 'true'`; Vite подставляет значение при сборке, и при `false` код вырезается;
  - тест собирает прод-бандл без флага и проверяет, что текста кнопки и пароля в `dist/` нет;
  - на проде email-провайдер выключен в дашборде (чек-лист, часть B) — вторая страховка.
- **Выход:** `signOut()` → `/`.

## 8. Диаграммы и экспорт в Google Docs (только клиент)

### 8.1 PNG

`exportToBlob({ elements, files, mimeType: 'image/png', appState: { exportBackground: true, viewBackgroundColor: '#ffffff' }, exportPadding: 16, getDimensions })`, длинная сторона ≤ 1600 px. Только непустые диаграммы (`diagramNonEmpty`). Тот же PNG идёт в ревью и в экспорт.

### 8.2 Доступ к Drive

- Скрипт `https://accounts.google.com/gsi/client` грузится лениво, при первом экспорте.
- `google.accounts.oauth2.initTokenClient({ client_id: VITE_GOOGLE_CLIENT_ID, scope: 'https://www.googleapis.com/auth/drive.file', include_granted_scopes: true, callback, error_callback })`.
- Токен хранится только в памяти до `expires_in`. Бэкенд токены не видит.

| Событие GIS | Уведомление |
|---|---|
| `error_callback`, `type: popup_failed_to_open` | окно заблокировано браузером |
| `error_callback`, `type: popup_closed`; `callback` с `error: access_denied`; `hasGrantedAllScopes` = false | доступ не дан, ничего не экспортировано |

### 8.3 Загрузка

- `POST https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`:
  - метаданные `{ name: <title>, mimeType: 'application/vnd.google-apps.document' }`;
  - тело — HTML документа: те же разделы, что в документе и Markdown; таблицы с явными рамками; диаграммы как `data:image/png`; находок нет.
- 401 от Drive → один повторный запрос токена, затем ошибка Drive.
- После успеха `last_export = { url: webViewLink, at }`: в `designs` или в IndexedDB `meta` у гостя.

## 9. Тестовая инфраструктура

- **Перед прогоном:** `supabase start` делает человек или агент. Playwright `globalSetup` проверяет `GET <local>/auth/v1/health`. Нет ответа → падение с текстом «Local Supabase is not running: run `supabase start`».
- **Функции** должны отвечать по локальному URL Supabase. Нужен ли отдельный `supabase functions serve` при текущей версии CLI, агент проверяет по документации (context7) и записывает команду в CLAUDE.md.
- **Изоляция:**
  - M2 e2e идут в одном воркере;
  - `beforeEach` очищает `designs`, `review_runs`, `findings`, `user_settings` и секреты Vault тестовых пользователей сервисным SQL-хелпером;
  - пользователи из seed остаются.
- **Мок OpenRouter:**
  - Node HTTP-сервер без зависимостей на `127.0.0.1:4010`, его поднимает `globalSetup`. Функции ходят туда через `OPENROUTER_BASE_URL = http://host.docker.internal:4010/api/v1` из `[edge_runtime.secrets]` в `config.toml` (не секрет, коммитится).
  - Эндпоинты: `/key`, `/models`, `/chat/completions`.
  - Управление: `POST /__mock/scenario { chat: 'R1' | 'R2' | '401' | '402' | '429' | 'bad_output' | 'no_images', delayMs }`.
  - Ответы R1 и R2 лежат в `e2e/mocks/openrouter/answers/` и ссылаются на поля по подписи («Key Metric», вариант «Split by distribution center», «Rationale»). Мок находит `[kp:<id>]` и `[opt:<id>]` по подписи в присланном тексте дизайна и подставляет метки.
  - Мок записывает последний запрос (без заголовка Authorization). Тесты по нему проверяют число картинок (AT-32).
- **Google в браузере:**
  - `page.route` подменяет `accounts.google.com/gsi/client` заглушкой `google.accounts.oauth2` с настраиваемым исходом: grant, deny, popup blocked;
  - `page.route` на `www.googleapis.com/upload/drive/v3/files*` записывает запросы и отвечает `{ id, webViewLink }` или ошибкой.
- **Защита от реальной сети:** в фикстуре Playwright любой запрос не на `localhost`, `127.0.0.1` и не к перехваченным выше адресам роняет тест.
- **RLS и гранты:** pgTAP в `supabase/tests/`, запуск `supabase test db`. Входит в `pnpm e2e` или в отдельный `pnpm test:db`; команда записывается в CLAUDE.md.

## 10. Переменные окружения

| Где | Переменная | Значение |
|---|---|---|
| Приложение | `VITE_SUPABASE_URL` | URL Supabase |
| | `VITE_SUPABASE_PUBLISHABLE_KEY` | publishable (anon) key |
| | `VITE_GOOGLE_CLIENT_ID` | OAuth Client ID (Web) |
| | `VITE_TEST_SIGNIN` | `true` только локально и в e2e |
| Функции | `OPENROUTER_BASE_URL` | по умолчанию `https://openrouter.ai/api/v1`; локально — мок |
| | `RECOMMENDED_MODEL` | id модели по умолчанию; на проде задаёт человек |
| | `APP_ORIGINS` | разрешённые origin через запятую |
| | `SUPABASE_URL`, `SUPABASE_SECRET_KEYS` | дают сами Supabase |

Секретов в коде и в `config.toml` нет. Client Secret Google хранится только в дашборде Supabase.

## 11. Версии и история

- `designs.version` — для проверки конфликтов. В M3 сюда можно добавить таблицу снимков без смены протокола.
- `designs.data_schema` — версия формата модели. Меняется только с миграцией данных.
- `review_runs` хранит каждый запуск со снимком и моделью, `findings` — каждую находку, включая заменённые. Отсюда в M3 берутся прогресс между запусками и скоринг.

## 12. Риски

- **Лимит 150 с.** Медленная модель на большом дизайне не уложится и получит `timeout`. Idle timeout 150 с действует на любом плане, поэтому выход — асинхронный запуск (фоновая задача и опрос), а не апгрейд. В M2 риск принят: таймаут честно показывается.
- **Закрытая вкладка во время ревью.** Функция доработает и запишет находки, пользователь увидит их при следующем открытии. Запуск без ответа дольше 3 минут считается `failed/timeout`.
- **Vault и `db reset`.** Сброс базы стирает секреты Vault. В seed ключей нет: тесты, которым нужен ключ, сохраняют его сами через `openrouter-key`.
