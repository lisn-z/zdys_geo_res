import * as THREE from 'three'
import type { ClimateMapLayer, ClimateMapMonth } from '../simulation/ClimateGeoLayers.ts'
import type { ClimateState } from '../simulation/SurfaceClimate.ts'
import type { SeasonPoint } from '../simulation/seasonal-controls.ts'
import { earthTextureUvScale } from '../simulation/earth-texture-registration.ts'

export interface ClimateComparisonChoice {
  id: string
  layer: ClimateMapLayer
  month: ClimateMapMonth
  title: string
}

/** A standalone envelope has the same outer extent as a visible circulation. */
export function comparisonSceneRadius(layers: Record<string, boolean>, earthRadius = 2.5) {
  return ['singleCell', 'hadleyCell', 'ferrelCell', 'polarCell', 'circulationEnvelope'].some(key => layers[key])
    ? earthRadius * 3.55 / 2.5 : earthRadius
}

/** Reuse decoded image pixels, while retaining independent GPU texture ownership. */
export function cloneComparisonEarthTexture(source: THREE.Texture, maxAnisotropy = 1) {
  const texture = source.clone()
  const image = source.image as { naturalWidth?: number; naturalHeight?: number; width?: number; height?: number }
  const [scaleX, scaleY] = earthTextureUvScale(image?.naturalWidth ?? image?.width ?? 0, image?.naturalHeight ?? image?.height ?? 0)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping
  texture.offset.set(0, 0); texture.center.set(0, 0); texture.rotation = 0
  texture.repeat.set(scaleX, scaleY)
  texture.matrixAutoUpdate = true
  texture.updateMatrix()
  texture.anisotropy = Math.max(1, Math.min(8, maxAnisotropy))
  texture.needsUpdate = true
  return texture
}

/** A month comparison uses monthly targets, while the first two ideal models remain seasonless. */
export function comparisonClimateState(
  stage: number, month: ClimateMapMonth, layers: Record<string, boolean>, playing: boolean, speed: number,
  seasonPoint?: SeasonPoint, neutralSeason = false,
): ClimateState {
  return { stage: stage >= 2 ? 3 : stage, month, layers, playing, speed, seasonPoint, neutralSeason: stage < 2 && neutralSeason }
}

/** Fit the sphere silhouette, not merely a flat diameter, within either viewport dimension. */
export function comparisonFitDistance(aspect: number, radius = 2.5, verticalFov = 36, fill = .9) {
  const halfAngle = Math.atan(Math.tan(THREE.MathUtils.degToRad(verticalFov / 2)) * Math.min(1, Math.max(.05, aspect)) * fill)
  return radius / Math.sin(halfAngle)
}

export function synchronizeComparisonCamera(
  source: THREE.PerspectiveCamera, target: THREE.PerspectiveCamera,
  sourceTarget: THREE.Vector3, targetTarget: THREE.Vector3, sourceFit: number, targetFit: number,
) {
  targetTarget.copy(sourceTarget)
  target.position.copy(source.position).sub(sourceTarget).multiplyScalar(targetFit / sourceFit).add(targetTarget)
  target.up.copy(source.up)
  target.quaternion.copy(source.quaternion)
  target.zoom = source.zoom
  target.updateProjectionMatrix()
  target.updateMatrixWorld()
}

export function comparisonViewport(
  canvas: { left: number; top: number; width: number; height: number },
  pane: { left: number; top: number; width: number; height: number },
) {
  return {
    x: Math.round(pane.left - canvas.left),
    y: Math.round(canvas.height - (pane.top - canvas.top) - pane.height),
    width: Math.max(1, Math.round(pane.width)), height: Math.max(1, Math.round(pane.height)),
  }
}
