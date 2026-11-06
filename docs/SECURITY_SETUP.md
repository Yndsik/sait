# Защита YNDSI: настройка и проверка

## CAPTCHA (обязательна настройка двух сервисов)

1. Cloudflare dashboard → Turnstile → Add widget. Имя YNDSI, Hostname reliable-unicorn-7ce032.netlify.app (без протокола), тип Managed. Если тестируете preview, отдельно добавьте точный hostname preview; не разрешайте чужие домены.
2. Public Site Key → Netlify → Project configuration → Environment variables → TURNSTILE_SITE_KEY. Scope Builds, production; для preview только если его домен добавлен. После добавления запустить новую сборку. Ключ публичный, в нём нет секрета.
3. Проверить появление виджета на форме входа/регистрации.
4. Supabase → Authentication → Bot and Abuse Protection (названия разделов могут отличаться) → CAPTCHA protection → Turnstile. Secret Key вставить только сюда. Включить CAPTCHA после успешной публикации клиента с Site Key, чтобы не заблокировать вход.
5. Проверить регистрацию с пройденной проверкой и отказ без токена. Настоящая защита обеспечивается Supabase, даже если атакующий обходит интерфейс. Браузер передаёт captchaToken, не проверяет секрет самостоятельно.

Без Site Key и включённой CAPTCHA в Supabase защита от ботов НЕ активна. Не используйте тестовые ключи Cloudflare для production. Пароли, Secret Key и service_role не добавлять в репозиторий/чат/Netlify public-config. В Supabase оставить email confirmation, ограничить Auth rate limits, настроить SMTP и redirect allowlist: только основной домен и действительно нужные callback URL. Включить MFA для аккаунтов администраторов Netlify/Supabase/GitHub. Использовать защиту паролей от утечек, если доступна на тарифе.

## Лимиты API и записи

После предыдущих миграций выполнить 202611070008_security_limits.sql. Она добавляет атомарный общий лимит Steam 30/мин на подтверждённого пользователя и серверные ограничения новых заявок 20/мин и сообщений 60/мин. Старые секундантные ограничения и лимиты медиа сохраняются. Счётчики приватны, по одной строке на пользователя/действие; клиенты не могут редактировать их.

Затем добавить Netlify env STEAM_SHARED_RATE_LIMIT=true (Functions/runtime) и повторить deploy. До SQL флаг не включать: API будет отказывать с 503. Если включён, ошибки квоты не обходятся. Дополнительно внутри одного тёплого процесса есть backpressure 4 одновременных обработчика, локальный лимит обращений авторизации по доверенному IP-заголовку Netlify и Retry-After. Это не глобальная защита от DDoS.

## Netlify DDoS / WAF

Статические файлы обслуживает CDN Netlify; защита сети зависит от провайдера. В Netlify открыть Security / Firewall / Traffic rules (доступность и названия зависят от тарифа), проверить защиту и добавить edge rate rule на /.netlify/functions/steam: начальная настройка 60 запросов/мин/IP с 429, при необходимости корректировать по метрикам NAT и настоящего трафика. Ограничить автоматизированные запросы к дорогостоящим функциям; проверить лимиты/уведомления расходов. Не отключать подтверждение почты и серверную CAPTCHA ради устранения ошибок виджета.

Без административного доступа настройки Netlify/Supabase не подтверждены и не изменены. Если edge rate rules недоступны, нужен соответствующий тариф/поддержка провайдера; клиентская CAPTCHA и локальный Map не заменяют WAF. Не следует обещать полную защиту от DDoS.

## Публикация и заголовки

Netlify build создаёт dist из явного списка публичных файлов и icons. SQL, тесты, docs, .env, .git и серверные исходники туда не попадают. Секрет Turnstile не читается генератором публичной конфигурации. Функции остаются в netlify/functions.

Заголовки: CSP с ограничением внешних script/connect/frame, object-src none, frame-ancestors none, base-uri self, HSTS, nosniff, referrer policy, Permissions-Policy запрещает геолокацию/USB/payment и разрешает камеру/микрофон только текущему сайту. CSP пока содержит unsafe-inline из-за существующих inline-обработчиков; это ограничение, а не полная защита от XSS. Строгая nonce/hash CSP потребует отдельного переноса обработчиков. Фото и подписи пользователя по-прежнему должны экранироваться/валидироваться.

## Проверки

npm test; npm run check; npm run build. SQL regression: supabase/tests/security_limits.sql (ROLLBACK). Дополнительно имеющиеся multiuser_access.sql, social_access.sql, chat_media_access.sql, sharing_notifications.sql, private_timezones.sql.

На production проверить заголовки в DevTools/HTTP, CAPTCHA при входе/регистрации, отказы Supabase без captchaToken, изоляцию аккаунтов A/B, отказ третьему аккаунту и anonymous в чужой переписке/Storage/workspace, лимиты API без нагрузки. Реальная iPhone-проверка: вход в установленном PWA, камеры и микрофон с CSP. Полноценные нагрузочные атаки не проводились.
