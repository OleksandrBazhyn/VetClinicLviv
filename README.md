# 🐾 Ветеринарні клініки Львова

Мобільний застосунок-агрегатор ветеринарних клінік міста Львова.  
Розроблено на **React Native + Expo SDK 54** для iOS та Android.

---

## Вимоги

| Інструмент | Версія |
|---|---|
| Node.js | 18+ |
| npm | 9+ |
| Expo CLI | встановлюється автоматично |
| Expo Go (телефон) | остання версія з App Store / Google Play |

---

## Швидкий старт

### 1. Клонування репозиторію

```bash
git clone <url-репозиторію>
cd VetClinicLviv/VetClinicApp
```

### 2. Встановлення залежностей

```bash
npm install
```

### 3. Запуск

```bash
npx expo start
```

У терміналі з'явиться QR-код.  
Відскануй його застосунком **Expo Go** на телефоні — застосунок відкриється миттєво.

> Телефон і комп'ютер мають бути в **одній Wi-Fi мережі**.

---

## Запуск на емуляторі Android

1. Встанови [Android Studio](https://developer.android.com/studio)
2. Відкрий **Virtual Device Manager** → створи пристрій (Pixel 8, API 35)
3. Запусти емулятор
4. Виконай:

```bash
npx expo start --android
```

---

## Тестові акаунти

Створюються автоматично при першому запуску:

| Роль | Email | Пароль |
|---|---|---|
| 👤 Користувач (преміум) | `user@test.com` | `test123` |
| 🏥 Власник клініки | `clinic@test.com` | `clinic123` |
| 👑 Адміністратор | `admin@test.com` | `admin123` |

---

## Структура проєкту

```
VetClinicLviv/
├── docs/                        # Документація
│   ├── 01-concept.md            # Концепція, вимоги
│   ├── 02-uml-use-case.md       # Діаграма прецедентів
│   ├── 03-uml-activity.md       # Діаграми активності
│   ├── 04-uml-state.md          # Діаграми станів
│   ├── 05-data-structure.md     # ER-діаграма, таблиці БД
│   └── 06-sprints.md            # Розбиття на спринти
│
└── VetClinicApp/                # Код застосунку
    ├── app.config.js            # Конфігурація Expo
    ├── App.js                   # Навігація (Tab + Stack)
    ├── src/
    │   ├── assets/data/
    │   │   └── clinics.json     # Seed-дані (10 клінік)
    │   ├── constants/
    │   │   └── index.js         # Кольори, райони, категорії
    │   ├── components/
    │   │   ├── ClinicCard.jsx   # Картка клініки у списку
    │   │   └── StarRating.jsx   # Зіркова оцінка
    │   ├── db/
    │   │   ├── database.js      # Ініціалізація SQLite, seed
    │   │   ├── authService.js   # Реєстрація, логін, токен
    │   │   ├── clinicService.js # CRUD клінік, FTS5-пошук
    │   │   └── reviewService.js # CRUD відгуків, модерація
    │   ├── services/
    │   │   ├── fileService.js   # Улюблені (JSON-файл)
    │   │   └── emergencyService.js # Екстрені виклики
    │   └── screens/
    │       ├── ClinicsListScreen.jsx    # Список + пошук + фільтри
    │       ├── ClinicProfileScreen.jsx  # Профіль клініки
    │       ├── MapScreen.jsx            # Карта, геолокація, маршрут
    │       ├── AnalyticsScreen.jsx      # Графіки (Bar, Pie, Line)
    │       ├── AuthScreen.jsx           # Реєстрація / вхід
    │       ├── ProfileScreen.jsx        # Профіль користувача
    │       ├── EmergencyScreen.jsx      # Екстрений виклик
    │       ├── AdminScreen.jsx          # Адмін-панель
    │       └── AdminClinicFormScreen.jsx # Форма клініки (адмін)
    └── package.json
```

---

## Основний функціонал

| Функція | Де реалізовано |
|---|---|
| Пошук за назвою (FTS5) | `ClinicsListScreen` + `clinicService` |
| Фільтри (24/7, район, рейтинг, послуги) | `ClinicsListScreen` — модальна панель |
| Карта з маркерами клінік | `MapScreen` — react-native-maps |
| Геолокація + 5 найближчих | `MapScreen` — expo-location + Haversine |
| Побудова маршруту | `MapScreen` — Linking → зовнішні карти |
| Авторизація + ролі | `AuthScreen` + `authService` |
| Відгуки + рейтинг | `ClinicProfileScreen` + `reviewService` |
| Збереження у файл | `fileService` — expo-file-system |
| Графіки (3 типи) | `AnalyticsScreen` — react-native-chart-kit |
| Екстрений виклик | `EmergencyScreen` + `emergencyService` |
| Адмін CRUD клінік | `AdminScreen` + `AdminClinicFormScreen` |
| Модерація відгуків | `AdminScreen` — вкладка «Відгуки» |

---

## База даних

SQLite (expo-sqlite v16). Таблиці:

- `users` — користувачі (ролі: user, clinic_rep, admin)
- `clinics` — клініки
- `clinics_fts` — FTS5 індекс для пошуку
- `services` — послуги клінік
- `working_hours` — графік роботи
- `reviews` — відгуки
- `emergency_calls` — заявки на екстрений виклик

БД та seed-дані створюються автоматично при першому запуску.

---

## Технологічний стек

- **React Native + Expo SDK 54**
- **expo-sqlite v16** — локальна БД з FTS5
- **React Navigation v7** — Tab + Stack навігація
- **react-native-maps** — карта (без Google API ключа)
- **expo-location** — GPS
- **react-native-chart-kit** — графіки
- **expo-file-system** — робота з файлами
- **AsyncStorage v3** — зберігання токену сесії

---

## Гілки

| Гілка | Опис |
|---|---|
| `main` | Стабільна версія |
| `feature/sprint-1-init` | Повна реалізація проєкту |
