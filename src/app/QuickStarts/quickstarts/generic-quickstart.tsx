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
import cryostatLogo from '@app/assets/cryostat_icon_rgb_default.svg';
import build from '@app/build.json';
import { FeatureLevel } from '@app/Shared/Services/Settings.service';
import { QuickStart } from '@patternfly/quickstarts';

// Additional info: https://docs.openshift.com/container-platform/4.9/web_console/creating-quick-start-tutorials.html
const GenericQuickStart: QuickStart = {
  apiVersion: 'v2.3.0',
  metadata: {
    name: 'generic-quickstart',
    featureLevel: FeatureLevel.DEVELOPMENT,
    // you can add additional metadata here
  },
  spec: {
    version: 2.3, // versioning for each release of the quick start
    displayName: 'Getting started with quick starts',
    durationMinutes: 10,
    type: {
      text: 'Type',
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
    icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB2aWV3Qm94PSIwIDAgMzA4LjY0NyAyOTEuNjc5NyI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOnVybCgjbGluZWFyLWdyYWRpZW50KTt9PC9zdHlsZT48bGluZWFyR3JhZGllbnQgaWQ9ImxpbmVhci1ncmFkaWVudCIgeDE9IjE1NC4zMjM1IiB5MT0iOS4xNjQ4NyIgeDI9IjE1NC4zMjM1IiB5Mj0iMjkyLjY2MzgzIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHN0b3Agb2Zmc2V0PSIwIiBzdG9wLWNvbG9yPSIjNTRlZWZmIi8+PHN0b3Agb2Zmc2V0PSIxIiBzdG9wLWNvbG9yPSIjMWM3NWJjIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHRpdGxlPkFzc2V0IDE8L3RpdGxlPjxnIGlkPSJMYXllcl8yIiBkYXRhLW5hbWU9IkxheWVyIDIiPjxnIGlkPSJMYXllcl8xLTIiIGRhdGEtbmFtZT0iTGF5ZXIgMSI+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMTU0LjY3NDMuNTgxNmwuMDI4OC0uMjY3Ni0uMTMxMy4xNjQxLS4wNTMyLS4wNTA4TDE1NC41NjQ5LDBsLS4yNDA3LjIzNDlMMTU0LjA4MTUsMGwuMDQ1LjQyNzMtLjA1MDguMDUwOEwxNTMuOTQzOC4zMTRsLjAyODQuMjY3NkwwLDE1MS4wOTA5bDYwLjk3OSw4Ni4zODUyLDQ3LjEwMy0xMC44MTU5LDQ2LjI0MjIsNjUuMDE5NSw0Ni4yNDI3LTY1LjAxOTUsNDcuMTAzLDEwLjgxNTksMzcuNzcyLTUzLjUwOTcsMjMuMjA1MS0zMi44NzU1Wm0tNS4wMjY0LDE3LjY2OTlMMTI4LjYxNTIsMjE1LjMzNyw4Ny41MTY2LDE1OS4yODA4Wk04NS41MDA1LDE1Ni41MzM3LDU5LjYzNDgsMTIxLjI1NDRsODkuNzktMTA5LjgyMTdabTQyLjIyNzUsNjIuNTg2LTE4LjM4NDcsNC4yMTk3TDc4LjQzOSwxNzkuODg4N2w3LjcwMzEtMTcuNDg1M1pNMTUzLjgzODQsOC43MzkzbC40ODU4LTEuMTAyMS40ODQ0LDEuMDk2NywyMS43NDc1LDIxMS44OTUtLjA2NjgtLjA0NDktMjEuMzA2MiwzMS40ODc4LTIzLjA1NTctMzEuNTMyMi0uMDI4My4wMjA1Wm0yNi4xOTMzLDIwNi41OTk2TDE1OC45OTk1LDE4LjI0NTZsNjIuMTMwOSwxNDEuMDM1MlptNDIuNDc1MS01Mi45MzU1LDcuNzAzNiwxNy40ODUzLTMwLjkwNDcsNDMuNDUwNy0xOC4zODUzLTQuMjE5N1pNMTU5LjIyMzYsMTEuNDM3MWw4OS43ODg2LDEwOS44MTczLTI1Ljg2MzMsMzUuMjc5M1pNNjIuMjUsMjM0LjE1MzksMy44NjQ3LDE1MS40NDQ0LDEzOS43MTk3LDE4LjY0MTYsNTUuOTAxNCwxMjEuMTU2OGwyOC4yMjYsMzguNDk0Nkw3NS4wNjE1LDE4MC4yMzNsMzEuMTY2NSw0My44MjMyWm05Mi4wNzQyLDUyLjQzMjYtNDMuMTMwNC02MC42NDIxLDE4LjQzNTEtNC4yMzI5LjMxMi40MjU3LS4xOTgyLjE0NDYsMjUuNTMxMiwzNC45MTg0LDIzLjY2MTItMzQuOTU5OS0uMjAyNy0uMTM2Ny4yODcxLS4zOTIxLDE4LjQzNDEsNC4yMzI5Wk0yODMuMDMwOCwxODIuMjY0MmwtMzYuNjMyOSw1MS44ODk3LTQzLjk3NjUtMTAuMDk3NywzMS4xNjU1LTQzLjgyMzItOS4wNjU0LTIwLjU4MTYsMjguMjI2NS0zOC40OTQ2TDE2OC45Mjk3LDE4LjY0NDEsMzA0Ljc4MjIsMTUxLjQ0NDRaIi8+PC9nPjwvZz48L3N2Zz4=',
    // icon: 'cryostatLogo', <- typically use this
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
  HTML img tag: <img alt="Cryostat logo" src="${cryostatLogo}" width="30" height="30" />

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
    conclusion: `
<div>
  <p>You completed the <strong>Getting started with quick starts</strong> quick start!</p>

  <div style="max-width: 350px">
    <img style="margin-top: 2em; margin-bottom: 2em" src="${cryostatLogo}" alt="Cryostat Logo" width="100%" height="100%" />
  </div>
  <p>To learn more about [APP]'s extensive features and capabilities, read our guides at <a href="${build.documentationUrl}" target="_blank">cryostat.io</a>.</p>
</div>`,
    nextQuickStart: ['start-a-recording-quickstart'],
  },
};

export default GenericQuickStart;
