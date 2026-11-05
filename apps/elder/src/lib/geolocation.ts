export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export function getCurrentPosition(
  options?: PositionOptions,
): Promise<GeoPoint> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
        ...options,
      },
    );
  });
}

export function watchPosition(
  onUpdate: (point: GeoPoint) => void,
  onError?: (error: GeolocationPositionError) => void,
): number | null {
  if (!navigator.geolocation) return null;
  return navigator.geolocation.watchPosition(
    (position) => {
      onUpdate({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    },
    onError,
    { enableHighAccuracy: true, maximumAge: 3000 },
  );
}
