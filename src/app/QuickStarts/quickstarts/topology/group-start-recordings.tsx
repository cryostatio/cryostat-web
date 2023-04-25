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

import { conclusion, CryostatIcon } from '@app/QuickStarts/quickstart-utils';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
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
