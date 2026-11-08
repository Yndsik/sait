# Подключение Twitch к RIVLO

Поиск показывает пользователей RIVLO, которые сами включили видимость канала. Он не имитирует каталог всех стримеров Twitch. Для поиска вручную подтверждённых Twitch-каналов внешние API-ключи не нужны. Для кнопки «Подключить Twitch» один раз настройте провайдер Supabase.

## 1. База

После SQL 012/014 выполните [SQL 015](../supabase/migrations/202611080015_twitch_directory.sql) в Supabase → SQL Editor. Скрипт повторно запускается безопасно, существующие профили и ID не меняет. Видимость по умолчанию **выключена**, каналы сами в поиск не добавляются.

## 2. Приложение Twitch

Откройте https://dev.twitch.tv/console/apps и войдите в свой Twitch. Для Developer Console может потребоваться двухфакторная защита Twitch.

Выберите Register Your Application:

- Name: RIVLO (или другое свободное имя приложения).
- OAuth Redirect URL: `https://ougbjjfrxfokyqqriqtx.supabase.co/auth/v1/callback`.
- Category: Website Integration / подходящая категория сайта.
- Если есть Client Type: Confidential, потому что секрет хранит Supabase на сервере.

После создания откройте Manage. Скопируйте Client ID и создайте New Secret. **Client Secret не отправляйте в чат и не добавляйте в GitHub или код сайта.**

## 3. Supabase

Откройте https://supabase.com/dashboard/project/ougbjjfrxfokyqqriqtx/auth/providers → Twitch:

- включите Twitch Enabled;
- вставьте Client ID и Client Secret из Twitch;
- Save.

В Authentication → configuration options включите **Manual identity linking**. Это нужно, чтобы добавить Twitch к уже существующему аккаунту, включая Twitch с другой почтой. Сайт вызывает `linkIdentity`, а не создаёт ещё один аккаунт.

В URL Configuration (https://supabase.com/dashboard/project/ougbjjfrxfokyqqriqtx/auth/url-configuration) оставьте Site URL `https://yndsi-streamer-hub.pages.dev` и добавьте Redirect URL:

`https://yndsi-streamer-hub.pages.dev/?twitch=linked`

Twitch Developer Console принимает callback Supabase; настройки redirect в Supabase принимают адрес самого сайта. Не меняйте одно на другое.

## 4. Проверка на телефоне

1. Войдите на сайт обычным способом.
2. Мой профиль → «Твой канал — в твоём профиле» → «Подключить Twitch».
3. Разрешите вход на официальной странице Twitch и вернитесь в RIVLO.
4. Проверьте «Подключён @ник». Постоянный ID, ник RIVLO и аватарка остаются прежними.
5. По желанию включите «Показывать мой канал в поиске стримеров RIVLO».
6. В боковом меню «Стримеры» найдите ник Twitch или имя RIVLO. Можно вставить ссылку twitch.tv или @ник.

Гости видят только добровольно опубликованные профиль/канал и публичное расписание. Для подписки и общения нужен вход. Часовой пояс, почта, переписка, заметки и планы не публикуются. Привязка Twitch сама по себе не выдаёт административную галочку RIVLO — её прежнее правило проверки сохранено.

Отвязка выполняется через `unlinkIdentity`; Supabase требует ещё один способ входа, чтобы пользователь не потерял доступ. Если отвязка недоступна, сначала проверьте вход по почте. Снять видимость из поиска можно отдельным переключателем.

## Технические границы

Владение Twitch читается сервером только из `auth.identities` с provider=twitch, числовым provider_id и login, полученным от OAuth-провайдера. Поля user_metadata, ник RIVLO и присланная ссылка не являются OAuth-доказательством. Пользователи не имеют доступа к приватным таблицам. Twitch access/refresh tokens не сохраняются в локальном хранилище вместе с сессией RIVLO, не публикуются и не отправляются нашим RPC. Автоматического импорта никнейма/аватара и переименования профиля нет.

Статус «live на Twitch», категория трансляции и полный поиск по незарегистрированным каналам в этот пакет не входят: они требуют отдельного серверного Helix API. Не показываем выдуманный live-статус. Подключение на настоящем Twitch нельзя проверить до настройки вашего приложения; локальные проверки используют имитацию OAuth-ответов, настоящую SDK-форму вызова и PostgreSQL-проверки прав.

Официальные инструкции: https://supabase.com/docs/guides/auth/social-sign-in/auth-twitch и https://supabase.com/docs/guides/auth/auth-identity-linking .
