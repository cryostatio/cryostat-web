/*
Copyright The Cryostat Authors

The Universal Permissive License (UPL), Version 1.0

Subject to the condition set forth below, permission is hereby granted to any
person obtaining a copy of this software, associated documentation and/or data
(collectively the "Software"), free of charge and under any and all copyright
rights in the Software, and any and all patent rights owned or freely
licensable by each licensor hereunder covering either (i) the unmodified
Software as contributed to or provided by such licensor, or (ii) the Larger
Works (as defined below), to deal in both

(a) the Software, and
(b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
one is included with the Software (each a "Larger Work" to which the Software
is contributed by such licensors),

without restriction, including without limitation the rights to copy, create
derivative works of, display, perform, and distribute the Software and make,
use, sell, offer for sale, import, export, have made, and have sold the
Software and the Larger Work(s), and to sublicense the foregoing rights on
either these or other terms.

This license is subject to the following condition:
The above copyright notice and either this complete permission notice or at
a minimum a reference to the UPL must be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
# Cryostat quick starts

## Adding quick starts
<!---
TODO: Fix this section when quick starts are categorized 
-->

* To add a new quick start, create a new tsx/ts file under `src/app/QuickStarts/quickstarts` with your quick start name, like `my-quickstart.tsx`.

* For guidelines on writing a quick start, the fine folks at OpenShift have created [this guide](https://docs.openshift.com/container-platform/4.9/web_console/creating-quick-start-tutorials.html)

* Take note of the quick start [content guidelines](https://docs.openshift.com/container-platform/4.9/web_console/creating-quick-start-tutorials.html#quick-start-content-guidelines_creating-quick-start-tutorials) and follow them as closely as possible.

* For voice and tone requirements, refer to PatternFly’s brand voice and tone guidelines.
* For other UX content guidance, refer to all areas of PatternFly’s UX writing style guide.

* There is an example quick start written in TSX under `src/app/QuickStarts/quickstarts/generic-quickstart.tsx`. This is a good starting point for writing your own quick start in Cryostat.

#### Common quick start highlighted elements:

##### Target selector
```markdown
[Target selector]{{highlight target-selector}}
```
##### Navigation menu button
```markdown
[Navigation menu button]{{highlight nav-toggle-btn}}
```
##### Console navigation links
```markdown
[About]{{highlight nav-about-tab}}
[Dashboard]{{highlight nav-dashboard-tab}}
[Topology]{{highlight nav-topology-tab}}
[Automated Rules]{{highlight nav-automatedrules-tab}}
[Recordings]{{highlight nav-recordings-tab}}
[Archives]{{highlight nav-archives-tab}}
[Events]{{highlight nav-events-tab}}
[Security]{{highlight nav-security-tab}}
```
##### Masthead links
```markdown
[Settings]{{highlight settings-link}}
[Application Launcher]{{highlight application-launcher}}
```

### Some other notes:
* When showing user-facing strings, refer to quick starts as `quick starts` and not `Quick Starts`, `QuickStarts`, or `quickstarts`.
* While rendering markdown, when mentioning the Product name itself, use `[APP]` instead of `Cryostat`.
* The conclusion should stay largely consistent in all quick starts. Refer to the `generic-quickstart.tsx` for an example.

## Highlighting elements

You can highlight an element on the page from within a quick start. The element that should be highlightable needs a data-quickstart-id attribute. Example:
```
<button data-quickstart-id="special-btn">Click me</button>
```

In the quick start task description, you can add this type of markdown to target this element:
```
Highlight [special button]{{highlight special-btn}}
```

### Copyable text

You can have inline or block copyable text.

#### Inline copyable text example
```
`echo "Donec id est ante"`{{copy}}
```

#### Multiline copyable text example
```
    ```
      First line of text.
      Second line of text.
    ```{{copy}}
```

## Markdown extensions
If your source material content is defined in markdown (yaml + markdown / json + markdown), then you can add your own markdown extensions, example:
```
const drawerProps: QuickStartContainerProps = {
  markdown: {
    extensions: [
      // variable substitution example
      // this replaces the strings [APPLICATION] and [PRODUCT]
      {
        type: 'output',
        filter: function(html: string) {
          html = html.replace(/\[APPLICATION\]/g, 'Mercury');
          html = html.replace(/\[PRODUCT\]/g, 'Lightning');

          return html;
        },
      },
    ],
  },
};

return <QuickStartContainer {...drawerProps}>My page content</QuickStartContainer>
```

For more information on quick starts, see the Patternfly quick starts [documentation](https://github.com/patternfly/patternfly-quickstarts/blob/main/packages/module/README.md).

<!---
TODO: Add section on i18n localization when it is ready
-->
