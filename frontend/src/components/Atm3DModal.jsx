import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

export default function Atm3DModal({ isOpen, onClose, locationData }) {
  const mountRef = useRef(null)
  const [cameraView, setCameraView] = useState('OVERVIEW') // OVERVIEW, CARD_SLOT, VAULT, CCTV, KEYPAD
  const [visionMode, setVisionMode] = useState('STANDARD') // STANDARD, THERMAL, WIREFRAME, LASER
  const [autoRotate, setAutoRotate] = useState(true)
  const [vaultLocked, setVaultLocked] = useState(false)
  const [alarmActive, setAlarmActive] = useState(false)
  const [cashLevel, setCashLevel] = useState(74)
  const [dispatchStatus, setDispatchStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('TELEMETRY') // TELEMETRY, PROBLEM_SOLVING, CCTV

  const sceneRef = useRef(null)
  const rendererRef = useRef(null)
  const cameraRef = useRef(null)
  const atmGroupRef = useRef(null)
  const laserRef = useRef(null)
  const cctvLightRef = useRef(null)
  const screenMeshRef = useRef(null)
  const vaultLightRef = useRef(null)
  const isDraggingRef = useRef(false)
  const previousMousePosition = useRef({ x: 0, y: 0 })

  const name = locationData?.name || 'Chennai Central ATM'
  const type = locationData?.type || 'ATM'
  const zone = locationData?.zone || locationData?.city || 'Chennai'
  const riskScore = locationData?.riskScore || 86
  const riskLevel = locationData?.riskLevel || (riskScore >= 80 ? 'CRITICAL' : riskScore >= 60 ? 'HIGH' : 'MEDIUM')
  const lat = locationData?.latitude || 13.0827
  const lng = locationData?.longitude || 80.2707

  // Initialize Three.js Scene
  useEffect(() => {
    if (!isOpen || !mountRef.current) return

    const width = mountRef.current.clientWidth || 600
    const height = mountRef.current.clientHeight || 420

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0d0e)
    scene.fog = new THREE.FogExp2(0x0a0d0e, 0.04)
    sceneRef.current = scene

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100)
    camera.position.set(0, 2.2, 5.5)
    camera.lookAt(0, 1.2, 0)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xd7f36b, 1.2)
    mainLight.position.set(4, 6, 4)
    mainLight.castShadow = true
    scene.add(mainLight)

    const rimLight = new THREE.DirectionalLight(0x00f0ff, 0.8)
    rimLight.position.set(-4, 3, -3)
    scene.add(rimLight)

    const pointLight = new THREE.PointLight(0xd7f36b, 1.5, 6)
    pointLight.position.set(0, 1.6, 1.2)
    scene.add(pointLight)

    // Grid Floor
    const gridHelper = new THREE.GridHelper(12, 24, 0xd7f36b, 0x1f2923)
    gridHelper.position.y = 0
    scene.add(gridHelper)

    // ATM Group Construction
    const atmGroup = new THREE.Group()
    scene.add(atmGroup)
    atmGroupRef.current = atmGroup

    // Materials
    const chassisMat = new THREE.MeshStandardMaterial({
      color: 0x1b2022,
      metalness: 0.85,
      roughness: 0.25,
    })

    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x111415,
      metalness: 0.9,
      roughness: 0.1,
    })

    const screenMat = new THREE.MeshBasicMaterial({
      color: 0x052a26,
    })

    const neonMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x00ffcc,
      emissiveIntensity: 0.9,
    })

    const keypadMat = new THREE.MeshStandardMaterial({
      color: 0x333b3d,
      metalness: 0.7,
      roughness: 0.4,
    })

    const vaultMat = new THREE.MeshStandardMaterial({
      color: 0x242a2c,
      metalness: 0.95,
      roughness: 0.15,
    })

    // 1. ATM Outer Body Shell
    const bodyGeo = new THREE.BoxGeometry(1.6, 2.6, 1.2)
    const bodyMesh = new THREE.Mesh(bodyGeo, chassisMat)
    bodyMesh.position.y = 1.3
    bodyMesh.castShadow = true
    bodyMesh.receiveShadow = true
    atmGroup.add(bodyMesh)

    // Top Sign Banner
    const topSignGeo = new THREE.BoxGeometry(1.5, 0.35, 1.25)
    const topSignMat = new THREE.MeshStandardMaterial({
      color: 0x0f241d,
      emissive: 0xd7f36b,
      emissiveIntensity: 0.35,
    })
    const topSignMesh = new THREE.Mesh(topSignGeo, topSignMat)
    topSignMesh.position.set(0, 2.65, 0.02)
    atmGroup.add(topSignMesh)

    // Recessed Screen Bezel Frame
    const frameGeo = new THREE.BoxGeometry(1.25, 0.95, 0.15)
    const frameMesh = new THREE.Mesh(frameGeo, bezelMat)
    frameMesh.position.set(0, 1.75, 0.58)
    atmGroup.add(frameMesh)

    // Glowing LCD Display Screen
    const screenGeo = new THREE.PlaneGeometry(1.05, 0.75)
    const screenMesh = new THREE.Mesh(screenGeo, screenMat)
    screenMesh.position.set(0, 1.75, 0.66)
    atmGroup.add(screenMesh)
    screenMeshRef.current = screenMesh

    // Screen UI lines (Graphic simulation on screen)
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 360
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#061a17'
    ctx.fillRect(0, 0, 512, 360)
    ctx.fillStyle = '#d7f36b'
    ctx.font = 'bold 22px monospace'
    ctx.fillText('TAMIL NADU SENTINEL ATM #88', 24, 45)
    ctx.font = '16px monospace'
    ctx.fillStyle = '#78d7a6'
    ctx.fillText(`ID: ${locationData?.id || 'ATM-TN-04'} | ONLINE`, 24, 80)
    ctx.fillStyle = '#ffffff'
    ctx.fillText('SYSTEM READY · ENTER CARD', 24, 130)
    ctx.fillStyle = '#ff766a'
    ctx.fillText(`SURVEILLANCE RISK: ${riskScore}/100`, 24, 175)
    ctx.fillStyle = '#87918b'
    ctx.fillRect(24, 200, 464, 4)
    ctx.fillStyle = '#00ffcc'
    ctx.fillText('VAULT CAPACITY: 74% [SECURE]', 24, 240)
    ctx.fillText('ANTI-SKIMMER LASER: ACTIVE', 24, 275)

    const canvasTexture = new THREE.CanvasTexture(canvas)
    screenMesh.material = new THREE.MeshBasicMaterial({ map: canvasTexture })

    // Keypad Panel Shelf
    const shelfGeo = new THREE.BoxGeometry(1.25, 0.12, 0.45)
    const shelfMesh = new THREE.Mesh(shelfGeo, bezelMat)
    shelfMesh.position.set(0, 1.15, 0.72)
    shelfMesh.rotation.x = 0.25
    atmGroup.add(shelfMesh)

    // Keypad buttons
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const keyGeo = new THREE.BoxGeometry(0.08, 0.04, 0.08)
        const keyMesh = new THREE.Mesh(keyGeo, keypadMat)
        keyMesh.position.set(-0.25 + c * 0.15, 1.17 - r * 0.06, 0.74 + r * 0.04)
        atmGroup.add(keyMesh)
      }
    }

    // Card Slot Assembly (Glowing Neon Slot)
    const cardSlotGeo = new THREE.BoxGeometry(0.35, 0.06, 0.12)
    const cardSlotMesh = new THREE.Mesh(cardSlotGeo, neonMat)
    cardSlotMesh.position.set(0.36, 1.25, 0.68)
    atmGroup.add(cardSlotMesh)

    // Cash Dispenser Vault Shutter Door
    const vaultDoorGeo = new THREE.BoxGeometry(0.7, 0.25, 0.1)
    const vaultDoorMesh = new THREE.Mesh(vaultDoorGeo, vaultMat)
    vaultDoorMesh.position.set(0, 0.65, 0.62)
    atmGroup.add(vaultDoorMesh)

    // Vault Status LED Light
    const vaultLightGeo = new THREE.SphereGeometry(0.04, 16, 16)
    const vaultLightMat = new THREE.MeshBasicMaterial({ color: 0x78d7a6 })
    const vaultLightMesh = new THREE.Mesh(vaultLightGeo, vaultLightMat)
    vaultLightMesh.position.set(-0.3, 0.65, 0.68)
    atmGroup.add(vaultLightMesh)
    vaultLightRef.current = vaultLightMesh

    // Overhead CCTV Camera Turret
    const cctvMountGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 16)
    const cctvMountMesh = new THREE.Mesh(cctvMountGeo, chassisMat)
    cctvMountMesh.position.set(0, 2.75, 0.6)
    cctvMountMesh.rotation.x = Math.PI / 4
    atmGroup.add(cctvMountMesh)

    const cctvCamGeo = new THREE.SphereGeometry(0.09, 16, 16)
    const cctvCamMesh = new THREE.Mesh(cctvCamGeo, bezelMat)
    cctvCamMesh.position.set(0, 2.68, 0.68)
    atmGroup.add(cctvCamMesh)

    const cctvLedGeo = new THREE.SphereGeometry(0.025, 8, 8)
    const cctvLedMat = new THREE.MeshBasicMaterial({ color: 0xff0000 })
    const cctvLedMesh = new THREE.Mesh(cctvLedGeo, cctvLedMat)
    cctvLedMesh.position.set(0, 2.67, 0.76)
    atmGroup.add(cctvLedMesh)
    cctvLightRef.current = cctvLedMesh

    // Anti-Skimmer Security Laser Plane (Scans up & down)
    const laserGeo = new THREE.PlaneGeometry(1.5, 0.02)
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85
    })
    const laserMesh = new THREE.Mesh(laserGeo, laserMat)
    laserMesh.position.set(0, 1.2, 0.72)
    atmGroup.add(laserMesh)
    laserRef.current = laserMesh

    // Animation Loop
    let animationFrameId
    let clock = new THREE.Clock()

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      const elapsedTime = clock.getElapsedTime()

      // Auto-rotation if enabled & not dragging
      if (autoRotate && !isDraggingRef.current && atmGroupRef.current) {
        atmGroupRef.current.rotation.y += 0.005
      }

      // Laser Scanner Animation
      if (laserRef.current) {
        laserRef.current.position.y = 1.0 + Math.sin(elapsedTime * 2.5) * 0.75
      }

      // CCTV Recording LED blinking
      if (cctvLightRef.current) {
        cctvLightRef.current.material.color.setHex(
          Math.floor(elapsedTime * 3) % 2 === 0 ? 0xff0000 : 0x440000
        )
      }

      renderer.render(scene, camera)
    }

    animate()

    // Handle Window Resize
    const handleResize = () => {
      if (!mountRef.current || !renderer || !camera) return
      const w = mountRef.current.clientWidth
      const h = mountRef.current.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      if (renderer.domElement && mountRef.current) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [isOpen, locationData, riskScore])

  // Camera Presets Controller
  useEffect(() => {
    if (!cameraRef.current) return
    const camera = cameraRef.current
    const target = new THREE.Vector3(0, 1.2, 0)

    let coords = { x: 0, y: 2.2, z: 5.5 }
    if (cameraView === 'CARD_SLOT') coords = { x: 0.6, y: 1.35, z: 1.8 }
    else if (cameraView === 'VAULT') coords = { x: 0, y: 0.7, z: 1.9 }
    else if (cameraView === 'CCTV') coords = { x: 0, y: 3.1, z: 2.2 }
    else if (cameraView === 'KEYPAD') coords = { x: 0, y: 1.5, z: 1.6 }

    // Smooth transition
    camera.position.set(coords.x, coords.y, coords.z)
    camera.lookAt(target)
  }, [cameraView])

  // Vision Shader Mode Controller
  useEffect(() => {
    if (!sceneRef.current || !atmGroupRef.current) return
    const scene = sceneRef.current

    atmGroupRef.current.traverse((child) => {
      if (child.isMesh) {
        if (visionMode === 'WIREFRAME') {
          child.material.wireframe = true
        } else if (visionMode === 'THERMAL') {
          child.material.wireframe = false
          if (child === screenMeshRef.current) {
            child.material.color.setHex(0xff0055)
          } else {
            child.material.color.setHex(0x0055ff)
          }
        } else {
          child.material.wireframe = false
          if (child === screenMeshRef.current) {
            child.material.color.setHex(0x052a26)
          }
        }
      }
    })

    if (visionMode === 'THERMAL') {
      scene.background = new THREE.Color(0x050014)
    } else {
      scene.background = new THREE.Color(0x0a0d0e)
    }
  }, [visionMode])

  // Mouse Orbit Control Event Handlers
  const handleMouseDown = (e) => {
    isDraggingRef.current = true
    previousMousePosition.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseMove = (e) => {
    if (!isDraggingRef.current || !atmGroupRef.current) return
    const deltaX = e.clientX - previousMousePosition.current.x
    const deltaY = e.clientY - previousMousePosition.current.y

    atmGroupRef.current.rotation.y += deltaX * 0.008
    atmGroupRef.current.rotation.x += deltaY * 0.008

    previousMousePosition.current = { x: e.clientX, y: e.clientY }
  }

  const handleMouseUp = () => {
    isDraggingRef.current = false
  }

  const handleToggleVaultLock = () => {
    const nextState = !vaultLocked
    setVaultLocked(nextState)
    if (vaultLightRef.current) {
      vaultLightRef.current.material.color.setHex(nextState ? 0xff0044 : 0x78d7a6)
    }
  }

  const handleTriggerAlarm = () => {
    setAlarmActive(!alarmActive)
  }

  const handleDispatchInterception = () => {
    setDispatchStatus('Interception Patrol Unit #04 dispatched! ETA: 3.2 minutes to ' + name)
    setTimeout(() => setDispatchStatus(null), 6000)
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 8, 9, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1100,
          maxHeight: '92vh',
          backgroundColor: 'var(--panel)',
          border: '1px solid var(--border-strong)',
          borderRadius: 12,
          boxShadow: '0 25px 60px rgba(0,0,0,0.85)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header Bar */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(90deg, rgba(215,243,107,0.06), transparent)'
          }}
        >
          <div>
            <div className="eyebrow">MODULE 3 / 3D SPATIAL TELEMETRY INSPECTOR</div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>{name}</span>
              <span className={`badge ${riskLevel.toLowerCase()}`}>
                RISK {riskScore}/100 ({riskLevel})
              </span>
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="status-chip"><i /> 3D SENSORS ONLINE</span>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                borderRadius: '50%',
                width: 32,
                height: 32,
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Main Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(340px, 1fr)', flex: 1, overflow: 'hidden' }}>
          
          {/* 3D Viewport Column */}
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', background: '#0a0d0e', borderRight: '1px solid var(--border)' }}>
            
            {/* 3D Render Canvas Container */}
            <div
              ref={mountRef}
              style={{ flex: 1, minHeight: 400, cursor: 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />

            {/* Floating Camera Presets Bar */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                left: 14,
                display: 'flex',
                gap: 6,
                background: 'rgba(12,15,16,0.85)',
                padding: 6,
                borderRadius: 6,
                border: '1px solid var(--border)'
              }}
            >
              {[
                { id: 'OVERVIEW', label: '🎥 Overview' },
                { id: 'CARD_SLOT', label: '💳 Card Slot' },
                { id: 'VAULT', label: '🔒 Vault Door' },
                { id: 'CCTV', label: '📹 CCTV Cam' },
                { id: 'KEYPAD', label: '⌨️ Keypad' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setCameraView(btn.id)}
                  style={{
                    background: cameraView === btn.id ? 'var(--primary)' : 'transparent',
                    color: cameraView === btn.id ? '#000' : 'var(--muted-bright)',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: '.65rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Shader / Sensor Mode Bar */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                display: 'flex',
                gap: 6,
                background: 'rgba(12,15,16,0.85)',
                padding: 6,
                borderRadius: 6,
                border: '1px solid var(--border)'
              }}
            >
              {[
                { id: 'STANDARD', label: '🟢 Cyber 3D' },
                { id: 'THERMAL', label: '🔴 Thermal IR' },
                { id: 'WIREFRAME', label: '🔷 Wireframe' },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setVisionMode(btn.id)}
                  style={{
                    background: visionMode === btn.id ? 'rgba(215,243,107,0.2)' : 'transparent',
                    color: visionMode === btn.id ? 'var(--primary)' : 'var(--muted)',
                    border: visionMode === btn.id ? '1px solid var(--primary)' : '1px solid transparent',
                    borderRadius: 4,
                    padding: '4px 8px',
                    fontSize: '.62rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Bottom Controls Overlay */}
            <div
              style={{
                padding: '10px 16px',
                borderTop: '1px solid var(--border)',
                background: 'rgba(12,15,16,0.92)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '.7rem'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => setAutoRotate(!autoRotate)}
                  style={{
                    background: autoRotate ? 'var(--primary-dim)' : 'transparent',
                    color: autoRotate ? 'var(--primary)' : 'var(--muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    padding: '3px 8px',
                    cursor: 'pointer',
                    fontSize: '.65rem'
                  }}
                >
                  {autoRotate ? '⏸ Auto-Rotate: ON' : '▶ Auto-Rotate: OFF'}
                </button>
                <span style={{ color: 'var(--muted)' }}>Drag mouse to rotate 3D view</span>
              </div>

              <span style={{ color: 'var(--muted)', font: '500 .62rem "DM Mono"' }}>
                COORDS: {lat.toFixed(4)} N, {lng.toFixed(4)} E
              </span>
            </div>
          </div>

          {/* Details & Problem Solving Sidebar Column */}
          <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 20, gap: 16 }}>
            
            {/* Tab Selector */}
            <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
              <button
                onClick={() => setActiveTab('TELEMETRY')}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  fontSize: '.72rem',
                  fontWeight: 700,
                  background: activeTab === 'TELEMETRY' ? 'var(--primary-dim)' : 'transparent',
                  color: activeTab === 'TELEMETRY' ? 'var(--primary)' : 'var(--muted)',
                  border: activeTab === 'TELEMETRY' ? '1px solid rgba(215,243,107,0.3)' : '1px solid transparent',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                📊 3D Telemetry
              </button>
              <button
                onClick={() => setActiveTab('PROBLEM_SOLVING')}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  fontSize: '.72rem',
                  fontWeight: 700,
                  background: activeTab === 'PROBLEM_SOLVING' ? 'var(--primary-dim)' : 'transparent',
                  color: activeTab === 'PROBLEM_SOLVING' ? 'var(--primary)' : 'var(--muted)',
                  border: activeTab === 'PROBLEM_SOLVING' ? '1px solid rgba(215,243,107,0.3)' : '1px solid transparent',
                  borderRadius: 6,
                  cursor: 'pointer'
                }}
              >
                🎯 Cash-Out Interceptor
              </button>
            </div>

            {dispatchStatus && (
              <div className="replay-result" style={{ margin: 0, padding: 10, background: 'rgba(120,215,166,0.12)', borderColor: 'var(--success)' }}>
                <strong style={{ color: 'var(--success)' }}>{dispatchStatus}</strong>
              </div>
            )}

            {activeTab === 'TELEMETRY' ? (
              <>
                {/* Vault & Hardware Health Status */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>ATM VAULT & HARDWARE STATUS</div>
                  
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', marginBottom: 4 }}>
                      <span style={{ color: 'var(--muted)' }}>Cash Vault Reserve:</span>
                      <strong>₹{(cashLevel * 25000).toLocaleString('en-IN')} ({cashLevel}%)</strong>
                    </div>
                    <div style={{ width: '100%', height: 8, background: '#1c2223', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${cashLevel}%`, height: '100%', background: cashLevel < 30 ? 'var(--critical)' : 'var(--primary)', transition: 'width 0.4s' }} />
                    </div>
                  </div>

                  <div className="grid grid-2" style={{ gap: 8, fontSize: '.72rem' }}>
                    <div style={{ padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
                      <div style={{ color: 'var(--muted)', fontSize: '.6rem' }}>SKIMMER SENSOR</div>
                      <strong style={{ color: 'var(--success)' }}>100% CLEAN</strong>
                    </div>

                    <div style={{ padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
                      <div style={{ color: 'var(--muted)', fontSize: '.6rem' }}>VAULT LOCK DOOR</div>
                      <strong style={{ color: vaultLocked ? 'var(--critical)' : 'var(--success)' }}>
                        {vaultLocked ? 'LOCKED / FROZEN' : 'NORMAL / SECURE'}
                      </strong>
                    </div>

                    <div style={{ padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
                      <div style={{ color: 'var(--muted)', fontSize: '.6rem' }}>CCTV SURVEILLANCE</div>
                      <strong style={{ color: alarmActive ? 'var(--warning)' : 'var(--primary)' }}>
                        {alarmActive ? 'ALARM / STROBE ON' : 'LIVE RECORDING'}
                      </strong>
                    </div>

                    <div style={{ padding: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
                      <div style={{ color: 'var(--muted)', fontSize: '.6rem' }}>CARD SLOT SENSOR</div>
                      <strong style={{ color: 'var(--success)' }}>ACTIVE NEON GLOW</strong>
                    </div>
                  </div>
                </div>

                {/* Live Simulated CCTV Overlay Feed */}
                <div style={{ background: '#000', border: '1px solid var(--border)', borderRadius: 8, padding: 10, position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span className="status-chip" style={{ fontSize: '.6rem', color: alarmActive ? 'var(--critical)' : 'var(--success)' }}>
                      <i style={{ background: alarmActive ? 'var(--critical)' : 'var(--success)' }} /> CCTV FEED #01 (CAM-OVERHEAD)
                    </span>
                    <span style={{ color: 'var(--muted)', font: '500 .58rem "DM Mono"' }}>LIVE {new Date().toLocaleTimeString()}</span>
                  </div>

                  <div style={{ height: 120, background: '#07100e', border: '1px solid #142e27', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    {/* Simulated Bounding Box for Motion Detection */}
                    <div style={{ border: '1px dashed var(--primary)', width: 60, height: 70, position: 'absolute', top: 25, left: '42%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 2 }}>
                      <span style={{ fontSize: '.5rem', color: 'var(--primary)', font: '500 .5rem "DM Mono"' }}>TARGET ID#9</span>
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '.68rem', font: '500 .65rem "DM Mono"', textAlign: 'center' }}>
                      [ATM ENCLOSURE CCTV LIVE STREAM]<br />
                      <small style={{ color: 'var(--primary)' }}>MOTION DETECTION: ACTIVE</small>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="danger-button"
                      style={{ flex: 1, fontSize: '.72rem', height: 34 }}
                      onClick={handleToggleVaultLock}
                    >
                      {vaultLocked ? '🔓 Unfreeze ATM Vault' : '🔒 Freeze Vault (Remote Lock)'}
                    </button>
                    <button
                      className="secondary-button"
                      style={{ flex: 1, fontSize: '.72rem', height: 34, borderColor: alarmActive ? 'var(--warning)' : undefined }}
                      onClick={handleTriggerAlarm}
                    >
                      {alarmActive ? '🔕 Silence Siren' : '🚨 Trigger Siren & Strobe'}
                    </button>
                  </div>

                  <button
                    className="primary-button"
                    style={{ width: '100%', fontSize: '.75rem', height: 36 }}
                    onClick={handleDispatchInterception}
                  >
                    🚓 Dispatch Nearest Police Patrol Unit
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* PROBLEM SOLVING / REAL WORLD IMPACT TAB */}
                <div style={{ background: 'rgba(215,243,107,0.03)', border: '1px solid rgba(215,243,107,0.2)', borderRadius: 8, padding: 14 }}>
                  <div className="eyebrow" style={{ color: 'var(--primary)' }}>HOW THIS WEB APP SOLVES THE REAL PROBLEM</div>
                  <h4 style={{ margin: '6px 0 10px', fontSize: '.88rem', color: 'var(--text)' }}>
                    Nearest ATM Cash-Out Prediction &amp; Interception Architecture
                  </h4>
                  <p style={{ margin: 0, fontSize: '.72rem', color: 'var(--muted-bright)', lineHeight: 1.6 }}>
                    When cybercriminals perform phishing or OTP fraud, stolen funds are instantly wired to local money mule bank accounts. Mules are instructed to visit the <strong>nearest cash-rich ATM within a 2-10 km radius</strong> within 15 to 30 minutes before police issue bank freeze orders.
                  </p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8, padding: 14 }}>
                  <div className="eyebrow" style={{ marginBottom: 10 }}>SPATIAL INTERCEPTION MATRIX</div>

                  <div className="prediction-line" style={{ borderBottom: '1px solid var(--border)' }}>
                    <span>TARGET ATM</span>
                    <strong style={{ color: 'var(--primary)' }}>{name}</strong>
                  </div>

                  <div className="prediction-line">
                    <span>NEAREST POLICE STATION</span>
                    <strong>T. Nagar / Central Sector Police Station</strong>
                  </div>

                  <div className="prediction-line">
                    <span>POLICE PATROL DISTANCE</span>
                    <strong>1.2 km away</strong>
                  </div>

                  <div className="prediction-line">
                    <span>PATROL INTERCEPTION ETA</span>
                    <strong style={{ color: 'var(--success)' }}>3.5 Minutes</strong>
                  </div>

                  <div className="prediction-line">
                    <span>PREDICTED MULE ARRIVAL</span>
                    <strong style={{ color: 'var(--warning)' }}>12.0 Minutes</strong>
                  </div>

                  <div className="prediction-line">
                    <span>INTERCEPTION FEASIBILITY</span>
                    <strong style={{ color: 'var(--success)', fontSize: '.8rem' }}>✓ 100% FEASIBLE (PATROL ARRIVES FIRST)</strong>
                  </div>
                </div>

                <div style={{ padding: 12, background: 'rgba(120,215,166,0.06)', border: '1px solid var(--success)', borderRadius: 8 }}>
                  <div style={{ fontSize: '.7rem', color: 'var(--success)', fontWeight: 700, marginBottom: 4 }}>
                    Operational Real-World Impact:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: '.68rem', color: 'var(--text)', lineHeight: 1.5 }}>
                    <li>Prevents irreversible physical cash withdrawal from bank ATMs.</li>
                    <li>Coordinates immediate spatial dispatch to intercept mules red-handed at the ATM console.</li>
                    <li>Saves millions of rupees in victim funds prior to physical cash-out.</li>
                  </ul>
                </div>

                <button
                  className="primary-button"
                  style={{ width: '100%', fontSize: '.75rem', height: 38, marginTop: 'auto' }}
                  onClick={handleDispatchInterception}
                >
                  ⚡ Execute Instant Patrol Dispatch Interception
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
