# Деплой

Как приложение попадает в облако и что настраивает человек. Решения: D35 (окружения и пайплайн), D36 (квоты), D37 (CSP), D38 (privacy и удаление аккаунта). Контракт бэкенда — `docs/backend-spec.md`.

Агент облачных команд не запускает (`.claude/settings.json`). Миграции и функции деплоит GitHub Actions, фронтенд — Vercel.

## Схема

| | staging (сейчас) | prod (позже, раздел 7) |
|---|---|---|
| Ветка | `staging` | `main` |
| Supabase | проект `mlsd-staging` (Free) | проект `mlsd-prod` |
| Фронтенд | Vercel Preview ветки `staging`: постоянный адрес `https://<project>-git-staging-<team>.vercel.app` | Vercel Production: `https://<project>.vercel.app` |
| Миграции и функции | job `deploy-staging` после зелёных тестов | job `deploy-production` после ручного approve |

Как выкатывать на staging: влить рабочую ветку в `staging` и запушить. CI прогонит тесты, затем задеплоит базу и функции, Vercel параллельно соберёт фронтенд. Пока переменные проекта в GitHub не заданы, деплой пропускается, тесты идут всегда.

Фронтенд может выйти раньше, чем закончится деплой базы, поэтому **миграции только расширяющие** (expand/contract): новая колонка с default, а не переименование; удаление старого — отдельным релизом.

Ниже `<staging-url>` = `https://<project>-git-staging-<team>.vercel.app` (точный адрес виден в Vercel → Deployments у ветки `staging` → Domains).

## 1. Supabase: проект staging

- [ ] supabase.com → New project `mlsd-staging`, регион ближе к пользователям. Сохранить **Database password** (его потом не покажут).
- [ ] Записать **project ref** (из URL дашборда) и **publishable key** (Project Settings → API Keys, `sb_publishable_…`, не секрет). Secret key никуда не копировать: функции получают его сами.

Настройки входа — в шаге 4, когда будет Client ID от Google.

## 2. Vercel

- [ ] Add New → Project → импорт репозитория. Framework Vite, build `pnpm build`, output `dist`. Production Branch оставить `main`: пока `main` не трогаем, в production ничего важного не выходит.
- Собираются только ветки `staging` и `main`: `ignoreCommand` в `vercel.json`. Ветки других участников не деплоятся и не получают переменные staging.
- [ ] Settings → Environment Variables, окружение **Preview** (можно ограничить веткой `staging`):

| Переменная | Значение |
|---|---|
| `VITE_SUPABASE_URL` | `https://<staging-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | staging publishable key |
| `VITE_GOOGLE_CLIENT_ID` | Client ID из шага 3 |

  `VITE_TEST_SIGNIN` не задавать нигде. После изменения переменных — Redeploy (они вшиваются в сборку).
- [ ] Settings → Deployment Protection: Preview по умолчанию закрыт входом в Vercel. Для себя это удобно; чтобы staging открывали тестеры, выключить защиту для Preview или выдать им доступ.
- [ ] Запушить ветку `staging` (сделает агент по просьбе) и записать `<staging-url>`.

## 3. Google Cloud: OAuth-клиент

Нужен для входа через Google (Supabase только посредник) и для экспорта в Google Docs (Drive API из браузера). Бесплатно, биллинг не нужен.

- [ ] console.cloud.google.com → новый проект. APIs & Services → Library → **Google Drive API → Enable**.
- [ ] Google Auth Platform → **Branding**: имя «ML System Design Trainer», почта поддержки, Home page `<staging-url>`, Privacy policy `<staging-url>/privacy`. Authorized domains пусто (`vercel.app` не подтвердить как свой).
- [ ] **Data Access**: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `.../auth/drive.file` (все нечувствительные, проверка Google не нужна).
- [ ] **Audience**: External. Для staging можно оставить **Testing** и добавить себя и тестеров в Test users (до 100); In production — при запуске prod.
- [ ] **Clients → Web application**:
  - Authorized JavaScript origins (точные, без wildcard): `<staging-url>`, `http://localhost:5173`;
  - Authorized redirect URIs: `https://<staging-ref>.supabase.co/auth/v1/callback`, `http://127.0.0.1:54321/auth/v1/callback`.
- [ ] Client ID → Supabase (шаг 4) и Vercel (шаг 2). Client Secret → **только** Supabase.

## 4. Supabase: вход

- [ ] Authentication → Sign In / Providers:
  - **Google** — включить, вставить Client ID и Client Secret;
  - **Email — выключить** (локально он включён для тестового входа по паролю; в облаке не нужен);
  - Phone, Anonymous — выключены;
  - **Allow new users to sign up — включено** (пользователь Google создаётся при первом входе).
- [ ] Authentication → URL Configuration: Site URL `<staging-url>`; Redirect URLs `<staging-url>/**` и `http://localhost:5173/**`.
- [ ] Проверка (её же делает CI после каждого деплоя):
  `SUPABASE_URL=https://<staging-ref>.supabase.co SUPABASE_PUBLISHABLE_KEY=<key> node scripts/check-auth-settings.ts` → «Google only, sign-ups open».

## 5. GitHub

- [ ] Settings → Secrets and variables → Actions → **Secrets**: `SUPABASE_ACCESS_TOKEN` (supabase.com → Account → Access Tokens; даёт доступ ко всем проектам, хранится только здесь).
- [ ] **Variables**:

| Переменная | Значение |
|---|---|
| `STAGING_SUPABASE_PROJECT_REF` | staging ref |
| `STAGING_SUPABASE_PUBLISHABLE_KEY` | staging publishable key |
| `STAGING_APP_ORIGINS` | `<staging-url>` (CORS функций; точное совпадение) |
| `RECOMMENDED_MODEL` | модель по умолчанию с картинками и structured outputs (локально `google/gemini-2.5-flash`) |

- [ ] Settings → Environments → `staging`: secret `SUPABASE_DB_PASSWORD`; Deployment branches — только `staging`.

## 6. Первый деплой и проверка

1. Push в `staging` → в Actions `test`, затем `deploy-staging`: link → db push → secrets set → functions deploy → «Auth settings are safe».
2. На `<staging-url>`: вход Google; гостевой дизайн переезжает в аккаунт; свой ключ OpenRouter (с лимитом расходов в OpenRouter) сохраняется, видны только последние 4 символа, полного ключа нет ни в одном ответе (DevTools → Network); полное ревью примера; экспорт в Google Docs с тремя диаграммами; Delete account на `/privacy` удаляет всё.
3. `curl -sI <staging-url> | grep -iE 'content-security|nosniff|referrer|permissions'` — четыре заголовка (если Deployment Protection включена, проверить в DevTools).
4. Supabase → Advisors → Security и Performance: исправить или записать в `open-questions.md`.

Эксплуатация staging: Free ставит проект на паузу после недели без запросов; `keepalive.yml` пингует его дважды в неделю. Квоты (D36): 50 дизайнов по 2 МБ на пользователя.

## 7. Prod (позже)

Когда решим выходить в `main`:
- второй проект Supabase `mlsd-prod` — шаги 1 и 4 с prod-адресами;
- Vercel: переменные окружения **Production** с prod-значениями;
- Google: в тот же клиент добавить origin `https://<project>.vercel.app` и redirect `https://<prod-ref>.supabase.co/auth/v1/callback`; Branding — prod Home page и Privacy; Audience → **In production**;
- GitHub: variables `PROD_SUPABASE_PROJECT_REF`, `PROD_SUPABASE_PUBLISHABLE_KEY`, `PROD_APP_ORIGINS`; environment `production` с secret `SUPABASE_DB_PASSWORD`, **Required reviewers: владелец**, Deployment branches: только `main`; защита `main` с обязательным check `test`;
- выпуск: влить `staging` в `main` → `deploy-production` ждёт approve;
- до анонса перевести prod на **Pro** (нет пауз, ежедневные бэкапы) и убрать его из `keepalive.yml`.

Свой домен — только настройки, без кода, и лучше до заметного числа гостей (гостевой дизайн лежит в IndexedDB конкретного домена и не переезжает): Vercel → Domains (vercel.app оставить алиасом) → Google origins и Authorized domains → Supabase Site URL и Redirect URLs → `PROD_APP_ORIGINS` → перезапустить `deploy-production`.
