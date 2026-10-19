import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Truck,
  Compass,
  Package,
  MapPin,
  BellRing,
  Info,
  X,
  Navigation,
  Sparkles,
} from 'lucide-react';
import { COURIERS, type CourierId } from '../utils/ndr-rules';
import type { ShipmentStatus } from '../utils/rules-engine';

interface Delivery3DSceneProps {
  activeCourier: CourierId;
  escalationFlag?: 'Auto-resolve' | 'Needs human' | 'Blocked';
  shipmentStatus?: ShipmentStatus;
  suggestedAction?: string;
  onSelectStatus?: (status: ShipmentStatus) => void;
}

interface InspectionData {
  title: string;
  type: 'package' | 'van' | 'beacon' | 'waypoint' | 'stage';
  details: string;
  actionHint: string;
}

const STAGES: { status: ShipmentStatus; label: string; x: number; z: number }[] = [
  { status: 'Dispatched', label: '1. Dispatched', x: -2.4, z: -0.6 },
  { status: 'In transit', label: '2. In Transit', x: -1.2, z: 0.2 },
  { status: 'Out for delivery', label: '3. Out For Delivery', x: 0.2, z: -0.2 },
  { status: 'NDR raised', label: '4. NDR Raised', x: 1.4, z: 0.4 },
  { status: 'RTO initiated', label: '5. RTO Initiated', x: 2.6, z: -0.4 },
];

export const Delivery3DScene: React.FC<Delivery3DSceneProps> = ({
  activeCourier,
  escalationFlag = 'Auto-resolve',
  shipmentStatus = 'NDR raised',
  suggestedAction = 'Proceed with automated courier reschedule run-sheet sync',
  onSelectStatus,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [viewAngle, setViewAngle] = useState<'iso' | 'front' | 'top'>('iso');
  const [inspectedItem, setInspectedItem] = useState<InspectionData | null>(null);
  const [hoveredName, setHoveredName] = useState<string | null>(null);
  const [flashNotice, setFlashNotice] = useState<string | null>(null);

  // References to keep Three.js instances stable without rebuilding scene
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const vanGroupRef = useRef<THREE.Group | null>(null);
  const cargoMeshRef = useRef<THREE.Mesh | null>(null);
  const beaconLightRef = useRef<THREE.PointLight | null>(null);
  const beaconMeshRef = useRef<THREE.Mesh | null>(null);
  const headlightRefs = useRef<THREE.Mesh[]>([]);
  const packageGroupRef = useRef<THREE.Group | null>(null);
  const milestoneMeshesRef = useRef<THREE.Mesh[]>([]);

  // Colors per courier
  const courierColor =
    activeCourier === 'delhivery' ? 0x059669 : activeCourier === 'bluedart' ? 0x2563eb : 0xea580c;
  const statusColor =
    escalationFlag === 'Auto-resolve' ? 0x10b981 : escalationFlag === 'Blocked' ? 0xe11d48 : 0xf59e0b;

  // Active stage
  const activeStageIndex = STAGES.findIndex((s) => s.status === shipmentStatus);
  const currentStage = STAGES[activeStageIndex >= 0 ? activeStageIndex : 3];

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 340;
    const height = 280;

    // 1. Scene & Deep Atmosphere
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0a0f1d); // Sleek deep navy slate
    scene.fog = new THREE.FogExp2(0x0a0f1d, 0.05);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    cameraRef.current = camera;
    camera.position.set(3.8, 3.8, 4.8);
    camera.lookAt(0, 0.2, 0);

    // 3. Renderer with PBR ACESFilmic tone mapping
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 4. Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.9);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 2.0);
    dirLight.position.set(4, 7, 3);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 20;
    dirLight.shadow.camera.left = -3.5;
    dirLight.shadow.camera.right = 3.5;
    dirLight.shadow.camera.top = 3.5;
    dirLight.shadow.camera.bottom = -3.5;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.6);
    rimLight.position.set(-4, 3, -2);
    scene.add(rimLight);

    // 5. Ground Platform & S-Curve Route Pathway
    const groundGeo = new THREE.CylinderGeometry(4.2, 4.4, 0.16, 36);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.85,
      metalness: 0.15,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.08;
    ground.receiveShadow = true;
    scene.add(ground);

    // Procedural Curve Delivery Road
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.8, 0.01, -0.8),
      new THREE.Vector3(-2.4, 0.01, -0.6),
      new THREE.Vector3(-1.2, 0.01, 0.2),
      new THREE.Vector3(0.2, 0.01, -0.2),
      new THREE.Vector3(1.4, 0.01, 0.4),
      new THREE.Vector3(2.6, 0.01, -0.4),
      new THREE.Vector3(3.0, 0.01, -0.6),
    ]);

    const roadGeo = new THREE.TubeGeometry(curve, 40, 0.28, 8, false);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.9,
      metalness: 0.1,
    });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.scale.set(1, 0.1, 1);
    road.receiveShadow = true;
    scene.add(road);

    // 5 Journey Milestone Nodes
    const milestoneNodes: THREE.Mesh[] = [];
    STAGES.forEach((stage, idx) => {
      const pinGeo = new THREE.CylinderGeometry(0.18, 0.2, 0.08, 16);
      const isCurrent = stage.status === shipmentStatus;
      const pinMat = new THREE.MeshStandardMaterial({
        color: isCurrent ? statusColor : 0x374151,
        emissive: isCurrent ? statusColor : 0x1f2937,
        emissiveIntensity: isCurrent ? 1.5 : 0.1,
        roughness: 0.3,
        metalness: 0.6,
      });
      const pin = new THREE.Mesh(pinGeo, pinMat);
      pin.position.set(stage.x, 0.04, stage.z);
      pin.userData = {
        interactiveType: 'stage',
        status: stage.status,
        label: `Stage: ${stage.label}`,
      };
      scene.add(pin);
      milestoneNodes.push(pin);
    });
    milestoneMeshesRef.current = milestoneNodes;

    // 6. Composite 9-Part Procedural Van placed at current journey milestone
    const van = new THREE.Group();
    vanGroupRef.current = van;
    van.name = 'DeliveryVan';
    van.position.set(currentStage.x, 0, currentStage.z);

    // Cabin
    const cabGeo = new THREE.BoxGeometry(0.7, 0.65, 0.9);
    const cabMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.2,
      metalness: 0.35,
    });
    const cab = new THREE.Mesh(cabGeo, cabMat);
    cab.position.set(0.65, 0.44, 0);
    cab.castShadow = true;
    cab.userData = { interactiveType: 'van', label: 'Field Associate Cab' };
    van.add(cab);

    // Windshield
    const glassGeo = new THREE.BoxGeometry(0.35, 0.32, 0.84);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0.75, 0.58, 0);
    van.add(glass);

    // Cargo Container
    const cargoGeo = new THREE.BoxGeometry(1.25, 0.92, 0.98);
    const cargoMat = new THREE.MeshStandardMaterial({
      color: courierColor,
      roughness: 0.35,
      metalness: 0.2,
    });
    const cargo = new THREE.Mesh(cargoGeo, cargoMat);
    cargo.position.set(-0.25, 0.58, 0);
    cargo.castShadow = true;
    cargo.userData = { interactiveType: 'van', label: 'Courier Cargo Bay' };
    cargoMeshRef.current = cargo;
    van.add(cargo);

    // Bumper
    const bumperGeo = new THREE.BoxGeometry(0.14, 0.18, 0.94);
    const bumperMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    const bumper = new THREE.Mesh(bumperGeo, bumperMat);
    bumper.position.set(1.02, 0.18, 0);
    van.add(bumper);

    // Headlights
    const lightGeo = new THREE.BoxGeometry(0.04, 0.1, 0.16);
    const lightMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 1.8,
    });
    const leftLight = new THREE.Mesh(lightGeo, lightMat);
    leftLight.position.set(1.01, 0.36, 0.3);
    van.add(leftLight);
    const rightLight = new THREE.Mesh(lightGeo, lightMat.clone());
    rightLight.position.set(1.01, 0.36, -0.3);
    van.add(rightLight);
    headlightRefs.current = [leftLight, rightLight];

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 14);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
    const rimGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.13, 10);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.7, roughness: 0.3 });

    const wheelPositions = [
      [0.6, 0.18, 0.48],
      [0.6, 0.18, -0.48],
      [-0.5, 0.18, 0.48],
      [-0.5, 0.18, -0.48],
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.rotation.x = Math.PI / 2;
      tire.position.set(x, y, z);
      tire.castShadow = true;
      const rim = new THREE.Mesh(rimGeo, rimMat);
      tire.add(rim);
      van.add(tire);
    });

    // Roof Dispatch Beacon
    const beaconGeo = new THREE.CylinderGeometry(0.06, 0.08, 0.1, 10);
    const beaconMat = new THREE.MeshStandardMaterial({
      color: statusColor,
      emissive: statusColor,
      emissiveIntensity: 2.5,
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(-0.25, 1.08, 0);
    beacon.userData = { interactiveType: 'beacon', label: 'NDR Logistics Beacon' };
    beaconMeshRef.current = beacon;
    van.add(beacon);

    const beaconLight = new THREE.PointLight(statusColor, 1.6, 3.0);
    beaconLight.position.set(-0.25, 1.15, 0);
    beaconLightRef.current = beaconLight;
    van.add(beaconLight);

    // Shadow plane beneath vehicle
    const shadowGeo = new THREE.PlaneGeometry(2.2, 1.2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x020617,
      transparent: true,
      opacity: 0.6,
    });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    van.add(shadow);

    scene.add(van);

    // 7. Consignment Parcel Box beside the vehicle
    const packageGroup = new THREE.Group();
    packageGroupRef.current = packageGroup;
    packageGroup.name = 'ConsignmentBox';

    const pBoxGeo = new THREE.BoxGeometry(0.3, 0.26, 0.3);
    const pBoxMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.75 });
    const pBox = new THREE.Mesh(pBoxGeo, pBoxMat);
    pBox.position.set(currentStage.x + 0.6, 0.13, currentStage.z + 0.5);
    pBox.rotation.y = 0.3;
    pBox.castShadow = true;
    pBox.userData = { interactiveType: 'package', label: 'Consignment AWB #IND-9941' };
    packageGroup.add(pBox);
    scene.add(packageGroup);

    // 8. Raycaster for clicks & hovers
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getRaycastIntersects = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);

      const interactables = [cab, cargo, beacon, pBox, ...milestoneNodes];
      return raycaster.intersectObjects(interactables, false);
    };

    const handlePointerMove = (e: MouseEvent) => {
      const intersects = getRaycastIntersects(e);
      if (intersects.length > 0) {
        renderer.domElement.style.cursor = 'pointer';
        const label = intersects[0].object.userData.label || 'Interactive 3D Element';
        setHoveredName(label);
      } else {
        renderer.domElement.style.cursor = 'grab';
        setHoveredName(null);
      }
    };

    const handlePointerClick = (e: MouseEvent) => {
      const intersects = getRaycastIntersects(e);
      if (intersects.length > 0) {
        const obj = intersects[0].object;
        const type = obj.userData.interactiveType;

        if (type === 'stage') {
          const st = obj.userData.status as ShipmentStatus;
          if (onSelectStatus) onSelectStatus(st);
          setInspectedItem({
            title: `Journey Milestone: ${st}`,
            type: 'stage',
            details: `Package simulated at stage "${st}". Rules engine dynamically re-evaluates actions.`,
            actionHint: `Click "What if?" sandbox below to test how rules fire at this stage.`,
          });
        } else if (type === 'package') {
          if (packageGroupRef.current) {
            packageGroupRef.current.position.y = 0.12;
            setTimeout(() => {
              if (packageGroupRef.current) packageGroupRef.current.position.y = 0;
            }, 200);
          }
          setInspectedItem({
            title: 'NDR Consignment #IND-9941',
            type: 'package',
            details: `Status: ${shipmentStatus} • Carrier: ${COURIERS[activeCourier].name} • Weight: 1.1kg`,
            actionHint: suggestedAction,
          });
        } else if (type === 'van') {
          flashHeadlights();
          setFlashNotice('Delivery Associate Ping Dispatched!');
          setTimeout(() => setFlashNotice(null), 2500);
          setInspectedItem({
            title: `${COURIERS[activeCourier].name} Delivery Fleet`,
            type: 'van',
            details: `Field associate terminal synchronized. Current Stage: ${shipmentStatus}`,
            actionHint: 'Rider app receives automated run-sheet instructions.',
          });
        } else if (type === 'beacon') {
          setInspectedItem({
            title: 'NDR Dispatch Beacon',
            type: 'beacon',
            details: `Escalation Decision: ${escalationFlag} • Live carrier sync active`,
            actionHint: suggestedAction,
          });
        }
      }
    };

    // 9. Pointer Drag for Custom Angle
    let isDragging = false;
    let prevMouseX = 0;
    let targetRotationY = 0;
    let currentRotationY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
    };

    const onWindowMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const delta = e.clientX - prevMouseX;
      prevMouseX = e.clientX;
      targetRotationY += delta * 0.012;
    };

    const onWindowMouseUp = () => {
      isDragging = false;
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousemove', handlePointerMove);
    dom.addEventListener('click', handlePointerClick);
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onWindowMouseMove);
    window.addEventListener('mouseup', onWindowMouseUp);

    // 10. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Exponential damping
      if (autoRotate && !isDragging) {
        targetRotationY += 0.25 * delta;
      }
      currentRotationY += (targetRotationY - currentRotationY) * (1 - Math.exp(-8 * delta));
      scene.rotation.y = currentRotationY;

      // Pulse active beacon
      if (beaconLightRef.current && beaconMeshRef.current) {
        const pulse = 1.2 + 0.8 * Math.sin(time * 5);
        beaconLightRef.current.intensity = pulse;
        (beaconMeshRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
      }

      // Smooth vehicle gliding to current stage position
      if (vanGroupRef.current) {
        vanGroupRef.current.position.x += (currentStage.x - vanGroupRef.current.position.x) * 0.08;
        vanGroupRef.current.position.z += (currentStage.z - vanGroupRef.current.position.z) * 0.08;
        vanGroupRef.current.position.y = Math.sin(time * 2.5) * 0.012;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth;
      camera.aspect = newWidth / height;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, height);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousemove', handlePointerMove);
      dom.removeEventListener('click', handlePointerClick);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      cancelAnimationFrame(animationFrameId);

      renderer.dispose();
      groundGeo.dispose();
      roadGeo.dispose();
      cabGeo.dispose();
      cargoGeo.dispose();
      wheelGeo.dispose();
      pBoxGeo.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [currentStage]);

  // Sync courier color & status color
  useEffect(() => {
    if (cargoMeshRef.current) {
      (cargoMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(courierColor);
    }
    if (beaconLightRef.current && beaconMeshRef.current) {
      beaconLightRef.current.color.setHex(statusColor);
      (beaconMeshRef.current.material as THREE.MeshStandardMaterial).color.setHex(statusColor);
      (beaconMeshRef.current.material as THREE.MeshStandardMaterial).emissive.setHex(statusColor);
    }
    // Update milestone colors
    milestoneMeshesRef.current.forEach((mesh, idx) => {
      const isCur = STAGES[idx].status === shipmentStatus;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(isCur ? statusColor : 0x374151);
      mat.emissive.setHex(isCur ? statusColor : 0x1f2937);
      mat.emissiveIntensity = isCur ? 1.5 : 0.1;
    });
  }, [courierColor, statusColor, shipmentStatus]);

  const flashHeadlights = () => {
    headlightRefs.current.forEach((hl) => {
      const mat = hl.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 4.0;
      setTimeout(() => {
        mat.emissiveIntensity = 1.8;
      }, 300);
      setTimeout(() => {
        mat.emissiveIntensity = 4.0;
      }, 500);
      setTimeout(() => {
        mat.emissiveIntensity = 1.8;
      }, 800);
    });
  };

  const applyViewAngle = (preset: 'iso' | 'front' | 'top') => {
    setViewAngle(preset);
    if (!cameraRef.current) return;
    if (preset === 'iso') {
      cameraRef.current.position.set(3.8, 3.8, 4.8);
      cameraRef.current.lookAt(0, 0.2, 0);
    } else if (preset === 'front') {
      cameraRef.current.position.set(2.8, 1.4, 0.3);
      cameraRef.current.lookAt(0, 0.35, 0);
    } else if (preset === 'top') {
      cameraRef.current.position.set(0.1, 6.8, 0.1);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 text-white shadow-md overflow-hidden flex flex-col h-full">
      {/* 3D Header Bar */}
      <div className="px-3.5 py-2.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <Truck className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-bold text-slate-200">Interactive 3D Journey</span>
        </div>

        {/* View presets */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => applyViewAngle('iso')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
              viewAngle === 'iso' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            3D
          </button>
          <button
            onClick={() => applyViewAngle('front')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
              viewAngle === 'front' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cab
          </button>
          <button
            onClick={() => applyViewAngle('top')}
            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
              viewAngle === 'top' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Route
          </button>

          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`ml-1 p-1 rounded text-[10px] transition-colors cursor-pointer ${
              autoRotate ? 'bg-indigo-500/20 text-indigo-300' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Toggle rotation"
          >
            <Compass className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 3D Canvas Container */}
      <div className="relative flex-1 min-h-[220px]">
        <div ref={mountRef} className="w-full h-full min-h-[220px]" />

        {/* Hover HUD Badge */}
        {hoveredName && !inspectedItem && (
          <div className="absolute top-2.5 left-3 pointer-events-none text-[10px] font-semibold bg-slate-900/95 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30 shadow-xs flex items-center gap-1.5 z-10">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
            <span>Click to inspect: {hoveredName}</span>
          </div>
        )}

        {/* Headlight flash notice */}
        {flashNotice && (
          <div className="absolute top-2.5 right-3 pointer-events-none text-[10px] font-bold bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full shadow-md animate-bounce flex items-center gap-1 z-10">
            <BellRing className="w-3 h-3" />
            <span>{flashNotice}</span>
          </div>
        )}

        {/* Floating Direct Suggested Action in 3D */}
        <div className="absolute top-2.5 left-2.5 right-2.5 pointer-events-none z-10">
          <div className="p-2 rounded-xl bg-slate-950/85 backdrop-blur-sm border border-slate-700/80 text-[11px] shadow-sm flex items-start gap-1.5 text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">Suggested Action: </span>
              <span className="text-slate-300">{suggestedAction}</span>
            </div>
          </div>
        </div>

        {/* Inspection Details Popover overlay */}
        {inspectedItem && (
          <div className="absolute inset-x-2.5 bottom-2.5 p-3 rounded-xl bg-slate-950/95 border border-indigo-500/50 text-xs shadow-xl animate-in fade-in duration-150 z-20">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-indigo-300 flex items-center gap-1.5 text-[11px]">
                {inspectedItem.type === 'package' && <Package className="w-3.5 h-3.5 text-amber-400" />}
                {inspectedItem.type === 'van' && <Truck className="w-3.5 h-3.5 text-indigo-400" />}
                {inspectedItem.type === 'stage' && <Navigation className="w-3.5 h-3.5 text-emerald-400" />}
                {inspectedItem.title}
              </span>
              <button
                onClick={() => setInspectedItem(null)}
                className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">{inspectedItem.details}</p>
            <p className="mt-1 text-[10px] text-indigo-400 italic">{inspectedItem.actionHint}</p>
          </div>
        )}

        {/* Bottom Active Milestone Indicator */}
        {!inspectedItem && (
          <div className="absolute bottom-2 left-2.5 right-2.5 pointer-events-none flex items-center justify-between text-[10px] text-slate-400 bg-slate-950/80 px-2.5 py-1 rounded-lg backdrop-blur-xs z-10">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  escalationFlag === 'Auto-resolve'
                    ? 'bg-emerald-400'
                    : escalationFlag === 'Blocked'
                    ? 'bg-rose-400'
                    : 'bg-amber-400'
                } animate-ping`}
              />
              <span className="font-semibold text-white">
                Stage: {shipmentStatus}
              </span>
            </div>
            <span className="text-slate-500">
              Carrier: <strong className="text-slate-300">{COURIERS[activeCourier].name}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Interactive Controls & Milestone Switch Bar */}
      <div className="p-2 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-400 flex flex-wrap items-center justify-between gap-1">
        <div className="flex items-center gap-1 overflow-x-auto py-0.5">
          {STAGES.map((s, idx) => (
            <button
              key={s.status}
              onClick={() => onSelectStatus && onSelectStatus(s.status)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors cursor-pointer ${
                shipmentStatus === s.status
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
              }`}
            >
              #{idx + 1} {s.status.split(' ')[0]}
            </button>
          ))}
        </div>

        <button
          onClick={flashHeadlights}
          className="text-indigo-400 hover:text-indigo-300 font-bold px-1.5 py-0.5 rounded hover:bg-slate-900 cursor-pointer"
        >
          Alert Rider
        </button>
      </div>
    </div>
  );
};
