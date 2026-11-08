(function(root){const releases=[
  {
    "version": "2.0.0",
    "foldedVersions": ["2.0.1"],
    "date": "2026-11-08",
    "title": "Знакомься, RIVLO",
    "titleEn": "Meet RIVLO",
    "summary": "Новое имя. Твой прежний круг. Больше способов играть, общаться и быть на связи.",
    "summaryEn": "A new name. Your familiar circle. More ways to play, stream and stay connected.",
    "sections": [
      {
        "icon": "◌",
        "title": "Люди, планы и твой ритм",
        "titleEn": "People, plans and your rhythm",
        "text": "Новый календарь с месяцем, неделей, списком планов и панелью дня. Новый раздел друзей с отдельными заявками. Закреплённые диалоги и превью загруженных сообщений. Контрастное оформление всех разделов, три цветовых акцента и просторный режим переписки.",
        "textEn": "A new calendar with month, week, agenda and day details. Redesigned friends and request filters. Pinned conversations and loaded-message previews. A high-contrast design across every section, three colour accents and a spacious conversation mode."
      },
      {
        "icon": "◈",
        "title": "Твои игры — в центре",
        "titleEn": "Your games take centre stage",
        "text": "Новая личная библиотека с крупными обложками, прогрессом, избранным и компактными действиями. Плитки или список, поиск и фильтры коллекции. Каталог Steam — во вкладке «Открыть игры». Новый стиль и SVG-иконки, плавное появление карточек и обновлённый список «Хочу пройти».",
        "textEn": "A personal library with large covers, progress, favourites and compact actions. Grid or list, collection search and filters. Steam lives in Discover games. A refreshed visual style, SVG icons, gentle card reveals and a redesigned wishlist."
      },
      {
        "icon": "⌘",
        "title": "Меньше кликов, больше дела",
        "titleEn": "Less clicking, more doing",
        "text": "Быстрый поиск по разделам и своим записям, закреплённые разделы, поиск в загруженной переписке, фильтры задач и кнопка «Сегодня» в календаре. Пустые списки подсказывают следующий шаг, заметки открываются с клавиатуры.",
        "textEn": "Quick navigation and local item search, pinned sections, loaded-message search, task filters and a Today calendar button. Empty lists suggest a next step and notes work with the keyboard."
      },
      {
        "icon": "@",
        "title": "Твой @ник и ссылка",
        "titleEn": "Your handle and profile link",
        "text": "Выбери уникальный @ник через карандаш в профиле. Друзья смогут найти тебя по нему или открыть ссылку на профиль без Twitch. Видимость поиска и ссылки управляется в приватности после обновления базы.",
        "textEn": "Choose a unique handle using the profile pencil. Friends can find you or open your profile link without Twitch. Control handle and link visibility in Privacy after the database update."
      },
      {
        "icon": "⌁",
        "title": "Найди своего стримера",
        "titleEn": "Find your streamer",
        "text": "Поиск каналов Twitch, переход на эфир и связанный профиль RIVLO. Поиск по имени RIVLO, публичные карточки и расписания. Привязка Twitch и добровольное появление в поиске — в приватности после подключения сервиса администратором.",
        "textEn": "Search Twitch channels, open streams and discover linked RIVLO profiles. Search by RIVLO name, with public cards and schedules. Twitch linking and opt-in discovery are available in Privacy after administrator setup."
      },
      {
        "icon": "✧",
        "title": "Удобнее каждый день",
        "titleEn": "Smoother every day",
        "text": "Живой профиль с обложкой и редактированием по карандашу. Привязки и подтверждения — в приватности. Поиск друзей по ID или Twitch; чужой ID не показывается в карточке профиля. Единое оформление всех вкладок: обновлённые карточки, формы, иконки и мягкие анимации. В чате — разделители по дням, группы сообщений и быстрый переход к последним. Мобильный чат подстраивается под экран, меню закрывается по Escape, повторное нажатие не дублирует сообщение, а устаревшие результаты поиска не заменяют новые.",
        "textEn": "A lively profile with a cover and pencil editing. Connections and verification live in Privacy. Find friends by ID or Twitch; other users’ IDs are hidden on profile cards. A shared visual style across all tabs: refined cards, forms, icons and gentle motion. Chats gain day separators, consecutive groups and a jump to latest messages. Mobile chats fit the screen, Escape closes the menu, repeated taps do not duplicate messages and stale search results cannot replace newer ones."
      },
      {
        "icon": "✦",
        "title": "Новый характер",
        "titleEn": "A fresh identity",
        "text": "YNDSI стал RIVLO: новый знак, оформление, живые переходы и анимации. Аккаунты, постоянные ID, друзья и библиотека сохраняются.",
        "textEn": "YNDSI is now RIVLO: a new logo, visual style and motion. Accounts, permanent IDs, friends and game libraries stay with you."
      },
      {
        "icon": "↗",
        "title": "Игры ближе",
        "titleEn": "Games, together",
        "text": "Делись игрой с другом: обложка прямо в сообщении и карточка с подробностями внутри RIVLO. Добавление в коллекцию — отдельным нажатием.",
        "textEn": "Share games with friends: covers in messages and detailed game cards inside RIVLO. Adding to your collection stays a separate action."
      },
      {
        "icon": "♡",
        "title": "Свой круг зрителей",
        "titleEn": "Your audience",
        "text": "Подписки на расписания, число подписчиков в профиле и напоминания в день эфира по твоему времени.",
        "textEn": "Schedule subscriptions, subscriber counts on profiles and stream-day reminders in your time zone."
      },
      {
        "icon": "♫",
        "title": "Слышно и видно",
        "titleEn": "Stay in the loop",
        "text": "Звук сообщений и напоминаний с выключателем и проверкой. Общий онлайн, включая гостей, теперь в боковом меню.",
        "textEn": "Message and reminder sounds with mute and a test button. Site-wide activity, including guests, now lives in the sidebar."
      },
      {
        "icon": "◈",
        "title": "Игровой радар",
        "titleEn": "Gaming radar",
        "text": "Новости, обновления игр, скидки Steam и ссылки на официальные распродажи. Публичный просмотр без обязательного входа.",
        "textEn": "Gaming news, updates, Steam deals and official sale links. Explore public pages without signing in."
      },
      {
        "icon": "✓",
        "title": "Профиль стримера",
        "titleEn": "Creator profiles",
        "text": "Подтверждение владения каналом и галочка рядом с ником в профиле, друзьях и диалогах. Владелец проверяет заявки прямо на сайте. Планирование по нажатию на дату, голосовые и видеокружки с предпросмотром перед отправкой.",
        "textEn": "Channel ownership verification and badges beside names across profiles, friends and conversations. The site owner reviews requests on-site. Click-to-plan calendar dates, plus voice and video previews before sending."
      }
    ],
    "note": "Напоминания и звук работают, пока сайт открыт. Общий онлайн — приблизительное число активных браузеров. Название установленной Android APK пока может отображаться как YNDSI.",
    "noteEn": "Reminders and sounds work while the site is open. Site activity is an approximate count of active browsers. The installed Android APK may still be named YNDSI."
  }
];if(typeof module==='object'&&module.exports)module.exports=releases;root.RivloReleases=releases})(typeof globalThis!=='undefined'?globalThis:this);
