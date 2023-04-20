# Cryostat Quick Starts

## Adding Quick Starts
<!---
TODO: Fix this section when quickstarts are categorized 
-->

* To add a new quickstart, create a new tsx/ts file under `src/app/QuickStarts/quickstarts` with your Quick Start name, like `my-quickstart.tsx`.

* For guidelines on writing a quick start, the fine folks at OpenShift have created [this guide](https://docs.openshift.com/container-platform/4.9/web_console/creating-quick-start-tutorials.html)

* Take note of the Quick start [content guidelines](https://docs.openshift.com/container-platform/4.9/web_console/creating-quick-start-tutorials.html#quick-start-content-guidelines_creating-quick-start-tutorials) and follow them as closely as possible.

* For voice and tone requirements, refer to PatternFly’s brand voice and tone guidelines.
* For other UX content guidance, refer to all areas of PatternFly’s UX writing style guide.

* There is an example quickstart written in TypeScript-React under `src/app/QuickStarts/quickstarts/generic-quickstart.tsx`. This is a good starting point for writing your own quickstart in Cryostat.

### Highlighting elements

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

For more information on Quick Starts, see the Patternfly [Quick Starts documentation](https://github.com/patternfly/patternfly-quickstarts/blob/main/packages/module/README.md).

<!---
TODO: Add section on i18n localization when it is ready
-->
