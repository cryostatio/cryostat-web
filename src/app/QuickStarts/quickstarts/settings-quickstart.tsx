/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { QuickStart } from '@patternfly/quickstarts';
import { CogIcon } from '@patternfly/react-icons';
import { conclusion } from '../quickstart-utils';

const displayName = 'Using Settings';

const SettingsQuickStart: QuickStart = {
  metadata: {
    name: 'settings-quickstart',
    featureLevel: FeatureLevel.PRODUCTION,
    order: 100,
  },
  spec: {
    displayName: displayName,
    durationMinutes: 5,
    icon: <CogIcon />,
    description: `Learn about the settings page in **[APP]** and how to use it.`,
    prerequisites: [''],
    introduction: `
## Using Settings

[APP] provides a settings page that lets you configure various aspects of the application. This quick start will show you how to use the settings page.

### What you'll learn
  - How to navigate to the settings page
  - How to configure settings in [APP]
    `,
    tasks: [
      {
        title: 'Navigate to the Settings page',
        description: `
1. On the masthead, click the [Settings]{{highlight settings-link}} cog.`,
      },
      {
        title: 'Go to the **General** tab',
        description: `
The **General** settings tab is where you can adjust various general settings to tailor your experience with the application. You can select a preferred theme, the date locale, and the current timezone.

1. Click [General]{{highlight settings-general-tab}}.
2. Configure the theme.
3. Configure the date locale and current timezone.
[[APP] currently only supports English. We are planning on adding support for other languages in the future.]{{admonition note}}`,
      },
      {
        title: 'Go to the **Connectivity** tab',
        description: `
The **Connectivity** tab enables you to configure the WebSocket connection between the browser and the [APP] backend.

1. Click [Connectivity]{{highlight settings-connectivity-tab}}.
2. Configure the **WebSocket retry interval** time.
3. Configure the **Auto-refresh** period for content-views.
[To use the **Auto-refresh** feature, make sure to enable the [Auto-refresh]{{highlight settings-connectivity-tab-auto-refresh}} checkbox.]{{admonition tip}}
`,
      },
      {
        title: 'Go to the **Notifications & messages** tab',
        description: `
The **Notifications & messages** tab allows you to configure the notifications and deletion warnings.

1. Click [Notifications & messages]{{highlight settings-notifications&messages-tab}}.
2. You can enable or disable notifications from various categories. Click \`Show more\` for the full list of notifications.
  To control the maximum number of notifications, configure the input control.
3. You are also able to enable or disable deletion dialog warnings for various destructive actions. Click \`Show more\` for the full list of deletion warnings.
`,
      },
      {
        title: 'Go to the **Dashboard** tab',
        description: `
The **Dashboard** tab allows you to configure settings for the various Dashboard Cards that you can add to the Dashboard.

The **automated analysis** Dashboard Card allows you to automatically start an analysis on the Recording with a click of a button. You can configure the Recording that is started by this card.

1. From the list of settings tabs, click [Dashboard]{{highlight settings-dashboard-tab}}.
2. Configure the **Automated analysis Recording configuration** settings.
3. Configure the **Dashboard metrics configuration** settings.

[When using the **automated analysis card**, make sure the **Event Template** is compatible with the Target JVM.]{{admonition warning}}
[Setting both an infinite maximum size and age may result in an **Out Of Memory** error during report generation.]{{admonition caution}}
`,
      },
      {
        title: 'Go to the **Advanced** tab',
        description: `
[APP] has a few advanced settings that can be configured.

1. Click [Advanced]{{highlight settings-advanced-tab}}.
2. Configure the **feature level** settings.

  The **feature level** setting enables you to enable or disable beta features. This is a client-side switch that only applies to the particular web browser and Cryostat instance where it is set.

`,
      },
    ],
    conclusion: conclusion(displayName, 'Settings'),
    type: {
      text: 'Introduction',
      color: 'blue',
    },
  },
};

export default SettingsQuickStart;
