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
import cryostatLogoIconDark from '@app/assets/cryostat_icon_rgb_reverse.svg';
import build from '@app/build.json';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { withThemedIcon } from '@app/utils/withThemedIcon';
import { QuickStart } from '@patternfly/quickstarts';
import React from 'react';

const Icon = withThemedIcon(cryostatLogoIcon, cryostatLogoIconDark, 'Cryostat Logo');

// TODO: Add quickstarts based on the following example:
const DashboardQuickStart: QuickStart = {
  apiVersion: 'v2.3.0',
  metadata: {
    name: 'dashboard-quickstart',
    featureLevel: FeatureLevel.PRODUCTION,
    order: 2,
  },
  spec: {
    version: 2.3,
    displayName: 'Dashboard',
    durationMinutes: 10,
    icon: <Icon />,
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
- **JFR Metrics Chart (BETA)**
- **MBean Metrics Chart**

Each card displays a different set of information about the currently selected target JVM, such as the heap usage, thread statistics, JVM vendor, and more.

### What you'll learn
- How to create a simple Dashboard Layout
- How to add and remove a Dashboard Card to/from a Dashboard Layout
- How to move and resize Dashboard Cards
- How to rename, upload, download, and delete Dashboard Layouts

[Learn more about each Dashboard Card in the [Cryostat documentation](${build.dashboardGuideUrl}).]{{admonition tip}}
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
**Dashboard Layouts** are used to organize the Dashboard Cards that are displayed in the Dashboard. We will start by creating a new Dashboard Layout.

1. Click the [Layout Selector]{{highlight dashboard-layout-selector}} on the toolbar.

    This will open a dropdown menu. Click **New Layout**.

We have now created a new Dashboard Layout. The new layout is automatically selected and should be named **Custom1**, if you have not created any other layouts yet.

[You can also rename the layout with the pencil icon next to the name.]{{admonition tip}}
`,
        review: {
          instructions:
            '#### Verify that the new layout is created and selected. Make sure that the the new layout is named Custom with some number appended to it.',
          failedTaskHelp:
            'After opening the [Layout Selector]{{highlight dashboard-layout-selector}} dropdown, click the blue button labeled **New Layout**.',
        },
      },
      {
        title: 'Add Dashboard Cards to the Dashboard Layout',
        description: `
To create a card, we will go through a **creation wizard** that will guide us through the process of selecting the card type, and configuring the card, if needed.

1. Click the [Catalog Icon]{{highlight dashboard-add-btn}} on the toolbar.
    
    This will open a modal. From the card catalog, select the **Target JVM Details** card. Full details and available preview will be shown on the drawer panel.

2. Click Finish.
3. Repeat steps 1-2 to add the **MBeans Metrics Chart** card to the Dashboard Layout.
4. This time, click Next to go to the next configuration step of the creation wizard.
[The default metric selected for the card is the \`Process CPU Load\` metric. You can change this by clicking the **Performance Metric** dropdown menu within the **MBeans Chart Card** configuration step and selecting a different metric. Try other metrics and settings!]{{admonition tip}}
5. Click Finish again to finish creating the second card.
`,
        review: {
          instructions: '#### Verify that you see the two new cards in the Dashboard.',
          failedTaskHelp: `If you do not see the new rule, follow the previous steps again.`,
        },
      },
      {
        title: 'Rearrange and resize Dashboard Cards',
        description: `
1. Click and drag the **Target JVM Details** [card's header]{{highlight card-draggable-grip}} on top or to the right of the **MBeans Metrics Chart** card to swap their positions.
2. Click and resize the **MBeans Metrics Chart** card to make it larger by dragging the right edge of the card.
[You can also drag and drop between cards to rearrange them.]{{admonition tip}}
`,
        review: {
          instructions: '#### Verify that you are able to rearrange and resize the cards in the Dashboard Layout.',
          failedTaskHelp:
            'Make sure you are clicking and dragging the card header and not the card body to move the card. To resize cards, hover over the right edge of the card until the cursor changes to a double-sided arrow `↔`, then click and drag to resize.',
        },
      },
      {
        title: 'Modify Dashboard Layouts',
        description: `
You can rename, delete and quickly switch between **Dashboard Layouts** for different sets of information about the target JVMs. Customize these layouts to suit your needs!
1. Rename the current Dashboard Layout by clicking the [Pencil icon]{{highlight dashboard-rename-btn}} on the **Layout Selector** toolbar.
2. To switch between Dashboard Layouts, click the [Layout Selector]{{highlight dashboard-layout-selector}} dropdown on the **Layout Selector** toolbar and select the \`Default\` layout.
3. Delete the current Dashboard Layout by clicking [Delete]{{highlight dashboard-delete-btn}} on the **Layout Selector** toolbar.

   Note that you cannot delete the \`Default\` layout. Try deleting the \`Custom1\` layout that you created earlier.
[You can also favorite Dashboard Layouts by clicking on the [Layout Selector]{{highlight dashboard-layout-selector}} dropdown and clicking the Star Icon \`★\` next to the layout you want to favorite. Renaming and deletion can also be done in a similar fashion.]{{admonition tip}}
`,
        review: {
          instructions: '#### Verify that you are able to rename, delete, and switch between Dashboard Layouts.',
          failedTaskHelp: 'Make sure you are clicking the correct actions and buttons.',
        },
      },
      {
        title: 'Layout Templates',
        description: `
**Layout Templates** are pre-configured Dashboard Layouts that can be used to quickly create new Dashboard Layouts. You can also download and upload your own Dashboard Layouts as templates. [APP] provides a few templates that you can use to get started.
1. To create a new Dashboard Layout from a template, click the [Layout Selector]{{highlight dashboard-layout-selector}} dropdown on the **Layout Selector** toolbar and select the split button dropdown next to the **New Layout** button.
   
   This will open a dropdown menu. Select **Choose Template**.

2. From the **Create Dashboard Layout** modal, there is a Template Picker that allows you to select a template to use. There are two template categories: **Suggested** and **Cryostat**.
3. From the **Cryostat** category, select the **Automated Analysis** template. This will open a drawer from the right of the modal that shows details about the currently selected template. 
4. Enter a name for the new Dashboard Layout in the **Name** field.
5. Click **Create** to finish creating the new Dashboard Layout.
`,
        review: {
          instructions: '#### Verify that you are able to create a dashboard layout from template.',
          failedTaskHelp:
            'If you are having trouble creating a dashboard layout from a template, make sure that you have selected a template from the Template Picker and entered a name for the new layout.',
        },
      },
    ],
    conclusion: `
<div>
    <p>You completed the <strong>Dashboard</strong> quick start!</p>
    <div style="max-width: 350px">
        <img style="margin-top: 2em; margin-bottom: 2em" src="${cryostatLogoIcon}" alt="Cryostat Logo" width="100%" height="100%" />
        <p class="cryostat-text">cryostat</p>
        </div>
    <p>For more information about the new <strong>Dashboard</strong> and <strong>Dashboard Cards</strong> in [APP] 2.3, read our guides on the <a href="${build.dashboardGuideUrl}" target="_blank">Cryostat documentation</a>.</p>
</div>`,
    type: {
      text: 'Introduction',
      color: 'blue',
    },
  },
};

export default DashboardQuickStart;
