import type { Object3D as StationObject3D, Group as StationGroup, Mesh as StationMesh, Vector3 as StationVector3, Intersection as StationIntersection } from 'three';

/** Model-space naming. Names never depend on UUID, camera angle or the current animation time. */
export function stationElement<T extends StationObject3D>(object: T, role: string): T {
  object.userData.stationRole = role;
  return object;
}

function stationFallbackRole(object: StationObject3D): string {
  const type = (object as StationMesh).geometry?.type;
  return ({ BoxGeometry: '板件', CylinderGeometry: '圆柱或连接杆', SphereGeometry: '球形接头',
    TorusGeometry: '环形紧固件', PlaneGeometry: '平面板', TubeGeometry: '管线' } as Record<string, string>)[type || '']
    || (type ? `网格(${type})` : object.type === 'Group' ? '部件组' : object.type);
}

/** Run once, AFTER the model hierarchy has been built. Every Group and Mesh gets a unique name. */
export function assignStationElementNames(root: StationGroup, title: string): void {
  root.userData.isSpaceStation = true;
  root.userData.stationRole = title;
  const walk = (object: StationObject3D, fullName: string, role: string) => {
    object.name = fullName;
    object.userData.stationPartName = role;
    object.userData.stationPath = fullName;
    const labels = object.children.map(child => String(child.userData.stationRole || child.userData.label || stationFallbackRole(child)));
    const totals = new Map<string, number>();
    labels.forEach(label => totals.set(label, (totals.get(label) || 0) + 1));
    const counts = new Map<string, number>();
    object.children.forEach((child, i) => {
      const label = labels[i]!;
      const ordinal = (counts.get(label) || 0) + 1;
      counts.set(label, ordinal);
      const segment = (totals.get(label) || 0) > 1 ? `${label}_${String(ordinal).padStart(2, '0')}` : label;
      walk(child, `${fullName}/${segment}`, segment);
    });
  };
  walk(root, title, title);
}

/** Fix the INBOARD edge, not the centre. Core panels extend along their parent's ±X. */
export function corePanelDeployment(width: number, side: number, anchorX: number, amount: number) {
  const scale = Math.max(.035, Math.min(1, Number.isFinite(amount) ? amount : 1));
  return { scale, centerX: side * (anchorX + width * .5 * scale) };
}

export interface StationMeshHit {
  object: StationMesh;
  point: StationVector3;
  distance: number;
  instanceId?: number;
}

/** Filter Raycaster's nearest-first results using the visible hierarchy and opaque occluders. */
export function firstStationMeshHit(hits: readonly StationIntersection[]): StationMeshHit | null {
  for (const hit of hits) {
    const mesh = hit.object as StationMesh;
    if (!mesh.isMesh) continue;
    let node: StationObject3D | null = mesh;
    let visible = true, station = false;
    while (node) {
      if (!node.visible) visible = false;
      if (node.userData.isSpaceStation === true) station = true;
      node = node.parent;
    }
    if (!visible) continue;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    const materialIndex = hit.face?.materialIndex;
    const relevant = Array.isArray(mesh.material) && materialIndex !== undefined
      ? materials.slice(materialIndex, materialIndex + 1) : materials;
    const visibleMaterials = relevant.filter(material => material && material.visible !== false && (!material.transparent || material.opacity > .001));
    if (!visibleMaterials.length) continue;
    if (station && mesh.name) return { object: mesh, point: hit.point, distance: hit.distance, instanceId: hit.instanceId };
    // Transparent atmosphere and sky are not station parts; opaque foregrounds still block selection.
    if (mesh.renderOrder >= 0 && visibleMaterials.some(material => !material.transparent || material.opacity >= .95)) return null;
  }
  return null;
}
