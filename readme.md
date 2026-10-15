# Hotel System

Веб-приложение для управления гостиницей.

## Стек технологий

*   **Backend:** Java 21, Spring Boot 4.1.1, Spring Data JPA, Spring Security
*   **Frontend:** React, TypeScript, Vite
*   **Database:** PostgreSQL 16

## Структура проекта

*   `backend/` — Исходный код серверной части (Spring Boot).
*   `frontend/` — Исходный код клиентской части (React + Vite).

## Стратегия ветвления: GitHub Flow

Проект использует упрощённую модель GitHub Flow.

### Ветки

- `main` — стабильная версия. Прямой push запрещён. Merge через PR из `develop` или `release/*`.
- `develop` — основная ветка разработки. Merge через PR из `feature/*`.
- `feature/*` — новая функциональность. Именование: `feature/<scope>-<short-desc>`.
- `fix/*` — исправления. Именование: `fix/<scope>-<short-desc>`.
- `release/*` — подготовка релиза. Именование: `release/v<semver>`.

### Workflow

1. Создание ветки от `develop`: `git checkout -b feature/room-crud develop`
2. Коммиты по Conventional Commits.
3. Push в удалённый репозиторий: `git push -u origin feature/room-crud`
4. Создание Pull Request в `develop`.
5. Прохождение CI (commitlint + тесты + линтеры).
6. Squash and merge.
7. Удаление feature-ветки.

### Защита веток

- `main` и `develop` защищены: прямой push запрещён, обязательны PR, CI-проверки и запрет force push.
- Запрещены удаления и force push.

### Релизы

Релизы создаются через теги `v<semver>` (SemVer) и GitHub Releases.