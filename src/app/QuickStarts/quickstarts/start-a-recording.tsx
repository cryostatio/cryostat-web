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

const displayName = 'Start a Recording';

const RecordingQuickStart: QuickStart = {
  metadata: {
    name: 'start-a-recording-quickstart',
    featureLevel: FeatureLevel.PRODUCTION,
    order: 1,
  },
  spec: {
    displayName: displayName,
    durationMinutes: 10,
    icon: <CryostatIcon />,
    description: `Learn how to start a Recording with Java Flight Recorder (JFR) with **[APP]**.`,
    prerequisites: [''],
    introduction: `
## Start a Recording
**Java Flight Recorder (JFR)** is a profiling tool that is built into the JVM. It allows you to record events that happen in the JVM and then analyze the Recording to find performance issues. [APP] leverages JFR to provide a simple way to start, stop, and download Recordings from a containerized Target JVM.

### What you'll learn

- How to start/stop a JFR Recording on a Target JVM
- How to download a Recording from [APP] to your local machine
- How to view an automated analysis report of a Recording with [APP]'s capabilities

### What you'll need

- A running instance of [APP] which has discovered at least one Target JVM
- JMX auth credentials for the Target JVM (if required)

`,
    tasks: [
      {
        title: 'Go to the Recordings page',
        description: '1. In the [APP] console navigation bar, click [Recordings]{{highlight nav-recordings-tab}}.',
        review: {
          instructions: '#### Verify that you see the Recordings page.',
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
          instructions: '#### Verify that you can see the Recordings table.',
          failedTaskHelp: 'If you do not see the table, try the above steps again.',
        },
      },
      {
        title: 'Start a Recording',
        description: `
There are two tabs within the Recordings page:

[Active Recordings]{{highlight active-recordings-tab}} and [Archived Recordings]{{highlight archived-recordings-tab}}.

**Active Recordings** are Recordings that only exist only within the Target JVM. **Archived Recordings** are Recordings that have been saved from the Target JVM and copied to [APP]'s storage volume.

To start an active Recording:

1. Click [Create]{{highlight recordings-create-btn}} to open the **Custom Flight Recording Form**.
[If you have a smaller viewport, the \`Create\` button may not be immediately visible. In this case, you can click on the kebab button (three vertical dots) to reveal additional options, including \`Create\`."]{{admonition note}}
2. Enter a name for the Recording in the [Name]{{highlight crf-name}} field.
3. Select the [Duration]{{highlight crf-duration}} for the Recording. You can select \`CONTINUOUS\` to record until the Recording is stopped.
4. Select an [Event Template]{{highlight template-selector}} to use for the Recording.
5. Click [Create]{{highlight crf-create-btn}}.

After the creation of a Recording, the Recording will be displayed in the **Active Recordings** tab. You should be able to see the Recording's name, start time, duration, state, and any attached Labels.

[You may also attach metadata Labels to the Recordings under the [Metadata]{{highlight crf-metadata-opt}} options or configure your custom Recording further under the [Advanced]{{highlight crf-advanced-opt}} options.]{{admonition tip}}`,
        review: {
          instructions: '#### Verify that you see the Recording within the table.',
          failedTaskHelp: 'If you do not see the Recording, try the above steps again.',
        },
      },
      {
        title: 'Stop a Recording',
        description: `
Stopping a Recording will cut off the Recording at the time that the Recording is stopped.

1. Select the [checkbox]{{highlight active-recordings-checkbox}} ☐ next to the Recording.
2. Click [Stop]{{highlight recordings-stop-btn}} to stop the Recording.`,
        review: {
          instructions: '#### Verify that the STATE field of the Recording has changed to STOPPED.',
          failedTaskHelp: 'If you do not see the Recording, try the **Start a Recording** task again.',
        },
      },
      {
        title: 'Download a Recording',
        description: `
Downloading a Recording will save the Recording to your local machine as a JFR file. You can then use **JDK Mission Control (JMC)** to analyze the Recording.
1. Open the [kebab menu]{{highlight recording-kebab}} next to the Recording that you want to download.
2. Click \`Download Recording\` to prompt your browser to open a dialog to save the Recording to your local machine.
3. Choose what to do with the file.
      `,
        review: {
          instructions: '#### Verify that you have downloaded the Recording to your local machine.',
          failedTaskHelp: 'If you do not see the Recording, try the **Start a Recording** task again.',
        },
      },
      {
        title: 'View an analysis report',
        description: `
[APP] is able to generate an **Automated analysis report** using a JFR Recording. The **Java Mission Control** rules engine analyzes your Recording, looks for common problems, and assigns a severity score from 0 (no problem) to 100 (potentially severe problem) to each problem.
1. Click the [kebab menu]{{highlight recording-kebab}} next to the Recording that you want to view an analysis report for.
2. Click \`View Report ...\` to view an analysis report of the Recording in a new tab.
3. *Optional:* Right click on the page and select \`Save Page As...\` to download the report HTML file to your local machine.
`,
        review: {
          instructions: '#### Verify that you can see an analysis report of the Recording.',
          failedTaskHelp:
            'The kebab `⁝` should be next to the Recording row in the Active Recordings table. Clicking the kebab icon should show a menu with the `View Report ...` option.',
        },
      },
      {
        title: 'Archive a Recording',
        description: `
Archiving a Recording will save the Recording to [APP]'s archival storage, and will persist even after either the Target JVM, or [APP], has stopped. These Recordings will appear in the Target JVM's **Archived Recordings** tab, as well as in the [Archives]{{highlight nav-archives-tab}} view on the [APP] console navigation bar.

1. Click [Archive]{{highlight recordings-archive-btn}} to archive the Recording.
2. To view the Archived Recording in [APP]'s storage, go to the [Archived Recordings]{{highlight archived-recordings-tab}} tab.

[You can download Archived Recordings and view an analysis report of the Archived Recording from the [Archived Recordings]{{highlight archived-recordings-tab}} tab, similar to active recordings.]{{admonition tip}}`,
        review: {
          instructions: '#### Verify that the Recording has been archived in the **Archived Recordings** tab.',
          failedTaskHelp:
            'The Recording name should have been saved in the format `<jvm-alias>_<recording-name>_<timestamp>.jfr`. If you still cannot find the Recording, please try the above steps again.',
        },
      },
    ],
    conclusion: conclusion(
      displayName,
      'Start a Recording',
      `To learn more about [APP]'s extensive features and capabilities, please visit our website at <a href="${build.documentationUrl}" target="_blank">${build.documentationUrl}</a>.`,
    ),
    type: {
      text: 'Introduction',
      color: 'blue',
    },
    nextQuickStart: ['automated-rules-quickstart'],
  },
};

export default RecordingQuickStart;
