# Ambrosus Basic Event Entry Types

Following document specifies a basic set of entry types, that most events should adhere to, in order to provide maximum interoperability. Mandatory fields are marked with a `*` in front of the field name. In cases where additional fields are allowed, we recommend to name them in a developer-friendly, human-readable way using `camelCase`.

## Asset Informations

`"ambrosus.asset.info"` is used to record human readable information about an asset, such as its name, photos, description, etc. This is where to store information about an asset that will be displayed by applications (internal and consumer-facing).

```json
{
  *"type": "ambrosus.asset.info",
  "assetType": "...",
  *"name": "...",
  "localisedName": {
    "...": "..."
	},
  "description": "...",
  "localisedDescription": {
    "...": "..."
  },
  "tags":["...","..."],
  "images": {
    "default": {
      *"url": "http://...",
      "size": {
        *"width": 300,
        *"height": 600
      }
    },
		"...": {
      *"url": "http://...",
      "size": {
        *"width": 300,
        *"height": 600
      }
    }
  }
}
```

`assetType` is the type of the asset (such as a pallet, a box, an invoice, a batch, a unique item, etc.). Ambrosus provides the following types: `ambrosus.assetTypes.item` (for individual items with a unique serial number), `ambrosus.assetTypes.batch` (for a batch/lot of a certain), `ambrosus.assetTypes.sku` ("Stock Keeping Unit" used for a class of products that share the same attributes such as color, size, size, brand). Apps can create custom asset types as required.

`name` is the default human readable name of the product (in English). Additionally localised versions of name can be provided using the `localisedName` dictionary, where the key is the ISO 639-1 language code, and the value holds the translation.

`description` is the default human readable description of the asset (in English). Additionally localised versions of it can be provided using the `localisedDescription` dictionary, where the key is the ISO 639-1 language code, and the value holds the translation. (same as for name)

`tags` is an array of strings (`"tags":["test", "local", "UK"]`).

`images` is a dictionary that maps identifiers (this can be used to distinguish sizes, orientations, etc.) to objects describing images. Each such object must have a `url` field. Adding a optional `size` object with `width` and `height` is recommended. Additional fields are permitted but will not be checked/validated. For example:

```json
{
  "...",
  "images": {
    "default": {
      *"url": "https://5.imimg.com/data5/WQ/JP/MY-10901605/coffee-packaging-bags-500x500.jpg",
      "name": "Main product image",
      "size": {
        *"width": 300,
        *"height": 600
      }
    },
    "second": {
      "url": "https://5.imimg.com/data5/WQ/JP/MY-10901605/coffee-packaging-bags-500x500.jpg",
      "name": "Alternative product image",
			"size": {
        *"width": 300,
        *"height": 600
      }
    },
    "mobile": {...}
  }
}
```

Additional fields to the `ambrosus.asset.info` entry type are allowed, but will not be checked/validated.

### Asset Branding

`"ambrosus.asset.branding"` is used to provide the unique styling to the front page which is used to display asset data to the end client. Every front page is divided into sections. Each section is styled individually. Basic css rules are used within of each section's object.

```json
{
  "...":,
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

`"ambrosus.asset.redirection"` is used to redirect client to a different page.

```json
{
  "...",
  *"targetUrl": "https://google.com"
}
```

`targetUrl` defines the url to which page will be redirected. In order to disable the redirection a new `"ambrosus.asset.redirection"` shall be created with a values set to **false** or **NULL**.

### Asset/Event Identifier

The different identifiers for an asset. Can represent a unique item (e.g. unique serial ID) or a identifier for a type of item (e.g. barcode).

```json
{
  *"type": "ambrosus.asset.identifiers",
  *"identifiers": {
    "ean13": ["...."],
    "...": ["...."]
  }
}
```

Similarly, identifiers for a event (as opposed to assets) can be represented using following entry:

```json
{
  *"type": "ambrosus.event.identifiers",
  *"identifiers": {
    "...": ["...."]
  }
}
```

In both cases, the required `identifiers` field is a map of identifier types (e.g. ean8, ean13, etc) to an array of values for this type as strings.

*Additional fields outside of `identifiers` are NOT allowed.*

### Asset/Event Location

Represents the location of the asset (ambrosus.asset.location) or an event (ambrosus.event.location).

```json
{
  *"type": "ambrosus.event.location",
  "geoJson": {
    *"type": "Point",
    *"coordinates": [13, -15]
  },
  "assetId": "0x...00",
  "name": "Huxley Building, Imperial College London",
  "city": "London",
  "country": "UK",
  "locationId": "809c578721b74cae1d56504594819285",
  "GLN": 9501101530003
}
```

Any set of fields is allowed. Validation is only provided for the cases described below:

The `geoJson` should be used to express the location using geographical coordinates. If provided it is required to set the `geoJson.type` to `Point` and to provide a `geoJson.coordinates` array field with the first value representing the longitude (valid range from -90 to 90) and the second the latitude (valid range from -180 to 180). Following this standard enables the usage of performant geo-queries using the special `geo(lon, lat, radius)` decorator.

`assetId`, if provided, must be valid asset identification hex-string with a `0x` prefix (e.g. 0x5563cdbcd6bb0cb0fd9ca66426e6df7f8a0d11caa1191162c540bb14d1906019).

`name`, `country`, `city`, if provided, must be strings.



