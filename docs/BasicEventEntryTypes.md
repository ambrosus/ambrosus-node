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
