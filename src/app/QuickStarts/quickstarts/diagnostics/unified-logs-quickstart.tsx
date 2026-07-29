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
import { FeatureLevel } from '@app/Shared/Services/service.types';
import { QuickStart } from '@patternfly/quickstarts';
import { CryostatIcon, conclusion } from '../../quickstart-utils';

const displayName = 'Collect JVM Unified Logs';

const UnifiedLogsQuickStart: QuickStart = {
  metadata: {
    name: 'unified-logs-quickstart',
    featureLevel: FeatureLevel.BETA,
    order: 2,
  },
  spec: {
    displayName: displayName,
    durationMinutes: 15,
    icon: <CryostatIcon />,
    description: `Learn how to enable Unified Logging, pull archived log files from the Cryostat Agent, and manage them in [APP].`,
    prerequisites: [''],
    introduction: `
## Collect Unified Logs

**Unified Logs** are diagnostic output produced by the JVM's unified logging
framework. They record garbage collection events, pause times, heap occupancy,
and other memory-management data that are essential for diagnosing latency
spikes, memory leaks, and GC tuning.

[APP] integrates with the **Cryostat Agent** to let you enable logging on a
running JVM without restarting it, configure exactly what the JVM logs, and
then pull the resulting log files into [APP]'s storage for safe keeping,
labelling, and download.

### What you'll learn

- How to enable or reconfigure logging on a running Target JVM
- How to view the current logging status from the Capture page
- How to pull archived log files from the Cryostat Agent into storage
- How to add labels to archived log files
- How to download a log file for local analysis
- How to delete log files from storage

### What you'll need

- A running instance of [APP] which has discovered at least one Target JVM
- The **Cryostat Agent** running inside the Target JVM - log collection
  requires the Agent
`,
    tasks: [
      {
        title: 'Go to the Capture page',
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

[If JMX Auth credentials are required, you will be prompted to enter them.]{{admonition note}}`,
        review: {
          instructions: "#### Verify that you can see the Diagnostics page with the target's data.",
          failedTaskHelp:
            'If you do not see any targets, ensure [APP] has discovered at least one running JVM and try again.',
        },
      },
      {
        title: 'View the current logging status',
        description: `
The [Garbage Collection and Logging card]{{highlight unified-capture-status-card}} on the
Capture page shows you the current logging configuration for the selected target.

When logging is **enabled**, the card shows:

- **Status** — \`Enabled\`
- **Log File Path** — the path on the Agent's container filesystem where the JVM
  is writing the log. When logging is enabled through [APP], the Agent
  assigns a randomly-named temporary file. The specific path is not
  user-configurable through the UI but is displayed here for reference.
- **What** — the JVM log tag selectors currently in use
- **Decorators** — the metadata fields prepended to each log line

When logging is **disabled**, the card shows **Status: Disabled** and the
configuration fields are hidden.`,
        review: {
          instructions:
            '#### Verify that you can see the Garbage Collection and Logging status card and that it displays a Status value.',
          failedTaskHelp:
            'If you do not see the card, confirm the selected target is active and try refreshing the page.',
        },
      },
      {
        title: 'Enable or reconfigure log capture',
        description: `
To start collecting logs you must enable logging on the JVM via the
[APP] modal. If logging is already enabled you can reconfigure it at any time
without restarting the JVM.

1. Click [Enable]{{highlight unified-capture-configure-btn}} (or **Reconfigure** if
   logging is already on) in the **Garbage Collection and Logging** card.
2. In the **What to log** dual-list selector, move the tags you want to the
   **Chosen** side. A good starting point is \`gc\` and \`heap\` — these cover
   basic collection events and heap size information. Add or remove tags to suit
   your scenario.
3. In the **Decorators** selector, choose the fields to prefix each log line
   with. \`time\` and \`level\` are selected by default and are recommended as a
   minimum.
4. _(Reconfigure mode only)_ Use the **Unified Logging** toggle to disable logging
   entirely if you need to turn it off.
5. Click **Enable** (or **Save**) to apply the configuration.

[Custom tag values entered in the text field are passed verbatim to the JVM and may not be recognised.]{{admonition note}}`,
        review: {
          instructions:
            '#### Verify that the Garbage Collection and Logging card now shows Status: Enabled with the tags you selected.',
          failedTaskHelp:
            'If the card still shows Disabled, confirm the Agent is running inside the target JVM and try the Enable step again.',
        },
      },
      {
        title: 'Navigate to the Unified Log Archives page',
        description: `
1. In the [APP] console navigation bar, click [Unified Log Archives]{{highlight nav-unifiedlogarchives-tab}}.

The page shows a table of all log files that have been pulled from the
Agent and stored in [APP]'s storage. Each row shows the log file name, last
modified time, any attached labels, and the file size.`,
        review: {
          instructions: '#### Verify that you see the Unified Log Archives page.',
          failedTaskHelp:
            'If you do not see **Unified Log Archives** in the navigation, confirm that the Cryostat Agent is running inside the target JVM.',
        },
      },
      {
        title: 'Pull log files into archives',
        description: `
Pulling a log copies log file content from the Cryostat Agent's container
filesystem into [APP]'s storage. Each pull creates a new archived file - it
does not overwrite an earlier pull.

When log rotation is enabled, the Agent automatically concatenates all
completed rotated files into a single pulled file. For example, if the JVM is
configured to write to \`/tmp/jvm.log\` with rotation, the Agent will combine
\`/tmp/jvm.log.0\`, \`/tmp/jvm.log.1\`, and any other completed rotation files into
one archive. The current log file being actively written by the JVM is
excluded, because there is no lock that would guarantee the file is not being
written mid-transfer.

When log rotation is **disabled** and only a single log file exists, the Agent
will send that file regardless. Because the JVM may be actively writing to it,
the pulled content may contain torn lines or other partial-write artefacts at
the end of the file.

1. Click the [Pull log from Agent button]{{highlight unified-logs-pull-btn}} (the
   import icon) in the toolbar.

After a successful pull, a new row appears in the Unified Logs table.

[The Pull button is disabled when the JVM is logging to a streaming path such as /dev/stdout or /dev/stderr because those paths have no persistent file content to copy. This can occur if logging was configured outside of [APP]. To resolve this, use the **Enable** or **Reconfigure** button on the Capture page - the Agent to assign a file-based path automatically.]{{admonition important}}`,
        review: {
          instructions: '#### Verify that a new entry appears in the Unified Logs table after pulling.',
          failedTaskHelp:
            'If no new entry appears, confirm that logging is enabled and that the JVM is not logging to a streaming path (`/dev/stdout` or `/dev/stderr`). Check the **Log File Path** field on the Capture page status card to see where the JVM is currently writing.',
        },
      },
      {
        title: 'Edit labels on archived logs',
        description: `
[APP] can associate key-value labels with archived log files to make
filtering and searching easier.

1. Click the checkbox next to one or more log rows you want to label.
2. Click [Edit Labels]{{highlight unified-logs-edit-labels-btn}} in the toolbar.
3. An **Edit Labels** panel will appear on the right, showing the current labels
   with a button to add more.
4. Edit the labels as desired, then click **Save**.`,
        review: {
          instructions: '#### Verify that you can see the updated labels in the Labels column for the selected rows.',
          failedTaskHelp: 'If the Edit Labels button is disabled, ensure at least one row is checked.',
        },
      },
      {
        title: 'Download a log file',
        description: `
Downloading saves the log file to your local machine for analysis with local tools.

1. Open [the row action menu]{{highlight unified-log-row-kebab}} (the ⋮ icon) next
   to the log file you want to download.
2. Click **Download**.
3. Your browser will prompt you to save the file.`,
        review: {
          instructions: '#### Verify that the log file has been downloaded to your local machine.',
          failedTaskHelp: "If the file does not download, check your browser's download settings or pop-up blocker.",
        },
      },
      {
        title: 'Delete log files',
        description: `
Deleting removes selected log files from [APP]'s storage permanently.

1. Click the checkbox next to each log file you want to delete.
2. Click [Delete]{{highlight unified-logs-delete-btn}} in the toolbar.
3. If a confirmation dialog appears, review the warning and click **Delete** to
   confirm.`,
        review: {
          instructions: '#### Verify that the selected log files no longer appear in the table.',
          failedTaskHelp:
            'If the Delete button is disabled, ensure at least one row is checked. If rows remain after deletion, refresh the page.',
        },
      },
    ],
    conclusion: conclusion(displayName, 'Collect Logs'),
    type: {
      text: 'Introduction',
      color: 'blue',
    },
    nextQuickStart: [],
  },
};

export default UnifiedLogsQuickStart;
