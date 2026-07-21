export const messages = {
  ru: {
    navigation: {
      primary: 'Основная навигация',
      feed: 'Главная',
      categories: 'Категории',
      roadmap: 'Что дальше',
    },
    hero: {
      eyebrow: 'Игровая медиаплатформа · RU / EN',
      titleFirst: 'Игровые истории',
      titleAccent: 'без языковых границ.',
      description:
        'Публикуйте на русском или английском. Ion Pulse сохранит оригинал и подготовит перевод для второй аудитории.',
      primaryAction: 'Следить за запуском',
      secondaryAction: 'Посмотреть категории',
      original: 'Оригинал',
      translation: 'Перевод',
      translationState: 'готовится после публикации',
    },
    status: {
      label: 'Статус платформы',
      loading: 'Проверяем API',
      online: 'API работает',
      offline: 'API пока недоступен',
    },
    categories: {
      eyebrow: 'Первая редакция',
      title: 'Четыре направления. Два языка.',
      description:
        'Категории будут управляться редакцией и получат собственные локализованные страницы.',
      reviews: 'Ревью игр',
      reviewsDescription: 'Подробные разборы, оценки и личный опыт.',
      news: 'Игровые новости',
      newsDescription: 'События индустрии без информационного шума.',
      guides: 'Гайды',
      guidesDescription: 'Практические материалы от игроков для игроков.',
      esports: 'Киберспорт',
      esportsDescription: 'Матчи, команды, турниры и аналитика.',
    },
    roadmap: {
      eyebrow: 'В разработке',
      title: 'Сначала надёжный редакционный фундамент.',
      items: {
        identity: 'Профили, роли и верификация авторов',
        publishing: 'Черновики и редакционная проверка',
        translation: 'Сохранённые AI-переводы RU ↔ EN',
        community: 'Подписки, оценки и комментарии',
      },
    },
    footer: {
      tagline: 'One story. Two audiences.',
    },
  },
  en: {
    navigation: {
      primary: 'Primary navigation',
      feed: 'Home',
      categories: 'Categories',
      roadmap: 'What is next',
    },
    hero: {
      eyebrow: 'Gaming media platform · RU / EN',
      titleFirst: 'Gaming stories',
      titleAccent: 'without language barriers.',
      description:
        'Publish in Russian or English. Ion Pulse keeps the original and prepares a translation for the second audience.',
      primaryAction: 'Follow the launch',
      secondaryAction: 'Explore categories',
      original: 'Original',
      translation: 'Translation',
      translationState: 'prepared after publication',
    },
    status: {
      label: 'Platform status',
      loading: 'Checking API',
      online: 'API is online',
      offline: 'API is not available yet',
    },
    categories: {
      eyebrow: 'First edition',
      title: 'Four beats. Two languages.',
      description:
        'Categories will be managed by the editorial team and have their own localized pages.',
      reviews: 'Game reviews',
      reviewsDescription: 'Deep dives, scores, and first-hand experience.',
      news: 'Gaming news',
      newsDescription: 'The events shaping the industry, without the noise.',
      guides: 'Guides',
      guidesDescription: 'Practical knowledge made by players for players.',
      esports: 'Esports',
      esportsDescription: 'Matches, teams, tournaments, and analysis.',
    },
    roadmap: {
      eyebrow: 'In development',
      title: 'A dependable editorial foundation comes first.',
      items: {
        identity: 'Profiles, roles, and author verification',
        publishing: 'Drafts and editorial review',
        translation: 'Stored AI translations between RU and EN',
        community: 'Subscriptions, ratings, and comments',
      },
    },
    footer: {
      tagline: 'One story. Two audiences.',
    },
  },
} as const
