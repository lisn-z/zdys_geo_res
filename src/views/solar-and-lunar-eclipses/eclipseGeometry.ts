import * as THREE from 'three'

// Earth-radius units; shared by global eclipse tests, local sky and lunar shading.
export const MOON_DISTANCE_EARTH_RADII = 60.27
export const MOON_RADIUS_EARTH_RADII = 0.2724
export const SUN_DISTANCE_EARTH_RADII = 23455
export const SUN_RADIUS_EARTH_RADII = 109.1

/** Fraction of a target disc covered by an occulting disc, including tangencies. */
export function discCoverage(targetRadius: number, occulterRadius: number, separation: number) {
  if (targetRadius <= 0 || occulterRadius <= 0 || separation >= targetRadius + occulterRadius) return 0
  if (separation <= Math.abs(targetRadius - occulterRadius)) {
    return Math.min(1, (occulterRadius / targetRadius) ** 2)
  }
  const r = targetRadius, R = occulterRadius, d = separation
  const a = Math.acos(THREE.MathUtils.clamp((d * d + r * r - R * R) / (2 * d * r), -1, 1))
  const b = Math.acos(THREE.MathUtils.clamp((d * d + R * R - r * r) / (2 * d * R), -1, 1))
  const area = r * r * a + R * R * b - 0.5 * Math.sqrt(Math.max(0, (-d + r + R) * (d + r - R) * (d - r + R) * (d + r + R)))
  return THREE.MathUtils.clamp(area / (Math.PI * r * r), 0, 1)
}

/** Exact tangent-cone / sphere contact for a spherical, airless shadow caster. */
function shadowAtTarget(sun: THREE.Vector3, caster: THREE.Vector3, casterRadius: number, target: THREE.Vector3, targetRadius: number) {
  const axis = caster.clone().sub(sun)
  const lightDistance = axis.length()
  axis.normalize()
  const offset = target.clone().sub(caster)
  const along = offset.dot(axis)
  const radial = offset.addScaledVector(axis, -along).length()
  const sinUmbra = (SUN_RADIUS_EARTH_RADII - casterRadius) / lightDistance
  const sinPenumbra = (SUN_RADIUS_EARTH_RADII + casterRadius) / lightDistance
  const cosUmbra = Math.sqrt(1 - sinUmbra * sinUmbra)
  const cosPenumbra = Math.sqrt(1 - sinPenumbra * sinPenumbra)
  const umbraWidth = casterRadius - along * sinUmbra
  const penumbraWidth = casterRadius + along * sinPenumbra
  return {
    penumbraContact: along > 0 && radial * cosPenumbra < penumbraWidth + targetRadius,
    umbraContact: along > 0 && umbraWidth > 0 && radial * cosUmbra < umbraWidth + targetRadius,
    umbraTotal: along > 0 && radial * cosUmbra + targetRadius <= umbraWidth,
    // Cross sections are also useful for an average diagnostic strength (not per-pixel lighting).
    radial, umbraRadius: Math.max(0, umbraWidth / cosUmbra), penumbraRadius: penumbraWidth / cosPenumbra,
  }
}

export function calculateEclipseGeometry(moon: THREE.Vector3) {
  const sun = new THREE.Vector3(-SUN_DISTANCE_EARTH_RADII, 0, 0)
  const earth = new THREE.Vector3()
  const solar = shadowAtTarget(sun, moon, MOON_RADIUS_EARTH_RADII, earth, 1)
  const lunar = shadowAtTarget(sun, earth, 1, moon, MOON_RADIUS_EARTH_RADII)
  const lunarKind = lunar.umbraTotal ? 'total' : lunar.umbraContact ? 'partial' : lunar.penumbraContact ? 'penumbral' : 'none'
  const strength = lunarKind === 'none' ? 0 :
    0.15 * discCoverage(MOON_RADIUS_EARTH_RADII, lunar.penumbraRadius, lunar.radial) +
    0.85 * discCoverage(MOON_RADIUS_EARTH_RADII, lunar.umbraRadius, lunar.radial)
  return { solarEclipse: solar.penumbraContact, lunarKind, lunarStrength: strength }
}

/** Local coordinates make the same shadow valid in overview, surface, sky and inset. */
export function lunarLightVectors(moon: THREE.Vector3, orientation: THREE.Quaternion) {
  const inverse = orientation.clone().invert()
  return {
    earth: moon.clone().negate().applyQuaternion(inverse),
    sun: new THREE.Vector3(-SUN_DISTANCE_EARTH_RADII, 0, 0).sub(moon).applyQuaternion(inverse),
  }
}

// Per-fragment finite solar-disc occultation. No whole-Moon red tint before contact.
// The faint red residual in totality is an illustrative atmosphere contribution,
// not a radiative-transfer model; geometric contact itself uses the actual spheres.
export const lunarShadowShader = `
  uniform float uLunarShadow;
  uniform vec3 uMoonToEarthLocal, uMoonToSunLocal;
  varying vec3 vBodyNormal;
  float lunarSunVisibility() {
    vec3 point = normalize(vBodyNormal) * ${MOON_RADIUS_EARTH_RADII};
    vec3 toEarth = uMoonToEarthLocal - point;
    vec3 toSun = uMoonToSunLocal - point;
    float earthDistance = length(toEarth), sunDistance = length(toSun);
    if (earthDistance >= sunDistance) return 1.0;
    float r = asin(clamp(${SUN_RADIUS_EARTH_RADII} / sunDistance, 0.0, 1.0));
    float R = asin(clamp(1.0 / earthDistance, 0.0, 1.0));
    vec3 e = toEarth / earthDistance, s = toSun / sunDistance;
    float d = atan(length(cross(e, s)), dot(e, s));
    if (d >= r + R) return 1.0;
    if (d <= abs(R - r)) return 1.0 - min(1.0, R * R / (r * r));
    float a = acos(clamp((d*d + r*r - R*R) / (2.0*d*r), -1.0, 1.0));
    float b = acos(clamp((d*d + R*R - r*r) / (2.0*d*R), -1.0, 1.0));
    float area = r*r*a + R*R*b - 0.5*sqrt(max(0.0, (-d+r+R)*(d+r-R)*(d-r+R)*(d+r+R)));
    return clamp(1.0 - area / (3.14159265359*r*r), 0.0, 1.0);
  }
`
