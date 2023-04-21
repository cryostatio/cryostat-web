/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import cryostatLogo from '@app/assets/cryostat_icon_rgb_default.svg';
import build from '@app/build.json';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { QuickStart } from '@patternfly/quickstarts';
import { CogIcon } from '@patternfly/react-icons';
import React from 'react';

const SettingsQuickStart: QuickStart = {
  apiVersion: 'v2.3.0',
  metadata: {
    name: 'settings-quickstart',
    featureLevel: FeatureLevel.PRODUCTION,
    order: 100,
  },
  spec: {
    version: 2.3,
    displayName: 'Using Settings',
    durationMinutes: 5,
    icon: <CogIcon />,
    description: `Learn about the settings page in **[APP]** and how to use it.`,
    prerequisites: [''],
    introduction: `
## Using Settings
      
[APP] provides a settings page that lets you configure various aspects of the application. This quick start will show you how to use the settings page.

There are various settings that can be configured:
* General
* Connectivity
* Notification & Messages   
* Dashboard
* Advanced

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
        title: 'Go to the General settings tab',
        description: `
1. Click [General]{{highlight settings-general-tab}}.
2. Configure the theme.
3. Configure the date locale and current timezone.
[[APP] currently only supports English. We are planning on adding support for other languages in the future.]{{admonition note}}`,
      },
      {
        title: 'Go to the Connectivity settings tab',
        description: `
The Connectivity tab enables you to configure the WebSocket connection between the browser and the [APP] backend.

1. Click [Connectivity]{{highlight settings-connectivity-tab}}.
2. Configure the WebSocket Connection Debounce time.
3. Configure the Auto-Refresh period for content-views.
[To use the Auto-Refresh feature, make sure to enable the [Auto-Refresh]{{highlight settings-connectivity-tab-auto-refresh}} checkbox.]{{admonition tip}}
`,
      },
      {
        title: 'Go to the Notifications & Messages tab',
        description: `
The Notifications & Messages tab allows you to configure the notifications and deletion warnings that are displayed in the [APP] UI.

1. Click [Notifications & Messages]{{highlight settings-notifications&messages-tab}}.
2. You can enable or disable notifications from various categories. Click \`Show more\` for the full list of notifications.
3. You are also able to enable or disable deletion dialog warnings for various destructive actions. Click \`Show more\` for the full list of deletion warnings.
[Control the maximum number of notifications that can be displayed at once with the input control.]{{admonition tip}}
`,
      },
      {
        title: 'Go to the Dashboard tab',
        description: `
The Dashboard tab allows you to configure settings for the various Dashboard Cards that you can add to the Dashboard.

New to [APP] 2.3 is the **Automated Analysis** card. This card starts a recording and then automatically starts an analysis on the recording. You can configure the recording that is started by this card.

1. From the list of settings tabs, click [Dashboard]{{highlight settings-dashboard-tab}}.
2. Configure the Automated Analysis Recording Configuration settings.
3. Configure the Dashboard Metrics Configuration settings.

[When using the Automated Analysis Card, make sure the event template is able to be used with the target JVM.]{{admonition warning}}
[Setting both an infinite maximum size and age may result in an **Out Of Memory** error during report generation.]{{admonition caution}}
`,
      },
      {
        title: 'Go to the Advanced tab',
        description: `
[APP] has a few advanced settings that can be configured.

1. Click [Advanced]{{highlight settings-advanced-tab}}.

  Credentials are necessary to authenticate with the target JVMs that [APP] communicates with, if JMX auth is enabled. If you prefer not to store these credentials in the [APP] backend, you can opt to store them in local session storage instead.
2. Configure the Credentials Storage settings.
`,
      },
    ],
    conclusion: `
<div>
  <p>You completed the <strong>Using Settings</strong> quick start!</p>
    <div style="max-width: 22rem">
      <img style="margin-top: 2em; margin-bottom: 2em" src="${cryostatLogo}" alt="[APP] Logo" width="100%" height="100%" />
        <p class="cryostat-text">cryostat</p>
    </div>
  <p>For more information about configuring <strong>Settings</strong> in [APP], read our guides on the <a href="${build.homePageUrl}" target="_blank">[APP] website</a>.</p>
</div>`,
    type: {
      text: 'Introduction',
      color: 'blue',
    },
  },
};

export default SettingsQuickStart;
