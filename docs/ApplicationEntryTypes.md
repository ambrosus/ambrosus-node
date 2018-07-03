### Asset Branding

`"ambrosus.apps.branding"` is used to provide the unique styling to the front page which is used to display asset data to the end client. Every front page is divided into sections. Each section is styled individually. Basic css rules are used within of each section's object.

```json
{
  "type": "ambrosus.apps.branding",
  "...",
  "nav": {
    "background": "linear-gradient(#ffde00,#ffc900)",
    "color": "#333",
    "border-bottom": "1px solid #c69c15"
  },
  "logo": {
    "url": "https://www.billa.at/Resources/Billa14/images/_cms/logo.png",
    "height": "40px"
  },
  "content": {
    "background": "#fff",
    "color": "#333"
  },
  "footer": {
    "background": "#333",
    "color": "#888",
    "border-top": "1px solid #454545"
  },
  "components": {
    "background": "#fbfbfb",
    "color": "#333"
  },
  "components_titles": {
    "border-bottom": "1px solid #e2e2e2",
    "font-weight": "400",
    "color": "#222",
    "padding-top": "0px",
    "padding-bottom": "10px"
  },
  "components_subtitles": {
    "background": "#f5f5f5",
    "border-bottom": "1px solid #e2e2e2",
    "padding-top": "10px",
    "padding-bottom": "10px",
    "font-size": "12px",
    "color": "#222"
  },
  "components_keys": {
    "font-size": "12px",
    "color": "#222",
    "vertical-align": "top",
    "font-weight": "700"
  },
  "components_values": {
    "font-size": "12px",
    "line-height": "1.8",
    "color": "#222",
    "vertical-align": "top",
    "font-weight": "100"
  }
}
```

`nav` is a navigation bar located at the very top of the page.

`logo` is used to display logo in the navigation bar. Some front pages might display logo in the footer of the page as well.

`content` section between a header and a footer. Used for the general rules only (e.g background-color, padding, etc.)

`footer` is a section located at the very bottom of the page.

`components` are separated blocks of data displayed in the content section.

`components_titles` and `components_subtitles` are located at the top of each component.

`components_keys` and `components_values` are used to render data object's keys and values.

### Asset Redirection

`"ambrosus.apps.redirection"` is used to redirect client to a different page.

```json
{
  "type": "ambrosus.apps.redirection",
  "...",
  *"targetUrl": "https://google.com"
}
```

`targetUrl` defines the url to which page will be redirected. In order to disable the redirection a new `"ambrosus.asset.redirection"` shall be created with a `targetUrl` set to **false** or **NULL**.