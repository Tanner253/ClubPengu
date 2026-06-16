/**
 * Shared world-space chop axe mesh (local player drag + remote player broadcasts).
 */

export function createManualChopAxeGroup(THREE) {
    const axeGroup = new THREE.Group();
    axeGroup.name = 'manual_chop_axe';

    const handleGeo = new THREE.CylinderGeometry(0.022, 0.035, 1.1, 12, 8);
    const hPos = handleGeo.attributes.position.array;
    for (let i = 0; i < hPos.length; i += 3) {
        const y = hPos[i + 1];
        hPos[i] += Math.sin((y + 0.5) * Math.PI) * 0.04;
    }
    handleGeo.computeVertexNormals();
    axeGroup.add(new THREE.Mesh(handleGeo, new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 })));

    const headGroup = new THREE.Group();
    headGroup.position.set(0.04, 0.4, 0);
    axeGroup.add(headGroup);

    const shape = new THREE.Shape();
    shape.moveTo(-0.06, 0.1);
    shape.lineTo(0.12, 0.12);
    shape.quadraticCurveTo(0.18, 0, 0.12, -0.16);
    shape.lineTo(-0.06, -0.07);
    shape.closePath();
    const blade = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008 }),
        new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.85, roughness: 0.25 })
    );
    blade.position.set(0.1, 0, 0);
    headGroup.add(blade);

    const bladeTipMarker = new THREE.Object3D();
    bladeTipMarker.position.set(0.17, 0, 0);
    bladeTipMarker.name = 'blade_tip';
    headGroup.add(bladeTipMarker);

    return axeGroup;
}
