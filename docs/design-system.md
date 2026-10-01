# Design system

Палитра и рецепты компонентов для UI. Источник: `docs/mockups/` и уже написанный M1 (ветка `m1/autonomous`). Решение и альтернативы: D10 в `docs/decisions.md`.

Отдельных токенов нет: это стандартные классы Tailwind, сужённые до четырёх палитр. Любой цвет вне них — ошибка, проверка ниже.

## Цвета

| Роль | Классы | Где на мокапе |
|---|---|---|
| Фон страницы | `bg-slate-50` / `bg-slate-100` | фон канваса и документа |
| Поверхность | `bg-white` | карточки, модалка, лист документа |
| Подложка | `bg-slate-50` | блок key-value в документе, миниатюра, чипы |
| Граница | `border-slate-200` снаружи, `border-slate-100` внутри | рамка карточки, разделители |
| Текст | `text-slate-900` заголовки, `text-slate-700` основной | значения |
| Вторичный текст | `text-slate-500` ключи, `text-slate-400` подписи и плейсхолдеры | Domain, Metric, «+N» |
| Основная кнопка | `bg-slate-900 text-white hover:bg-slate-700` | Details, Share |
| Акцент | `text-indigo-600`, фон `bg-indigo-50` / `bg-indigo-100`, рамка и фокус `indigo-300` / `ring-indigo-400` | Diagram, «+ Add Property», выбранный вариант, активный пункт оглавления |
| Успех | `text-emerald-600` | Active, горящий индикатор, хорошие цифры в матрице |
| Плохо, ошибка | `text-red-600` (`red-500` для иконок удаления) | плохие цифры в матрице, ошибка сохранения |

Разрешены только `slate`, `indigo`, `emerald`, `red`, `white`, `black`. В CSS — `var(--color-slate-100)` и т. п., не hex.

## Типографика

- Шрифт системный (`font-sans` по умолчанию Tailwind), отдельный не грузим.
- Заголовок секции на карточке: `text-sm font-semibold uppercase tracking-wide`.
- Подписи над значениями в документе: `text-xs uppercase tracking-wide text-slate-400`.
- Цифры в матрице и коде: `font-mono`.

## Радиусы и тени

| Что | Класс |
|---|---|
| Кнопки, чипы, пункты меню | `rounded-lg` |
| Миниатюра, блоки внутри карточки | `rounded-xl` |
| Карточка, модалка, лист документа | `rounded-2xl` |
| Поля Component Editor | `rounded-full` |
| Тень | `shadow-sm` у карточек, `shadow-lg` у модалки и тултипов |

## Компоненты

**Карточка секции**
```
article: flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm
header:  flex items-center gap-3 border-b border-slate-100 px-4 py-3
footer:  flex items-center justify-end gap-2 border-t border-slate-100 px-4 py-3
```

**Кнопки**
```
primary:   rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700
secondary: rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 hover:bg-slate-50
link:      text-sm font-semibold text-indigo-600 hover:text-indigo-700
```

**Индикатор (Trade-offs, Diagram)** — два состояния, не кнопка
```
off: text-slate-300
on:  text-emerald-600
```

**Поле key-value (Component Editor)**
```
w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100
```

**Строка матрицы trade-offs**
```
chosen: bg-indigo-50, имя варианта text-indigo-600 font-medium
good:   font-mono text-emerald-600
bad:    font-mono text-red-600
```

**Активный пункт (оглавление, переключатель, тулбар редактора)**
```
active:   bg-indigo-50 font-medium text-indigo-700
inactive: text-slate-500 hover:bg-slate-100
```

**Диалог (подтверждение, предупреждение, ввод)** — нативный `<dialog>` с `role="alertdialog"`, не `window.alert/confirm/prompt`
```
dialog:  m-auto w-full max-w-md rounded-2xl bg-white p-6 text-slate-700 shadow-lg backdrop:bg-slate-900/30
кнопки:  справа, primary — действие глаголом («Load example», «Export anyway»), secondary — «Cancel»
```
Готовые функции в M1: `confirmDialog`, `alertDialog`, `promptDialog` из `src/dialogs.ts`. В e2e отвечать через `answerDialog(page, '<кнопка>')` из `e2e/helpers.ts`.

**Фокус** — не стандартная синяя рамка браузера
```
outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
```

## Проверка

Пустой вывод — цвета только из палитры:

```
grep -rnE '\b(gray|zinc|neutral|stone|orange|amber|yellow|lime|green|teal|cyan|sky|blue|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}\b|-\[#' src
grep -rnE '#[0-9a-fA-F]{3,8}\b' src --include='*.css'
```

Hex в TypeScript для API библиотек (например, `viewBackgroundColor` у Excalidraw) допустим.
