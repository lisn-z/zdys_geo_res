/**
 * Material.003_diffuse.jpg is 4095 × 1988. Coastline registration at Taiwan,
 * Japan, Cuba, Madagascar, South Africa and New Zealand matches a 4096 × 2048
 * equirectangular image with its top 60 pixels and rightmost pixel cropped.
 * Correct this particular raster's sampling, never the geographic GIS data.
 * Evidence and the remaining missing Arctic cap are documented in CLIMATE_GIS_DATA.md.
 */
export const CROPPED_EARTH_TEXTURE = Object.freeze({ width: 4095, height: 1988, fullWidth: 4096, fullHeight: 2048 })

export function earthTextureUvScale(width: number, height: number): readonly [number, number] {
  return width === CROPPED_EARTH_TEXTURE.width && height === CROPPED_EARTH_TEXTURE.height
    ? [CROPPED_EARTH_TEXTURE.fullWidth / width, CROPPED_EARTH_TEXTURE.fullHeight / height]
    : [1, 1]
}

/** Standard geographic UV uses v=1 at the north pole (CanvasTexture/Texture flipY). */
export function registeredEarthUv(longitude: number, latitude: number, width = 4095, height = 1988) {
  const [sx, sy] = earthTextureUvScale(width, height)
  return { u: (longitude + 180) / 360 * sx, v: (latitude + 90) / 180 * sy }
}
