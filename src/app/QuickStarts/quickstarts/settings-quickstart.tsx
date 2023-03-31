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
import cryostatLogo from '@app/assets/cryostat_logo_vert_rgb_default.svg';
import build from '@app/build.json';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { QuickStart } from '@patternfly/quickstarts';
import { CogIcon } from '@patternfly/react-icons';
import React from 'react';

// TODO: Change this when adding dark mode setting to the settings page (General tab)
const SettingsQuickStart: QuickStart = {
  apiVersion: 'v2.3.0',
  metadata: {
    name: 'settings-quickstart',
    featureLevel: FeatureLevel.PRODUCTION,
  },
  spec: {
    version: 2.3,
    displayName: 'Using Settings',
    durationMinutes: 5,
    icon: <CogIcon />,
    description: `Learn about the settings page in **${build.productName}** and how to use it.`,
    prerequisites: [''],
    introduction: `
  <div style="padding-bottom: 1rem">
    <p>
    <h1>Using Settings</h1>
      Cryostat has a settings page that allows you to configure the application. This quick start will show you how to use the settings page.
      <h3>
      There are various settings that can be configured:
      </h3>
      <ul style="font-weight: bold;">
        <li>Connectivity</li>
        <li>Languages & Region</li>
        <li>Notification & Messages</li>    
        <li>Dashboard</li>
        <li>Advanced</li>
      </ul>
      We will go over each of these settings in detail.
    </p>
  </div>
    `,
    tasks: [
      {
        title: 'Navigate to the Settings page',
        description: `
1. Press the [Settings]{{highlight settings-link}} cog icon.`,
      },
      {
        title: 'Go to the Connectivity settings tab',
        description: `
The Connectivity tab allows you to configure the WebSocket connection the browser forms with the Cryostat backend.

1. Go to the [Connectivity]{{highlight settings-connectivity-tab}} tab.
2. Configure the WebSocket Connection Debounce time.
3. Configure the Auto-Refresh period for content-views.
[To use the Auto-Refresh feature, you must have the [Auto-Refresh]{{highlight settings-connectivity-tab-auto-refresh}} checkbox enabled.]{{admonition tip}}
`,
      },
      {
        title: 'Go to to the Languages & Region settings tab',
        description: `
1. Go to the [Languages & Region]{{highlight settings-language&region-tab}} tab
2. Configure the date locale and current timezone.
[Cryostat currently only supports English. We are planning on adding support for other languages in the future.]{{admonition note}}`,
      },
      {
        title: 'Go to the Notifications & Messages tab',
        description: `
The Notifications & Messages tab allows you to configure the notifications and deletion warnings that are displayed in the Cryostat UI.

1. Go to the [Notifications & Messages]{{highlight settings-notifications&messages-tab}} tab.
2. Enable or disable notifications from various categories if you choose to.
3. Enable or disable deletion dialog warnings for various destructive actions.
[You can also control the maximum number of notifications that can be displayed at once.]{{admonition tip}}
`,
      },
      {
        title: 'Go to the Dashboard tab',
        description: `
The Dashboard tab allows you to configure settings for the various Dashboard Cards that you can add to the Dashboard.

New to [APP] 2.3 is the Automated Analysis Recording Configuration card. This card starts a recording and then automatically starts an analysis on the recording. You can configure the recording that is started by this card.

1. Go to the [Dashboard]{{highlight settings-dashboard-tab}} tab.
2. Configure the Automated Analysis Recording Configuration settings.
3. Configure the Dashboard Metrics Configuration settings.

[When using the Automated Analysis Card, make sure the event template is able to be used with the target JVM.]{{admonition warning}}
[Setting both an infinite maximum size and age may result in an out of memory error during report generation.]{{admonition caution}}
`,
      },
      {
        title: 'Go to the Advanced tab',
        description: `
Cryostat has a few advanced settings that can be configured. These settings are not recommended for most users.
1. Go to the [Advanced]{{highlight settings-advanced-tab}} tab.

Credentials are used to authenticate with the target JVMs that Cryostat communicates with. If you don't want these credentials to be stored in the Cryostat backend, you can choose to store them in a local session storage instead.

2. Configure the Credentials Storage settings.
`,
      },
    ],
    conclusion: `
<div>
  <p>You completed the <strong>Using Settings</strong> quick start!</p>
    <div style="max-width: 350px">
      <img style="margin-top: 2em; margin-bottom: 2em" src="${cryostatLogo}" alt="Cryostat Logo" width="100%" height="100%" />
    </div>
  <p>For more information about configuring <strong>Settings</strong> in Cryostat, read our guides on the <a href="${build.homePageUrl}" target="_blank">Cryostat website</a>.</p>
</div>`,
    type: {
      text: 'Featured',
      color: 'blue',
    },
  },
};

export default SettingsQuickStart;
