import * as THREE from 'three'
import { createFlowingRiverWater } from './river-water'

/** Small deterministic, tileable textures keep the model independent of network assets. */
function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function texture(size: number, pixel: (x: number, y: number) => number[], color = true) {
  const data = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const p = pixel(x, y), i = (y * size + x) * 4
    data[i] = p[0] ?? 0; data[i + 1] = p[1] ?? 0; data[i + 2] = p[2] ?? 0; data[i + 3] = 255
  }
  const result = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  result.wrapS = result.wrapT = THREE.RepeatWrapping
  result.magFilter = THREE.LinearFilter
  result.minFilter = THREE.LinearMipmapLinearFilter
  result.generateMipmaps = true
  result.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  result.needsUpdate = true
  return result
}

export function createRiverMaterials() {
  const grain = texture(256, (x, y) => {
    const fine = hash(x, y), coarse = hash(Math.floor(x / 8), Math.floor(y / 8))
    const value = 205 + 36 * fine + 10 * coarse
    return [value, value * .985, value * .95]
  })
  const strata = texture(256, (x, y) => {
    const wave = Math.sin(x / 256 * Math.PI * 4) * .8
    const bands = Math.sin((y + wave) * 1.28) * 3.6 + Math.sin((y + wave) * .38) * 2.4
    const fleck = hash(x, y) * 12
    return [219 + bands + fleck, 215 + bands + fleck, 205 + bands + fleck]
  })
  const crop = texture(128, (x, y) => {
    const row = .5 + .5 * Math.cos(x / 128 * Math.PI * 32)
    const speck = hash(x, y) * 20
    return [191 + row * 40 + speck, 200 + row * 30 + speck, 166 + row * 37 + speck]
  })
  const brickHeight = (x:number,y:number) => {
    const row = Math.floor(((y%256)+256)%256/32)
    const bx = ((x + row%2*4)%8+8)%8, by = ((y%32)+32)%32
    const edge = Math.min(bx,7-bx,by,31-by)
    return Math.min(1,Math.max(0,edge/1.2))*.75 + Math.sin(bx/8*Math.PI)*Math.sin(by/32*Math.PI)*.08
  }
  const glazedBrick = texture(256,(x,y) => {
    const row=Math.floor(y/32), col=Math.floor((x+row%2*4)/8)
    const h=brickHeight(x,y), brickTone=195+hash(col,row)*39
    const value=brickTone*(.62+h*.48)+hash(x,y)*5
    return [value, value*.985, value*.945]
  })
  const brickNormal = texture(256,(x,y) => {
    const dx=brickHeight(x+1,y)-brickHeight(x-1,y), dy=brickHeight(x,y+1)-brickHeight(x,y-1)
    const normal=new THREE.Vector3(-dx*.65,-dy*.65,1).normalize()
    return [(normal.x*.5+.5)*255,(normal.y*.5+.5)*255,(normal.z*.5+.5)*255]
  },false)
  // Analytic gradients of periodic waves produce a seamless water normal map.
  const waterNormal = texture(256, (x, y) => {
    const u = x / 256 * Math.PI * 2, v = y / 256 * Math.PI * 2
    const dx = .27 * Math.cos(4 * u + 2 * v) + .13 * Math.cos(11 * u - 3 * v) + .07 * Math.cos(19 * u + 5 * v)
    const dy = .13 * Math.cos(4 * u + 2 * v) - .06 * Math.cos(11 * u - 3 * v) + .03 * Math.cos(19 * u + 5 * v)
    const n = new THREE.Vector3(-dx, -dy, 1).normalize()
    return [(n.x * .5 + .5) * 255, (n.y * .5 + .5) * 255, (n.z * .5 + .5) * 255]
  }, false)

  const ground = new THREE.MeshStandardMaterial({ color: 0xffffff, map: grain, vertexColors: true, roughness: .97 })
  const lower = new THREE.MeshStandardMaterial({ color: 0x796956, map: strata, roughness: 1 })
  const middle = new THREE.MeshStandardMaterial({ color: 0x9a8569, map: strata, roughness: 1 })
  const original = new THREE.MeshStandardMaterial({ color: 0xa6916e, map: strata, roughness: 1 })
  const deposited = new THREE.MeshStandardMaterial({ color: 0xb69763, map: strata, roughness: .95 })
  const bottom = new THREE.MeshStandardMaterial({ color: 0x756451, roughness: 1 })
  const flowingWater = createFlowingRiverWater(waterNormal)
  const water = flowingWater.water
  const waterEdge = new THREE.MeshStandardMaterial({ color: 0x8a754e, roughness: .58, transparent: true, opacity: .5, depthWrite: false })
  const fields = [0x7d8968, 0x8b9573, 0x9b9c7b, 0x75866a, 0xa39b76].map(color =>
    new THREE.MeshStandardMaterial({ color, map: crop, roughness: .98 }))
  const path = new THREE.MeshStandardMaterial({ color: 0xb4ac93, map: grain, roughness: 1 })
  const wall = new THREE.MeshStandardMaterial({ color: 0xc1bcaa, map: grain, roughness: .93 })
  const roof = new THREE.MeshStandardMaterial({ color: 0x625b51, map: grain, roughness: .92 })
  const towerBrick = new THREE.MeshPhysicalMaterial({ color: 0x6d5545, map: glazedBrick,
    normalMap:brickNormal, normalScale:new THREE.Vector2(.32,.32), roughness:.64,
    clearcoat:.24,clearcoatRoughness:.45,flatShading:true })
  const towerTrim = new THREE.MeshStandardMaterial({color:0x665548,map:grain,roughness:.74,flatShading:true})
  const towerOpening = new THREE.MeshStandardMaterial({color:0x28241f,roughness:1})
  const windows = new THREE.MeshStandardMaterial({ color: 0x52646a, roughness: .5 })
  const tree = new THREE.MeshStandardMaterial({ color: 0x596f51, map: grain, roughness: 1, flatShading: false })
  const trunk = new THREE.MeshStandardMaterial({ color: 0x6d5d48, roughness: 1 })
  return {
    ground, lower, middle, original, deposited, bottom, water, waterEdge,
    fields, path, wall, roof, towerBrick, towerTrim, towerOpening, windows, tree, trunk,
    updateWater(time: number) { flowingWater.update(time) },
    setDepositionReveal(enabled: boolean) { flowingWater.setReveal(enabled); waterEdge.opacity = enabled ? .5 : 1 },
    dispose() {
      flowingWater.dispose()
      ;[grain, strata, crop, glazedBrick, brickNormal, waterNormal].forEach(value => value.dispose())
      ;[ground, lower, middle, original, deposited, bottom, waterEdge,
        ...fields, path, wall, roof, towerBrick, towerTrim, towerOpening, windows, tree, trunk].forEach(value => value.dispose())
    },
  }
}
