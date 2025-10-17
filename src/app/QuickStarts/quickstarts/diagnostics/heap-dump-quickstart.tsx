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
import { CryostatIcon, conclusion } from '../../quickstart-utils';

const displayName = 'Capture a Heap Dump';

const ThreadDumpQuickStart: QuickStart = {
  metadata: {
    name: 'capture-a-heap-dump-quickstart',
    featureLevel: FeatureLevel.PRODUCTION,
    order: 1,
  },
  spec: {
    displayName: displayName,
    durationMinutes: 10,
    icon: <CryostatIcon />,
    description: `Learn how to capture a Heap Dump with **[APP]**.`,
    prerequisites: [''],
    introduction: `
## Capture a Heap Dump
**Heap Dumps** are a profiling tool that is built into the JVM. They allow you to capture a snapshot of all the memory currently in use within a JVM Process at a specific moment in time. They provide detailed information about all Java objects and classes residing in memory at the time that aid in diagnosing performance issues, diagnosing memory leaks and other problems with memory usage. [APP] provides a simple way to capture and download Heap Dumps from a containerized Target JVM.

### What you'll learn

- How to capture a Heap Dump on a Target JVM
- How to download a Heap Dump from [APP] to your local machine

### What you'll need

- A running instance of [APP] which has discovered at least one Target JVM with the [APP] Agent running within it.

`,
    tasks: [
      {
        title: 'Go to the Capture/Diagnostics page',
        description: '1. In the [APP] console navigation bar, click [Capture]{{highlight nav-capture-tab}}.',
        review: {
          instructions: '#### Verify that you see the Diagnostics page.',
          failedTaskHelp:
            'If you do not see the navigation bar, click the [menu button]{{highlight nav-toggle-btn}} on the masthead.',
        },
      },
      {
        title: 'Select a Target JVM',
        description: `
Select a Target JVM from the list of available targets that [APP] has discovered.

1. Click the [Target Select]{{highlight target-select}} dropdown menu.
2. Select a target from the list of available targets.`,
        review: {
          instructions: '#### Verify that you can see the Diagnostics page.',
          failedTaskHelp: 'If you do not see the table, try the above steps again.',
        },
      },
      {
        title: 'Capture a Heap Dump',
        description: `
*Archived* Heap Dumps are Heap Dumps that have been saved from the Target JVM and copied to [APP]'s storage volume. This is done automatically when capturing one.

To capture a **Heap Dump**:

1. Click [Invoke Heap Dump]{{highlight heap-dumps-invoke-btn}} to capture a **Heap Dump**.

After the creation of a Heap Dump, the Heap Dump will be displayed in the **Heap Dumps** table. You can navigate there through the [Sidebar]{{highlight nav-heapdumps-tab}} or by clicking on the [Archives Button]{{highlight heap-dumps-archive-btn}} next to the capture button. You should be able to see the Heap Dump's ID, start time, file size, and any attached Labels.
`,
        review: {
          instructions: '#### Verify that you see the Heap Dump within the table.',
          failedTaskHelp: 'If you do not see the Heap Dump, try the above steps again.',
        },
      },
      {
        title: 'Download a Heap Dump',
        description: `
Downloading a Heap Dump will save the Heap Dump to your local machine as a file. You can then use **JDK Mission Control (JMC)** to analyze the Heap Dump.
1. Open the [kebab menu]{{highlight heap-dumps-kebab}} next to the Heap Dump that you want to download.
2. Click \`Download Heap Dump\` to prompt your browser to open a dialog to save the Heap Dump to your local machine.
3. Choose what to do with the file.
      `,
        review: {
          instructions: '#### Verify that you have downloaded the Heap Dump to your local machine.',
          failedTaskHelp: 'If you do not see the Heap Dump, try the **Start a Heap Dump** task again.',
        },
      },
      {
        title: 'Edit labels for a captured Heap Dump',
        description: `
[APP] can associate labels with Heap Dumps to make filtering them easier.
1. Click the [Checkbox]{{highlight heap-dumps-check-box}} next to each Heap Dump you wish to attach a label to.
2. Click the [Edit Labels]{{highlight heap-dumps-edit-labels}} at the top of the table.
3. An **Edit Labels** panel will appear containing the current labels with a button to add more. 
4. Edit the labels for the Heap Dumps as desired. Click save when complete.
`,
        review: {
          instructions: '#### Verify that you can see the updated labels for the Heap Dump.',
        },
      },
    ],
    conclusion: conclusion(
      displayName,
      'Capture a Heap Dump',
      `To learn more about [APP]'s extensive features and capabilities, please visit our website at <a href="${build.documentationUrl}" target="_blank">${build.documentationUrl}</a>.`,
    ),
    type: {
      text: 'Introduction',
      color: 'blue',
    },
  },
};

export default ThreadDumpQuickStart;
