export const BRAND_LOGO = 'https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png'
export type HouseView = 'cutaway' | 'exterior' | 'interior'
export type RoomId = 'living' | 'kitchen' | 'bathroom' | 'garage'
export type Vec3 = [number, number, number]
export interface MaterialPoint {
  id: number; title: string; product: string; resource: string; category: string
  explanation: string; observe: string; chain: string[]
  position: Vec3; camera: Vec3; target: Vec3
}
// The eight associations follow 七上 p.80 图3-25. Room backs and hidden
// construction are illustrative reconstruction, not building specifications.
export const MATERIAL_POINTS: MaterialPoint[] = [
  { id: 1, title: '黏土与瓷砖', product: '瓷砖', resource: '黏土', category: '建筑装饰',
    explanation: '黏土是陶瓷的重要原料之一。与其他原料配合，经成型、烧制等工序制成瓷砖，铺在浴室的地面和墙面。',
    observe: '观察浴室：哪些表面适合铺瓷砖？', chain: ['黏土等原料', '配料、成型与烧制', '瓷砖'],
    position: [.4, .3, -3.85], camera: [.1, 3.2, -1.8], target: [-.4, .4, -4.6] },
  { id: 2, title: '硅与玻璃', product: '玻璃', resource: '硅', category: '透光材料',
    explanation: '普通玻璃的主要原料之一是富含二氧化硅的石英砂。教材用“硅”概括这种原料联系，并不是把纯硅直接做成玻璃。',
    observe: '找一找：房屋里的玻璃用在哪些地方？', chain: ['石英砂（含二氧化硅）', '配料、熔融与成型', '玻璃'],
    position: [-.7, 1.72, -5.98], camera: [.1, 2.6, -2.9], target: [-.7, 1.72, -5.98] },
  { id: 3, title: '萤石与墙面漆', product: '墙面漆', resource: '萤石', category: '化工原料',
    explanation: '墙面漆是涂覆在墙体表面的饰面涂层。萤石可用于生产含氟化工材料，其中一些用于涂料；并非所有墙面漆都含萤石。石膏板的表面也可以再涂墙面漆。',
    observe: '矿石变成墙面涂料，是否还需要加工？', chain: ['萤石', '含氟化工材料', '部分涂料'],
    position: [-2, 1.45, -1.29], camera: [-1.8, 2.2, -3.5], target: [-2, 1.45, -1.29] },
  { id: 4, title: '铁与钉子', product: '钉子', resource: '铁', category: '连接构件',
    explanation: '铁矿石经过冶炼成为钢铁，再加工成钉子等连接件。观察墙体的小段剖面，钉子将木构件连接在一起。',
    observe: '如果没有这些连接件，构件还能牢固连接吗？', chain: ['铁矿石', '冶炼与金属加工', '钢钉'],
    position: [-4.636, 1.02, 3.67], camera: [-2.6, 1.8, 4.5], target: [-4.636, 1.02, 3.67] },
  { id: 5, title: '砂砾与混凝土', product: '混凝土', resource: '砂与砾石', category: '建筑基础',
    explanation: '砂和砾石是混凝土中的骨料。它们与水泥、水等拌合，硬化后形成混凝土，可用于地基、楼板等部位。',
    observe: '观察底座剖面：混凝土与室内地板有什么不同？', chain: ['砂、砾石', '加入水泥与水拌合', '混凝土'],
    position: [.5, .1, 6.08], camera: [2, 1.4, 8.5], target: [.5, .1, 6.08] },
  { id: 6, title: '石膏与石膏板', product: '石膏板', resource: '石膏', category: '室内隔墙',
    explanation: '石膏板是形成隔墙、吊顶等的板材，不是墙面漆。这处局部剖面展示了薄护面纸、白色石膏芯和内部钢龙骨。板面处理后，也可以再涂墙面漆。',
    observe: '对比第3处：哪一个是表面涂层，哪一个是板材？', chain: ['石膏', '形成石膏芯并覆纸', '纸面石膏板'],
    position: [4.53, .95, .8], camera: [4.15, 1.6, 2.4], target: [4.53, .95, .75] },
  { id: 7, title: '铝与汽车', product: '汽车', resource: '铝', category: '交通制造',
    explanation: '铝土矿等原料经加工、冶炼得到铝，制成铝合金后可用于汽车车身、轮毂等部件。汽车同时也使用钢铁、玻璃和其他材料。',
    observe: '除了铝，汽车中还能找到哪些图中的材料？', chain: ['铝土矿', '制取铝与铝合金', '汽车部件'],
    position: [4.13, 1.1, -3.56], camera: [8, 2.9, -2.1], target: [3.1, 1, -4.12] },
  { id: 8, title: '锂与电池', product: '电池', resource: '锂', category: '储能材料',
    explanation: '含锂矿产或卤水经加工得到锂化合物，可用于生产锂离子电池的材料。电池将多种材料组合起来，实现能量的储存与释放。这里抬起车身，示意车厢地板下方的动力电池；内部模组为教学示意。',
    observe: '电池和车库中的汽车有什么联系？', chain: ['含锂矿产或卤水', '锂化合物与电池材料', '锂离子电池'],
    position: [3.03, .63, -3.84], camera: [4.5, 1.4, -2.7], target: [3.03, .66, -4.12] },
]
