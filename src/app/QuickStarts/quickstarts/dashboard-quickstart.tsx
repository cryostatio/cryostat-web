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
import build from '@app/build.json';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { QuickStart } from '@patternfly/quickstarts';
import { CryostatIcon, conclusion } from '../quickstart-utils';

const displayName = 'Get started with the Dashboard';

// TODO: Split quick start into multiple quick starts under Dashboard category
// e.g. dashboard cards, layouts/templates, automated analysis, etc.
const DashboardQuickStart: QuickStart = {
  metadata: {
    name: 'dashboard-quickstart',
    featureLevel: FeatureLevel.PRODUCTION,
    order: 2,
  },
  spec: {
    version: 2.3,
    displayName: displayName,
    durationMinutes: 10,
    icon: <CryostatIcon />,
    description: `Learn about what you can do with the **[APP]** Dashboard.`,
    prerequisites: [''],
    introduction: `
## Dashboard
The **[APP] Dashboard** is the main page of the [APP] console. The [APP] dashboard provides a high-level overview of the connected target JVMs and the instance itself through the use of **Dashboard Cards**.

Dashboard Cards are displayed in **Dashboard Layouts**, which can be customized by adding, removing, or rearranging cards. The layout can also be saved and restored at a later time.

### What you'll learn
- How to create a simple Dashboard Layout
- How to add and remove a Dashboard Card to/from a Dashboard Layout
- How to move and resize Dashboard Cards
- How to rename, upload, download, and delete Dashboard Layouts

    `,
    tasks: [
      {
        title: 'Go to the Dashboard page',
        description: `
1. In the [APP] console navigation bar, click [Dashboard]{{highlight nav-dashboard-tab}}.
2. From the [Target Selector]{{highlight target-select}}, select a target JVM.
`,
        review: {
          instructions: '#### Verify that you see the Dashboard page.',
          failedTaskHelp:
            'If you do not see the navigation bar, click the [menu button]{{highlight nav-toggle-btn}} on the masthead.',
        },
      },
      {
        title: 'Create a new Dashboard Layout',
        description: `
**Dashboard Layouts** are used to organize the Dashboard Cards that are displayed in the Dashboard.

1. Click the [Layout Selector]{{highlight dashboard-layout-selector}} on the toolbar.

    This will open a dropdown menu. Click **New Layout**.

The new layout is automatically selected and should be named \`Custom1\`, assuming you have not created any other layouts.

[You can also rename the layout with the pencil icon next to the name.]{{admonition tip}}
`,
        review: {
          instructions: '#### Verify that the new layout is created and selected.',
          failedTaskHelp:
            'Try the steps again. Make sure that the the new layout is named `Custom` with a numeric suffix.',
        },
      },
      {
        title: 'Add Dashboard Cards to the layout',
        description: `
The following Dashboard Cards are available:

- **Target JVM Details**
- **Automated analysis**
- **JFR Metrics Chart (BETA)**
- **MBean Metrics Chart**

Each card displays a different set of information about the currently selected target JVM, such as the heap usage, thread statistics, JVM vendor, and more.

[Learn more about each Dashboard Card in the [Cryostat documentation](${build.dashboardGuideUrl}).]{{admonition tip}}

To create a card, go through a creation wizard that guides the process of selecting and configuring the desired card.

1. Click the [Catalog Icon]{{highlight dashboard-add-btn}}.

    This will open a modal. From the card catalog, select the **Target JVM Details** card. Full details and any available preview will be shown on the drawer panel.

2. Click **Finish**.
3. Repeat steps 1-2 to add the **MBeans Metrics Chart** card to the current layout.
4. This time, click **Next** to go to the next configuration step of the creation wizard.
[The default metric selected for the card is the \`Process CPU Load\` metric. You can change this by clicking the **Performance Metric** dropdown menu within the **MBeans Chart Card** configuration step and selecting a different metric. Try other metrics and settings!]{{admonition tip}}
5. Click **Finish** once more.
`,
        review: {
          instructions: '#### Verify that you see the two new cards in the Dashboard.',
          failedTaskHelp: `If you do not see the cards, follow the previous steps again.`,
        },
      },
      {
        title: 'Rearrange and resize Dashboard Cards',
        description: `
1. Click and drag the **Target JVM Details** [card's header]{{highlight card-draggable-grip}} on top or to the right of the **MBeans Metrics Chart** card to swap their positions.
2. Click and drag the right edge of the **MBeans Metrics Chart** card to resize it.
[You can also drag and drop between cards between other cards to rearrange them.]{{admonition tip}}
`,
        review: {
          instructions: '#### Verify that you are able to rearrange and resize the cards.',
          failedTaskHelp:
            'Make sure you are clicking and dragging the card header to move the card, not the body. To resize cards, hover over the right edge of the card until the cursor changes to a double-sided arrow `↔`, then click and drag to resize.',
        },
      },
      {
        title: 'Modify a Dashboard Layout',
        description: `
You can rename, delete and quickly switch between **Dashboard Layouts** for different sets of information about the target JVMs. Customize these layouts to suit your needs!
1. Rename the current Dashboard Layout by clicking the [Pencil icon]{{highlight dashboard-rename-btn}} on the **Layout Selector** toolbar. You cannot rename the \`Default\` layout.
2. To switch between Dashboard Layouts, click the [Layout Selector]{{highlight dashboard-layout-selector}} dropdown on the **Layout Selector** toolbar and select the \`Default\` layout.
3. You are able to delete Dashboard Layouts by clicking the [Trash icon]{{highlight dashboard-delete-btn}} on the **Layout Selector** toolbar. You cannot delete the \`Default\` layout.

[You can also favorite Dashboard Layouts by clicking on the [Layout Selector]{{highlight dashboard-layout-selector}} dropdown and clicking the Star Icon \`★\` next to the layout you want to favorite. Renaming and deletion can also be done in a similar fashion.]{{admonition tip}}
`,
        review: {
          instructions: '#### Verify that you are able to rename, and switch between Dashboard Layouts.',
          failedTaskHelp:
            'Make sure you are clicking the correct actions and buttons. Note that you cannot rename or delete the `Default` layout.',
        },
      },
      {
        title: 'Use Layout Templates',
        description: `
**Layout Templates** are pre-configured Dashboard Layouts that are used to quickly create new Dashboard Layouts. You can also download and upload your own Dashboard Layouts as templates. [APP] provides a few templates that you can use to get started.
1. To create a new Dashboard Layout from a template, click the [Layout Selector]{{highlight dashboard-layout-selector}} dropdown on the **Layout Selector** toolbar and click the caret icon next to the **New Layout** button.

   This will open a dropdown menu.
2. Select **Choose Template**.
   A modal will open with a list of available templates. There will be two template categories: **Suggested** and **Cryostat**.
3. From the **Cryostat** category, select the **Automated analysis** template.
4. Enter a name for the new layout in the **Name** field.
5. Click **Create** to finish.
`,
        review: {
          instructions: '#### Verify that you are able to create a Dashboard Layout from template.',
          failedTaskHelp:
            'If you are having trouble creating a Dashboard Layout from a template, make sure that you have selected a template from the Template Picker and entered a name for the new layout.',
        },
      },
    ],
    conclusion: conclusion(
      displayName,
      'Dashboard',
      `For more information about the new <strong>Dashboard</strong> and <strong>Dashboard Cards</strong> in [APP] ${build.version}, read our guides on the <a href="${build.dashboardGuideUrl}" target="_blank">Cryostat documentation</a>.`,
    ),
    type: {
      text: 'Introduction',
      color: 'blue',
    },
  },
};

export default DashboardQuickStart;
