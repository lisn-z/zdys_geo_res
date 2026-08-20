import type { GeographyProfile, Poem } from './data'

export const getGeographyProfile = (poem: Poem): GeographyProfile => poem.geography
