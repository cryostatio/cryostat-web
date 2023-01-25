// Mock out the services shared across the app in order to help isolate 
// components from the ServiceContext

jest.mock('@app/Shared/Services/Api.service');
jest.mock('@app/Shared/Services/Login.service');
jest.mock('@app/Shared/Services/NotificationChannel.service');
jest.mock('@app/Shared/Services/Report.service');
jest.mock('@app/Shared/Services/Settings.service');
jest.mock('@app/Shared/Services/Target.service');
jest.mock('@app/Shared/Services/Targets.service');
jest.mock('@i18n/config', () => ({
  ...jest.requireActual('@test/i18n_config'),
  __esModule: true
}));
jest.mock('@i18n/datetime', () => ({
  ...jest.requireActual('@i18n/datetime'),
  __esModule: true,
  supportedTimezones: () =>
    [
      {
        full: 'UTC',
        short: 'UTC',
      },
      {
        full: 'America/Toronto',
        short: 'EST',
      },
    ],
  defaultDatetimeFormat: 
    {
      dateLocale: {
        key: 'en',
        name: 'English',
      },
      timeZone: {
        full: 'UTC',
        short: 'UTC',
      },
    },
  locales: [
    {
      name: 'English',
      key: 'en',
      load: jest.fn()
    },
    {
      name: 'French',
      key: 'fr',
      load: jest.fn()
    }
  ]
}));
