export default {
  config: {
    locales: ['en'],
    translations: {
      en: {
        'app.components.LeftMenu.navbrand.title': 'SLMS CMS',
        'app.components.LeftMenu.navbrand.workplace': 'Content Dashboard',
        'Auth.form.welcome.title': 'Welcome to SLMS',
        'Auth.form.welcome.subtitle': 'Manage sustainability content',
      },
    },
    theme: {
      light: {
        colors: {
          primary100: '#fce8e6',
          primary200: '#f5c4c0',
          primary500: '#C43A31',
          primary600: '#9E2C25',
          primary700: '#7a2219',
          buttonPrimary500: '#C43A31',
          buttonPrimary600: '#9E2C25',
        },
      },
      dark: {
        colors: {
          primary100: '#3d1a17',
          primary200: '#5c2822',
          primary500: '#C43A31',
          primary600: '#d95a51',
          primary700: '#e88880',
          buttonPrimary500: '#C43A31',
          buttonPrimary600: '#d95a51',
        },
      },
    },
    tutorials: false,
    notifications: { releases: false },
  },
  bootstrap() {
    // Bootstrap admin panel
  },
};
