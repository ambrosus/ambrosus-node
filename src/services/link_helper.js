export default class LinkHelper {
  linkForAsset(assetId) {
    return `/assets/${assetId}`;
  }

  linkForEvent(assetId, eventId) {
    return `/assets/${assetId}/events/${eventId}`;
  }
}
