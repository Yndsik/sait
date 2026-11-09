# Полные файлы первого этапа

Содержимое архива — полные файлы, без сокращений и без node_modules/APK/секретов. Это набор изменений поверх текущего RIVLO 2.0.1 beta, а не отдельный сайт.

Новые: creator-tools-model.js, creator-tools-ui.js, creator-tools.css, tests/creator-tools.test.cjs, docs/RESEARCH_CREATOR_HUB_2026_11.md.
Изменены: index.html (подключения и OG), scripts/build.cjs (публичные assets), package.json (проверки), releases.js (заметка в существующей версии).

Применение: сохранить резервную копию текущей ветки, заменить файлы из архива с сохранением путей. npm run check; npm test; npm run build. Netlify: build command node scripts/build.cjs, publish dist, functions netlify/functions — существующая конфигурация netlify.toml не менялась. Cloudflare: npm run build:cloudflare, output dist. Не переносить произвольные серверные секреты в клиентские файлы.

На главной под основным знакомством с продуктом появится блок подготовки. Проверить в гостевом режиме и после входа: ввести название/игру/дату/HTTPS-ссылку Twitch или YouTube, создать анонс, скопировать; отключить доступ к буферу обмена и проверить ручное выделение; переключить игру и идею; RU/EN; ширины 360 и 390 px. При навигации введённые поля сбрасываются — автосохранения нет. Время в анонсе включает часовой пояс устройства.

Откат: revert коммита первого этапа. Данные Supabase не затронуты. Прежние неинтегрированные Stream Hub WIP файлы не входят в архив.
