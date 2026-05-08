const PLACES_NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';

const FIELD_MASK = [
  'places.displayName',
  'places.rating',
  'places.userRatingCount',
  'places.formattedAddress',
  'places.googleMapsUri',
  'places.priceLevel',
  'places.currentOpeningHours.openNow',
].join(',');

export async function searchNearbyRestaurants({ lat, lng, radius = 1000, minRating = 4.0, openNowOnly = true, limit = 5 }) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY not set');

  const res = await fetch(PLACES_NEARBY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: ['restaurant'],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius,
        },
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Places API ${res.status}: ${text}`);
  }

  const data = await res.json();
  const places = data.places || [];

  return places
    .filter((p) => (p.rating || 0) >= minRating)
    .filter((p) => !openNowOnly || p.currentOpeningHours?.openNow === true)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, limit);
}
