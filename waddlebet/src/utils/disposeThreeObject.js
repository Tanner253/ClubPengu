/**
 * Dispose GPU resources for a Three.js object tree.
 * Shared helper — mesh rebuilds and room teardown must call this or WebGL memory leaks.
 */
export function disposeThreeObject(root) {
    if (!root) return;

    root.traverse((child) => {
        if (child.geometry) {
            child.geometry.dispose();
        }
        if (child.material) {
            if (Array.isArray(child.material)) {
                child.material.forEach((mat) => {
                    if (mat?.map) mat.map.dispose();
                    mat?.dispose();
                });
            } else {
                if (child.material.map) child.material.map.dispose();
                child.material.dispose();
            }
        }
    });
}
