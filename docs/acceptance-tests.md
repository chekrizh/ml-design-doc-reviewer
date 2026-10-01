# Acceptance Tests (M1, M1.1, M2)

Приёмочные сценарии M1 и M2. Их утвердил человек, они проверяют решения из `docs/mvp-spec.md` и основной сценарий продукта.

## Правила для агента

- Эти сценарии — планка качества. **Не меняйте, не ослабляйте и не удаляйте этот файл.** Если сценарий кажется неверным или противоречит spec, запишите это в `open-questions.md` и продолжайте работу над другими пунктами.
- Реализуйте каждый сценарий как отдельный Playwright-тест в `e2e/acceptance/`. Имя теста начинается с ID сценария, например `AT-04 trade-offs indicator follows the strict rule`.
- Тест проверяет **каждый** пункт «Ожидаем» из сценария. Нельзя пропускать проверки, заменять их более слабыми или помечать тест как `skip`/`fixme`.
- Каждый тест начинается с пустого IndexedDB, если в сценарии не сказано иное.
- Приёмочные тесты запускаются в двух браузерах: Chromium и WebKit (движок Safari). Оба должны быть зелёными.
- Проверяйте то, что видит пользователь (текст, наличие элементов, скачанные файлы), а не внутреннее состояние хранилища.

## Сценарии

### AT-01. Сквозной путь

**Дано:** пустой дизайн.
**Действие:**
1. Переименовать дизайн в «Fraud Detection».
2. На карточке Problem Space задать Domain = «Payments», Business Goal = «Cut fraud losses by 20%».
3. Открыть Details у Baseline, задать Approach = «Rules», написать в Rationale «Rules are cheap to start».
4. В матрице Baseline добавить варианты «Rules» и «Logistic Regression», критерий «Cost», заполнить все ячейки, отметить «Rules».
5. Закрыть редактор, переключиться в Document.
6. Экспортировать Markdown через меню Share, подтвердив предупреждение о пустых секциях.

**Ожидаем:**
- Заголовок документа — «Fraud Detection».
- В разделе Problem Space видны «Payments» и «Cut fraud losses by 20%».
- В разделе Baseline видны «Rules», текст «Rules are cheap to start» и таблица с обоими вариантами, «Rules» отмечен как выбранный.
- Скачан файл `fraud-detection.md`, в котором есть все эти значения.

### AT-02. Синхронизация: канвас → документ

**Дано:** пустой дизайн.
**Действие:** на карточке Monitoring задать Data Drift = «PSI < 0.2», переключиться в Document.
**Ожидаем:** в разделе Monitoring виден «PSI < 0.2», перезагрузка страницы не нужна.

### AT-03. Синхронизация: документ → канвас

**Дано:** загружен пример.
**Действие:** в режиме Document изменить:
1. значение Key Property в Integration на «Streaming»;
2. текст Rationale в Integration: дописать «Needs Kafka»;
3. одну ячейку матрицы в любом разделе, где есть матрица, на «Changed».

Переключиться в Canvas.
**Ожидаем:**
- На карточке Integration виден «Streaming».
- В Details у Integration в Rationale есть «Needs Kafka».
- В Details изменённого раздела ячейка матрицы равна «Changed».

### AT-04. Индикатор Trade-offs по строгому правилу

**Дано:** пустой дизайн, открыт Details у Evaluation (Offline).
**Действие и ожидаем**, после каждого шага проверяется индикатор Trade-offs (значок весов в правом верхнем углу карточки; «погашен» = серый, «горит» = зелёный с галочкой):
1. 1 вариант, 1 критерий, ячейка заполнена, вариант выбран → **погашен**.
2. Добавить 2-й вариант, заполнить его ячейку, ничего не менять в выборе → **горит** (выбор остался у 1-го варианта).
3. Очистить одну ячейку → **погашен**.
4. Заполнить ячейку обратно → **горит**.
5. Снять выбор (или удалить выбранный вариант) → **погашен**.
6. Сделать 2 варианта, 0 критериев → **погашен**.

### AT-05. Диаграмма: индикатор, миниатюра, документ

**Дано:** пустой дизайн.
**Действие:** открыть Details у Validation, нарисовать на вайтборде прямоугольник, закрыть редактор.
**Ожидаем:**
- На карточке Validation есть миниатюра диаграммы, у других карточек миниатюр нет.
- Индикатора Diagram нет ни на одной карточке.
- В режиме Document в разделе Validation есть изображение диаграммы, и раздел не помечен как «Not filled yet».

### AT-06. Секции и шаблонные ключи

**Дано:** пустой дизайн.
**Ожидаем:**
- 9 карточек. На канвасе по умолчанию они стоят тремя рядами (слева направо, сверху вниз): Problem Space, Evaluation (Offline), Baseline; Validation, Data & Features, Target Solution & Architecture; Evaluation (Online), Monitoring, Integration.
- Текста «Evaluation Strategy» нет нигде.
- Ключи каждой секции совпадают с таблицей шаблонных ключей в `docs/mvp-spec.md`; у Validation ключей нет.

### AT-07. Канонический порядок документа


**Дано:** загружен пример.
**Действие:** перетащить карточку Monitoring на место Problem Space, переключиться в Document.
**Ожидаем:** разделы документа и пункты оглавления идут в каноническом порядке: Problem Space, Evaluation (Offline), Baseline, Validation, Data & Features, Evaluation (Online), Integration, Monitoring, Target Solution & Architecture. Problem Space — первым.

### AT-08. Выбор в матрице не трогает Key Properties

**Дано:** пустой дизайн, у Target Solution & Architecture задан Model Type = «XGBoost».
**Действие:** в матрице этой секции добавить варианты «CatBoost» и «XGBoost», критерий, заполнить ячейки, отметить «CatBoost».
**Ожидаем:** Model Type на карточке и в Details по-прежнему «XGBoost».

### AT-09. Всё переживает перезагрузку

**Дано:** пустой дизайн.
**Действие:** задать название, значение Key Property, текст Rationale, полную матрицу 2×1 с выбором, прямоугольник на вайтборде; перетащить одну карточку и изменить размер другой. Перезагрузить страницу.
**Ожидаем:** название, значение, текст, матрица с выбором, диаграмма (миниатюра на карточке), позиция и размер карточек сохранились.

### AT-10. Reset layout

**Дано:** загружен пример.
**Действие:** запомнить позиции и размеры карточек, переставить две карточки, изменить размер третьей, нажать «Reset layout».
**Ожидаем:** позиции и размеры всех карточек равны запомненным, содержимое карточек не изменилось.

### AT-11. Load example

**Дано:** пустой дизайн, название изменено на «Mine».
**Действие и ожидаем:**
1. Нажать «Load example», отменить → название по-прежнему «Mine».
2. Нажать «Load example», подтвердить → название «Churn Prediction (Telecom)», у всех 9 карточек заполнены значения, индикатор Trade-offs горит минимум у 3 карточек, миниатюра диаграммы есть минимум у 2.

### AT-12. Markdown: файл или ZIP

**Дано и ожидаем:**
1. Пустой дизайн, заполнено одно значение в Problem Space, диаграмм нет. Export Markdown → скачан один файл с расширением `.md`.
2. Загружен пример (есть диаграммы). Export Markdown → скачан `.zip`. В нём один `.md` и папка `images/` с `.svg`; каждая ссылка на картинку в `.md` указывает на файл, который есть в архиве; количество `.svg` равно числу секций с непустой диаграммой.

### AT-13. Пустые секции

**Дано:** пустой дизайн, заполнены только Problem Space и Baseline.
**Действие и ожидаем:**
1. В Document у остальных 7 разделов виден «Not filled yet».
2. Export Markdown → появляется предупреждение, в котором указано число 7. Отмена → ничего не скачано.
3. Export Markdown ещё раз, подтвердить → в скачанном `.md` есть разделы Problem Space и Baseline и нет заголовков остальных семи.

### AT-14. PDF

**Дано:** загружен пример.
**Действие:** в режиме Document сгенерировать PDF страницы через `page.pdf()` в print-режиме.
**Ожидаем:** текст PDF содержит заголовки всех заполненных разделов и не содержит текста шапки («Canvas», «Document», «Share», «AI Review») и заголовка оглавления «On this page».
**В WebKit:** `page.pdf()` доступен только в Chromium, поэтому в WebKit те же ожидания проверяются по видимому тексту страницы в режиме печати (`emulateMedia({ media: 'print' })`). Реальная печать в Safari проверяется руками при приёмке.

## Сценарии M1.1

### AT-15. Индикатор Trade-offs и кнопка Details

**Дано:** пустой дизайн.
**Ожидаем:**
1. В правом верхнем углу карточки Evaluation (Offline) — серый значок весов. Это не кнопка: клик по нему ничего не открывает.
2. При наведении на значок появляется подсказка «Trade-offs not filled yet. Weigh the alternatives and make a considered choice.»
3. После заполнения матрицы этой секции по строгому правилу (2 варианта, 1 критерий, все ячейки, выбор) значок зелёный с галочкой, подсказка — «Trade-offs filled: alternatives weighed, choice made.»
4. Индикатора Diagram нет ни на одной карточке.
5. Кнопка Details прижата к правому краю нижней части карточки.

### AT-16. Свободный текст в документе

**Дано:** пустой дизайн, режим Document.
**Действие:** в разделе Monitoring кликнуть по подсказке «Not filled yet — start typing…» и набрать «Watch PSI weekly». Переключиться в Canvas, открыть Details у Monitoring.
**Ожидаем:**
- В Rationale у Monitoring — «Watch PSI weekly».
- Export Markdown: предупреждение называет число 8, в скачанном `.md` есть раздел Monitoring с текстом «Watch PSI weekly».

### AT-17. Заголовок документа — это название дизайна

**Дано:** пустой дизайн, режим Document.
**Действие:** кликнуть по заголовку документа, ввести «Ads CTR», нажать Enter. Перезагрузить страницу.
**Ожидаем:** до и после перезагрузки в шапке название «Ads CTR», заголовок документа — «Ads CTR».

### AT-18. Шапка: Share, AI Review, меню «⋯», статус сохранения

**Дано:** пустой дизайн.
**Ожидаем:**
1. В шапке нет отдельных кнопок Export PDF, Export Markdown, Load example и Reset layout.
2. Рядом с названием дизайна виден статус «Saved».
3. Share открывает всплывающее меню с пунктами Export PDF и Export Markdown. После заполнения одного значения в Problem Space пункт Export Markdown из этого меню (с подтверждением предупреждения) скачивает `.md`.
4. AI Review открывает всплывающее меню с пунктом «Full review». Пункт неактивен, при наведении видна подсказка «Coming soon».
5. Меню «⋯» содержит Load example и Reset layout. Load example из него загружает пример (с подтверждением).

### AT-19. Высота карточек по содержимому

**Дано:** пустой дизайн.
**Ожидаем:**
1. Карточки одного ряда одинаковой высоты (±2px) — по самой высокой из них. У самой высокой по содержимому карточки каждого ряда расстояние от нижнего края последнего элемента содержимого до верхней границы нижней части с кнопкой Details — не больше 32px.
2. После изменения содержимого (нарисовать прямоугольник в Evaluation (Offline): Details → вайтборд → закрыть) условие п. 1 по-прежнему выполняется для всех рядов.
3. После изменения ширины Problem Space ручкой ресайза условие п. 1 по-прежнему выполняется для всех рядов.

### AT-20. Раскладка на всю ширину (Safari)

**Дано:** пустой дизайн, окно 1440×900, тест выполняется и в Chromium, и в WebKit.
**Ожидаем:** левый край Problem Space совпадает с левым краем области карточек, правый край Baseline — с правым краем области карточек (±2px); между карточками первого ряда нет промежутков шире, чем между карточками второго ряда (±2px).

### AT-21.  Раскладка по умолчанию
    
**Дано:** пустой дизайн, окно 1440×900.
**Действие и ожидаем:**
1. Три ряда по три карточки: Problem Space, Evaluation (Offline), Baseline; Validation, Data & Features, Target Solution & Architecture; Evaluation (Online), Monitoring, Integration. В каждом ряду ширины 4 / 3 / 5 колонок из 12, ряд от левого края до правого (±2px).
2. У Validation, Target Solution & Architecture и Integration на карточке схема по умолчанию со словом «Diagram»; в режиме Document эти разделы помечены «Not filled yet».
3. Изменить ширину Problem Space и перетащить Monitoring на место Problem Space; Reset layout → раскладка как в п. 1.
4. Изменить ширину Problem Space, Load example → раскладка как в п. 1. Изменить ширину Problem Space, Clear design (подтвердить) → пустой дизайн с раскладкой как в п. 1.

## Сценарии M2

### Что из M1 заменено

Остальные сценарии M1 действуют в M2 без изменений; «загружен пример» теперь значит Supermegaretail Demand Forecasting.

- AT-11, п. 2 (название «Churn Prediction (Telecom)», минимум 3 и 2) → AT-25.
- AT-18, п. 3 (пункты Share) и п. 4 («Full review», «Coming soon») → AT-43 и AT-30.

### Тестовое окружение M2

- Внешние сервисы не вызываются. Supabase локальный (CLI + Docker), база чистая перед каждым тестом. Вход — тестовый, в обход Google, доступен только в локальном окружении. OpenRouter и Google Drive — моки, которые записывают полученные запросы.
- Мок проверки ключа: ключ `sk-or-v1-test-valid-0000a3f9` принимается, любой другой отклоняется.
- Мок LLM отвечает записанными ответами:
  - **R1** — полное ревью примера, 5 находок:
    1. Critical, Evaluation (Online) › Key Metric: «Average check does not measure the stated goal». Fix: «Make the primary metric waste plus lost sales in money per store-day.»
    2. Major, Evaluation (Online) › строка матрицы «Split by distribution center»: «Split by distribution center leaves too few units to detect +0.3%».
    3. Minor, Evaluation (Online) › Rationale: «Control metrics have no thresholds».
    4. Major, дизайн целиком, Cost of mistakes & risk: «Out-of-stock is called costlier than overstock, but neither cost is estimated».
    5. Minor, Problem Space › Rationale: «Antigoals are not stated».
  - **R2** — ревью одной секции Evaluation (Online), 1 находка: Major, Key Metric, «Primary metric is a revenue proxy».
  - **Ошибки**: ответ 401, 402, 429; ответ, не подходящий под схему находок.
- «Залогинен» в сценарии — вход тестовым пользователем; «с ключом» — в настройках сохранён валидный ключ.

### AT-22. Главный экран гостя

**Дано:** гость, пустой IndexedDB, окно 1440×900.
**Ожидаем:**
1. Видны секции «Design a system», «Examples», «Your designs». Страница не прокручивается: нижний край «Your designs» в пределах окна.
2. В «Design a system» — карточка «Your own problem» с кнопкой «New design» и карточка «SuperPay Real-Time Fraud Detection» с кнопкой «Start task»; в её превью ML Task — «Your first decision».
3. В «Examples» — «Supermegaretail Demand Forecasting» с кнопкой «Open example» и строкой Source.
4. В «Your designs» — «Sign in to keep several designs and run AI review», блока «Current work» нет.
5. В шапке — «Sign in with Google» и аватар гостя.

### AT-23. Гость: текущая работа и перезапись

**Дано:** гость, пустой IndexedDB.
**Действие и ожидаем:**
1. «New design», переименовать в «Mine», вернуться на главный экран → блок «Current work · in this browser» с «Mine». Continue открывает «Mine».
2. На главном экране «Open example» → диалог «Replace your current work?». Cancel → в «Current work» по-прежнему «Mine».
3. «Open example», подтвердить → открыт дизайн «Supermegaretail Demand Forecasting»; на главном экране в «Current work» — он, «Mine» нигде нет.

### AT-24. Задача из Library

**Дано:** гость, пустой IndexedDB.
**Действие:** «Start task» у «SuperPay Real-Time Fraud Detection».
**Ожидаем:**
- Название дизайна — «SuperPay Real-Time Fraud Detection».
- На карточке Problem Space Domain — «High-volume payment risk management», значение ML Task пустое.
- В Document у 8 разделов, кроме Problem Space, виден «Not filled yet».

### AT-25. Load example — Supermegaretail

**Дано:** пустой дизайн, название «Mine».
**Действие:** «⋯» → Load example, подтвердить.
**Ожидаем:** название «Supermegaretail Demand Forecasting»; у всех 9 карточек заполнены значения; индикатор Trade-offs горит ровно у 7 карточек; миниатюра диаграммы ровно у 3: Validation, Data & Features, Integration.

### AT-26. Вход переносит дизайн гостя

**Дано:** у тестового пользователя в облаке есть дизайн «Cloud A». Гость создал дизайн «Mine» и задал в Problem Space Domain = «Payments».
**Действие:** войти.
**Ожидаем:**
1. В «Your designs» есть и «Cloud A», и «Mine»; «Cloud A» не изменён. Блока «Current work» нет.
2. Открыть «Mine» → Domain = «Payments».
3. Перезагрузить страницу → оба дизайна на месте.
4. Выйти → главный экран гостя без блока «Current work».

### AT-27. Несколько дизайнов

**Дано:** залогинен, дизайнов нет.
**Действие и ожидаем:**
1. Создать «A», затем «B», задать в «B» одно значение Key Property → в «Your designs» сначала «B», затем «A»; у «B» видно «1 / 9 sections», у «A» — «0 / 9 sections».
2. Изменить значение в «A», вернуться на главный экран → «A» первым.
3. «⋯» у «B» → Delete, подтвердить → «B» нет в списке, и после перезагрузки тоже.

### AT-28. Пример у залогиненного сохраняется копией

**Дано:** залогинен, дизайнов нет.
**Действие и ожидаем:**
1. «Open example», ничего не менять, вернуться на главный экран → «Your designs» пуст.
2. «Open example», изменить Domain в Problem Space на «Grocery», вернуться → в «Your designs» есть «Supermegaretail Demand Forecasting» с чипом «Example».
3. Снова «Open example» из «Examples» → Domain — «Retail, grocery chain».

### AT-29. Правки в двух вкладках

**Дано:** залогинен, дизайн «A» открыт в двух вкладках.
**Действие:** во вкладке 1 задать Domain = «One» и дождаться «Saved»; во вкладке 2 задать Domain = «Two».
**Ожидаем:** во вкладке 2 виден баннер о том, что дизайн изменён в другом месте, с действием перезагрузки; «Two» не перезаписало «One» молча. После перезагрузки по баннеру во вкладке 2 Domain = «One».

### AT-30. AI Review без входа и без ключа

**Действие и ожидаем:**
1. Гость: AI Review → «Sign in to run AI review» и «Sign in with Google»; пунктов «Review whole design» нет.
2. Залогинен без ключа: AI Review → «Add your OpenRouter key»; «Add key» открывает диалог «AI Review settings».
3. Залогинен с ключом: AI Review → «Review whole design» и 9 секций под «Review one section».

### AT-31. Ключ OpenRouter

**Дано:** залогинен без ключа, открыт «AI Review settings».
**Действие и ожидаем:**
1. Ввести `sk-or-v1-wrong`, Save → сообщение, что OpenRouter отклонил ключ. Закрыть, открыть снова → ключа нет.
2. Ввести `sk-or-v1-test-valid-0000a3f9`, Save → видно окончание «a3f9» и «Works». Полного ключа нет ни в тексте страницы, ни в ответах сервера браузеру за всю сессию, в том числе после перезагрузки.
3. В списке моделей выбрана модель по умолчанию; цены не показаны.
4. Delete, подтвердить → AI Review снова показывает «Add your OpenRouter key».

### AT-32. Полное ревью: сигналы на канвасе

**Дано:** залогинен с ключом, загружен пример. Мок LLM отвечает R1 с задержкой 2 с.
**Действие:** AI Review → «Review whole design».
**Ожидаем:**
1. Пока идёт проверка — панель Review с текстом «Reviewing» и кнопкой Cancel.
2. После ответа — счётчики: 1 critical, 2 major, 2 minor.
3. Evaluation (Online): индикатор ревью красный с «!», бейдж «3 findings».
4. Problem Space: индикатор зелёный с галочкой, бейдж «1 finding».
5. Baseline: индикатор зелёный с галочкой, бейджа нет.
6. Первая группа в панели — «Whole design», в ней «Out-of-stock is called costlier…».
7. В группе Evaluation (Online) minor-находка свёрнута в строку с «minor — show».
8. В запрос к LLM ушли 3 картинки PNG — диаграммы Validation, Data & Features, Integration.

### AT-33. Находка: раскрытие, Fix, переход

**Дано:** после AT-32.
**Действие и ожидаем:**
1. Раскрыть «Average check does not measure the stated goal» → видны «What the design says» и «Why it matters», текста Fix нет. «Show fix» → виден «Make the primary metric waste plus lost sales…».
2. Карточка Evaluation (Online) в зоне видимости канваса.
3. Закрыть панель, кликнуть бейдж Problem Space → панель открыта, раскрыта «Antigoals are not stated».

### AT-34. Статус находки синхронен везде

**Дано:** после AT-32.
**Действие и ожидаем** (без перезагрузки и без повторного запуска):
1. В панели Resolve у critical → бейдж Evaluation (Online) «2 findings», индикатор по-прежнему красный.
2. Details у Evaluation (Online): во вкладке Open колонки Findings 2 находки, в Resolved — critical; у Key Metric маркера нет.
3. В Details Dismiss у major «Split by distribution center…» → бейдж на карточке «1 finding», индикатор зелёный с галочкой; в панели Review вкладка Dismissed содержит эту находку.
4. Document: в комментариях Open нет обеих находок; во вкладке Resolved — critical. Reopen у неё → Canvas: бейдж «2 findings», индикатор красный.

### AT-35. Маркеры в Component Editor

**Дано:** после AT-32, открыт Details у Evaluation (Online).
**Ожидаем:**
1. Маркеры есть у Key Metric, у строки матрицы «Split by distribution center» и у заголовка Rationale; у остальных Key Properties маркеров нет.
2. Клик по маркеру строки матрицы → в колонке Findings раскрыта «Split by distribution center leaves too few units…».
3. В колонке Findings есть кнопка «Review this section».

### AT-36. Документ: оглавление и комментарии

**Дано и ожидаем:**
1. Пустой дизайн, Document: оглавление левее листа документа.
2. После AT-32, Document: справа от листа — комментарии, ни один не перекрывает другой.
3. Раскрыть комментарий «Average check…» → его верхний край на уровне поля Key Metric в Evaluation (Online) (±4px).
4. Комментарий «Out-of-stock is called costlier…» стоит на уровне заголовка документа (±4px), выше остальных.

### AT-37. Ревью секции заменяет только её находки

**Дано:** после AT-32; Dismiss у «Antigoals are not stated». Мок LLM отвечает R2.
**Действие:** AI Review → Review one section → Evaluation (Online).
**Ожидаем:**
- У Evaluation (Online) ровно одна находка — «Primary metric is a revenue proxy», во всех вкладках; трёх прежних нет нигде.
- «Antigoals are not stated» — по-прежнему во вкладке Dismissed.
- «Out-of-stock is called costlier…» — по-прежнему в «Whole design».

### AT-38. Устаревшие находки

**Дано:** после AT-32.
**Действие и ожидаем:**
1. Изменить значение Key Metric → у «Average check…» метка «Field changed since review» в панели и в документе.
2. Удалить Key Property «Key Metric» → «Average check…» в группе «Whole design» с меткой «Field removed».

### AT-39. Ошибки и отмена ревью

**Дано:** после AT-32 (5 открытых находок).
**Действие и ожидаем** — после каждого шага счётчики и находки те же, что до шага:
1. Мок отвечает 401 → в панели «OpenRouter rejected your key» и «Replace key».
2. 402 → «out of credits» и «Run again».
3. 429 → «limiting requests» и «Run again».
4. Ответ не по схеме → «could not be read» и «Run again».
5. Запустить ревью с задержкой ответа 5 с, нажать Cancel → проверка остановлена, находки прежние.

### AT-40. Находки не попадают в экспорт

**Дано:** после AT-32.
**Действие:** Export Markdown; PDF (как в AT-14); Export to Google Docs (мок Drive).
**Ожидаем:** ни в скачанном `.md`, ни в тексте PDF, ни в HTML, ушедшем в Drive, нет заголовков пяти находок R1 и подписей «What the design says», «Why it matters», «Show fix». (Слово «critical» не проверяется: оно есть в самом примере, «Latency Budget: Not critical».)

### AT-41. Экспорт в Google Docs

**Дано:** загружен пример; проверяется и гостем, и залогиненным. Мок Drive принимает загрузку.
**Действие и ожидаем:**
1. Share → первый пункт «Export to Google Docs». Нажать → уведомление «Google Doc created» с Open и Copy link.
2. Мок Drive получил один запрос создания файла с типом `application/vnd.google-apps.document`; HTML содержит название дизайна, заголовки всех 9 разделов и ровно 3 картинки `data:image/png`; SVG нет.
3. Экспортировать ещё раз → мок получил второй запрос создания, запросов изменения не было. В Share видно «Last exported».
4. Мок отказывает в доступе к Drive → уведомление с «Nothing was exported», запросов создания нет.

### AT-42. Ревью видно после перезагрузки

**Дано:** после AT-34, п. 1 (critical решена).
**Действие:** перезагрузить страницу.
**Ожидаем:** счётчики 0 critical, 2 major, 2 minor; critical во вкладке Resolved; бейдж Evaluation (Online) «2 findings».

### AT-43. Шапка M2

**Дано:** залогинен, загружен пример.
**Ожидаем:**
1. Аватар левее кнопок AI Review и Share.
2. Share: пункты по порядку — «Export to Google Docs», «Export PDF», «Export Markdown».
3. В меню AI Review нет «Coming soon».
4. Меню аккаунта: My designs, AI Review settings, Sign out.   