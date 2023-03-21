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
import build from '@app/build.json';
import { QuickStart } from '@patternfly/quickstarts';
import { CogIcon } from '@patternfly/react-icons';
import React from 'react';

const SettingsQuickStart: QuickStart = {
  apiVersion: 'v2.3.0',
  metadata: {
    name: 'settings-quickstart',
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
        title: 'Navigate to the Connectivity settings tab',
        description: `
1. Go to the [Connectivity]{{highlight settings-connectivity-tab}} tab.
2. Here you can configure the WebSocket connection to the Cryostat backend.
3. You can also configure Auto-Refresh period for content-views.`,
      },
      {
        title: 'Navigate to the Languages & Region settings tab',
        description: `
1. Go to the [Languages & Region]{{highlight settings-language&region-tab}} tab
2. Here you can configure the language and region settings for the Cryostat UI.
3. You can also configure the date and time format.`,
      },
      {
        title: 'Go to the Notifications & Messages tab',
        description: `
1. Go to the [Notifications & Messages]{{highlight settings-notifications&messages-tab}} tab.
1. Here you can configure the notification settings for the Cryostat UI.
2. You can also configure the message settings.`,
      },
      {
        title: 'Go to the Dashboard tab',
        description: `
1. Go to the [Dashboard]{{highlight settings-dashboard-tab}} tab.
1. Here you can configure the dashboard settings for the Cryostat UI.
2. You can also configure the default dashboard.`,
      },
      {
        title: 'Go to the Advanced tab',
        description: `
1. Go to the [Advanced]{{highlight settings-advanced-tab}} tab.
1. Here you can configure the advanced settings for the Cryostat UI.
2. You can also configure the default dashboard.`,
      },
    ],
    conclusion: `You completed the **Using Settings** quick start!
    
Learn more about the **Settings** page from our guides at <https://cryostat.io/guides/>.
`,
    type: {
      text: 'Featured',
      color: 'blue',
    },
  },
};

export default SettingsQuickStart;
