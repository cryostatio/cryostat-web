## Adding quick starts
<!---
TODO: Fix this section when quick starts are categorized 
-->

* For guidelines on writing a quick start, please follow [this tutorial](https://docs.openshift.com/container-platform/4.12/web_console/creating-quick-start-tutorials.html).

* Take note of the quick start [content guidelines](https://docs.openshift.com/container-platform/4.12/web_console/creating-quick-start-tutorials.html#quick-start-content-guidelines_creating-quick-start-tutorials) and follow them as closely as possible.

* For voice and tone requirements, refer to [PatternFly’s brand voice and tone guidelines](https://www.patternfly.org/v4/ux-writing/brand-voice-and-tone/).

* For other UX content guidance, refer to all areas of [PatternFly’s UX writing style guide](https://www.patternfly.org/v4/ux-writing/about/).

* There is an [example quick start](./quickstarts/generic-quickstart.tsx) available, which can serve as a useful starting point for creating your own quick start in Cryostat.

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

You can highlight an element on the page from within a quick start. The element that should be highlighted needs a `data-quickstart-id` attribute. Example:
```html
<button data-quickstart-id="special-btn">Click me</button>
```

In the quick start task description, you can add this type of markdown to target this element:
```markdown
Highlight [special button]{{highlight special-btn}}
```
### Copyable text

You can have inline or block copyable text.
#### Inline copyable text example
```markdown
`echo "Donec id est ante"`{{copy}}
```
#### Multiline copyable text example
```markdown
    ```
      First line of text.
      Second line of text.
    ```{{copy}}
```
## Markdown extensions
If your source material content is defined in markdown (yaml + markdown / json + markdown), then you can add your own markdown extensions, example:
```tsx
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

For additional information on quick starts, see the [Patternfly quick starts documentation](https://github.com/patternfly/patternfly-quickstarts/blob/main/packages/module/README.md).

<!---
TODO: Add section on i18n localization when it is ready
-->
