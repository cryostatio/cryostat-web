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

import { conclusion, CryostatIcon } from '@app/QuickStarts/quickstart-utils';
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { QuickStart } from '@patternfly/quickstarts';
import * as React from 'react';

const GroupStartRecordingQuickStart: QuickStart = {
  apiVersion: 'v2.3.0',
  metadata: {
    name: 'topology/start-group-recording',
    featureLevel: FeatureLevel.PRODUCTION,
  },
  spec: {
    version: 2.3,
    displayName: 'Start recording on multiple target JVMs',
    durationMinutes: 5,
    icon: <CryostatIcon />,
    description: 'Learn how to start recordings on multiple targets at once.',
    introduction: `
## Topology View
The **Cryostat Topology** provides a visual presentation of all targets discovered by **Cryostat**, using various mechanisms (e.g. **Kubernetes API**, **JDP**) that are represented by **Realms**.

With **Topology** view, you can perform actions (i.e. start recording) on an individual target or a group of targets, using either **Graph View** or **List View**.

### What you'll learn
- How to start recording on a group of targets

### What you'll need

- A running instance of Cryostat which has discovered at least one target JVM
- JMX auth credentials for the target JVM (if required)
`,
    tasks: [
      {
        title: 'Go to the Topology page',
        description: `1. In the [APP] console navigation bar, click [Topology]{{highlight nav-topology-tab}}.`,
        review: {
          instructions: '#### Verify that you see the Topology page.',
          failedTaskHelp:
            'If you do not see the navigation bar, click the [menu button]{{highlight nav-toggle-btn}} on the masthead.',
        },
      },
      {
        title: 'Open action menu for a group',
        description: `
To open the action menu for a target group:

- *Graph View*: Right-click a target group to display the **Action** menu.

- *List View*: Click the **Action** dropdown menu next to the group name.
`,
        review: {
          instructions: '#### Verify that you see action menu.',
          failedTaskHelp: `
In *Graph View*, the line surronding the targets represents the group.

In *List View*, to reveal nested groups, click on list rows.`,
        },
      },
      {
        title: 'Start recording for a group of targets.',
        description: `
To start a recording for targets under the selected group, select the \`Start recording\` option.

On each descendant target, **Cryostat** will create an active recording named \`cryostat_topology_action\` with the label
\`cryostat.io.topology-group=<group_name>\` which represents the group the action is invoked on.

[In some cases (e.g. missing JMX Credentials), **Cryostat** will fail to start recording on some targets.]{{admonition warning}}
`,
        review: {
          instructions: '#### Verify that you can start recording on a group of targets.',
          failedTaskHelp: `If you do not see the **Action** menu, follow the previous steps again.`,
        },
      },
      {
        title: 'Check the started recordings.',
        description: `
To check the started recordings in the previous step:

1. In the [APP] console navigation bar, click [Recordings]{{highlight nav-recordings-tab}} to go to **Recording** page.
2. Click the [Target Select]{{highlight target-select}} dropdown menu.
3. Select a target that belong to the selected group.
4. The recording will be displayed with name \`cryostat_topology_action\` and a label \`cryostat.io.topology-group=<group_name>\`

[In the **Topology Graph View**, targets (i.e. nodes) that have any \`RUNNING\` active recordings will have a decorator on their top-right corner to indicate so.]{{admonition tip}}
`,
        review: {
          instructions: '#### Verify that you can start recording on a group of targets.',
          failedTaskHelp: `If you do not see the recording, follow the previous steps again.`,
        },
      },
    ],
    conclusion: conclusion('Start recording on multiple target JVMs', 'Topology'),
    type: {
      text: 'Featured',
      color: 'blue',
    },
    nextQuickStart: ['custom-target-quickstart'],
  },
};

export default GroupStartRecordingQuickStart;
