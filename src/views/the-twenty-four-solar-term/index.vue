<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import * as THREE from 'three'

// ================ 数据：24 节气 ================
interface SolarTerm {
  name: string
  pinyin: string
  english: string
  date: string
  angle: number
  month: number
  day1: number
  day2: number
  season: '春' | '夏' | '秋' | '冬'
  group: 0 | 1
  climate: string
  phenomenon: string
  custom: string
  knowledge: string
  sceneKey: 'spring' | 'summer' | 'autumn' | 'winter' | 'lateSpring' | 'lateSummer' | 'lateAutumn' | 'lateWinter'
  poem?: string
  food?: string
}

const solarTerms: SolarTerm[] = [
  { name: '立春', pinyin: 'Lìchūn', english: 'Start of Spring', date: '2月3-5日', angle: -45, month: 2, day1: 3, day2: 5, season: '春', group: 0, climate: '东风送暖,冰雪消融', phenomenon: '桃始华、仓庚鸣、鹰乃祭鸟', custom: '打春牛、贴春字、咬春（春饼/萝卜）', knowledge: '太阳到达黄经 315° 时为立春。北半球昼渐长、夜渐短,气温回升,标志春季开始。', sceneKey: 'lateWinter', poem: '东风带雨逐西风,大地阳和暖气生。', food: '春饼、萝卜' },
  { name: '雨水', pinyin: 'Yǔshuǐ', english: 'Rain Water', date: '2月18-20日', angle: -30, month: 2, day1: 18, day2: 20, season: '春', group: 1, climate: '降水增多,寒意未消', phenomenon: '獭祭鱼、鸿雁来、草木萌动', custom: '占稻色、撞拜寄、拉保保', knowledge: '太阳到达黄经 330°。气温回升、降水增多,但乍暖还寒,常有倒春寒。', sceneKey: 'spring', poem: '好雨知时节,当春乃发生。', food: '春笋、龙须饼' },
  { name: '惊蛰', pinyin: 'Jīngzhé', english: 'Awakening of Insects', date: '3月5-7日', angle: -15, month: 3, day1: 5, day2: 7, season: '春', group: 0, climate: '春雷始鸣,气温回升', phenomenon: '桃始华、仓庚鸣、鹰乃祭鸟', custom: '吃梨、祭白虎、打小人', knowledge: '太阳到达黄经 345°。春雷乍动,蛰伏冬眠动物苏醒,万物复苏。', sceneKey: 'spring', poem: '微雨众卉新,一雷惊蛰始。', food: '梨子' },
  { name: '春分', pinyin: 'Chūnfēn', english: 'Spring Equinox', date: '3月20-22日', angle: 0, month: 3, day1: 20, day2: 22, season: '春', group: 1, climate: '昼夜等长,阳光直射赤道', phenomenon: '玄鸟至、雷乃发声、始电', custom: '竖蛋、放风筝、吃春菜', knowledge: '太阳直射赤道,昼夜平分。北半球进入春季,全球昼夜几乎等长。', sceneKey: 'spring', poem: '风雷送暖入中春,稚子逢春耍笑新。', food: '春菜、太阳糕' },
  { name: '清明', pinyin: 'Qīngmíng', english: 'Pure Brightness', date: '4月4-6日', angle: 15, month: 4, day1: 4, day2: 6, season: '春', group: 0, climate: '气清景明,雨纷纷', phenomenon: '桐始华、田鼠化为鴽、虹始见', custom: '扫墓祭祖、踏青郊游、插柳', knowledge: '太阳到达黄经 15°。气候温暖,草木茂盛,也是二十四节气中唯一成为节日的节气。', sceneKey: 'lateSpring', poem: '清明时节雨纷纷,路上行人欲断魂。', food: '青团、清明粑' },
  { name: '谷雨', pinyin: 'Gǔyǔ', english: 'Grain Rain', date: '4月19-21日', angle: 30, month: 4, day1: 19, day2: 21, season: '春', group: 1, climate: '雨生百谷,春雨贵如油', phenomenon: '萍始生、鸣鸠拂其羽、戴胜降于桑', custom: '走谷雨、喝谷雨茶、食香椿', knowledge: '太阳到达黄经 30°。春季降水增多,是农作物播种的关键时期,有"春雨贵如油"之说。', sceneKey: 'lateSpring', poem: '谷雨春光晓,山川黛色青。', food: '香椿、谷雨茶' },
  { name: '立夏', pinyin: 'Lìxià', english: 'Start of Summer', date: '5月5-7日', angle: 45, month: 5, day1: 5, day2: 7, season: '夏', group: 0, climate: '气温显著升高,雷雨增多', phenomenon: '蝼蝈鸣、蚯蚓出、王瓜生', custom: '秤人、斗蛋、尝新、迎夏', knowledge: '太阳到达黄经 45°。标志夏季开始,北半球昼长夜短,正午太阳高度增大。', sceneKey: 'spring', poem: '绿树阴浓夏日长,楼台倒影入池塘。', food: '立夏蛋、立夏饭' },
  { name: '小满', pinyin: 'Xiǎomǎn', english: 'Lesser Fullness', date: '5月20-22日', angle: 60, month: 5, day1: 20, day2: 22, season: '夏', group: 1, climate: '夏熟作物籽粒饱满', phenomenon: '苦菜秀、靡草死、麦秋至', custom: '祭车神、祭蚕、食苦菜', knowledge: '太阳到达黄经 60°。江浙一带"小满动三车",象征丰收将至,但尚未完全成熟。', sceneKey: 'summer', poem: '夜莺啼绿柳,皓月醒长空。', food: '苦菜、麦糕' },
  { name: '芒种', pinyin: 'Mángzhòng', english: 'Grain in Ear', date: '6月5-7日', angle: 75, month: 6, day1: 5, day2: 7, season: '夏', group: 0, climate: '雨量充沛,气温显著升高', phenomenon: '螳螂生、鵙始鸣、反舌无声', custom: '煮梅、安苗、送花神', knowledge: '太阳到达黄经 75°。农事最忙,南方"忙种",北方"忙收",长江中下游进入梅雨季节。', sceneKey: 'summer', poem: '时雨及芒种,四野皆栽秧。', food: '青梅酒、麦仁汤' },
  { name: '夏至', pinyin: 'Xiàzhì', english: 'Summer Solstice', date: '6月21-22日', angle: 90, month: 6, day1: 21, day2: 22, season: '夏', group: 1, climate: '白昼最长,正午太阳高度最高', phenomenon: '鹿角解、蝉始鸣、半夏生', custom: '祭神祀祖、吃面、消夏避伏', knowledge: '太阳直射北回归线(Tropic of Cancer),北半球白昼最长、黑夜最短,正午太阳高度达一年最高。', sceneKey: 'summer', poem: '昼晷已云极,宵漏自此长。', food: '夏至面' },
  { name: '小暑', pinyin: 'Xiǎoshǔ', english: 'Lesser Heat', date: '7月6-8日', angle: 105, month: 7, day1: 6, day2: 8, season: '夏', group: 0, climate: '炎热将至,但未达极点', phenomenon: '温风至、蟋蟀居壁、鹰始挚', custom: '晒伏、吃藕、食新', knowledge: '太阳到达黄经 105°。暑热开始,但还未到最热。华北进入雨季,江淮梅雨结束转入伏旱。', sceneKey: 'summer', poem: '倏忽温风至,因循小暑来。', food: '藕、绿豆芽' },
  { name: '大暑', pinyin: 'Dàshǔ', english: 'Greater Heat', date: '7月22-24日', angle: 120, month: 7, day1: 22, day2: 24, season: '夏', group: 1, climate: '一年中最炎热的时期', phenomenon: '腐草为萤、土润溽暑、大雨时行', custom: '晒伏姜、烧仙草、饮伏茶', knowledge: '太阳到达黄经 120°。此时我国大部分地区进入一年中最热时期,长江流域伏旱突出。', sceneKey: 'lateSummer', poem: '赤日几时过,清风无处寻。', food: '仙草、凉面' },
  { name: '立秋', pinyin: 'Lìqiū', english: 'Start of Autumn', date: '8月7-9日', angle: 135, month: 8, day1: 7, day2: 9, season: '秋', group: 0, climate: '暑热未退,凉风渐起', phenomenon: '凉风至、白露降、寒蝉鸣', custom: '贴秋膘、咬秋、晒秋', knowledge: '太阳到达黄经 135°。标志秋季开始,但暑热未消,有"秋老虎"之称。', sceneKey: 'summer', poem: '自古逢秋悲寂寥,我言秋日胜春朝。', food: '西瓜、肉类' },
  { name: '处暑', pinyin: 'Chǔshǔ', english: 'End of Heat', date: '8月22-24日', angle: 150, month: 8, day1: 22, day2: 24, season: '秋', group: 1, climate: '暑气止,凉秋始', phenomenon: '鹰乃祭鸟、天地始肃、禾乃登', custom: '出游迎秋、放河灯、吃鸭子', knowledge: '太阳到达黄经 150°。"处"为止,暑气至此而止,气温由热转凉。', sceneKey: 'autumn', poem: '离离暑云散,袅袅凉风起。', food: '龙眼、酸梅汤' },
  { name: '白露', pinyin: 'Báilù', english: 'White Dew', date: '9月7-9日', angle: 165, month: 9, day1: 7, day2: 9, season: '秋', group: 0, climate: '天气转凉,昼夜温差大', phenomenon: '鸿雁来、玄鸟归、群鸟养羞', custom: '饮白露茶、吃龙眼、收清露', knowledge: '太阳到达黄经 165°。气温下降,夜间水汽凝结成白色露珠,故名"白露"。', sceneKey: 'autumn', poem: '蒹葭苍苍,白露为霜。', food: '龙眼、白露米酒' },
  { name: '秋分', pinyin: 'Qiūfēn', english: 'Autumn Equinox', date: '9月22-24日', angle: 180, month: 9, day1: 22, day2: 24, season: '秋', group: 1, climate: '昼夜均分,阳光直射赤道', phenomenon: '雷始收声、蛰虫坯户、水始涸', custom: '祭月、竖蛋、吃秋菜', knowledge: '太阳直射赤道,昼夜再次平分。北半球昼短夜长,昼夜温差进一步加大。', sceneKey: 'autumn', poem: '金气秋分,风清露冷秋期半。', food: '秋菜、汤圆' },
  { name: '寒露', pinyin: 'Hánlù', english: 'Cold Dew', date: '10月8-9日', angle: 195, month: 10, day1: 8, day2: 9, season: '秋', group: 0, climate: '露水更冷,将凝结成霜', phenomenon: '鸿雁来宾、雀入大水为蛤、菊有黄华', custom: '登高、赏菊、吃花糕', knowledge: '太阳到达黄经 195°。气温更低,露水有寒意,我国大部分地区进入秋季。', sceneKey: 'lateAutumn', poem: '袅袅凉风动,凄凄寒露零。', food: '花糕、芝麻' },
  { name: '霜降', pinyin: 'Shuāngjiàng', english: "Frost's Descent", date: '10月23-24日', angle: 210, month: 10, day1: 23, day2: 24, season: '秋', group: 1, climate: '初霜出现,天气渐冷', phenomenon: '豺乃祭兽、草木黄落、蛰虫咸俯', custom: '赏菊、吃柿子、登高远眺', knowledge: '太阳到达黄经 210°。秋季最后一个节气,初霜出现,黄河流域进入初冬。', sceneKey: 'lateAutumn', poem: '霜降水返壑,风落木归山。', food: '柿子、栗子' },
  { name: '立冬', pinyin: 'Lìdōng', english: 'Start of Winter', date: '11月7-8日', angle: 225, month: 11, day1: 7, day2: 8, season: '冬', group: 0, climate: '冬季开始,万物收藏', phenomenon: '水始冰、地始冻、雉入大水为蜃', custom: '迎冬、补冬、贺冬', knowledge: '太阳到达黄经 225°。标志冬季开始,北半球昼短夜长,正午太阳高度最低。', sceneKey: 'autumn', poem: '细雨生寒未有霜,庭前木叶半青黄。', food: '饺子、羊肉' },
  { name: '小雪', pinyin: 'Xiǎoxuě', english: 'Lesser Snow', date: '11月22-23日', angle: 240, month: 11, day1: 22, day2: 23, season: '冬', group: 1, climate: '气温下降,北方初雪', phenomenon: '虹藏不见、天气腾地气闭塞、闭塞成冬', custom: '腌腊肉、晒鱼干、吃糍粑', knowledge: '太阳到达黄经 240°。北方地区开始降雪,但雪量不大;南方进入"小雪"腌肉期。', sceneKey: 'winter', poem: '莫怪虹无影,如今小雪时。', food: '腊肉、糍粑' },
  { name: '大雪', pinyin: 'Dàxuě', english: 'Greater Snow', date: '12月6-8日', angle: 255, month: 12, day1: 6, day2: 8, season: '冬', group: 0, climate: '降雪量增大,大地银装', phenomenon: '鹖鴠不鸣、虎始交、荔挺出', custom: '腌肉、进补、观赏封河', knowledge: '太阳到达黄经 255°。降雪可能性大增,我国北方呈现"千里冰封、万里雪飘"景观。', sceneKey: 'winter', poem: '忽如一夜春风来,千树万树梨花开。', food: '红黏粥、羊肉' },
  { name: '冬至', pinyin: 'Dōngzhì', english: 'Winter Solstice', date: '12月21-23日', angle: 270, month: 12, day1: 21, day2: 23, season: '冬', group: 1, climate: '白昼最短,正午太阳高度最低', phenomenon: '蚯蚓结、麋角解、水泉动', custom: '吃饺子、吃汤圆、数九', knowledge: '太阳直射南回归线(Tropic of Capricorn),北半球白昼最短、黑夜最长,正午太阳高度达一年最低。', sceneKey: 'winter', poem: '邯郸驿里逢冬至,抱膝灯前影伴身。', food: '饺子、汤圆' },
  { name: '小寒', pinyin: 'Xiǎohán', english: 'Lesser Cold', date: '1月5-7日', angle: 285, month: 1, day1: 5, day2: 7, season: '冬', group: 0, climate: '开始进入最冷时节', phenomenon: '雁北乡、鹊始巢、雉始雊', custom: '吃腊八粥、写春联、画图数九', knowledge: '太阳到达黄经 285°。标志进入一年中最寒冷时段,但还未到极寒。', sceneKey: 'lateWinter', poem: '小寒大寒,冷成一团。', food: '腊八粥、菜饭' },
  { name: '大寒', pinyin: 'Dàhán', english: 'Greater Cold', date: '1月20-21日', angle: 300, month: 1, day1: 20, day2: 21, season: '冬', group: 1, climate: '一年中最寒冷的时期', phenomenon: '鸡始乳、鸷鸟厉疾、水泽腹坚', custom: '尾牙祭、大扫除、备年货', knowledge: '太阳到达黄经 300°。二十四节气中最后一个,标志一年周期结束,新一轮节气即将开始。', sceneKey: 'lateWinter', poem: '旧雪未及消,新雪又拥户。', food: '八宝饭、年糕' },
]

// ================ 状态 ================
const currentIndex = ref(3) // 默认春分
const isPlaying = ref(false)
const isNightMode = ref(false)
const showDetail = ref(false) // 详情弹窗
const transitioning = ref(false)

const currentTerm = computed(() => solarTerms[currentIndex.value]!)
const seasonList = computed(() => ({
  春: solarTerms.filter((t) => t.season === '春'),
  夏: solarTerms.filter((t) => t.season === '夏'),
  秋: solarTerms.filter((t) => t.season === '秋'),
  冬: solarTerms.filter((t) => t.season === '冬'),
}))

// ================ 季节场景信息 ================
const sceneInfo = computed(() => {
  const k = currentTerm.value.sceneKey
  const map: Record<string, { bg: string; particles: string; emoji: string; label: string; tint: string }> = {
    spring: { bg: 'linear-gradient(180deg, #a8d8ea 0%, #dcedc1 60%, #ffd3b6 100%)', particles: '花瓣·柳絮', emoji: '🌸', label: '春·万物复苏', tint: '#a8d8ea' },
    lateSpring: { bg: 'linear-gradient(180deg, #fff5b8 0%, #c8e6c9 50%, #aed581 100%)', particles: '细雨·春茶', emoji: '🌱', label: '暮春·雨生百谷', tint: '#c8e6c9' },
    summer: { bg: 'linear-gradient(180deg, #81d4fa 0%, #4fc3f7 40%, #0288d1 100%)', particles: '蜻蜓·荷花', emoji: '☀️', label: '夏·烈日当空', tint: '#4fc3f7' },
    lateSummer: { bg: 'linear-gradient(180deg, #ffcc80 0%, #ff8a65 50%, #bf360c 100%)', particles: '萤火·蝉鸣', emoji: '🔥', label: '盛夏·烈日如火', tint: '#ff8a65' },
    autumn: { bg: 'linear-gradient(180deg, #ffe082 0%, #ffb74d 50%, #a1887f 100%)', particles: '落叶·桂花', emoji: '🍂', label: '秋·天高气爽', tint: '#ffb74d' },
    lateAutumn: { bg: 'linear-gradient(180deg, #bcaaa4 0%, #8d6e63 50%, #4e342e 100%)', particles: '霜花·菊花', emoji: '🍁', label: '深秋·霜降时节', tint: '#a1887f' },
    winter: { bg: 'linear-gradient(180deg, #cfd8dc 0%, #90a4ae 50%, #37474f 100%)', particles: '雪花·梅花', emoji: '❄️', label: '冬·银装素裹', tint: '#90a4ae' },
    lateWinter: { bg: 'linear-gradient(180deg, #b3e5fc 0%, #81d4fa 40%, #4fc3f7 100%)', particles: '冰凌·寒梅', emoji: '🌨️', label: '寒冬·万物蛰伏', tint: '#81d4fa' },
  }
  return map[k]!
})

// ================ Three.js 场景 ================
const canvasRef = ref<HTMLCanvasElement>()
const renderer = shallowRef<THREE.WebGLRenderer | null>(null)
const scene3d = shallowRef<THREE.Scene | null>(null)
const camera3d = shallowRef<THREE.PerspectiveCamera | null>(null)
const earthGroup = shallowRef<THREE.Group | null>(null)
let dotMeshes: THREE.Mesh[] = [] // 只存 24 个 dot
let ringMeshes: THREE.Mesh[] = [] // 中气圈
let animationId = 0
let sunLightRef: THREE.PointLight | null = null

function initThree() {
  if (!canvasRef.value) return
  const width = canvasRef.value.clientWidth
  const height = canvasRef.value.clientHeight

  const r = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true, alpha: true })
  r.setSize(width, height)
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.value = r

  const s = new THREE.Scene()
  scene3d.value = s

  const c = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000)
  c.position.set(0, 220, 0)
  c.lookAt(0, 0, 0)
  camera3d.value = c

  // 灯光
  s.add(new THREE.AmbientLight(0xffffff, 0.35))
  const sunLight = new THREE.PointLight(0xfff5d6, 2.2, 0, 1.4)
  sunLight.position.set(0, 0, 0)
  s.add(sunLight)
  sunLightRef = sunLight

  // 太阳
  const sunGeo = new THREE.SphereGeometry(14, 64, 64)
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd54f })
  s.add(new THREE.Mesh(sunGeo, sunMat))

  // 太阳光芒
  const haloGeo = new THREE.RingGeometry(15, 26, 64, 1)
  const haloMat = new THREE.MeshBasicMaterial({ color: 0xffe082, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
  const halo = new THREE.Mesh(haloGeo, haloMat)
  halo.rotation.x = Math.PI / 2
  s.add(halo)

  // 地球组
  const earthG = new THREE.Group()
  const earthGeo = new THREE.SphereGeometry(4.5, 64, 64)
  const earthMat = new THREE.MeshStandardMaterial({ color: 0x4fa3ff, roughness: 0.85, metalness: 0.0, emissive: 0x0a2540, emissiveIntensity: 0.2 })
  earthG.add(new THREE.Mesh(earthGeo, earthMat))

  // 大陆
  const cMat = new THREE.MeshStandardMaterial({ color: 0x66bb6a, roughness: 1 })
  ;[
    { x: 0.5, z: 1, s: 1.5 }, { x: -2.5, z: -0.5, s: 1 }, { x: 1.8, z: -1.5, s: 1.1 }, { x: 3.2, z: -1.8, s: 0.8 }, { x: 3.5, z: 1.8, s: 0.7 },
  ].forEach((p) => {
    const cGeo = new THREE.SphereGeometry(p.s, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2)
    const cMesh = new THREE.Mesh(cGeo, cMat)
    const phi = Math.atan2(p.z, p.x)
    const offset = 4.45
    cMesh.position.set(Math.cos(phi) * offset, 0, Math.sin(phi) * offset)
    cMesh.lookAt(0, 0, 0)
    earthG.add(cMesh)
  })

  // 地轴
  const axisMat = new THREE.MeshBasicMaterial({ color: 0xff5252 })
  const axisGeo = new THREE.CylinderGeometry(0.1, 0.1, 12, 8)
  earthG.add(new THREE.Mesh(axisGeo, axisMat))

  // 自转方向箭头
  const arrowGeo = new THREE.ConeGeometry(0.4, 1.2, 8)
  const arrowMesh = new THREE.Mesh(arrowGeo, axisMat)
  arrowMesh.position.y = 6.5
  earthG.add(arrowMesh)

  // 赤道
  const eqGeo = new THREE.TorusGeometry(4.5, 0.05, 8, 128)
  const eqMat = new THREE.MeshBasicMaterial({ color: 0xffab91, transparent: true, opacity: 0.45 })
  const eq = new THREE.Mesh(eqGeo, eqMat)
  eq.rotation.x = Math.PI / 2
  earthG.add(eq)

  earthG.rotation.z = THREE.MathUtils.degToRad(23.5)
  earthGroup.value = earthG
  s.add(earthG)

  // 轨道
  const orbitRadius = 80
  const orbitGeo = new THREE.RingGeometry(orbitRadius - 0.15, orbitRadius + 0.15, 256, 1)
  const orbitMat = new THREE.MeshBasicMaterial({ color: 0x80cbc4, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
  const orbitMesh = new THREE.Mesh(orbitGeo, orbitMat)
  orbitMesh.rotation.x = -Math.PI / 2
  s.add(orbitMesh)

  // 24 节气标记
  const markGroup = new THREE.Group()
  dotMeshes = []
  ringMeshes = []

  const colorMap: Record<string, number> = { 春: 0x66bb6a, 夏: 0xff7043, 秋: 0xffa726, 冬: 0x42a5f5 }

  solarTerms.forEach((term, idx) => {
    const rad = THREE.MathUtils.degToRad(term.angle - 90)
    const x = Math.cos(rad) * orbitRadius
    const z = Math.sin(rad) * orbitRadius
    const baseColor = colorMap[term.season]!

    const dotGeo = new THREE.SphereGeometry(1.2, 16, 16)
    const dotMat = new THREE.MeshBasicMaterial({ color: baseColor })
    const dot = new THREE.Mesh(dotGeo, dotMat)
    dot.position.set(x, 0.5, z)
    dot.userData.termIndex = idx
    markGroup.add(dot)
    dotMeshes.push(dot)

    // 中气标记环
    if (term.group === 1) {
      const ringGeo = new THREE.RingGeometry(1.6, 2.2, 32, 1)
      const ringMat = new THREE.MeshBasicMaterial({ color: baseColor, transparent: true, opacity: 0.6, side: THREE.DoubleSide })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.position.set(x, 0.5, z)
      ring.rotation.x = -Math.PI / 2
      ring.userData.termIndex = idx
      markGroup.add(ring)
      ringMeshes.push(ring)
    }
  })
  s.add(markGroup)

  // 季节背景环
  ;[
    { color: 0x81c784, start: 0, end: 90 },
    { color: 0xff8a65, start: 90, end: 180 },
    { color: 0xffb74d, start: 180, end: 270 },
    { color: 0x64b5f6, start: 270, end: 360 },
  ].forEach((seg) => {
    const segGeo = new THREE.RingGeometry(orbitRadius + 4, orbitRadius + 7, 64, 1, THREE.MathUtils.degToRad(seg.start), THREE.MathUtils.degToRad(seg.end - seg.start))
    const segMat = new THREE.MeshBasicMaterial({ color: seg.color, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    const segMesh = new THREE.Mesh(segGeo, segMat)
    segMesh.rotation.x = -Math.PI / 2
    s.add(segMesh)
  })

  // 鼠标交互
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2()
  let hoveredDotIdx = -1

  function pickTerm(clientX: number, clientY: number): number {
    if (!canvasRef.value || !camera3d.value) return -1
    const rect = canvasRef.value.getBoundingClientRect()
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera3d.value)
    const intersects = raycaster.intersectObjects([...dotMeshes, ...ringMeshes], false)
    if (intersects.length > 0) {
      return (intersects[0]!.object.userData.termIndex as number) ?? -1
    }
    return -1
  }

  canvasRef.value.addEventListener('mousemove', (e) => {
    const idx = pickTerm(e.clientX, e.clientY)
    if (idx !== hoveredDotIdx) {
      // 还原旧的高亮
      if (hoveredDotIdx !== -1) {
        const dm = dotMeshes[hoveredDotIdx]
        if (dm) {
          const baseColor = colorMap[solarTerms[hoveredDotIdx]!.season]!
          ;(dm.material as THREE.MeshBasicMaterial).color.setHex(baseColor)
        }
      }
      if (idx !== -1) {
        const dm = dotMeshes[idx]
        if (dm) (dm.material as THREE.MeshBasicMaterial).color.setHex(0xffeb3b)
        canvasRef.value!.style.cursor = 'pointer'
      } else {
        canvasRef.value!.style.cursor = 'default'
      }
      hoveredDotIdx = idx
    }
  })

  canvasRef.value.addEventListener('click', (e) => {
    const idx = pickTerm(e.clientX, e.clientY)
    if (idx !== -1) selectIndex(idx)
  })

  animate()
}

function animate() {
  animationId = requestAnimationFrame(animate)
  if (!renderer.value || !scene3d.value || !camera3d.value || !earthGroup.value) return

  // 自动播放
  if (isPlaying.value) {
    const nextIdx = (currentIndex.value + 1) % 24
    // 每 2 秒切换一个节气
    if (!animate._lastSwitch || Date.now() - animate._lastSwitch > 2000) {
      currentIndex.value = nextIdx
      animate._lastSwitch = Date.now()
    }
  }

  // 地球位置
  const curAngle = currentTerm.value.angle
  const rad = THREE.MathUtils.degToRad(curAngle - 90)
  const orbitRadius = 80
  const targetX = Math.cos(rad) * orbitRadius
  const targetZ = Math.sin(rad) * orbitRadius
  earthGroup.value.position.x += (targetX - earthGroup.value.position.x) * 0.12
  earthGroup.value.position.z += (targetZ - earthGroup.value.position.z) * 0.12
  earthGroup.value.position.y = 0

  // 地球自转
  earthGroup.value.rotation.y += 0.01

  // 夜昼模式
  if (sunLightRef) {
    sunLightRef.intensity = isNightMode.value ? 0.8 : 2.2
  }

  // 高亮当前节气
  const colorMap: Record<string, number> = { 春: 0x66bb6a, 夏: 0xff7043, 秋: 0xffa726, 冬: 0x42a5f5 }
  dotMeshes.forEach((dot, i) => {
    const mat = dot.material as THREE.MeshBasicMaterial
    const baseColor = colorMap[solarTerms[i]!.season]!
    if (i === currentIndex.value) {
      mat.color.setHex(0xffeb3b)
      dot.scale.setScalar(1.6)
    } else {
      mat.color.setHex(baseColor)
      dot.scale.setScalar(1)
    }
  })

  renderer.value.render(scene3d.value, camera3d.value)
}
animate._lastSwitch = 0

function onResize() {
  if (!canvasRef.value || !renderer.value || !camera3d.value) return
  const w = canvasRef.value.clientWidth
  const h = canvasRef.value.clientHeight
  renderer.value.setSize(w, h)
  camera3d.value.aspect = w / h
  camera3d.value.updateProjectionMatrix()
}

function selectIndex(i: number) {
  if (i < 0 || i >= solarTerms.length || i === currentIndex.value) return
  transitioning.value = true
  currentIndex.value = i
  setTimeout(() => { transitioning.value = false }, 600)
}

function togglePlay() {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) animate._lastSwitch = Date.now()
}

function nextTerm() {
  if (isPlaying.value) isPlaying.value = false
  selectIndex((currentIndex.value + 1) % 24)
}

function prevTerm() {
  if (isPlaying.value) isPlaying.value = false
  selectIndex((currentIndex.value - 1 + 24) % 24)
}

function jumpToSeason(season: '春' | '夏' | '秋' | '冬') {
  if (isPlaying.value) isPlaying.value = false
  const idx = solarTerms.findIndex((t) => t.season === season)
  if (idx !== -1) selectIndex(idx)
}

function openDetail() {
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
}

// ================ 粒子动画 ================
interface Particle { id: number; left: number; delay: number; duration: number; size: number; drift: number; type: 'flower' | 'leaf' | 'snow' | 'rain' | 'firefly' }
const particles = ref<Particle[]>([])
function rebuildParticles() {
  const types: Record<string, Particle['type']> = {
    spring: 'flower', lateSpring: 'rain',
    summer: 'flower', lateSummer: 'firefly',
    autumn: 'leaf', lateAutumn: 'leaf',
    winter: 'snow', lateWinter: 'snow',
  }
  const type = types[currentTerm.value.sceneKey] ?? 'flower'
  particles.value = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 8,
    duration: 8 + Math.random() * 8,
    size: 6 + Math.random() * 10,
    drift: (Math.random() - 0.5) * 200,
    type,
  }))
}

watch(currentIndex, () => { rebuildParticles() })

// ================ 生命周期 ================
onMounted(() => {
  initThree()
  rebuildParticles()
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
  if (renderer.value) { renderer.value.dispose(); renderer.value = null }
})

const ringItems = computed(() => solarTerms.map((t, i) => ({ ...t, index: i })))

// 黄经计算
function getEclipticLongitude(angle: number): number {
  return ((angle + 90 + 360) % 360)
}
</script>

<template>
  <div class="solar-terms-page" :class="{ night: isNightMode }">
    <!-- 背景 -->
    <div class="scene-bg" :style="{ background: sceneInfo.bg }">
      <div class="particles-layer">
        <span v-for="p in particles" :key="p.id" class="particle" :class="['particle-' + p.type]"
          :style="{ left: p.left + '%', animationDelay: p.delay + 's', animationDuration: p.duration + 's', width: p.size + 'px', height: p.size + 'px', '--drift': p.drift + 'px' }">
          <template v-if="p.type === 'flower'">❀</template>
          <template v-else-if="p.type === 'leaf'">🍂</template>
          <template v-else-if="p.type === 'snow'">❄</template>
          <template v-else-if="p.type === 'rain'">•</template>
          <template v-else-if="p.type === 'firefly'">✦</template>
        </span>
      </div>
      <div class="scene-label">
        <span class="scene-emoji">{{ sceneInfo.emoji }}</span>
        <span class="scene-title">{{ sceneInfo.label }}</span>
      </div>
    </div>

    <!-- 顶部：标题 + 四季成因图 -->
    <header class="top-section">
      <div class="header-bar">
        <div class="brand">
          <span class="brand-icon">☯</span>
          <div class="brand-text">
            <div class="brand-title">二十四节气 · 地理动态交互</div>
            <div class="brand-sub">高中地理 · 必修一 · 地球运动与气候</div>
          </div>
        </div>
        <div class="header-right">
          <button class="ctrl-btn" :class="{ active: isNightMode }" @click="isNightMode = !isNightMode">
            <span>{{ isNightMode ? '🌞' : '🌗' }}</span>{{ isNightMode ? '白天' : '夜昼' }}
          </button>
          <button class="ctrl-btn play-btn" :class="{ playing: isPlaying }" @click="togglePlay">
            <span>{{ isPlaying ? '⏸' : '▶' }}</span>{{ isPlaying ? '暂停' : '公转演示' }}
          </button>
          <button class="ctrl-btn" @click="prevTerm">‹ 上一节气</button>
          <button class="ctrl-btn" @click="nextTerm">下一节气 ›</button>
        </div>
      </div>
      <!-- 四季成因示意图（置顶） -->
      <div class="top-diagram">
        <div class="td-title">📐 四季成因示意图（北半球）— 地球公转与太阳直射点移动</div>
        <svg viewBox="0 0 900 160" class="td-canvas">
          <circle cx="450" cy="80" r="18" fill="#ffd54f" />
          <text x="450" y="84" text-anchor="middle" class="td-sun-label">太阳</text>
          <ellipse cx="450" cy="80" rx="320" ry="30" stroke="#80cbc4" stroke-width="1" fill="none" stroke-dasharray="4 4" opacity="0.6" />
          <g v-for="(t, i) in [
            { x: 130, name: '春分', label: '直射赤道', tilt: '正对' },
            { x: 290, name: '夏至', label: '直射北回归线', tilt: '北倾向日' },
            { x: 610, name: '秋分', label: '直射赤道', tilt: '正对' },
            { x: 770, name: '冬至', label: '直射南回归线', tilt: '南倾向日' },
          ]" :key="i">
            <circle :cx="t.x" cy="80" r="12" fill="#4fa3ff" stroke="#fff" stroke-width="1.5" />
            <line :x1="t.x - 5" :y1="72" :x2="t.x + 5" :y2="88" stroke="#ff5252" stroke-width="1.5"
                  :transform="i % 2 === 1 ? `rotate(20, ${t.x}, 80)` : `rotate(-20, ${t.x}, 80)`" />
            <text :x="t.x" y="108" text-anchor="middle" class="td-point-name">{{ t.name }}</text>
            <text :x="t.x" y="124" text-anchor="middle" class="td-point-info">{{ t.label }}</text>
            <text :x="t.x" y="140" text-anchor="middle" class="td-point-tilt">{{ t.tilt }}</text>
          </g>
          <g v-for="i in 8" :key="i">
            <line :x1="450 - 24 + (i - 1) * 6" :y1="80" :x2="450 - 24 + (i - 1) * 6" :y2="140" stroke="#ffd54f" stroke-width="0.6" opacity="0.5" />
          </g>
        </svg>
      </div>
    </header>

    <main class="main-grid">
      <!-- 左侧：节气列表 -->
      <section class="left-list-panel">
        <div class="season-list-card">
          <div class="sl-title">节气列表</div>
          <div v-for="(seas, key) in seasonList" :key="key" class="season-group">
            <div class="sg-header" :class="'sg-' + key" @click="jumpToSeason(key as any)">
              <span>{{ key }}季</span>
              <span class="sg-count">{{ seas.length }}</span>
            </div>
            <div class="sg-list">
              <button v-for="t in seas" :key="t.name" class="sg-item"
                :class="{ active: currentTerm.name === t.name }"
                @click="selectIndex(solarTerms.findIndex(s => s.name === t.name))">
                <span class="sg-name">{{ t.name }}</span>
                <span class="sg-date">{{ t.date }}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- 右侧：3D + 圆环 + 场景 上下排列 -->
      <section class="right-content">
        <!-- 3D 公转 -->
        <div class="stage-frame">
          <canvas ref="canvasRef" class="three-canvas"></canvas>

          <!-- 浮动信息卡 -->
          <div class="floating-card" :class="{ 'card-enter': transitioning }">
            <div class="card-season-tag" :class="'tag-' + currentTerm.season">{{ currentTerm.season }}季 · 节气</div>
            <div class="card-name">{{ currentTerm.name }}</div>
            <div class="card-pinyin">{{ currentTerm.pinyin }} · {{ currentTerm.english }}</div>
            <div class="card-date">{{ currentTerm.date }}</div>
            <div class="card-divider"></div>
            <div class="card-row"><span class="row-label">气候</span><span class="row-value">{{ currentTerm.climate }}</span></div>
            <div class="card-row"><span class="row-label">物候</span><span class="row-value">{{ currentTerm.phenomenon }}</span></div>
            <button class="card-more-btn" @click="openDetail">查看详情 →</button>
          </div>

          <!-- 位姿图示 -->
          <div class="position-hint">
            <div class="hint-row"><span class="dot" :class="'dot-' + currentTerm.season"></span>当前：<b>{{ currentTerm.name }}</b></div>
            <div class="hint-row sub">轨道角：{{ currentTerm.angle }}° ｜ 黄经：{{ getEclipticLongitude(currentTerm.angle) }}°</div>
          </div>
        </div>

        <!-- 场景还原 -->
        <div class="season-illustration">
          <div class="si-grid">
            <div class="si-card si-spring" :class="{ 'si-active': currentTerm.season === '春' }" @click="jumpToSeason('春')">
              <div class="si-emoji">🌸</div>
              <div class="si-text">春 · 桃始华</div>
            </div>
            <div class="si-card si-summer" :class="{ 'si-active': currentTerm.season === '夏' }" @click="jumpToSeason('夏')">
              <div class="si-emoji">🌾</div>
              <div class="si-text">夏 · 麦秋至</div>
            </div>
            <div class="si-card si-autumn" :class="{ 'si-active': currentTerm.season === '秋' }" @click="jumpToSeason('秋')">
              <div class="si-emoji">🍁</div>
              <div class="si-text">秋 · 草木黄落</div>
            </div>
            <div class="si-card si-winter" :class="{ 'si-active': currentTerm.season === '冬' }" @click="jumpToSeason('冬')">
              <div class="si-emoji">❄️</div>
              <div class="si-text">冬 · 水始冰</div>
            </div>
          </div>
        </div>

        <!-- 圆环 + 详情 -->
        <div class="ring-card">
          <div class="ring-title">24 节气时间轴（点击跳转）</div>
          <div class="ring-wrapper">
            <div class="ring-svg-area">
              <svg viewBox="-120 -120 240 240" class="ring-svg">
                <g>
                  <path d="M 0 -100 A 100 100 0 0 1 100 0" stroke="#81c784" stroke-width="14" fill="none" stroke-opacity="0.35" />
                  <path d="M 100 0 A 100 100 0 0 1 0 100" stroke="#ff8a65" stroke-width="14" fill="none" stroke-opacity="0.35" />
                  <path d="M 0 100 A 100 100 0 0 1 -100 0" stroke="#ffb74d" stroke-width="14" fill="none" stroke-opacity="0.35" />
                  <path d="M -100 0 A 100 100 0 0 1 0 -100" stroke="#64b5f6" stroke-width="14" fill="none" stroke-opacity="0.35" />
                </g>
                <g v-for="(t, i) in ringItems" :key="t.name" class="ring-item-group" @click="selectIndex(i)">
                  <circle :cx="100 * Math.cos((t.angle - 90) * Math.PI / 180)"
                          :cy="100 * Math.sin((t.angle - 90) * Math.PI / 180)"
                          :r="i === currentIndex ? 6 : t.group === 1 ? 4.5 : 3.5"
                          :class="['ring-dot', 'dot-' + t.season, { active: i === currentIndex, main: t.group === 1 }]"
                          :stroke="i === currentIndex ? '#fff' : 'none'"
                          :stroke-width="i === currentIndex ? 2 : 0">
                  </circle>
                  <text :x="(100 + 16) * Math.cos((t.angle - 90) * Math.PI / 180)"
                        :y="(100 + 16) * Math.sin((t.angle - 90) * Math.PI / 180)"
                        text-anchor="middle" dominant-baseline="middle"
                        :class="['ring-label', { active: i === currentIndex }]"
                        @click="selectIndex(i)">
                    {{ t.name }}
                  </text>
                </g>
                <circle r="14" fill="#ffd54f" />
                <text y="4" text-anchor="middle" dominant-baseline="middle" class="center-label">太阳</text>
              </svg>
            </div>

            <!-- 当前节气详情 -->
            <div class="term-detail" :class="{ 'detail-enter': transitioning }">
              <div class="detail-header">
                <span class="detail-season" :class="'season-' + currentTerm.season">{{ currentTerm.season }}季</span>
                <span class="detail-date">{{ currentTerm.date }}</span>
                <span class="detail-group">{{ currentTerm.group === 1 ? '中气' : '节气' }}</span>
              </div>
              <h2 class="detail-name">{{ currentTerm.name }}</h2>
              <div class="detail-pinyin">{{ currentTerm.pinyin }} · {{ currentTerm.english }}</div>

              <div class="knowledge-block">
                <div class="kb-title">📚 中高考地理知识点</div>
                <div class="kb-content">{{ currentTerm.knowledge }}</div>
              </div>

              <div class="custom-block" v-if="currentTerm.poem">
                <div class="kb-title">📜 节气诗句</div>
                <div class="poem-line">{{ currentTerm.poem }}</div>
              </div>

              <div class="folk-block">
                <div class="kb-title">🎎 传统民俗</div>
                <div class="folk-content">
                  <div class="folk-row"><span class="folk-icon">🎉</span><b>习俗：</b>{{ currentTerm.custom }}</div>
                  <div class="folk-row" v-if="currentTerm.food"><span class="folk-icon">🍜</span><b>食俗：</b>{{ currentTerm.food }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- 详情弹窗 -->
    <Teleport to="body">
      <div v-if="showDetail" class="detail-overlay" @click.self="closeDetail">
        <div class="detail-modal" :class="'modal-' + currentTerm.sceneKey">
          <button class="modal-close" @click="closeDetail">✕</button>
          <div class="modal-header">
            <span class="modal-season-tag" :class="'tag-' + currentTerm.season">{{ currentTerm.season }}季</span>
            <h2 class="modal-name">{{ currentTerm.name }}</h2>
            <div class="modal-pinyin">{{ currentTerm.pinyin }} · {{ currentTerm.english }}</div>
            <div class="modal-date">{{ currentTerm.date }}</div>
          </div>
          <div class="modal-body">
            <div class="modal-section">
              <div class="ms-title">🌍 气候特点</div>
              <div class="ms-text">{{ currentTerm.climate }}</div>
            </div>
            <div class="modal-section">
              <div class="ms-title">🌱 物候</div>
              <div class="ms-text">{{ currentTerm.phenomenon }}</div>
            </div>
            <div class="modal-section">
              <div class="ms-title">📚 中高考地理知识点</div>
              <div class="ms-text highlight">{{ currentTerm.knowledge }}</div>
            </div>
            <div class="modal-section" v-if="currentTerm.poem">
              <div class="ms-title">📜 节气诗句</div>
              <div class="ms-poem">{{ currentTerm.poem }}</div>
            </div>
            <div class="modal-section">
              <div class="ms-title">🎎 传统民俗</div>
              <div class="ms-text">
                <div>🎉 习俗：{{ currentTerm.custom }}</div>
                <div v-if="currentTerm.food">🍜 食俗：{{ currentTerm.food }}</div>
              </div>
            </div>
            <div class="modal-section">
              <div class="ms-title">📐 轨道数据</div>
              <div class="ms-text">
                轨道角：{{ currentTerm.angle }}° ｜ 黄经：{{ getEclipticLongitude(currentTerm.angle) }}° ｜ {{ currentTerm.group === 1 ? '中气' : '节气' }}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="modal-nav-btn" @click="selectIndex((currentIndex - 1 + 24) % 24); showDetail = true">← 上一节气</button>
            <button class="modal-nav-btn primary" @click="selectIndex((currentIndex + 1) % 24); showDetail = true">下一节气 →</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.solar-terms-page {
  --theme-primary: #2ec4b6;
  --theme-secondary: #247cff;
  --theme-accent: #ff8a65;
  position: relative;
  min-height: 100vh;
  width: 100%;
  color: #f3f6fa;
  overflow-x: hidden;
  font-family: 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
}

/* 背景 */
.scene-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  transition: background 2s ease;
  overflow: hidden;
}
.scene-label {
  position: absolute;
  bottom: 28px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  background: rgba(8, 12, 28, 0.55);
  backdrop-filter: blur(14px);
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  font-size: 16px;
}
.scene-emoji { font-size: 22px; }
.scene-title { letter-spacing: 1px; }

.particles-layer { position: absolute; inset: 0; pointer-events: none; }
.particle {
  position: absolute;
  top: -20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.85);
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.4);
  font-size: inherit;
  animation-name: particleFall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}
.particle-flower { color: #ffb3c1; }
.particle-leaf { color: #ff8a65; }
.particle-snow { color: #fff; font-size: 1.1em; }
.particle-rain { color: rgba(180, 220, 255, 0.85); font-size: 1.4em; }
.particle-firefly { color: #fff59d; text-shadow: 0 0 12px #ffeb3b, 0 0 18px #fff176; }

@keyframes particleFall {
  0% { transform: translate(0, -20px) rotate(0deg); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: translate(var(--drift, 0), 110vh) rotate(360deg); opacity: 0; }
}

/* 顶部 */
.top-section {
  position: relative;
  z-index: 20;
  background: linear-gradient(180deg, rgba(8, 12, 28, 0.9) 0%, rgba(8, 12, 28, 0.0) 100%);
}
.header-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 24px;
  backdrop-filter: blur(6px);
}
.brand { display: flex; align-items: center; gap: 14px; }
.brand-icon {
  font-size: 32px;
  color: var(--theme-primary);
  background: radial-gradient(circle at 30% 30%, rgba(46, 196, 182, 0.4), rgba(8, 12, 28, 0.7));
  width: 52px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: 1px solid rgba(46, 196, 182, 0.4);
}
.brand-title { font-size: 20px; font-weight: 700; letter-spacing: 1px; }
.brand-sub { font-size: 12px; color: rgba(255, 255, 255, 0.6); }
.header-right { display: flex; gap: 10px; flex-wrap: wrap; }
.ctrl-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #fff;
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.25s;
  user-select: none;
}
.ctrl-btn:hover { background: rgba(46, 196, 182, 0.18); border-color: var(--theme-primary); transform: translateY(-1px); }
.ctrl-btn:active { transform: scale(0.96); }
.ctrl-btn.active, .ctrl-btn.play-btn.playing {
  background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
  border-color: transparent;
  box-shadow: 0 4px 16px rgba(46, 196, 182, 0.45);
}

/* 主体 */
.main-grid {
  position: relative;
  z-index: 10;
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 12px;
  padding: 10px 24px 8px;
  height: calc(100vh - 180px);
}

/* 左侧节气列表 */
.left-list-panel {
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(46, 196, 182, 0.3) transparent;
}
.left-list-panel::-webkit-scrollbar { width: 4px; }
.left-list-panel::-webkit-scrollbar-thumb { background: rgba(46, 196, 182, 0.3); border-radius: 2px; }

/* 右侧内容区 */
.right-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(46, 196, 182, 0.3) transparent;
}
.right-content::-webkit-scrollbar { width: 4px; }
.right-content::-webkit-scrollbar-thumb { background: rgba(46, 196, 182, 0.3); border-radius: 2px; }

/* 顶部四季成因图 */
.top-diagram {
  padding: 8px 24px 10px;
  background: rgba(8, 12, 28, 0.78);
  border-top: 1px solid rgba(46, 196, 182, 0.22);
  border-bottom: 1px solid rgba(46, 196, 182, 0.22);
  backdrop-filter: blur(10px);
}
.td-title { font-size: 13px; font-weight: 700; color: var(--theme-primary); margin-bottom: 4px; }
.td-canvas { width: 100%; height: auto; max-height: 160px; display: block; }
.td-sun-label { font-size: 10px; fill: #fff; font-weight: 700; }
.td-point-name { font-size: 12px; fill: #fff; font-weight: 700; }
.td-point-info { font-size: 10px; fill: var(--theme-primary); }
.td-point-tilt { font-size: 9px; fill: rgba(255, 255, 255, 0.55); }

/* 左侧 3D */
.stage-frame {
  position: relative;
  height: 340px;
  flex-shrink: 0;
  border-radius: 14px;
  overflow: hidden;
  background: radial-gradient(circle at 50% 60%, rgba(46, 196, 182, 0.06), rgba(8, 12, 28, 0.92) 70%);
  border: 1px solid rgba(46, 196, 182, 0.28);
  box-shadow: inset 0 0 80px rgba(46, 196, 182, 0.15);
}
.three-canvas { width: 100%; height: 100%; display: block; }

.floating-card {
  position: absolute;
  top: 14px;
  left: 14px;
  padding: 14px 18px;
  width: 240px;
  background: rgba(8, 12, 28, 0.88);
  backdrop-filter: blur(14px);
  border-radius: 14px;
  border: 1px solid rgba(46, 196, 182, 0.35);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  transition: transform 0.5s ease, opacity 0.5s ease;
  z-index: 5;
}
.floating-card.card-enter {
  animation: cardSlideIn 0.5s ease;
}
@keyframes cardSlideIn {
  from { transform: translateY(-12px); opacity: 0.5; }
  to { transform: translateY(0); opacity: 1; }
}
.card-season-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 11px;
  letter-spacing: 1px;
  margin-bottom: 6px;
}
.tag-春 { background: rgba(102, 187, 106, 0.25); color: #81c784; border: 1px solid #66bb6a; }
.tag-夏 { background: rgba(255, 138, 101, 0.25); color: #ffab91; border: 1px solid #ff8a65; }
.tag-秋 { background: rgba(255, 167, 38, 0.25); color: #ffcc80; border: 1px solid #ffa726; }
.tag-冬 { background: rgba(100, 181, 246, 0.25); color: #90caf9; border: 1px solid #64b5f6; }
.card-name { font-size: 26px; font-weight: 800; color: #fff; }
.card-pinyin { font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-top: 2px; }
.card-date { font-size: 12px; color: var(--theme-primary); margin-top: 6px; }
.card-divider { height: 1px; background: rgba(255, 255, 255, 0.12); margin: 10px 0; }
.card-row { display: flex; gap: 8px; font-size: 12px; line-height: 1.6; }
.row-label { flex: 0 0 40px; color: rgba(255, 255, 255, 0.55); }
.row-value { flex: 1; color: rgba(255, 255, 255, 0.92); }
.card-more-btn {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 6px 0;
  background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.card-more-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(46, 196, 182, 0.4); }
.card-more-btn:active { transform: scale(0.97); }

.position-hint {
  position: absolute;
  bottom: 12px;
  left: 14px;
  padding: 8px 12px;
  background: rgba(8, 12, 28, 0.7);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-size: 12px;
  z-index: 5;
}
.hint-row { color: #fff; }
.hint-row b { color: var(--theme-primary); margin-left: 4px; }
.hint-row.sub { color: rgba(255, 255, 255, 0.55); margin-top: 4px; font-size: 11px; }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
.dot-春 { background: #66bb6a; }
.dot-夏 { background: #ff7043; }
.dot-秋 { background: #ffa726; }
.dot-冬 { background: #42a5f5; }

/* 场景还原 */
.season-illustration {
  background: rgba(8, 12, 28, 0.78);
  border: 1px solid rgba(46, 196, 182, 0.22);
  border-radius: 14px;
  padding: 10px;
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}
.si-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.ring-card {
  background: rgba(8, 12, 28, 0.78);
  border: 1px solid rgba(46, 196, 182, 0.22);
  border-radius: 14px;
  padding: 12px;
  backdrop-filter: blur(10px);
}
.ring-title { font-size: 14px; font-weight: 700; color: var(--theme-primary); margin-bottom: 8px; }
.ring-wrapper { display: grid; grid-template-columns: 0.85fr 1.15fr; gap: 12px; align-items: start; }
.ring-svg-area {
  display: flex;
  justify-content: center;
  align-items: center;
  background: radial-gradient(circle at 50% 50%, rgba(46, 196, 182, 0.06), rgba(8, 12, 28, 0.5));
  border-radius: 12px;
  padding: 6px;
}
.ring-svg { width: 100%; max-width: 320px; height: auto; }
.ring-item-group { cursor: pointer; }
.ring-item-group:hover .ring-dot { filter: brightness(1.4); }
.ring-dot { cursor: pointer; transition: all 0.2s; }
.ring-dot.dot-春 { fill: #66bb6a; }
.ring-dot.dot-夏 { fill: #ff7043; }
.ring-dot.dot-秋 { fill: #ffa726; }
.ring-dot.dot-冬 { fill: #42a5f5; }
.ring-dot.active { fill: #ffeb3b; }
.ring-label {
  font-size: 8px;
  fill: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: all 0.2s;
}
.ring-label.active { fill: #fff; font-weight: 700; font-size: 10px; }
.center-label { font-size: 9px; fill: #fff; font-weight: 700; }

.term-detail {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.4s ease;
}
.term-detail.detail-enter {
  animation: detailFadeIn 0.5s ease;
}
@keyframes detailFadeIn {
  from { opacity: 0.5; transform: translateX(8px); }
  to { opacity: 1; transform: translateX(0); }
}
.detail-header { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.detail-season { padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
.season-春 { background: rgba(102, 187, 106, 0.25); color: #81c784; }
.season-夏 { background: rgba(255, 138, 101, 0.25); color: #ffab91; }
.season-秋 { background: rgba(255, 167, 38, 0.25); color: #ffcc80; }
.season-冬 { background: rgba(100, 181, 246, 0.25); color: #90caf9; }
.detail-date { font-size: 12px; color: rgba(255, 255, 255, 0.65); }
.detail-group { padding: 2px 8px; background: rgba(46, 196, 182, 0.15); color: var(--theme-primary); border-radius: 4px; font-size: 11px; }
.detail-name { font-size: 26px; font-weight: 800; margin: 4px 0 0; color: #fff; }
.detail-pinyin { font-size: 12px; color: rgba(255, 255, 255, 0.6); margin-bottom: 12px; }
.knowledge-block, .custom-block, .folk-block { margin-top: 8px; }
.kb-title { font-size: 12px; color: var(--theme-primary); font-weight: 700; margin-bottom: 4px; letter-spacing: 1px; }
.kb-content { font-size: 13px; line-height: 1.7; color: rgba(255, 255, 255, 0.9); }
.poem-line { font-size: 14px; font-style: italic; color: #ffe082; padding-left: 8px; border-left: 2px solid var(--theme-primary); }
.folk-row { font-size: 13px; line-height: 1.7; color: rgba(255, 255, 255, 0.9); }
.folk-icon { display: inline-block; width: 18px; }
.folk-row b { color: var(--theme-primary); margin-right: 4px; }

/* 右侧 */
.season-list-card {
  background: rgba(8, 12, 28, 0.78);
  border: 1px solid rgba(46, 196, 182, 0.22);
  border-radius: 14px;
  padding: 10px;
  backdrop-filter: blur(10px);
}
.sl-title { font-size: 14px; font-weight: 700; color: var(--theme-primary); margin-bottom: 8px; text-align: center; }
.season-group { margin-bottom: 6px; }
.sg-header { display: flex; justify-content: space-between; font-size: 12px; padding: 4px 8px; border-radius: 6px; margin-bottom: 4px; cursor: pointer; transition: all 0.2s; }
.sg-header:hover { filter: brightness(1.3); }
.sg-春 { background: rgba(102, 187, 106, 0.15); color: #81c784; }
.sg-夏 { background: rgba(255, 138, 101, 0.15); color: #ffab91; }
.sg-秋 { background: rgba(255, 167, 38, 0.15); color: #ffcc80; }
.sg-冬 { background: rgba(100, 181, 246, 0.15); color: #90caf9; }
.sg-count { color: rgba(255, 255, 255, 0.5); }
.sg-list { display: flex; flex-direction: column; gap: 3px; }
.sg-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.85);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  text-align: left;
}
.sg-item:hover { background: rgba(46, 196, 182, 0.12); transform: translateY(-1px); }
.sg-item:active { transform: scale(0.96); }
.sg-item.active {
  background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
  border-color: transparent;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(46, 196, 182, 0.3);
}
.sg-name { font-weight: 600; }
.sg-date { color: rgba(255, 255, 255, 0.55); font-size: 10px; }

.si-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 6px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.25s;
  user-select: none;
}
.si-card:hover { transform: translateY(-3px); background: rgba(255, 255, 255, 0.1); }
.si-card:active { transform: scale(0.95); }
.si-card.si-spring { border-color: rgba(102, 187, 106, 0.35); }
.si-card.si-summer { border-color: rgba(255, 138, 101, 0.35); }
.si-card.si-autumn { border-color: rgba(255, 167, 38, 0.35); }
.si-card.si-winter { border-color: rgba(100, 181, 246, 0.35); }
.si-card.si-active {
  background: rgba(46, 196, 182, 0.12);
  box-shadow: 0 0 16px rgba(46, 196, 182, 0.2);
  transform: scale(1.05);
}
.si-emoji { font-size: 28px; }
.si-text { font-size: 12px; color: #fff; margin-top: 4px; }

/* 详情弹窗 */
.detail-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(6px);
  animation: overlayIn 0.3s ease;
}
@keyframes overlayIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.detail-modal {
  position: relative;
  width: 520px;
  max-width: 92vw;
  max-height: 85vh;
  overflow-y: auto;
  background: rgba(12, 20, 38, 0.96);
  border: 1px solid rgba(46, 196, 182, 0.35);
  border-radius: 20px;
  padding: 28px 24px 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: modalIn 0.35s ease;
}
@keyframes modalIn {
  from { transform: translateY(30px) scale(0.95); opacity: 0; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}
.modal-close {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.modal-close:hover { background: rgba(255, 82, 82, 0.3); border-color: #ff5252; }
.modal-header { text-align: center; margin-bottom: 16px; }
.modal-season-tag {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 6px;
  font-size: 12px;
  letter-spacing: 1px;
}
.modal-name { font-size: 36px; font-weight: 800; color: #fff; margin: 8px 0 0; }
.modal-pinyin { font-size: 13px; color: rgba(255, 255, 255, 0.6); }
.modal-date { font-size: 13px; color: var(--theme-primary); margin-top: 4px; }
.modal-body { display: flex; flex-direction: column; gap: 14px; }
.modal-section { padding: 10px 14px; background: rgba(255, 255, 255, 0.04); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.06); }
.ms-title { font-size: 13px; color: var(--theme-primary); font-weight: 700; margin-bottom: 6px; }
.ms-text { font-size: 13px; line-height: 1.7; color: rgba(255, 255, 255, 0.9); }
.ms-text.highlight { color: #ffe082; font-weight: 600; }
.ms-poem { font-size: 15px; font-style: italic; color: #ffe082; padding-left: 10px; border-left: 3px solid var(--theme-primary); line-height: 1.8; }
.modal-footer { display: flex; gap: 12px; margin-top: 18px; }
.modal-nav-btn {
  flex: 1;
  padding: 10px 0;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.modal-nav-btn:hover { background: rgba(46, 196, 182, 0.15); border-color: var(--theme-primary); }
.modal-nav-btn:active { transform: scale(0.97); }
.modal-nav-btn.primary {
  background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
  border-color: transparent;
  font-weight: 600;
}
.modal-nav-btn.primary:hover { box-shadow: 0 4px 16px rgba(46, 196, 182, 0.4); }

/* 响应式 */
@media (max-width: 1280px) {
  .main-grid { grid-template-columns: 200px 1fr; }
}
@media (max-width: 900px) {
  .main-grid { grid-template-columns: 1fr; padding: 10px; height: auto; }
  .left-list-panel { overflow-y: visible; }
  .right-content { overflow-y: visible; }
  .ring-wrapper { grid-template-columns: 1fr; }
  .header-bar { flex-direction: column; gap: 8px; }
  .top-diagram { padding: 6px 10px; }
  .si-grid { grid-template-columns: 1fr 1fr; }
  .sg-list { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
}
</style>