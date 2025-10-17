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

const displayName = 'Capture a Thread Dump';

const ThreadDumpQuickStart: QuickStart = {
  metadata: {
    name: 'capture-a-thread-dump-quickstart',
    featureLevel: FeatureLevel.PRODUCTION,
    order: 1,
  },
  spec: {
    displayName: displayName,
    durationMinutes: 10,
    icon: <CryostatIcon />,
    description: `Learn how to capture a Thread Dump with **[APP]**.`,
    prerequisites: [''],
    introduction: `
## Capture a Thread Dump
**Thread Dumps** are a profiling tool that is built into the JVM. They allow you to capture a snapshot of all the threads currently running within a JVM Process at a specific moment in time. They provide detailed information about each thread that aid in diagnosing performance issues, identifying deadlocks and other problems with concurrency. [APP] provides a simple way to capture and download Thread Dumps from a containerized Target JVM.

### What you'll learn

- How to capture a Thread Dump on a Target JVM
- How to download a Thread Dump from [APP] to your local machine

### What you'll need

- A running instance of [APP] which has discovered at least one Target JVM
- JMX auth credentials for the Target JVM (if required)

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
2. Select a target from the list of available targets.


[If JMX Auth username and password is required, you will be prompted to enter them.]{{admonition note}}`,
        review: {
          instructions: '#### Verify that you can see the Diagnostics page.',
          failedTaskHelp: 'If you do not see the page, try the above steps again.',
        },
      },
      {
        title: 'Capture a Thread Dump',
        description: `
*Archived* Thread Dumps are Thread Dumps that have been saved from the Target JVM and copied to [APP]'s storage volume. This is done automatically when capturing one.

To capture a **Thread Dump**:

1. Click [Invoke Thread Dump]{{highlight thread-dumps-invoke-btn}} to capture a **Thread Dump**.

After the creation of a Thread Dump, the Thread Dump will be displayed in the **Thread Dumps** table. You can navigate there through the [Sidebar]{{highlight nav-threaddumps-tab}} or by clicking on the [Archives Button]{{highlight thread-dumps-archive-btn}} next to the capture button. You should be able to see the Thread Dump's ID, start time, file size, and any attached Labels.
`,
        review: {
          instructions: '#### Verify that you see the Thread Dump within the table.',
          failedTaskHelp: 'If you do not see the Thread Dump, try the above steps again.',
        },
      },
      {
        title: 'Download a Thread Dump',
        description: `
Downloading a Thread Dump will save the Thread Dump to your local machine as a file. You can then analyze the Thread Dump.
1. Open the [kebab menu]{{highlight thread-dumps-kebab}} next to the Thread Dump that you want to download.
2. Click \`Download Thread Dump\` to prompt your browser to open a dialog to save the Thread Dump to your local machine.
3. Choose what to do with the file.
      `,
        review: {
          instructions: '#### Verify that you have downloaded the Thread Dump to your local machine.',
          failedTaskHelp: 'If you do not see the Thread Dump, try the **Start a Thread Dump** task again.',
        },
      },
      {
        title: 'Edit labels for a captured Thread Dump',
        description: `
[APP] can associate labels with Thread Dumps to make filtering them easier.
1. Click the [Checkbox]{{highlight thread-dumps-check-box}} next to each Thread Dump you wish to attach a label to.
2. Click the [Edit Labels]{{highlight thread-dumps-edit-labels}} button at the top of the table.
3. An **Edit Labels** panel will appear containing the current labels with a button to add more. 
4. Edit the labels for the thread dumps as desired. Click save when complete.
`,
        review: {
          instructions: '#### Verify that you can see the updated labels for the Thread Dump.',
        },
      },
    ],
    conclusion: conclusion(
      displayName,
      'Capture a Thread Dump',
      `To learn more about [APP]'s extensive features and capabilities, please visit our website at <a href="${build.documentationUrl}" target="_blank">${build.documentationUrl}</a>.`,
    ),
    type: {
      text: 'Introduction',
      color: 'blue',
    },
    nextQuickStart: ['capture-a-heap-dump-quickstart'],
  },
};

export default ThreadDumpQuickStart;
