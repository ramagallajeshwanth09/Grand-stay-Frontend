import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/* ---------- procedural textures ---------- */
function windowTexture() {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = '#0a1024'
  g.fillRect(0, 0, 64, 128)
  for (let y = 4; y < 124; y += 8) {
    for (let x = 4; x < 60; x += 8) {
      const r = Math.random()
      g.fillStyle = r > 0.55 ? (r > 0.9 ? '#7dd3fc' : '#fde68a') : '#0f1733'
      g.fillRect(x, y, 4, 5)
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.magFilter = THREE.NearestFilter
  return t
}

function signTexture(text, color, vertical = false) {
  const c = document.createElement('canvas')
  c.width = vertical ? 128 : 512
  c.height = vertical ? 512 : 128
  const g = c.getContext('2d')
  g.fillStyle = 'rgba(6,8,24,.85)'
  g.beginPath()
  if (g.roundRect) g.roundRect(6, 6, c.width - 12, c.height - 12, 16)
  else g.rect(6, 6, c.width - 12, c.height - 12)
  g.fill()
  g.lineWidth = 6
  g.strokeStyle = color
  g.shadowColor = color
  g.shadowBlur = 18
  g.stroke()
  g.fillStyle = '#ffffff'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.shadowBlur = 22
  if (vertical) {
    g.font = 'bold 64px "Segoe UI",Arial,sans-serif'
    const letters = text.split('')
    const step = (c.height - 40) / letters.length
    letters.forEach((ch, i) => g.fillText(ch, c.width / 2, 24 + step * (i + 0.5)))
  } else {
    g.font = 'bold 74px "Segoe UI",Arial,sans-serif'
    g.fillText(text, c.width / 2, c.height / 2 + 4)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

export default function Scene3D() {
  const mount = useRef(null)

  useEffect(() => {
    const el = mount.current
    let renderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      return // no WebGL: gradient + orbs still show
    }
    renderer.setClearColor(0x000000, 0)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    renderer.setSize(window.innerWidth, window.innerHeight)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x070a20, 38, 105)
    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300)

    /* lights */
    scene.add(new THREE.AmbientLight(0x6b7bd6, 0.75))
    const moon = new THREE.DirectionalLight(0xaec3ff, 0.9)
    moon.position.set(-20, 40, 20)
    scene.add(moon)
    const glowA = new THREE.PointLight(0x22d3ee, 90, 50); glowA.position.set(4, 12, 4); scene.add(glowA)
    const glowB = new THREE.PointLight(0x8b5cf6, 90, 50); glowB.position.set(-14, 8, 4); scene.add(glowB)
    const glowC = new THREE.PointLight(0xf472b6, 70, 40); glowC.position.set(16, 6, 4); scene.add(glowC)

    /* helpers */
    const baseWin = windowTexture()
    const winMat = (w, h, intensity = 0.95, color = 0x1a2350) => {
      const t = baseWin.clone()
      t.needsUpdate = true
      t.repeat.set(Math.max(1, Math.round(w / 3)), Math.max(1, Math.round(h / 6)))
      return new THREE.MeshStandardMaterial({
        color, map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: intensity, roughness: 0.7, metalness: 0.25
      })
    }
    const plain = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra })
    const glow = (color) => new THREE.MeshBasicMaterial({ color })

    const tower = (w, h, d, x, z, y0 = 0) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), winMat(w, h))
      m.position.set(x, y0 + h / 2, z)
      scene.add(m)
      return m
    }
    const plainBox = (w, h, d, color, x, y, z, mat) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || plain(color))
      m.position.set(x, y, z)
      scene.add(m)
      return m
    }
    const sign = (text, color, w, h, x, y, z, vertical = false) => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: signTexture(text, color, vertical), transparent: true, fog: false })
      )
      m.position.set(x, y, z)
      scene.add(m)
      return m
    }
    const palm = (x, z, s = 1) => {
      const g = new THREE.Group()
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1 * s, 0.17 * s, 2.8 * s, 6), plain(0x5b4636))
      trunk.position.y = 1.4 * s
      g.add(trunk)
      for (let i = 0; i < 6; i++) {
        const pivot = new THREE.Group()
        pivot.position.y = 2.8 * s
        pivot.rotation.y = (i * Math.PI) / 3
        const geo = new THREE.ConeGeometry(0.32 * s, 2 * s, 4)
        geo.translate(0, 1 * s, 0)
        const leaf = new THREE.Mesh(geo, plain(i % 2 ? 0x15803d : 0x166534))
        leaf.rotation.z = -1.2
        pivot.add(leaf)
        g.add(pivot)
      }
      g.position.set(x, 0, z)
      scene.add(g)
    }

    /* ground + road */
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ color: 0x080b1e, roughness: 0.35, metalness: 0.5 }))
    ground.rotation.x = -Math.PI / 2
    scene.add(ground)
    const grid = new THREE.GridHelper(300, 100, 0x1d4ed8, 0x1e293b)
    grid.position.y = 0.02
    grid.material.transparent = true
    grid.material.opacity = 0.22
    scene.add(grid)

    const ROAD_Z = 12
    const road = new THREE.Mesh(new THREE.PlaneGeometry(120, 4.2), plain(0x0d1126, { roughness: 0.4 }))
    road.rotation.x = -Math.PI / 2
    road.position.set(0, 0.04, ROAD_Z)
    scene.add(road)
    for (let x = -58; x <= 58; x += 4) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.14), glow(0x64748b))
      dash.rotation.x = -Math.PI / 2
      dash.position.set(x, 0.06, ROAD_Z)
      scene.add(dash)
    }

    /* ===== 1. Grand tower hotel ===== */
    tower(5, 24, 5, 4, -4)
    plainBox(5.5, 0.6, 5.5, 0, 4, 24.3, -4, glow(0x22d3ee))
    plainBox(2.6, 1.4, 2.6, 0x1a2350, 4, 25.3, -4)
    sign('HOTEL', '#22d3ee', 4.6, 1.15, 4, 20.8, -4 + 2.56)

    /* ===== 2. Glass round tower with balcony rings ===== */
    const round = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 18, 28), winMat(16, 18, 0.9, 0x1b2a5e))
    round.material.map.repeat.set(7, 3)
    round.position.set(-6, 9, -9)
    scene.add(round)
    for (let y = 3; y <= 17; y += 3) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.78, 0.06, 8, 48), glow(0x8b5cf6))
      ring.rotation.x = Math.PI / 2
      ring.position.set(-6, y, -9)
      scene.add(ring)
    }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.7, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), plain(0x8b5cf6, { emissive: 0x6d28d9, emissiveIntensity: 0.6 }))
    dome.position.set(-6, 18, -9)
    scene.add(dome)

    /* ===== 3. Art-deco stepped hotel ===== */
    tower(6.4, 10, 6.4, -15, -3)
    tower(4.8, 6, 4.8, -15, -3, 10)
    tower(3.2, 4, 3.2, -15, -3, 16)
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.7, 5, 6), glow(0xf472b6))
    spire.position.set(-15, 22.5, -3)
    scene.add(spire)
    sign('SUITES', '#f472b6', 1.0, 4.2, -15 + 3.25, 6, -3 + 3.3, true)

    /* ===== 4. Wide resort with balconies + rooftop pool ===== */
    tower(13, 7, 5, 16, -5)
    for (let y = 2.4; y <= 6.4; y += 2.2) {
      plainBox(13.2, 0.12, 0.9, 0x334155, 16, y, -5 + 2.9)
    }
    plainBox(13.4, 0.4, 5.4, 0x0f1733, 16, 7.2, -5)
    plainBox(5, 0.1, 2.2, 0, 17.5, 7.45, -5, glow(0x22d3ee))
    sign('RESORT', '#fbbf24', 5.6, 1.2, 14, 9.2, -5 + 2.4)
    plainBox(0.12, 1.4, 0.12, 0x475569, 11.4, 8.2, -5 + 2.4)
    plainBox(0.12, 1.4, 0.12, 0x475569, 16.6, 8.2, -5 + 2.4)

    /* ===== 5. Pyramid hotel with sky beam ===== */
    const pyr = new THREE.Mesh(new THREE.ConeGeometry(7, 14, 4), new THREE.MeshStandardMaterial({
      color: 0x1d4ed8, transparent: true, opacity: 0.38, roughness: 0.15, metalness: 0.4, emissive: 0x1e3a8a, emissiveIntensity: 0.5
    }))
    pyr.rotation.y = Math.PI / 4
    pyr.position.set(29, 7, -10)
    scene.add(pyr)
    const pyrEdges = new THREE.LineSegments(new THREE.EdgesGeometry(pyr.geometry), new THREE.LineBasicMaterial({ color: 0x22d3ee }))
    pyrEdges.rotation.copy(pyr.rotation)
    pyrEdges.position.copy(pyr.position)
    scene.add(pyrEdges)
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 1.2, 40, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x67e8f9, transparent: true, opacity: 0.18, depthWrite: false, fog: false, side: THREE.DoubleSide })
    )
    beam.position.set(29, 34, -10)
    scene.add(beam)

    /* ===== 6. Motel row + VACANCY sign ===== */
    plainBox(14, 2.6, 3.2, 0x141a3a, -3, 1.3, 7)
    for (let i = 0; i < 8; i++) {
      const door = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.3), glow(i % 3 === 0 ? 0xfde68a : 0x38bdf8))
      door.position.set(-9 + i * 1.7, 1.0, 7 + 1.62)
      scene.add(door)
    }
    plainBox(14.4, 0.25, 3.6, 0x22d3ee, -3, 2.7, 7, glow(0x0e7490))
    plainBox(0.14, 5, 0.14, 0x475569, 5.2, 2.5, 8.8)
    sign('VACANCY', '#34d399', 3.2, 0.85, 5.2, 5.4, 8.8)

    /* ===== 7. Pool villas ===== */
    ;[[-24, 7], [24, 6]].forEach(([x, z]) => {
      plainBox(5, 2.4, 3.4, 0x141a3a, x, 1.2, z)
      plainBox(5.4, 0.3, 3.8, 0x8b5cf6, x, 2.55, z, glow(0x5b21b6))
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.0), new THREE.MeshBasicMaterial({ color: 0x22d3ee }))
      pool.rotation.x = -Math.PI / 2
      pool.position.set(x, 0.07, z + 3.2)
      scene.add(pool)
    })

    /* palms + street lamps */
    ;[[-18, 9], [-11, 9.6], [8, 9.4], [13, 9], [-28, 9], [28, 9.5], [-8, 4], [1, 5], [20, 3]].forEach(([x, z], i) => palm(x, z, 0.9 + (i % 3) * 0.15))
    for (let x = -30; x <= 30; x += 10) {
      plainBox(0.1, 3.6, 0.1, 0x475569, x, 1.8, ROAD_Z - 2.6)
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), glow(0xfef3c7))
      bulb.position.set(x, 3.7, ROAD_Z - 2.6)
      scene.add(bulb)
    }

    /* cars (headlights + taillights) */
    const cars = []
    const makeCar = (dir, x, speed) => {
      const g = new THREE.Group()
      g.add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.5, 0.75), plain(dir > 0 ? 0x1e293b : 0x312e81)))
      const top = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.35, 0.65), plain(0x0f172a))
      top.position.set(-0.05, 0.4, 0)
      g.add(top)
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.5), glow(0xfef9c3)); head.position.set(0.76 * dir, 0.05, 0); g.add(head)
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.5), glow(0xf43f5e)); tail.position.set(-0.76 * dir, 0.05, 0); g.add(tail)
      g.position.set(x, 0.35, ROAD_Z + (dir > 0 ? 0.8 : -0.8))
      scene.add(g)
      cars.push({ g, dir, speed })
    }
    ;[-40, -15, 12, 36].forEach((x, i) => makeCar(1, x, 5 + i))
    ;[-30, 0, 24, 45].forEach((x, i) => makeCar(-1, x, 4 + i))

    /* stars */
    const N = 380
    const arr = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 220
      arr[i * 3 + 1] = 22 + Math.random() * 60
      arr[i * 3 + 2] = -40 - Math.random() * 60
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xc7d2fe, size: 0.35, transparent: true, opacity: 0.85, fog: false, depthWrite: false })))

    /* animation - automatic only, never reacts to mouse or scroll */
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let last = performance.now()
    let t = 0
    let raf

    const render = (now = performance.now()) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      t += dt

      const a = Math.sin(t * 0.13) * 0.3
      camera.position.set(Math.sin(a) * 32, 7.5 + Math.sin(t * 0.2) * 0.6, Math.cos(a) * 32)
      camera.lookAt(2, 9, -3)

      cars.forEach((c) => {
        c.g.position.x += c.dir * c.speed * dt
        if (c.g.position.x > 60) c.g.position.x = -60
        if (c.g.position.x < -60) c.g.position.x = 60
      })
      beam.material.opacity = 0.14 + Math.sin(t * 1.5) * 0.05
      glowA.intensity = 90 + Math.sin(t * 1.2) * 15

      renderer.render(scene, camera)
      if (!reduce) raf = requestAnimationFrame(render)
    }
    render()

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      if (reduce) render()
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      scene.traverse((o) => {
        o.geometry?.dispose?.()
        const m = o.material
        if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { x.map?.dispose?.(); x.emissiveMap?.dispose?.(); x.dispose?.() })
      })
      baseWin.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="bg" aria-hidden="true">
      <div className="orb o1" />
      <div className="orb o2" />
      <div className="orb o3" />
      <div ref={mount} className="scene3d" />
    </div>
  )
}
