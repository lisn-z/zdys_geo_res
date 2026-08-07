<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import * as THREE from 'three'
import { useGeoPanelLayout } from '@/hooks/useGeoPanelLayout'
import '@/styles/geo-page-template.css'

/* ================================================================
   数据：24 节气 — 初高中地理教材内容
   ================================================================ */
interface SolarTerm {
  name: string
  pinyin: string
  english: string
  date: string
  angle: number
  season: '春' | '夏' | '秋' | '冬'
  group: 0 | 1
  ecliptic: number
  declination: number
  climate: string
  phenomenon: string
  custom: string
  knowledge: string
  geoPoint: string
  customEmoji: string
  customDesc: string
  poem?: string
  food?: string
}

const solarTerms: SolarTerm[] = [
  { name: '立春', pinyin: 'Lìchūn', english: 'Start of Spring', date: '2月3—5日', angle: -45, season: '春', group: 0, ecliptic: 315, declination: -16.3, climate: '东风送暖,冰雪消融', phenomenon: '东风解冻、蛰虫始振、鱼陟负冰', custom: '打春牛、贴春字、咬春', knowledge: '太阳到达黄经315°，标志春季开始。北半球昼渐长夜渐短，但气温仍低，有"春捂秋冻"之说。', geoPoint: '太阳直射点位于南半球，正向赤道移动', customEmoji: '🐂', customDesc: '打春牛：用泥塑春牛鞭打，象征催牛耕田，祈求丰收', poem: '东风带雨逐西风，大地阳和暖气生', food: '春饼、萝卜' },
  { name: '雨水', pinyin: 'Yǔshuǐ', english: 'Rain Water', date: '2月18—20日', angle: -30, season: '春', group: 1, ecliptic: 330, declination: -11.5, climate: '降水增多,草木萌发', phenomenon: '獭祭鱼、鸿雁来、草木萌动', custom: '占稻色、撞拜寄', knowledge: '太阳到达黄经330°。气温回升、冰雪融化、降水增多，但乍暖还寒。', geoPoint: '太阳直射点位于南半球，继续北移', customEmoji: '🌧️', customDesc: '占稻色：爆糯米花占卜当年稻谷收成', poem: '好雨知时节，当春乃发生', food: '春笋、龙须饼' },
  { name: '惊蛰', pinyin: 'Jīngzhé', english: 'Awakening of Insects', date: '3月5—7日', angle: -15, season: '春', group: 0, ecliptic: 345, declination: -5.0, climate: '春雷始鸣,蛰虫苏醒', phenomenon: '桃始华、仓庚鸣、鹰化为鸠', custom: '吃梨、祭白虎', knowledge: '太阳到达黄经345°。春雷乍动，蛰伏冬眠动物苏醒，万物复苏。', geoPoint: '太阳直射点接近赤道，即将北移过赤道', customEmoji: '⚡', customDesc: '吃梨：梨与"离"谐音，寓意与疾病分离', poem: '微雨众卉新，一雷惊蛰始', food: '梨子' },
  { name: '春分', pinyin: 'Chūnfēn', english: 'Spring Equinox', date: '3月20—22日', angle: 0, season: '春', group: 1, ecliptic: 0, declination: 0, climate: '昼夜等长,阳光直射赤道', phenomenon: '玄鸟至、雷乃发声、始电', custom: '竖蛋、放风筝、吃春菜', knowledge: '太阳直射赤道，全球昼夜几乎等长。此后太阳直射点移至北半球，北半球昼长夜短。', geoPoint: '太阳直射赤道，昼夜平分', customEmoji: '🥚', customDesc: '竖蛋：春分这天最易把鸡蛋竖立，象征平衡', poem: '风雷送暖入中春，稚子逢春耍笑新', food: '春菜、太阳糕' },
  { name: '清明', pinyin: 'Qīngmíng', english: 'Pure Brightness', date: '4月4—6日', angle: 15, season: '春', group: 0, ecliptic: 15, declination: 5.8, climate: '气清景明,万物皆显', phenomenon: '桐始华、田鼠化为鴽、虹始见', custom: '扫墓祭祖、踏青郊游、插柳', knowledge: '太阳到达黄经15°。北半球昼长夜短，气温回升快。二十四节气中唯一既是节气又是法定节假日的。', geoPoint: '太阳直射点位于北半球，继续北移', customEmoji: '🎋', customDesc: '插柳：门前插柳枝，传说可辟邪，也纪念介子推', poem: '清明时节雨纷纷，路上行人欲断魂', food: '青团、清明粑' },
  { name: '谷雨', pinyin: 'Gǔyǔ', english: 'Grain Rain', date: '4月19—21日', angle: 30, season: '春', group: 1, ecliptic: 30, declination: 11.5, climate: '雨生百谷,春雨贵如油', phenomenon: '萍始生、鸣鸠拂其羽、戴胜降于桑', custom: '走谷雨、喝谷雨茶、食香椿', knowledge: '太阳到达黄经30°。春季最后一个节气，降水增多利于谷物生长，南方进入雨季。', geoPoint: '太阳直射点位于北半球，继续北移', customEmoji: '🍵', customDesc: '喝谷雨茶：谷雨这天采的茶叶称为"谷雨茶"，传说可清火明目', poem: '谷雨春光晓，山川黛色青', food: '香椿、谷雨茶' },
  { name: '立夏', pinyin: 'Lìxià', english: 'Start of Summer', date: '5月5—7日', angle: 45, season: '夏', group: 0, ecliptic: 45, declination: 16.3, climate: '气温显著升高,雷雨增多', phenomenon: '蝼蝈鸣、蚯蚓出、王瓜生', custom: '秤人、斗蛋、尝新', knowledge: '太阳到达黄经45°，标志夏季开始。北半球昼长夜短，正午太阳高度增大。', geoPoint: '太阳直射点位于北半球，继续北移', customEmoji: '⚖️', customDesc: '秤人：立夏称体重，防止"疰夏"消瘦', poem: '绿树阴浓夏日长，楼台倒影入池塘', food: '立夏蛋、立夏饭' },
  { name: '小满', pinyin: 'Xiǎomǎn', english: 'Lesser Fullness', date: '5月20—22日', angle: 60, season: '夏', group: 1, ecliptic: 60, declination: 20.2, climate: '夏熟作物籽粒饱满', phenomenon: '苦菜秀、靡草死、麦秋至', custom: '祭车神、祭蚕', knowledge: '太阳到达黄经60°。江浙一带"小满动三车"（水车、油车、丝车），象征丰收将至但尚未完全成熟。', geoPoint: '太阳直射点位于北半球，继续北移', customEmoji: '🧵', customDesc: '祭蚕：江浙一带祭祀蚕神，祈求蚕茧丰收', poem: '夜莺啼绿柳，皓月醒长空', food: '苦菜、麦糕' },
  { name: '芒种', pinyin: 'Mángzhòng', english: 'Grain in Ear', date: '6月5—7日', angle: 75, season: '夏', group: 0, ecliptic: 75, declination: 22.6, climate: '雨量充沛,气温升高', phenomenon: '螳螂生、鵙始鸣、反舌无声', custom: '煮梅、安苗、送花神', knowledge: '太阳到达黄经75°。农事最忙，"芒种芒种，连收带种"，长江中下游进入梅雨季节。', geoPoint: '太阳直射点接近北回归线', customEmoji: '🌸', customDesc: '送花神：芒种百花凋零，花神退位，人们饯行花神', poem: '时雨及芒种，四野皆栽秧', food: '青梅酒' },
  { name: '夏至', pinyin: 'Xiàzhì', english: 'Summer Solstice', date: '6月21—22日', angle: 90, season: '夏', group: 1, ecliptic: 90, declination: 23.5, climate: '白昼最长,正午太阳高度最高', phenomenon: '鹿角解、蝉始鸣、半夏生', custom: '祭神祀祖、吃面', knowledge: '太阳直射北回归线(23°26′N)，北半球白昼最长、黑夜最短。此后太阳直射点南移，北半球昼渐短。', geoPoint: '太阳直射北回归线，北半球正午太阳高度达一年最大', customEmoji: '🍜', customDesc: '吃夏至面："冬至饺子夏至面"，北方吃凉面消暑', poem: '昼晷已云极，宵漏自此长', food: '夏至面' },
  { name: '小暑', pinyin: 'Xiǎoshǔ', english: 'Lesser Heat', date: '7月6—8日', angle: 105, season: '夏', group: 0, ecliptic: 105, declination: 22.6, climate: '炎热将至,但未达极点', phenomenon: '温风至、蟋蟀居壁、鹰始挚', custom: '晒伏、吃藕、食新', knowledge: '太阳到达黄经105°。暑热开始，但还未到最热。华北进入雨季，江淮梅雨结束转入伏旱。', geoPoint: '太阳直射点位于北半球，开始南移', customEmoji: '☀️', customDesc: '晒伏：小暑前后晒衣物书籍，防虫蛀霉变', poem: '倏忽温风至，因循小暑来', food: '藕、绿豆芽' },
  { name: '大暑', pinyin: 'Dàshǔ', english: 'Greater Heat', date: '7月22—24日', angle: 120, season: '夏', group: 1, ecliptic: 120, declination: 20.2, climate: '一年中最炎热的时期', phenomenon: '腐草为萤、土润溽暑、大雨时行', custom: '晒伏姜、烧仙草、饮伏茶', knowledge: '太阳到达黄经120°。一年中最热时期，长江流域伏旱突出，"热在三伏"。', geoPoint: '太阳直射点位于北半球，继续南移', customEmoji: '🫖', customDesc: '饮伏茶：伏天喝中草药茶，清热解暑', poem: '赤日几时过，清风无处寻', food: '仙草、凉面' },
  { name: '立秋', pinyin: 'Lìqiū', english: 'Start of Autumn', date: '8月7—9日', angle: 135, season: '秋', group: 0, ecliptic: 135, declination: 16.3, climate: '暑热未退,凉风渐起', phenomenon: '凉风至、白露降、寒蝉鸣', custom: '贴秋膘、咬秋、晒秋', knowledge: '太阳到达黄经135°，标志秋季开始。但暑热未消，有"秋老虎"之称。', geoPoint: '太阳直射点位于北半球，继续南移', customEmoji: '🍖', customDesc: '贴秋膘：称体重，若比立夏轻则"贴秋膘"吃肉补回', poem: '自古逢秋悲寂寥，我言秋日胜春朝', food: '西瓜、肉类' },
  { name: '处暑', pinyin: 'Chǔshǔ', english: 'End of Heat', date: '8月22—24日', angle: 150, season: '秋', group: 1, ecliptic: 150, declination: 11.5, climate: '暑气止,凉秋始', phenomenon: '鹰乃祭鸟、天地始肃、禾乃登', custom: '出游迎秋、放河灯', knowledge: '太阳到达黄经150°。"处"即止，暑气至此而止。气温由热转凉，秋高气爽。', geoPoint: '太阳直射点位于北半球，继续南移', customEmoji: '🏮', customDesc: '放河灯：中元节前后放河灯，超度亡灵，也迎秋', poem: '离离暑云散，袅袅凉风起', food: '龙眼、鸭子' },
  { name: '白露', pinyin: 'Báilù', english: 'White Dew', date: '9月7—9日', angle: 165, season: '秋', group: 0, ecliptic: 165, declination: 5.8, climate: '天气转凉,昼夜温差大', phenomenon: '鸿雁来、玄鸟归、群鸟养羞', custom: '饮白露茶、收清露', knowledge: '太阳到达黄经165°。气温下降，夜间水汽凝结成白色露珠。"白露秋分夜，一夜凉一夜"。', geoPoint: '太阳直射点位于北半球，继续南移接近赤道', customEmoji: '💧', customDesc: '收清露：清晨收集草木上的露水，传说可明目', poem: '蒹葭苍苍，白露为霜', food: '龙眼、白露米酒' },
  { name: '秋分', pinyin: 'Qiūfēn', english: 'Autumn Equinox', date: '9月22—24日', angle: 180, season: '秋', group: 1, ecliptic: 180, declination: 0, climate: '昼夜均分,阳光直射赤道', phenomenon: '雷始收声、蛰虫坯户、水始涸', custom: '祭月、竖蛋、吃秋菜', knowledge: '太阳直射赤道，全球昼夜再次等长。此后太阳直射点移至南半球，北半球昼短夜长。', geoPoint: '太阳直射赤道，昼夜平分', customEmoji: '🌕', customDesc: '祭月：秋分曾是"祭月节"，后演变为中秋节', poem: '金气秋分，风清露冷秋期半', food: '秋菜、汤圆' },
  { name: '寒露', pinyin: 'Hánlù', english: 'Cold Dew', date: '10月8—9日', angle: 195, season: '秋', group: 0, ecliptic: 195, declination: -5.0, climate: '露水更冷,将凝结成霜', phenomenon: '鸿雁来宾、雀入大水为蛤、菊有黄华', custom: '登高、赏菊、吃花糕', knowledge: '太阳到达黄经195°。气温更低，露水有寒意。北方进入深秋，南方秋意渐浓。', geoPoint: '太阳直射点位于南半球，继续南移', customEmoji: '🏔️', customDesc: '登高：寒露重阳前后登高望远，避灾祈福', poem: '袅袅凉风动，凄凄寒露零', food: '花糕、芝麻' },
  { name: '霜降', pinyin: 'Shuāngjiàng', english: "Frost's Descent", date: '10月23—24日', angle: 210, season: '秋', group: 1, ecliptic: 210, declination: -11.5, climate: '初霜出现,天气渐冷', phenomenon: '豺乃祭兽、草木黄落、蛰虫咸俯', custom: '赏菊、吃柿子', knowledge: '太阳到达黄经210°。秋季最后一个节气，初霜出现，黄河流域进入初冬。', geoPoint: '太阳直射点位于南半球，继续南移', customEmoji: '🍊', customDesc: '吃柿子：霜降吃柿子，"霜降吃柿子，不会流鼻涕"', poem: '霜降水返壑，风落木归山', food: '柿子、栗子' },
  { name: '立冬', pinyin: 'Lìdōng', english: 'Start of Winter', date: '11月7—8日', angle: 225, season: '冬', group: 0, ecliptic: 225, declination: -16.3, climate: '冬季开始,万物收藏', phenomenon: '水始冰、地始冻、雉入大水为蜃', custom: '迎冬、补冬、贺冬', knowledge: '太阳到达黄经225°，标志冬季开始。北半球昼短夜长，正午太阳高度最低。', geoPoint: '太阳直射点位于南半球，继续南移', customEmoji: '🥟', customDesc: '补冬：立冬进补，吃高热量食物抵御严寒', poem: '细雨生寒未有霜，庭前木叶半青黄', food: '饺子、羊肉' },
  { name: '小雪', pinyin: 'Xiǎoxuě', english: 'Lesser Snow', date: '11月22—23日', angle: 240, season: '冬', group: 1, ecliptic: 240, declination: -20.2, climate: '气温下降,北方初雪', phenomenon: '虹藏不见、天气上升地气下降、闭塞成冬', custom: '腌腊肉、吃糍粑', knowledge: '太阳到达黄经240°。北方开始降雪但雪量不大，南方开始腌制腊肉。', geoPoint: '太阳直射点位于南半球，继续南移', customEmoji: '🥓', customDesc: '腌腊肉：小雪后气温骤降，正是腌制腊肉的好时机', poem: '莫怪虹无影，如今小雪时', food: '腊肉、糍粑' },
  { name: '大雪', pinyin: 'Dàxuě', english: 'Greater Snow', date: '12月6—8日', angle: 255, season: '冬', group: 0, ecliptic: 255, declination: -22.6, climate: '降雪量增大,大地银装', phenomenon: '鹖鴠不鸣、虎始交、荔挺出', custom: '腌肉、进补、观赏封河', knowledge: '太阳到达黄经255°。降雪可能性大增，北方"千里冰封、万里雪飘"。', geoPoint: '太阳直射点接近南回归线', customEmoji: '🧣', customDesc: '进补：大雪是"进补"好时节，吃羊肉牛肉御寒', poem: '忽如一夜春风来，千树万树梨花开', food: '红黏粥、羊肉' },
  { name: '冬至', pinyin: 'Dōngzhì', english: 'Winter Solstice', date: '12月21—23日', angle: 270, season: '冬', group: 1, ecliptic: 270, declination: -23.5, climate: '白昼最短,正午太阳高度最低', phenomenon: '蚯蚓结、麋角解、水泉动', custom: '吃饺子、吃汤圆、数九', knowledge: '太阳直射南回归线(23°26′S)，北半球白昼最短、黑夜最长。此后太阳直射点北移，北半球昼渐长。', geoPoint: '太阳直射南回归线，北半球正午太阳高度达一年最小', customEmoji: '🥟', customDesc: '数九：从冬至起每九天为一个"九"，数到"九九"春暖花开', poem: '邯郸驿里逢冬至，抱膝灯前影伴身', food: '饺子、汤圆' },
  { name: '小寒', pinyin: 'Xiǎohán', english: 'Lesser Cold', date: '1月5—7日', angle: 285, season: '冬', group: 0, ecliptic: 285, declination: -22.6, climate: '开始进入最冷时节', phenomenon: '雁北乡、鹊始巢、雉始雊', custom: '吃腊八粥、画图数九', knowledge: '太阳到达黄经285°。一年中最寒冷时段开始，但还未到极寒。"冷在三九"。', geoPoint: '太阳直射点位于南半球，开始北移', customEmoji: '🥣', customDesc: '吃腊八粥：小寒前后腊八节，喝腊八粥驱寒', poem: '小寒大寒，冷成一团', food: '腊八粥、菜饭' },
  { name: '大寒', pinyin: 'Dàhán', english: 'Greater Cold', date: '1月20—21日', angle: 300, season: '冬', group: 1, ecliptic: 300, declination: -20.2, climate: '一年中最寒冷的时期', phenomenon: '鸡始乳、鸷鸟厉疾、水泽腹坚', custom: '尾牙祭、大扫除、备年货', knowledge: '太阳到达黄经300°。二十四节气最后一个，标志一年周期结束。大寒后立春，新一轮循环开始。', geoPoint: '太阳直射点位于南半球，继续北移', customEmoji: '🧹', customDesc: '大扫除：大寒前后"扫尘"，寓意除旧迎新', poem: '旧雪未及消，新雪又拥户', food: '八宝饭、年糕' },
]

/* ================================================================
   状态
   ================================================================ */
const currentIndex = ref(3)
const isPlaying = ref(false)
const playSpeed = ref(1)
const showDetail = ref(false)
const seasonFilter = ref<'春' | '夏' | '秋' | '冬' | '全部'>('全部')

const currentTerm = computed(() => solarTerms[currentIndex.value]!)

const seasonGroups = computed(() => [
  { key: '春' as const, label: '春', color: '#66bb6a', bg: 'rgba(102,187,106,0.12)', terms: solarTerms.filter(t => t.season === '春') },
  { key: '夏' as const, label: '夏', color: '#ff7043', bg: 'rgba(255,112,67,0.12)', terms: solarTerms.filter(t => t.season === '夏') },
  { key: '秋' as const, label: '秋', color: '#ffa726', bg: 'rgba(255,167,38,0.12)', terms: solarTerms.filter(t => t.season === '秋') },
  { key: '冬' as const, label: '冬', color: '#42a5f5', bg: 'rgba(66,165,245,0.12)', terms: solarTerms.filter(t => t.season === '冬') },
])

/* ================================================================
   面板布局
   ================================================================ */
const rootRef = ref<HTMLElement | null>(null)
const { workspaceAttrs, leftPanelAttrs, rightPanelAttrs, leftCollapseAttrs, rightCollapseAttrs, leftEntryAttrs, rightEntryAttrs, leftResizeAttrs, rightResizeAttrs } = useGeoPanelLayout({
  rootRef,
  left: { enabled: true, initialWidth: 320 },
  right: { enabled: true, initialWidth: 360 },
  onLayoutChange: () => { onResize() },
})

/* ================================================================
   Three.js — 3D 地球公转场景
   ================================================================ */
const canvasRef = ref<HTMLCanvasElement>()
const renderer = shallowRef<THREE.WebGLRenderer | null>(null)
const scene3d = shallowRef<THREE.Scene | null>(null)
const camera3d = shallowRef<THREE.PerspectiveCamera | null>(null)
const earthGroup = shallowRef<THREE.Group | null>(null)
let dotMeshes: THREE.Mesh[] = []
let sunLightRef: THREE.PointLight | null = null
let animationId = 0

function initThree() {
  if (!canvasRef.value) return
  const w = canvasRef.value.clientWidth
  const h = canvasRef.value.clientHeight

  const r = new THREE.WebGLRenderer({ canvas: canvasRef.value, antialias: true, alpha: true })
  r.setSize(w, h)
  r.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.value = r

  const scene = new THREE.Scene()
  scene3d.value = scene

  const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100)
  camera.position.set(0, 6, 9)
  camera.lookAt(0, 0, 0)
  camera3d.value = camera

  // 环境光
  scene.add(new THREE.AmbientLight(0x334455, 0.6))

  // 太阳光
  const sunLight = new THREE.PointLight(0xfff5e0, 2.2, 50)
  sunLight.position.set(0, 0, 0)
  scene.add(sunLight)
  sunLightRef = sunLight

  // 太阳
  const sunGeo = new THREE.SphereGeometry(0.5, 32, 32)
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd54f })
  scene.add(new THREE.Mesh(sunGeo, sunMat))

  // 太阳辉光
  const glowGeo = new THREE.SphereGeometry(0.7, 32, 32)
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.15 })
  scene.add(new THREE.Mesh(glowGeo, glowMat))

  // 公转轨道
  const orbitGeo = new THREE.RingGeometry(4.8, 5.2, 128)
  const orbitMat = new THREE.MeshBasicMaterial({ color: 0x80cbc4, side: THREE.DoubleSide, transparent: true, opacity: 0.2 })
  const orbitMesh = new THREE.Mesh(orbitGeo, orbitMat)
  orbitMesh.rotation.x = -Math.PI / 2
  scene.add(orbitMesh)

  // 地球（ShaderMaterial + 纹理贴图 + 太阳方向光照）
  const eGroup = new THREE.Group()
  const earthGeo = new THREE.SphereGeometry(0.35, 64, 64)

  const earthVertShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `

  const earthFragShader = `
    uniform sampler2D uEarthMap;
    uniform vec3 uSunPos;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPos;
    void main() {
      vec4 texColor = texture2D(uEarthMap, vUv);
      vec3 lightDir = normalize(uSunPos - vWorldPos);
      float diff = max(dot(vNormal, lightDir), 0.0);
      // 环境光 + 漫反射（提亮）
      float ambient = 0.28;
      vec3 finalColor = texColor.rgb * (ambient + diff * 0.92);
      // 整体提亮
      finalColor *= 1.25;
      // 背光面微弱蓝调大气散射
      float backLight = max(dot(-vNormal, lightDir), 0.0);
      finalColor += vec3(0.06, 0.12, 0.25) * backLight * 0.5;
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `

  const earthTex = new THREE.TextureLoader().load('/geo-resources-folder/images/earth.jpg')
  earthTex.colorSpace = THREE.SRGBColorSpace

  const earthMat = new THREE.ShaderMaterial({
    vertexShader: earthVertShader,
    fragmentShader: earthFragShader,
    uniforms: {
      uEarthMap: { value: earthTex },
      uSunPos: { value: new THREE.Vector3(0, 0, 0) },
    },
  })
  eGroup.add(new THREE.Mesh(earthGeo, earthMat))

  // 地轴
  const axisGeo = new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8)
  const axisMat = new THREE.MeshBasicMaterial({ color: 0xff5252 })
  const axisMesh = new THREE.Mesh(axisGeo, axisMat)
  axisMesh.rotation.z = 0.41
  eGroup.add(axisMesh)
  scene.add(eGroup)
  earthGroup.value = eGroup

  // 24节气标记点
  const colorMap: Record<string, number> = { 春: 0x66bb6a, 夏: 0xff7043, 秋: 0xffa726, 冬: 0x42a5f5 }
  dotMeshes = []
  solarTerms.forEach((term) => {
    const rad = (term.angle * Math.PI) / 180
    const x = 5 * Math.cos(rad)
    const z = 5 * Math.sin(rad)

    // 节气标记点
    const dotGeo = new THREE.SphereGeometry(0.12, 16, 16)
    const dotMat = new THREE.MeshBasicMaterial({ color: colorMap[term.season]! })
    const dot = new THREE.Mesh(dotGeo, dotMat)
    dot.position.set(x, 0, z)
    scene.add(dot)
    dotMeshes.push(dot)

    // 标记光环
    const ringGeo = new THREE.RingGeometry(0.18, 0.24, 32)
    const ringMat = new THREE.MeshBasicMaterial({ color: colorMap[term.season]!, side: THREE.DoubleSide, transparent: true, opacity: 0.3 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.position.set(x, 0, z)
    ring.rotation.x = -Math.PI / 2
    scene.add(ring)
  })

  animate()
}

function animate() {
  animationId = requestAnimationFrame(animate)
  const now = Date.now()

  if (isPlaying.value && now - animate._lastSwitch > 1800 / playSpeed.value) {
    currentIndex.value = (currentIndex.value + 1) % 24
    animate._lastSwitch = now
  }

  const angle = (solarTerms[currentIndex.value]!.angle * Math.PI) / 180
  if (earthGroup.value) {
    earthGroup.value.position.set(5 * Math.cos(angle), 0, 5 * Math.sin(angle))
    earthGroup.value.rotation.y += 0.01
    // 更新地球 shader 的太阳位置（太阳在原点，需转换到地球本地坐标）
    const earthMesh = earthGroup.value.children[0] as THREE.Mesh
    const mat = earthMesh?.material
    if (mat instanceof THREE.ShaderMaterial && mat.uniforms.uSunPos) {
      mat.uniforms.uSunPos.value.set(0, 0, 0)
    }
  }

  // 高亮当前节气标记
  const colorMap: Record<string, number> = { 春: 0x66bb6a, 夏: 0xff7043, 秋: 0xffa726, 冬: 0x42a5f5 }
  dotMeshes.forEach((dot, i) => {
    const mat = dot.material as THREE.MeshBasicMaterial
    const baseColor = colorMap[solarTerms[i]!.season]!
    if (i === currentIndex.value) {
      mat.color.setHex(0xffeb3b)
      dot.scale.setScalar(1.8)
    } else {
      mat.color.setHex(baseColor)
      dot.scale.setScalar(1)
    }
  })

  if (renderer.value && scene3d.value && camera3d.value) {
    renderer.value.render(scene3d.value, camera3d.value)
  }
}
animate._lastSwitch = 0

function onResize() {
  if (!canvasRef.value || !renderer.value || !camera3d.value) return
  const w = canvasRef.value.clientWidth
  const h = canvasRef.value.clientHeight
  if (w === 0 || h === 0) return
  renderer.value.setSize(w, h)
  camera3d.value.aspect = w / h
  camera3d.value.updateProjectionMatrix()
}

/* ================================================================
   交互
   ================================================================ */
function selectIndex(i: number) {
  if (i < 0 || i >= solarTerms.length || i === currentIndex.value) return
  currentIndex.value = i
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
  const idx = solarTerms.findIndex(t => t.season === season)
  if (idx !== -1) selectIndex(idx)
}

function openDetail() {
  showDetail.value = true
}

function closeDetail() {
  showDetail.value = false
}

function formatDeclination(d: number): string {
  const abs = Math.abs(d).toFixed(1)
  if (d > 0) return `${abs}°N`
  if (d < 0) return `${abs}°S`
  return '0°（赤道）'
}

/* ================================================================
   生命周期
   ================================================================ */
onMounted(() => {
  initThree()
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animationId)
  if (renderer.value) { renderer.value.dispose(); renderer.value = null }
})

watch(currentIndex, () => {
  if (isPlaying.value) animate._lastSwitch = Date.now()
})
</script>

<template>
  <div ref="rootRef" class="the-twenty-four-solar-term-container geo-template-page geo-page theme-dark">
    <!-- ====== 顶部工具栏 ====== -->
    <header class="top-toolbar">
      <div class="brand-area">
        <img class="brand-logo" src="https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png" alt="智地有申" />
      </div>
      <h1 class="page-title">二十四节气 · 地球公转</h1>
      <div class="toolbar-actions">
        <button class="theme-btn toolbar-btn" :class="{ active: isPlaying }" @click="togglePlay">
          {{ isPlaying ? '⏸ 暂停' : '▶ 公转演示' }}
        </button>
        <button class="theme-btn toolbar-btn" @click="prevTerm">‹ 上一节气</button>
        <button class="theme-btn toolbar-btn" @click="nextTerm">下一节气 ›</button>
      </div>
    </header>

    <!-- ====== 工作区 ====== -->
    <main class="workspace" v-bind="workspaceAttrs">
      <!-- 左侧面板：控制面板 -->
      <aside id="left-panel" class="side-panel left-panel" v-bind="leftPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>公转控制</h2>
              <p>播放 · 速度 · 太阳直射点</p>
            </div>
            <span class="panel-badge">3D</span>
          </div>

          <!-- 播放控制 -->
          <div class="geo-card control-card">
            <div class="ctrl-row">
              <label>公转速度</label>
              <input type="range" min="0.5" max="3" step="0.5" v-model.number="playSpeed" />
              <span class="ctrl-value">{{ playSpeed }}x</span>
            </div>
            <div class="ctrl-row">
              <label>当前节气</label>
              <strong class="ctrl-accent">{{ currentTerm.name }}</strong>
              <span class="ctrl-sub">黄经 {{ currentTerm.ecliptic }}°</span>
            </div>
            <div class="ctrl-row">
              <label>直射纬度</label>
              <strong class="ctrl-accent">{{ formatDeclination(currentTerm.declination) }}</strong>
            </div>
          </div>

          <!-- 太阳直射点移动示意图 -->
          <div class="geo-card diagram-card">
            <div class="diagram-title">📐 太阳直射点移动（北半球视角）</div>
            <svg viewBox="0 0 900 140" class="diagram-svg">
              <circle cx="450" cy="70" r="16" fill="#ffd54f" />
              <text x="450" y="74" text-anchor="middle" class="svg-sun-label">太阳</text>
              <ellipse cx="450" cy="70" rx="300" ry="24" stroke="#80cbc4" stroke-width="1" fill="none" stroke-dasharray="4 4" opacity="0.6" />
              <g v-for="(pt, i) in [
                { x: 150, name: '春分', label: '直射赤道', tilt: '正对' },
                { x: 300, name: '夏至', label: '直射北回归线', tilt: '北倾向日' },
                { x: 600, name: '秋分', label: '直射赤道', tilt: '正对' },
                { x: 750, name: '冬至', label: '直射南回归线', tilt: '南倾向日' },
              ]" :key="i">
                <circle :cx="pt.x" cy="70" r="10" fill="#4fa3ff" stroke="#fff" stroke-width="1.5" />
                <line :x1="pt.x - 4" :y1="63" :x2="pt.x + 4" :y2="77" stroke="#ff5252" stroke-width="1.5"
                  :transform="i % 2 === 1 ? `rotate(20, ${pt.x}, 70)` : `rotate(-20, ${pt.x}, 70)`" />
                <text :x="pt.x" y="98" text-anchor="middle" class="svg-pt-name">{{ pt.name }}</text>
                <text :x="pt.x" y="112" text-anchor="middle" class="svg-pt-info">{{ pt.label }}</text>
                <text :x="pt.x" y="126" text-anchor="middle" class="svg-pt-tilt">{{ pt.tilt }}</text>
              </g>
            </svg>
          </div>

          <!-- 24 节气快捷列表 -->
          <div class="geo-card terms-grid-card">
            <div v-for="group in seasonGroups" :key="group.key" class="season-group"
              v-show="seasonFilter === '全部' || seasonFilter === group.key">
              <div class="sg-header" :style="{ background: group.bg, color: group.color }" @click="jumpToSeason(group.key)">
                <span class="sg-label">{{ group.label }}季</span>
                <span class="sg-count">{{ group.terms.length }}个</span>
              </div>
              <div class="sg-grid">
                <button v-for="t in group.terms" :key="t.name" class="term-btn"
                  :class="{ active: currentTerm.name === t.name, ['term-' + t.season]: true }"
                  @click="selectIndex(solarTerms.findIndex(s => s.name === t.name))">
                  <span class="tb-name">{{ t.name }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="resize-handle resize-right" v-bind="leftResizeAttrs"></div>
        <button type="button" class="panel-collapse-btn collapse-left" v-bind="leftCollapseAttrs">‹</button>
      </aside>

      <!-- ====== 中心舞台：3D 地球公转 ====== -->
      <section class="center-stage">
        <div class="stage-content">
          <div class="scene-host">
            <canvas ref="canvasRef" class="three-canvas scene-canvas"></canvas>
          </div>

          <!-- 浮层信息 -->
          <div class="orbit-overlay-layer">
            <div class="floating-info">
              <span class="fi-season-tag" :class="'tag-' + currentTerm.season">{{ currentTerm.season }}季</span>
              <span class="fi-name">{{ currentTerm.name }}</span>
              <span class="fi-pinyin">{{ currentTerm.pinyin }}</span>
              <span class="fi-date">{{ currentTerm.date }}</span>
              <span class="fi-ecliptic">黄经 {{ currentTerm.ecliptic }}°</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 右侧面板：节气详情 -->
      <aside id="right-panel" class="side-panel right-panel" v-bind="rightPanelAttrs">
        <div class="panel-scroll">
          <div class="panel-heading">
            <div>
              <h2>节气详情</h2>
              <p>地理知识 · 民俗文化</p>
            </div>
            <span class="panel-badge">24</span>
          </div>

          <!-- 季节筛选 -->
          <div class="geo-card filter-card">
            <div class="filter-row">
              <button v-for="s in ['全部', '春', '夏', '秋', '冬']" :key="s"
                class="filter-btn" :class="{ active: seasonFilter === s }"
                @click="seasonFilter = s as any">
                {{ s === '全部' ? '全部' : s + '季' }}
              </button>
            </div>
          </div>

          <!-- 当前节气详情卡 -->
          <div class="geo-card detail-card" :class="'detail-' + currentTerm.season">
            <div class="dc-header">
              <span class="dc-season-tag" :class="'tag-' + currentTerm.season">{{ currentTerm.season }}季 · {{ currentTerm.group === 1 ? '中气' : '节气' }}</span>
              <h3 class="dc-name">{{ currentTerm.name }}</h3>
              <div class="dc-sub">{{ currentTerm.pinyin }} · {{ currentTerm.english }}</div>
              <div class="dc-date">{{ currentTerm.date }}</div>
            </div>

            <!-- 民俗图片 -->
            <div class="dc-custom-illustration">
              <div class="ci-emoji">{{ currentTerm.customEmoji }}</div>
              <div class="ci-label">{{ currentTerm.customDesc }}</div>
            </div>

            <!-- 地理知识点 -->
            <div class="dc-section">
              <div class="ds-title">📐 地理考点</div>
              <div class="ds-content highlight">{{ currentTerm.knowledge }}</div>
            </div>

            <div class="dc-section">
              <div class="ds-title">🌍 太阳直射点</div>
              <div class="ds-content">
                <div>直射纬度：<strong class="accent-value">{{ formatDeclination(currentTerm.declination) }}</strong></div>
                <div>{{ currentTerm.geoPoint }}</div>
              </div>
            </div>

            <div class="dc-section">
              <div class="ds-title">🌡️ 气候与物候</div>
              <div class="ds-content">
                <div><span class="ds-label">气候</span>{{ currentTerm.climate }}</div>
                <div><span class="ds-label">物候</span>{{ currentTerm.phenomenon }}</div>
              </div>
            </div>

            <div class="dc-section">
              <div class="ds-title">🎎 传统民俗</div>
              <div class="ds-content">
                <div>🎉 {{ currentTerm.custom }}</div>
                <div v-if="currentTerm.food">🍜 食俗：{{ currentTerm.food }}</div>
              </div>
            </div>

            <div class="dc-section" v-if="currentTerm.poem">
              <div class="ds-title">📜 节气诗句</div>
              <div class="ds-poem">{{ currentTerm.poem }}</div>
            </div>

            <button class="dc-more-btn" @click="openDetail">查看完整详情 →</button>
          </div>
        </div>

        <div class="resize-handle resize-left" v-bind="rightResizeAttrs"></div>
        <button type="button" class="panel-collapse-btn collapse-right" v-bind="rightCollapseAttrs">›</button>
      </aside>

      <!-- 面板展开入口 -->
      <button class="panel-entry-btn left-entry" v-bind="leftEntryAttrs" aria-label="展开左侧面板">‹</button>
      <button class="panel-entry-btn right-entry" v-bind="rightEntryAttrs" aria-label="展开右侧面板">›</button>
    </main>

    <!-- ====== 底部时间轴 ====== -->
    <footer class="timeline-bar">
      <div class="tl-progress" :style="{ width: ((currentIndex + 1) / 24 * 100) + '%' }"></div>
      <button v-for="(term, i) in solarTerms" :key="term.name"
        class="tl-dot" :class="{ active: i === currentIndex, ['tl-' + term.season]: true }"
        @click="selectIndex(i)">
        <span class="tl-name">{{ term.name }}</span>
      </button>
    </footer>

    <!-- ====== 详情弹窗 ====== -->
    <Teleport to="body">
      <div v-if="showDetail" class="detail-overlay" @click.self="closeDetail">
        <div class="detail-modal">
          <button class="modal-close" @click="closeDetail">✕</button>
          <div class="modal-header">
            <span class="modal-season-tag" :class="'tag-' + currentTerm.season">{{ currentTerm.season }}季 · {{ currentTerm.group === 1 ? '中气' : '节气' }}</span>
            <h2 class="modal-name">{{ currentTerm.name }}</h2>
            <div class="modal-pinyin">{{ currentTerm.pinyin }} · {{ currentTerm.english }}</div>
            <div class="modal-date">{{ currentTerm.date }} · 黄经 {{ currentTerm.ecliptic }}°</div>
          </div>
          <div class="modal-body">
            <!-- 民俗插图 -->
            <div class="modal-custom-illust">
              <div class="mci-emoji">{{ currentTerm.customEmoji }}</div>
              <div class="mci-desc">{{ currentTerm.customDesc }}</div>
            </div>

            <div class="modal-section">
              <div class="ms-title">📐 中高考地理考点</div>
              <div class="ms-text highlight">{{ currentTerm.knowledge }}</div>
            </div>

            <div class="modal-section">
              <div class="ms-title">🌍 太阳直射点</div>
              <div class="ms-text">
                <div>直射纬度：<strong class="accent-value">{{ formatDeclination(currentTerm.declination) }}</strong></div>
                <div>{{ currentTerm.geoPoint }}</div>
              </div>
            </div>

            <div class="modal-section">
              <div class="ms-title">🌡️ 气候与物候</div>
              <div class="ms-text">
                <div><strong>气候：</strong>{{ currentTerm.climate }}</div>
                <div><strong>物候：</strong>{{ currentTerm.phenomenon }}</div>
              </div>
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
                <div>类型：{{ currentTerm.group === 1 ? '中气' : '节气' }}</div>
                <div>太阳黄经：{{ currentTerm.ecliptic }}°</div>
                <div>直射纬度：{{ formatDeclination(currentTerm.declination) }}</div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="modal-nav-btn" @click="selectIndex((currentIndex - 1 + 24) % 24)">← 上一节气</button>
            <button class="modal-nav-btn primary" @click="selectIndex((currentIndex + 1) % 24)">下一节气 →</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* ── 页面根容器 ── */
.the-twenty-four-solar-term-container {
  --st-primary: #2ec4b6;
  --st-secondary: #247cff;
  --st-bg: rgba(8, 12, 28, 0.92);
  --st-border: rgba(46, 196, 182, 0.22);
  --st-panel: rgba(8, 12, 28, 0.78);
  --st-text: #f3f6fa;
  --st-soft: rgba(255, 255, 255, 0.6);
}

/* ── 左侧面板内容 flex 布局 ── */
#left-panel .panel-scroll {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}

/* ── 中心舞台 ── */
.scene-host {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 60%, rgba(46, 196, 182, 0.06), rgba(8, 12, 28, 0.92) 70%);
  border: 1px solid rgba(46, 196, 182, 0.28);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: inset 0 0 80px rgba(46, 196, 182, 0.15);
  margin: 8px;
}

.scene-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

/* 浮层信息 */
.orbit-overlay-layer {
  position: absolute;
  inset: 8px;
  pointer-events: none;
  z-index: 5;
}

.floating-info {
  position: absolute;
  top: 14px;
  left: 14px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(8, 12, 28, 0.82);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(46, 196, 182, 0.3);
  pointer-events: auto;
}

.fi-season-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 11px;
  letter-spacing: 1px;
}

.fi-name { font-size: 22px; font-weight: 800; color: #fff; }
.fi-pinyin { font-size: 11px; color: var(--st-soft); }
.fi-date { font-size: 11px; color: var(--st-primary); }
.fi-ecliptic { font-size: 11px; color: rgba(255, 255, 255, 0.5); }

/* ── 控制卡片 ── */
.control-card { display: flex; flex-direction: column; gap: 8px; }
.ctrl-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.ctrl-row label { flex: 0 0 70px; color: var(--st-soft); }
.ctrl-row input[type="range"] { flex: 1; accent-color: var(--st-primary); }
.ctrl-value { flex: 0 0 36px; text-align: right; color: var(--st-primary); font-weight: 700; }
.ctrl-accent { color: var(--st-primary); font-size: 16px; }
.ctrl-sub { color: var(--st-soft); font-size: 12px; }

/* ── 示意图 ── */
.diagram-card { overflow: hidden; }
.diagram-title { font-size: 12px; font-weight: 700; color: var(--st-primary); margin-bottom: 6px; }
.diagram-svg { width: 100%; height: auto; max-height: 130px; display: block; }
.svg-sun-label { font-size: 9px; fill: #fff; font-weight: 700; }
.svg-pt-name { font-size: 11px; fill: #fff; font-weight: 700; }
.svg-pt-info { font-size: 9px; fill: var(--st-primary); }
.svg-pt-tilt { font-size: 8px; fill: rgba(255, 255, 255, 0.55); }

/* ── 季节标签 ── */
.tag-春 { background: rgba(102, 187, 106, 0.25); color: #81c784; border: 1px solid #66bb6a; }
.tag-夏 { background: rgba(255, 138, 101, 0.25); color: #ffab91; border: 1px solid #ff8a65; }
.tag-秋 { background: rgba(255, 167, 38, 0.25); color: #ffcc80; border: 1px solid #ffa726; }
.tag-冬 { background: rgba(100, 181, 246, 0.25); color: #90caf9; border: 1px solid #64b5f6; }

/* ── 筛选 ── */
.filter-card { padding: 8px 12px !important; }
.filter-row { display: flex; gap: 6px; }
.filter-btn {
  flex: 1;
  padding: 5px 0;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: var(--st-soft);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover { background: rgba(46, 196, 182, 0.1); }
.filter-btn.active { background: rgba(46, 196, 182, 0.2); border-color: var(--st-primary); color: var(--st-primary); font-weight: 600; }

/* ── 节气网格 ── */
.terms-grid-card { padding: 8px 12px !important; }

.season-group { margin-bottom: 8px; }
.season-group:last-child { margin-bottom: 0; }

.sg-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 10px;
  border-radius: 8px;
  margin-bottom: 6px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}

.sg-header:hover { filter: brightness(1.3); }
.sg-label { letter-spacing: 1px; }
.sg-count { font-size: 11px; opacity: 0.6; }

.sg-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 5px;
}

.term-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 2px 4px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  color: #fff;
  text-align: center;
}

.term-btn:hover { transform: translateY(-1px); background: rgba(255, 255, 255, 0.1); }
.term-btn:active { transform: scale(0.95); }

.term-btn.active {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(46, 196, 182, 0.3);
  z-index: 2;
}

.term-btn.term-春.active { background: linear-gradient(135deg, rgba(102,187,106,0.3), rgba(102,187,106,0.1)); border-color: #66bb6a; }
.term-btn.term-夏.active { background: linear-gradient(135deg, rgba(255,112,67,0.3), rgba(255,112,67,0.1)); border-color: #ff7043; }
.term-btn.term-秋.active { background: linear-gradient(135deg, rgba(255,167,38,0.3), rgba(255,167,38,0.1)); border-color: #ffa726; }
.term-btn.term-冬.active { background: linear-gradient(135deg, rgba(66,165,245,0.3), rgba(66,165,245,0.1)); border-color: #42a5f5; }

.tb-name { font-size: 13px; font-weight: 700; letter-spacing: 1px; }
.tb-date { font-size: 9px; color: var(--st-soft); margin-top: 1px; }

/* ── 详情卡 ── */
.detail-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.3s;
}

.dc-header { text-align: center; }
.dc-season-tag { display: inline-block; padding: 2px 10px; border-radius: 6px; font-size: 11px; letter-spacing: 1px; }
.dc-name { font-size: 28px; font-weight: 800; color: #fff; margin: 6px 0 0; }
.dc-sub { font-size: 12px; color: var(--st-soft); }
.dc-date { font-size: 13px; color: var(--st-primary); margin-top: 2px; }

/* 民俗插图 */
.dc-custom-illustration {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.ci-emoji {
  font-size: 42px;
  line-height: 1;
  flex: 0 0 60px;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}

.ci-label { font-size: 13px; line-height: 1.6; color: rgba(255, 255, 255, 0.85); }

/* 详情段落 */
.dc-section {
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.ds-title { font-size: 13px; color: var(--st-primary); font-weight: 700; margin-bottom: 6px; }
.ds-content { font-size: 13px; line-height: 1.7; color: rgba(255, 255, 255, 0.9); }
.ds-content.highlight { color: #ffe082; font-weight: 600; }
.ds-label { display: inline-block; width: 32px; color: var(--st-soft); }
.ds-poem { font-size: 14px; font-style: italic; color: #ffe082; padding-left: 10px; border-left: 3px solid var(--st-primary); line-height: 1.8; }

.dc-more-btn {
  display: block;
  width: 100%;
  padding: 8px 0;
  background: linear-gradient(135deg, var(--st-primary), var(--st-secondary));
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.dc-more-btn:hover { box-shadow: 0 4px 16px rgba(46, 196, 182, 0.4); transform: translateY(-1px); }

/* ── 底部时间轴 ── */
.timeline-bar {
  position: relative;
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 24px;
  background: rgba(8, 12, 28, 0.9);
  border-top: 1px solid rgba(46, 196, 182, 0.15);
  overflow: hidden;
}

.tl-progress {
  position: absolute;
  top: 0;
  left: 0;
  height: 2px;
  background: linear-gradient(90deg, var(--st-primary), var(--st-secondary));
  transition: width 0.4s ease;
}

.tl-dot {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.tl-dot::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  transition: all 0.2s;
}

.tl-dot.tl-春::before { background: rgba(102, 187, 106, 0.4); }
.tl-dot.tl-夏::before { background: rgba(255, 112, 67, 0.4); }
.tl-dot.tl-秋::before { background: rgba(255, 167, 38, 0.4); }
.tl-dot.tl-冬::before { background: rgba(66, 165, 245, 0.4); }

.tl-dot.active::before { width: 10px; height: 10px; background: #ffeb3b; box-shadow: 0 0 8px rgba(255, 235, 59, 0.5); }

.tl-name {
  font-size: 10px;
  color: var(--st-soft);
  opacity: 0;
  transition: all 0.2s;
  white-space: nowrap;
}

.tl-dot:hover .tl-name,
.tl-dot.active .tl-name { opacity: 1; }
.tl-dot.active .tl-name { color: #ffeb3b; font-weight: 700; }

/* ── 详情弹窗 ── */
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
  width: 560px;
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
.modal-season-tag { display: inline-block; padding: 3px 10px; border-radius: 6px; font-size: 12px; letter-spacing: 1px; }
.modal-name { font-size: 36px; font-weight: 800; color: #fff; margin: 8px 0 0; }
.modal-pinyin { font-size: 13px; color: var(--st-soft); }
.modal-date { font-size: 13px; color: var(--st-primary); margin-top: 4px; }

.modal-body { display: flex; flex-direction: column; gap: 12px; }

/* 弹窗民俗插图 */
.modal-custom-illust {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.mci-emoji {
  font-size: 56px;
  line-height: 1;
  flex: 0 0 72px;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 14px;
}

.mci-desc { font-size: 14px; line-height: 1.7; color: rgba(255, 255, 255, 0.9); }

.modal-section { padding: 10px 14px; background: rgba(255, 255, 255, 0.04); border-radius: 10px; border: 1px solid rgba(255, 255, 255, 0.06); }
.ms-title { font-size: 13px; color: var(--st-primary); font-weight: 700; margin-bottom: 6px; }
.ms-text { font-size: 13px; line-height: 1.7; color: rgba(255, 255, 255, 0.9); }
.ms-text.highlight { color: #ffe082; font-weight: 600; }
.ms-poem { font-size: 15px; font-style: italic; color: #ffe082; padding-left: 10px; border-left: 3px solid var(--st-primary); line-height: 1.8; }

.modal-footer { display: flex; gap: 12px; margin-top: 16px; }

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

.modal-nav-btn:hover { background: rgba(46, 196, 182, 0.15); border-color: var(--st-primary); }
.modal-nav-btn.primary { background: linear-gradient(135deg, var(--st-primary), var(--st-secondary)); border-color: transparent; font-weight: 600; }
.modal-nav-btn.primary:hover { box-shadow: 0 4px 16px rgba(46, 196, 182, 0.4); }

/* ── 响应式 ── */
@media (max-width: 900px) {
  .sg-grid { grid-template-columns: repeat(4, 1fr); }
}

@media (max-width: 600px) {
  .sg-grid { grid-template-columns: repeat(3, 1fr); }
  .tl-name { font-size: 8px; }
}
</style>
