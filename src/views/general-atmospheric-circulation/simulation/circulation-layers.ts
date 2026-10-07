const cellLayerKeys = ['hadleyCell', 'ferrelCell', 'polarCell'] as const

/** Only run for a user toggle, never while applying a stage's default layers. */
export function ensureAirflowCells(layers: Record<string, boolean>, singleMode: boolean) {
  if (singleMode || !layers.airflowRibbons) return
  // Stage four starts with no circulation selected. Turning airflow on should
  // show something, but an existing partial selection must remain unchanged.
  if (!cellLayerKeys.some(key => layers[key])) {
    for (const key of cellLayerKeys) layers[key] = true
  }
}
