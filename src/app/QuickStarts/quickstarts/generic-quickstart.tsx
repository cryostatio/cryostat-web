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
import cryostatLogo from '@app/assets/cryostat_icon_rgb_default.svg';
import build from '@app/build.json';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { QuickStart } from '@patternfly/quickstarts';
import { PficonTemplateIcon } from '@patternfly/react-icons';
import React from 'react';
import { conclusion } from '../quickstart-utils';

// Quick start name (currently cannot use [APP], there is a bug with how the title gets rendered in the quick start panel)
const displayName = 'Getting started with quick starts in Cryostat';

// Additional info: https://docs.openshift.com/container-platform/4.9/web_console/creating-quick-start-tutorials.html
const GenericQuickStart: QuickStart = {
  metadata: {
    name: 'generic-quickstart',
    featureLevel: FeatureLevel.DEVELOPMENT,
    order: 0,
    // you can add additional metadata here
  },
  spec: {
    version: 2.3, // versioning for each release of the quick start
    displayName: displayName,
    durationMinutes: 10,
    type: {
      text: 'Placeholder',
      // 'blue' | 'cyan' | 'green' | 'orange' | 'purple' | 'red' | 'grey'
      color: 'grey',
    },
    /*- The icon defined as a base64 value. Example flow:
    # 1. Find an .svg you want to use, like from here: https://www.patternfly.org/v4/guidelines/icons/#all-icons
    # 2. Upload the file here and encode it (output format - plain text): https://base64.guru/converter/encode/image
    # 3. compose - `icon: data:image/svg+xml;base64,<base64 string from step 2>`
    # - If empty string (icon: ''), will use a default rocket icon
    # - If set to null (icon: ~) will not show an icon
    */
    icon: <PficonTemplateIcon />,
    prerequisites: [
      'You can optionally list prerequisites',
      'Another prerequisite',
      'These prerequisites are also displayed on the introduction step',
    ],
    description: `This description appears on the card in the quick starts catalog.`,
    // NOTE: markdown par will acknowledge indents and new lines
    introduction: `
**This introduction is shown at the beginning of the quick start**
- It introduces the quick start and lists the tasks within it.
- You can view the [source for this quick start](https://github.com/patternfly/patternfly-quickstarts/blob/main/packages/dev/src/quickstarts-data/yaml/template.yaml) for additional help and information.`,
    tasks: [
      {
        title: 'Get started',
        description: `
## Text
  1. The main body of the task. You can use markdown syntax here to create list items and more.

  This is a paragraph.
  This is another paragraph. Add an empty line between paragraphs for line breaks or two spaces at the end.
  1. For more information on markdown syntax you can visit [this resource](https://www.markdownguide.org/basic-syntax/).
  1. A <small>limited set</small> of <strong>HTML tags</strong> [are also supported](https://docs.openshift.com/container-platform/4.9/web_console/creating-quick-start-tutorials.html#supported-tags-for-quick-starts_creating-quick-start-tutorials)

## Images
  HTML img tag: <img alt="[APP] logo" src="${cryostatLogo}" width="30" height="30" />

  > Markdown would work as well but cannot add height/width style

  Ellipsis icon (visible if font-awesome is installed): <i class="fas fa-ellipsis-v"></i>

  PF icon: <i class="pf-icon pf-icon-add-circle-o"></i>

## Highlighting
  To enable highlighting, the markdown syntax should contain:
  - Bracketed link text
  - The highlight keyword, followed by the ID of the element that you want to animate
  - The element to be highlighted, needs a \`data-quickstart-id\` attribute

**Example**
  <pre>[Recordings nav item]{{highlight nav-recordings-tab}}</pre>

  will highlight an element with the \`data-quickstart-id="quickstarts"\` attribute

### Code snippets
The syntax for an inline code snippet contains:
- Text between back quotes, followed by \`{{copy}}\`
#### Example 1
The following text demonstates an inline-copy element \`https://github.com/sclorg/ruby-ex.git\`{{copy}}
#### Example 2
And another one \`https://patternfly.org\`{{copy}} here!
The syntax for multi-line code snippets:
- Text between triple back quotes, followed by \`{{copy}}\`
#### Example 1
  \`\`\`
oc new-app ruby~https://github.com/sclorg/ruby-ex.git
echo "Expose route using oc expose svc/ruby-ex"
oc expose svc/ruby-ex
  \`\`\`{{copy}}
#### Example 2
\`\`\`
Hello
world
\`\`\`{{copy}}
  - Clicking the _Next_ button will display the **Check your work** module.
### Admonition blocks
  The syntax for rendering "Admonition Blocks" to Patternfly React Alerts:
  - Bracketed alert text contents
  - The admonition keyword, followed by the alert variant you want
  - Variants are: note, tip, important, caution, and warning

**Examples**
  [This is the note contents with **some bold** text]{{admonition note}}
  [This is the tip contents]{{admonition tip}}
  [This is the important contents]{{admonition important}}
  [This is the caution contents]{{admonition caution}}
  [This is the warning contents]{{admonition warning}}
        `,
        // optional - the task's Check your work module
        review: {
          instructions: `Did you complete the task successfully?`,
          failedTaskHelp: `This task isn't verified yet. Try the task again.`,
          // optional - the task's success and failure messages
        },
        summary: {
          success: 'Shows a success message in the task header',
          failed: 'Shows a failed message in the task header',
        },
      },
    ],
    conclusion: conclusion(
      displayName,
      '[APP]',
      `To learn more about [APP]'s extensive features and capabilities, please visit our website at <a href="${build.documentationUrl}" target="_blank">${build.documentationUrl}</a>.`
    ),
    nextQuickStart: ['start-a-recording-quickstart'],
  },
};

export default GenericQuickStart;
