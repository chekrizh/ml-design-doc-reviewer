# Деплой: staging и prod

Как приложение попадает в облако и что настраивает человек. Решения: D35 (окружения и пайплайн), D36 (квоты), D37 (CSP), D38 (privacy и удаление аккаунта). Контракт бэкенда — `docs/backend-spec.md`.

Агент облачных команд не запускает (`.claude/settings.json`). Миграции и функции деплоит GitHub Actions, фронтенд — Vercel.

## Схема

| | staging | prod |
|---|---|---|
| Supabase | проект `mlsd-staging` (Free) | проект `mlsd-prod` (Free → Pro до анонса) |
| Фронтенд | Vercel Preview (каждая ветка и PR) | Vercel Production (`main`) |
| Миграции и функции | `deploy-staging` после зелёных тестов на `main` | `deploy-production` после ручного approve |
| Домен | `*-<team>.vercel.app` | `<project>.vercel.app` (свой домен позже, см. конец) |

Порядок на `main`: тесты → staging (миграции, настройки функций, функции, проверка auth) → ожидание approve → prod. Vercel выкатывает фронтенд параллельно, поэтому **миграции только расширяющие** (expand/contract): новая колонка с default, а не переименование; удаление старого — отдельным релизом, когда фронтенд его уже не читает.

## 1. Supabase: два проекта

Для каждого (`mlsd-staging`, `mlsd-prod`), регион один и тот же, ближе к пользователям:

- [ ] Создать проект, сохранить **пароль базы** (понадобится в GitHub).
- [ ] Project Settings → API: записать **project ref** и **publishable key**.
- [ ] Authentication → Sign In / Providers:
  - Google — включить (Client ID и Secret из шага 2);
  - **Email — выключить** (иначе заработал бы вход по паролю);
  - Phone, Anonymous — выключены;
  - «Allow new users to sign up» — **включено** (вход публичный: новый пользователь Google создаётся при первом входе).
- [ ] Authentication → URL Configuration:
  - prod: Site URL `https://<project>.vercel.app`, Redirect URLs `https://<project>.vercel.app/**`;
  - staging: Site URL — адрес preview основной ветки, Redirect URLs `https://*-<team>.vercel.app/**` и `http://localhost:5173/**`.
- [ ] После первого деплоя: Advisors → Security и Performance, всё исправить или записать в `open-questions.md`.

Проверка руками (её же делает CI): `SUPABASE_URL=https://<ref>.supabase.co SUPABASE_PUBLISHABLE_KEY=<key> node scripts/check-auth-settings.ts`.

## 2. Google Cloud: один OAuth-клиент

- [ ] Проект в Google Cloud Console, APIs & Services → Library → **Google Drive API** включить.
- [ ] Google Auth Platform → Branding: имя «ML System Design Trainer», почта поддержки, Home page `https://<project>.vercel.app`, **Privacy policy `https://<project>.vercel.app/privacy`**, Authorized domains: `vercel.app` нельзя подтвердить как свой — оставить пустым до своего домена (для наших scopes проверка не нужна).
- [ ] Data Access: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `.../auth/drive.file`.
- [ ] Audience: External, **In production** (вход публичный; эти scopes не требуют проверки Google).
- [ ] Clients → Web application:
  - Authorized JavaScript origins: `https://<project>.vercel.app`, адрес staging preview, `http://localhost:5173`;
  - Authorized redirect URIs: `https://<prod-ref>.supabase.co/auth/v1/callback`, `https://<staging-ref>.supabase.co/auth/v1/callback`, `http://127.0.0.1:54321/auth/v1/callback`.
- [ ] Client ID → в Supabase (оба проекта) и в Vercel; Client Secret → только в Supabase.

## 3. Vercel

- [ ] Импорт репозитория (Framework: Vite, build `pnpm build`, output `dist`). `vercel.json` уже задаёт SPA-rewrite и заголовки безопасности.
- [ ] Environment Variables:

| Переменная | Production | Preview |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<prod-ref>.supabase.co` | `https://<staging-ref>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | prod publishable | staging publishable |
| `VITE_GOOGLE_CLIENT_ID` | Client ID | Client ID |

`VITE_TEST_SIGNIN` **не задавать нигде**. Секретов в Vercel нет.

## 4. GitHub

- [ ] Settings → Secrets and variables → Actions → **Secrets**: `SUPABASE_ACCESS_TOKEN` (supabase.com → Account → Access Tokens).
- [ ] **Variables** (репозиторий):

| Переменная | Значение |
|---|---|
| `STAGING_SUPABASE_PROJECT_REF`, `PROD_SUPABASE_PROJECT_REF` | project ref |
| `STAGING_SUPABASE_PUBLISHABLE_KEY`, `PROD_SUPABASE_PUBLISHABLE_KEY` | publishable key (не секрет) |
| `STAGING_APP_ORIGINS` | адрес staging preview (через запятую, если несколько) |
| `PROD_APP_ORIGINS` | `https://<project>.vercel.app` |
| `RECOMMENDED_MODEL` | актуальная модель OpenRouter с картинками и structured outputs |

- [ ] Settings → Environments:
  - `staging`: secret `SUPABASE_DB_PASSWORD` (пароль staging);
  - `production`: secret `SUPABASE_DB_PASSWORD` (пароль prod), **Required reviewers: владелец**, Deployment branches: только `main`.
- [ ] Branch protection на `main`: обязательный check `test`.

Workflow: `.github/workflows/ci.yml` (тесты, затем деплой), `deploy.yml` (деплой одного проекта), `keepalive.yml` (пинг Free-проектов).

## 5. Первый деплой и проверка

1. Мёрж в `main` → `test` зелёный → `deploy-staging` проходит, включая «Auth settings are safe».
2. Staging preview руками: вход Google; гостевой дизайн переезжает в аккаунт; ключ OpenRouter (с лимитом расходов на стороне OpenRouter) сохраняется, видны только последние 4 символа, полного ключа нет ни в одном ответе (DevTools → Network); полное ревью примера; экспорт в Google Docs с тремя диаграммами; Delete account на `/privacy` удаляет всё.
3. Approve `deploy-production` → те же проверки входа и ревью на prod.
4. `curl -sI https://<project>.vercel.app | grep -iE 'content-security|nosniff|referrer|permissions'` — четыре заголовка на месте.

## 6. Эксплуатация

- **Free ставит проект на паузу после недели без запросов и не делает бэкапов.** `keepalive.yml` дважды в неделю шлёт запрос в оба проекта. Prod до публичного анонса перевести на **Pro** (нет пауз, ежедневные бэкапы) и удалить пинг prod из `keepalive.yml`.
- Квоты (D36): 50 дизайнов по 2 МБ на пользователя. Поднять — новой миграцией.
- Расходы на LLM — у пользователей (свой ключ); в инструкции для тестеров — поставить лимит расходов на ключ в OpenRouter.
- Логи функций (Supabase → Edge Functions → Logs) содержат только код, длительность и `run_id`.

## 7. Свой домен (позже, без кода)

Делать **до** заметного числа гостей: гостевой дизайн лежит в IndexedDB конкретного домена и не переезжает (вошедших это не касается, их дизайны в базе).

1. Vercel → Domains: добавить домен, `*.vercel.app` оставить алиасом.
2. Google OAuth: домен в JavaScript origins и Authorized domains (подтвердить владение в Search Console), Home page и Privacy policy на новом домене.
3. Supabase prod: Site URL и Redirect URLs на новый домен.
4. GitHub variable `PROD_APP_ORIGINS`: добавить новый домен → перезапустить `deploy-production` (обновит секрет функций).
