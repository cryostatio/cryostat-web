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
import cryostatLogoIcon from '@app/assets/cryostat_icon_rgb_default.svg';
import cryostatLogo from '@app/assets/cryostat_logo_vert_rgb_default.svg';
import { QuickStart } from '@patternfly/quickstarts';

// TODO: Add quickstarts based on the following example:
const DashboardQuickStart: QuickStart = {
  apiVersion: 'v2.3.0',
  metadata: {
    name: 'dashboard-quickstart',
  },
  spec: {
    version: 2.3,
    displayName: 'Dashboard',
    durationMinutes: 10,
    icon: cryostatLogoIcon,
    description: `Learn about what you can do with the [APP] Dashboard.`,
    prerequisites: [''],
    introduction: `
# Dashboard
The **[APP] Dashboard** is the main page of the [APP] console. The Cryostat Dashboard is able to provide a high-level overview of the [APP] instance and the target JVMs that it is connected to, through the use of **Dashboard Cards**.

Dashboard Cards are displayed in the Dashboard in a grid layout. These **Dashboard Layouts** can be customized by adding, removing, or rearranging cards. The layout can also be saved and restored at a later time. 

Switch between layouts at any time for control over the information that is displayed in the Dashboard.

Currently, the following Dashboard Cards are available:

- **Target JVM Details**
- **Automated Analysis**
- **JFR Metrics Chart**
- **MBean Metrics Chart**

Each card displays a different set of information about the currently selected target JVM, such as the heap usage, thread statistics, JVM vendor, and more.

### What you'll learn
- How to create a simple Dashboard Layout
- How to add and remove a Dashboard Card to/from a Dashboard Layout
- How to move and resize Dashboard Cards
- How to rename, upload, download, and delete Dashboard Layouts

[Learn more about each Dashboard Card in the upstream [Cryostat documentation](https://cryostat.io/docs/user-guide/dashboard/).]{{admonition tip}}
    `,
    tasks: [
      {
        title: 'Go to the Dashboard page',
        description: `1. Click the [Dashboard]{{highlight nav-dashboard-tab}} tab in the [APP] console navigation bar.`,
        review: {
          instructions: '#### Verify that you see the Dashboard page.',
          failedTaskHelp:
            'If you do not see the navigation bar, you can click the `☰` button in the [top left corner of the page]{{highlight nav-toggle-btn}}.',
        },
      },
      {
        title: 'Create a new Dashboard Layout',
        description: `
Dashboard Layouts are used to organize the Dashboard Cards that are displayed in the Dashboard. We will start by creating a new Dashboard Layout.

1. Click [New]{{highlight dashboard-new-btn}} on the **Layout Selector** toolbar.

    This will open a modal dialog.

2. Enter a name for the new layout.
3. Click Create when you are finished.
`,
        review: {
          instructions: '#### Verify that the new layout is created and selected with the name you entered.',
          failedTaskHelp:
            'Make sure that the name you entered is unique, and contains only alphanumeric characters, underscores, dashes, and periods.',
        },
      },
      {
        title: 'Add Dashboard Cards to the Dashboard Layout',
        description: `
To create a card, we will go through a **creation wizard** that will guide us through the process of selecting the card type, and configuring the card, if needed.

1. Click the [Add]{{highlight dashboard-add-btn}} button on the Dashboard.
2. From the [Card Type selector]{{highlight card-type-selector}}, select the **Target JVM Details** card.
3. Click [Finish]{{highlight card-finish-btn}}.
4. Repeat steps 1-2 to add the **MBeans Metrics Chart** card to the Dashboard Layout.
5. This time, click [Next]{{highlight card-next-btn}} to go to the next configuration step of the creation wizard.
[The default metric selected for the card is the \`Process CPU Load\` metric. You can change this by clicking the [Performance Metric]{{highlight card-metric-selector}} dropdown menu within the MBeans Chart Card configuration step and selecting a different metric. Try other metrics and settings!]{{admonition tip}}
6. Click [Finish]{{highlight card-finish-btn}} again to finish creating the second card.
`,
        review: {
          instructions: '#### Verify that you see the two new cards in the Dashboard.',
          failedTaskHelp: `If you do not see the new rule, follow the previous steps again.`,
        },
      },
      {
        title: 'Rearrange and resize Dashboard Cards',
        description: `
1. Click and drag the **Target JVM Details** card's header on top of the **MBeans Metrics Chart** card.
2. Click and resize the **MBeans Metrics Chart** card to make it larger by dragging the right edge of the card.
[You can also drag and drop between cards to rearrange them.]{{admonition tip}}
`,
        review: {
          instructions: '#### Verify that you are able to rearrange and resize the cards in the Dashboard Layout.',
          failedTaskHelp:
            'Make sure you are clicking and dragging the card header and not the card body to move the card. To resize cards, hover over the right edge of the card until the cursor changes to a double-sided arrow, then click and drag to resize.',
        },
      },
      {
        title: 'Modify Dashboard Layouts',
        description: `
Dashboard Layouts can be modified by adding, removing, or rearranging cards. You can also rename, upload, download, and delete Dashboard Layouts.
1. Rename the current Dashboard Layout by clicking the [Pencil icon]{{highlight dashboard-edit-btn}} on the **Layout Selector** toolbar.
2. Download the current Dashboard Layout by clicking [Download]{{highlight dashboard-download-btn}} on the **Layout Selector** toolbar.
3. Delete the current Dashboard Layout by clicking [Delete]{{highlight dashboard-delete-btn}} on the **Layout Selector** toolbar.
4. Upload the Dashboard Layout that you downloaded in the previous step by clicking [Upload]{{highlight dashboard-upload-btn}} on the **Layout Selector** toolbar.
5. To switch between Dashboard Layouts, click the [Layout Selector]{{highlight dashboard-layout-selector}} on the **Layout Selector** toolbar and select the \`Default\` layout.
[You can also favorite Dashboard Layouts by clicking the [Star icon]{{highlight dashboard-favorite-btn}} on the **Layout Selector** toolbar.]{{admonition tip}}
[Renaming and deletion can also be done by clicking the **Layout Selector** dropdown and selecting the appropriate action next to the layout name.]{{admonition tip}}
`,
        review: {
          instructions: '#### Verify that you are able to rename, upload, download, and delete Dashboard Layouts.',
          failedTaskHelp:
            'Make sure you are clicking the correct buttons to rename, upload, download, and delete Dashboard Layouts.',
        },
      },
    ],
    conclusion: `
<div>
    <p>You completed the <strong>Dashboard</strong> quick start!</p>
    <div style="max-width: 350px">
        <img style="margin-top: 2em; margin-bottom: 2em" src="${cryostatLogo}" alt="Cryostat Logo" width="100%" height="100%" />
    </div>
    <p>For more information about the new <strong>Dashboard</strong> and <strong>Dashboard Cards<strong/> in [APP] 2.3, read our guide on the upstream <a href="https://cryostat.io/guides/#create-an-automated-rule" target="_blank">Cryostat documentation</a>.</p>
</div>`,
    type: {
      text: 'Featured',
      color: 'blue',
    },
  },
};

export default DashboardQuickStart;
