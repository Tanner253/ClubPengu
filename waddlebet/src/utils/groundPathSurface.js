/** Shared Y offset + polygon offset for gravel paths over ice ground (prevents z-fighting on mobile GPUs). */

export const GROUND_PATH_Y = 0.06;
export const GROUND_PATH_RENDER_ORDER = 2;

/** Material props to merge into MeshStandardMaterial for path decals. */
export function groundPathMaterialProps() {
    return {
        depthWrite: true,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
    };
}

/** Apply consistent path surface settings to a mesh. */
export function applyGroundPathSurface(mesh, y = GROUND_PATH_Y) {
    mesh.position.y = y;
    mesh.renderOrder = GROUND_PATH_RENDER_ORDER;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of materials) {
        if (!mat) continue;
        Object.assign(mat, groundPathMaterialProps());
    }
    return mesh;
}
