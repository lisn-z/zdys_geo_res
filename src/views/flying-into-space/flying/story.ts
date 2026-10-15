import type { Vec3T } from './math';
import { cosmicFlight, COSMIC_DURATION } from './cosmic-flight';
export interface ShotPose {
    position: Vec3T;
    target: Vec3T;
    fov: number;
}
export interface StoryShot {
    id: string;
    start: number;
    end: number;
    world: string;
    fromPose: ShotPose;
    toPose: ShotPose;
    description: string;
    orientation?: 'slerp';
}
export type GateKind = 'launch' | 'orbit' | 'look' | 'landing' | 'signal' | 'photo' | 'recovery' | 'relay' | 'rover' | 'station' | 'separate' | 'insertion';
export interface StoryGate {
    id: string;
    at: number;
    kind: GateKind;
    label: string;
}
export interface StoryChapter {
    id: number;
    index: number;
    start: number;
    duration: number;
    group: number;
    year: string;
    title: string;
    english: string;
    subtitle: string;
    textbook: boolean;
    narration: string;
    note: string;
    shots: StoryShot[];
    gates: StoryGate[];
    transition: string;
}
export const STORY_GROUPS = ['仰望与离地', '走出地球', '驻留与远探', '返回与建造', '接棒与回望'];
// Source: approved 飞向太空_沉浸式界面与章节分镜_v1.md. Camera coordinates are implementation choices.
export const STORY: StoryChapter[] = [
    {
        "id": 0,
        "index": 1,
        "start": 0,
        "duration": 28,
        "group": 0,
        "year": "序章",
        "title": "仰望星空",
        "english": "THE FIRST QUESTION",
        "subtitle": "天空之外，究竟还有什么？",
        "textbook": false,
        "narration": "在能够飞翔之前，人类先学会了仰望。天空之外，究竟还有什么？",
        "note": "这段故事从一次想象中的仰望开始。看到月亮和星星时，你最想问什么？",
        "shots": [
            {
                "id": "01-01",
                "start": 0,
                "end": 5,
                "world": "camp",
                "fromPose": {
                    "position": [
                        3.5,
                        2.2,
                        6
                    ],
                    "target": [
                        0,
                        0.5,
                        0
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        2,
                        1.5,
                        4
                    ],
                    "target": [
                        0,
                        0.5,
                        0
                    ],
                    "fov": 48
                },
                "description": "火星与木炭近景，人物的手臂或衣物进入边缘，先建立人的尺度"
            },
            {
                "id": "01-02",
                "start": 5,
                "end": 12,
                "world": "camp",
                "fromPose": {
                    "position": [
                        2,
                        1.5,
                        4
                    ],
                    "target": [
                        0,
                        0.5,
                        0
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        -2,
                        2.4,
                        7
                    ],
                    "target": [
                        0,
                        2,
                        -5
                    ],
                    "fov": 48
                },
                "description": "相机缓慢移到人物肩后，能看见前方的暗色山脊"
            },
            {
                "id": "01-03",
                "start": 12,
                "end": 21,
                "world": "camp",
                "fromPose": {
                    "position": [
                        -2,
                        2.4,
                        7
                    ],
                    "target": [
                        0,
                        2,
                        -5
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        -0.5,
                        2.8,
                        5
                    ],
                    "target": [
                        -7,
                        24,
                        -40
                    ],
                    "fov": 58
                },
                "description": "人物抬头，相机随之仰起；星空逐渐占据画面，月亮成为视线落点"
            },
            {
                "id": "01-04",
                "start": 21,
                "end": 25,
                "world": "camp",
                "fromPose": {
                    "position": [
                        -0.5,
                        2.8,
                        5
                    ],
                    "target": [
                        -7,
                        24,
                        -40
                    ],
                    "fov": 58
                },
                "toPose": {
                    "position": [
                        0,
                        2.8,
                        4
                    ],
                    "target": [
                        -7,
                        25,
                        -40
                    ],
                    "fov": 58
                },
                "description": "标题出现；镜头暂时稳定，保留安静的观看时间"
            },
            {
                "id": "01-05",
                "start": 25,
                "end": 28,
                "world": "camp",
                "fromPose": {
                    "position": [
                        0,
                        2.8,
                        4
                    ],
                    "target": [
                        -7,
                        25,
                        -40
                    ],
                    "fov": 58
                },
                "toPose": {
                    "position": [
                        1,
                        3,
                        4
                    ],
                    "target": [
                        0,
                        9,
                        -25
                    ],
                    "fov": 56
                },
                "description": "顺着山脊与天空的构图转向下一章；夜空渐变为清晨色调，年代出现"
            }
        ],
        "gates": [],
        "transition": "horizon"
    },
    {
        "id": 1,
        "index": 2,
        "start": 28,
        "duration": 34,
        "group": 0,
        "year": "1903",
        "title": "第一次离开地面",
        "english": "LEAVING THE GROUND",
        "subtitle": "飞行者一号 · 后置双桨推进",
        "textbook": false,
        "narration": "机器第一次带着人，完成了这样的动力飞行。通向天空的路，开始变得具体。",
        "note": "采用后置双螺旋桨推进，前方小翼为升降舵。这里表现低空短距离飞行，并非进入太空。",
        "shots": [
            {
                "id": "02-01",
                "start": 0,
                "end": 6,
                "world": "dune:flyer",
                "fromPose": {
                    "position": [
                        8.5,
                        3.0,
                        7
                    ],
                    "target": [
                        0,
                        1.1,
                        0
                    ],
                    "fov": 42
                },
                "toPose": {
                    "position": [
                        7,
                        2.3,
                        5
                    ],
                    "target": [
                        0,
                        1.1,
                        0
                    ],
                    "fov": 42
                },
                "description": "相机沿布面机翼和支撑杆移动，沙丘在背景中，飞机不悬空陈列"
            },
            {
                "id": "02-02",
                "start": 6,
                "end": 10,
                "world": "dune:flyer",
                "fromPose": {
                    "position": [
                        7,
                        2.3,
                        5
                    ],
                    "target": [
                        0,
                        1.1,
                        0
                    ],
                    "fov": 42
                },
                "toPose": {
                    "position": [
                        11,
                        1.6,
                        4
                    ],
                    "target": [
                        0,
                        1.3,
                        0
                    ],
                    "fov": 42
                },
                "description": "镜头落到机身侧前方，提示开始；后置螺旋桨从静止进入转动"
            },
            {
                "id": "02-03",
                "start": 10,
                "end": 24,
                "world": "dune:flyer",
                "fromPose": {
                    "position": [
                        11,
                        1.6,
                        4
                    ],
                    "target": [
                        0,
                        1.3,
                        0
                    ],
                    "fov": 42
                },
                "toPose": {
                    "position": [
                        12,
                        2.8,
                        4.5
                    ],
                    "target": [
                        0,
                        1.1,
                        0
                    ],
                    "fov": 43
                },
                "description": "沿地面平行跟拍飞机离地，始终保留机体与沙地之间的距离"
            },
            {
                "id": "02-04",
                "start": 24,
                "end": 30,
                "world": "dune:flyer",
                "fromPose": {
                    "position": [
                        12,
                        2.8,
                        4.5
                    ],
                    "target": [
                        0,
                        1.1,
                        0
                    ],
                    "fov": 43
                },
                "toPose": {
                    "position": [
                        13,
                        2.1,
                        4
                    ],
                    "target": [
                        0,
                        0.8,
                        0
                    ],
                    "fov": 46
                },
                "description": "飞机重新接近沙地，镜头稍落后，完整看到动作结束"
            },
            {
                "id": "02-05",
                "start": 30,
                "end": 34,
                "world": "dune:flyer",
                "fromPose": {
                    "position": [
                        13,
                        2.1,
                        4
                    ],
                    "target": [
                        0,
                        0.8,
                        0
                    ],
                    "fov": 46
                },
                "toPose": {
                    "position": [
                        3,
                        0.9,
                        4
                    ],
                    "target": [
                        0,
                        1.4,
                        0
                    ],
                    "fov": 40
                },
                "description": "近景掠过木质支架，利用杆件遮挡衔接下一章的金属支架"
            }
        ],
        "gates": [
            {
                "id": "1-launch",
                "at": 9,
                "kind": "launch",
                "label": "让飞行者一号起飞"
            }
        ],
        "transition": "strut"
    },
    {
        "id": 2,
        "index": 3,
        "start": 62,
        "duration": 28,
        "group": 0,
        "year": "1926",
        "title": "液体火箭的起点",
        "english": "A NEW WAY FORWARD",
        "subtitle": "戈达德 · 液体推进试验",
        "textbook": false,
        "narration": "通向太空的机器，此时还很简陋。但新的推进方式，已经开始飞行。",
        "note": "首次成功液体火箭飞行，不是首次到达太空。",
        "shots": [
            {
                "id": "03-01",
                "start": 0,
                "end": 6,
                "world": "field:goddard",
                "fromPose": {
                    "position": [
                        6.5,
                        3.7,
                        10
                    ],
                    "target": [
                        0,
                        2,
                        0
                    ],
                    "fov": 42
                },
                "toPose": {
                    "position": [
                        5,
                        3,
                        8
                    ],
                    "target": [
                        0,
                        2,
                        0
                    ],
                    "fov": 42
                },
                "description": "从金属支架近景后退，完整露出早期火箭装置"
            },
            {
                "id": "03-02",
                "start": 6,
                "end": 13,
                "world": "field:goddard",
                "fromPose": {
                    "position": [
                        5,
                        3,
                        8
                    ],
                    "target": [
                        0,
                        2,
                        0
                    ],
                    "fov": 42
                },
                "toPose": {
                    "position": [
                        2.5,
                        3.6,
                        4
                    ],
                    "target": [
                        0,
                        3,
                        0
                    ],
                    "fov": 45
                },
                "description": "接近发动机与管路；选看时高亮推进方向，不把场景切成另一张平面幻灯片"
            },
            {
                "id": "03-03",
                "start": 13,
                "end": 22,
                "world": "field:goddard",
                "fromPose": {
                    "position": [
                        2.5,
                        3.6,
                        4
                    ],
                    "target": [
                        0,
                        3,
                        0
                    ],
                    "fov": 45
                },
                "toPose": {
                    "position": [
                        6,
                        5,
                        11
                    ],
                    "target": [
                        0,
                        3,
                        0
                    ],
                    "fov": 44
                },
                "description": "完成短暂起飞，镜头不无限向高空追赶"
            },
            {
                "id": "03-04",
                "start": 22,
                "end": 25,
                "world": "field:goddard",
                "fromPose": {
                    "position": [
                        6,
                        5,
                        11
                    ],
                    "target": [
                        0,
                        3,
                        0
                    ],
                    "fov": 44
                },
                "toPose": {
                    "position": [
                        9,
                        4,
                        13
                    ],
                    "target": [
                        0,
                        2,
                        0
                    ],
                    "fov": 44
                },
                "description": "留住装置离地后的空间，显示年份与本次突破"
            },
            {
                "id": "03-05",
                "start": 25,
                "end": 28,
                "world": "field:goddard",
                "fromPose": {
                    "position": [
                        9,
                        4,
                        13
                    ],
                    "target": [
                        0,
                        2,
                        0
                    ],
                    "fov": 44
                },
                "toPose": {
                    "position": [
                        4,
                        4,
                        8
                    ],
                    "target": [
                        0,
                        14,
                        -4
                    ],
                    "fov": 55
                },
                "description": "视线转向天空，年代推进；相似仰视构图接入下一场"
            }
        ],
        "gates": [],
        "transition": "horizon"
    },
    {
        "id": 3,
        "index": 4,
        "start": 90,
        "duration": 30,
        "group": 0,
        "year": "1944",
        "title": "触及太空",
        "english": "BEYOND THE SKY",
        "subtitle": "越过高度门槛，还不是入轨",
        "textbook": false,
        "narration": "触及太空，是一道门槛。怎样持续环绕地球，是下一个问题。",
        "note": "海拔 100 千米常被用作太空的起点，但越过这一高度并不等于进入轨道。V-2 原本用于战争，这段历史也提醒我们思考科技如何服务和平。",
        "shots": [
            {
                "id": "04-01",
                "start": 0,
                "end": 8,
                "world": "pad:v2",
                "fromPose": {
                    "position": [
                        19,
                        12,
                        29
                    ],
                    "target": [
                        0,
                        6.5,
                        0
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        18,
                        11,
                        27
                    ],
                    "target": [
                        0,
                        6.5,
                        0
                    ],
                    "fov": 48
                },
                "description": "侧面跟拍上升中的早期火箭，先有箭体与空气环境的尺度感"
            },
            {
                "id": "04-02",
                "start": 8,
                "end": 17,
                "world": "earth:v2",
                "fromPose": {
                    "position": [
                        13.5,
                        8.7,
                        26
                    ],
                    "target": [
                        0,
                        1,
                        0
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        12,
                        8,
                        24
                    ],
                    "target": [
                        0,
                        1,
                        0
                    ],
                    "fov": 48
                },
                "description": "镜头后退，局部地面被球面地球承接，蓝天逐渐过渡到高空暗色"
            },
            {
                "id": "04-03",
                "start": 17,
                "end": 23,
                "world": "earth:v2",
                "fromPose": {
                    "position": [
                        12,
                        8,
                        24
                    ],
                    "target": [
                        0,
                        1,
                        0
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        16,
                        10,
                        29
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 48
                },
                "description": "100 km 标记短暂显现；它是一条辅助虚线，不是被撞破的玻璃罩"
            },
            {
                "id": "04-04",
                "start": 23,
                "end": 27,
                "world": "earth:v2",
                "fromPose": {
                    "position": [
                        16,
                        10,
                        29
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        26,
                        16,
                        34
                    ],
                    "target": [
                        0,
                        -9,
                        -16
                    ],
                    "fov": 48
                },
                "description": "镜头停在远景，轨迹继续弯向返回方向，强调“越界不等于入轨”"
            },
            {
                "id": "04-05",
                "start": 27,
                "end": 30,
                "world": "earth:v2",
                "fromPose": {
                    "position": [
                        26,
                        16,
                        34
                    ],
                    "target": [
                        0,
                        -9,
                        -16
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        18,
                        10,
                        30
                    ],
                    "target": [
                        0,
                        -5,
                        -12
                    ],
                    "fov": 48
                },
                "description": "保留地球的弧线位置，轨迹和箭体退出，接入下一章"
            }
        ],
        "gates": [],
        "transition": "earth"
    },
    {
        "id": 4,
        "index": 5,
        "start": 120,
        "duration": 32,
        "group": 1,
        "year": "1957",
        "title": "人造的星",
        "english": "AN ARTIFICIAL STAR",
        "subtitle": "第一颗人造地球卫星",
        "textbook": true,
        "narration": "人造的星，开始环绕我们的世界。",
        "note": "银色球体和四根长天线，是这颗卫星鲜明的外形。它绕地球飞行，将无线电信号传回地面。",
        "shots": [
            {
                "id": "05-01",
                "start": 0,
                "end": 7,
                "world": "earth:sputnik",
                "fromPose": {
                    "position": [
                        11.5,
                        4.7,
                        19
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 42
                },
                "toPose": {
                    "position": [
                        10,
                        4,
                        17
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 42
                },
                "description": "延续地球弧面，银色球形卫星进入前景；年份先于新任务名出现"
            },
            {
                "id": "05-02",
                "start": 7,
                "end": 15,
                "world": "earth:sputnik",
                "fromPose": {
                    "position": [
                        10,
                        4,
                        17
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 42
                },
                "toPose": {
                    "position": [
                        6,
                        2,
                        11
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 40
                },
                "description": "镜头平稳靠近卫星，清楚展示银色球壳与四根后掠天线"
            },
            {
                "id": "05-03",
                "start": 15,
                "end": 25,
                "world": "earth:sputnik",
                "fromPose": {
                    "position": [
                        6,
                        2,
                        11
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 40
                },
                "toPose": {
                    "position": [
                        15,
                        8,
                        25
                    ],
                    "target": [
                        0,
                        -4,
                        -8
                    ],
                    "fov": 48
                },
                "description": "相机渐退、侧移，逐步显示卫星与地球的位置关系；地球不只是背景墙"
            },
            {
                "id": "05-04",
                "start": 25,
                "end": 29,
                "world": "earth:sputnik",
                "fromPose": {
                    "position": [
                        15,
                        8,
                        25
                    ],
                    "target": [
                        0,
                        -4,
                        -8
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        19,
                        9,
                        29
                    ],
                    "target": [
                        0,
                        -8,
                        -14
                    ],
                    "fov": 50
                },
                "description": "保留一幅简洁的在轨画面，短无线电拟音回应卫星的存在"
            },
            {
                "id": "05-05",
                "start": 29,
                "end": 32,
                "world": "earth:sputnik",
                "fromPose": {
                    "position": [
                        19,
                        9,
                        29
                    ],
                    "target": [
                        0,
                        -8,
                        -14
                    ],
                    "fov": 50
                },
                "toPose": {
                    "position": [
                        26,
                        15,
                        34
                    ],
                    "target": [
                        0,
                        -10,
                        -16
                    ],
                    "fov": 50
                },
                "description": "缓慢浮现轨迹辅助线，进入原理实验；相机继续同方向移动"
            }
        ],
        "gates": [],
        "transition": "earth"
    },
    {
        "id": 5,
        "index": 6,
        "start": 152,
        "duration": 42,
        "group": 1,
        "year": "原理实验",
        "title": "高度之外，还需要速度",
        "english": "THE LANGUAGE OF ORBITS",
        "subtitle": "同样的高度，不同的横向速度",
        "textbook": false,
        "narration": "留在轨道，需要合适的横向速度。高度相同，速度不同，轨迹也不同。真实绕行一周，约需九十二分钟。",
        "note": "从地表以上 400 千米的同一位置，分别以两种水平速度出发，看看轨迹有何不同。在这个高度，每秒约 7.67 千米可以形成圆形轨道。更慢的速度也可能形成椭圆轨道，取决于轨迹是否碰到地表。这次实验先只考虑地球引力；真实飞行还会受到空气阻力等影响。",
        "shots": [
            {
                "id": "06-01",
                "start": 0,
                "end": 8,
                "world": "orbit:experiment",
                "fromPose": {
                    "position": [
                        1.5,
                        3.7,
                        32
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        0,
                        3,
                        30
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 48
                },
                "description": "稳定转到易于看清轨迹的方向，保留地球、起始点与试验卫星"
            },
            {
                "id": "06-02",
                "start": 8,
                "end": 17,
                "world": "orbit:experiment",
                "fromPose": {
                    "position": [
                        0,
                        3,
                        30
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        0,
                        3,
                        28
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 48
                },
                "description": "从 400 km 高处以 5.60 km/s 横向释放，展示与地表相交的轨迹"
            },
            {
                "id": "06-03",
                "start": 17,
                "end": 31,
                "world": "orbit:experiment",
                "fromPose": {
                    "position": [
                        0,
                        3,
                        28
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        0,
                        2,
                        29
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 48
                },
                "description": "从同一起点重新以约 7.67 km/s 横向释放，自动演示圆轨道"
            },
            {
                "id": "06-04",
                "start": 31,
                "end": 38,
                "world": "orbit:experiment",
                "fromPose": {
                    "position": [
                        0,
                        2,
                        29
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        2,
                        3,
                        30
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 48
                },
                "description": "继续展示约 92 分钟一次的圆轨道，时间压缩；速度箭头沿轨迹切向"
            },
            {
                "id": "06-05",
                "start": 38,
                "end": 42,
                "world": "orbit:experiment",
                "fromPose": {
                    "position": [
                        2,
                        3,
                        30
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        8,
                        8,
                        28
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 48
                },
                "description": "辅助图层依次退场，相机望向地球上的下一段故事，进入 1961 年"
            }
        ],
        "gates": [
            {
                "id": "5-orbit",
                "at": 17,
                "kind": "orbit",
                "label": "比较同一高度下两种初始横向速度的轨迹"
            }
        ],
        "transition": "cloud"
    },
    {
        "id": 6,
        "index": 7,
        "start": 194,
        "duration": 62,
        "group": 1,
        "year": "1961",
        "title": "地球，在窗外",
        "english": "EARTH THROUGH A WINDOW",
        "subtitle": "东方一号 · 加加林的太空旅程",
        "textbook": true,
        "narration": "当人真正来到这里，地球成为了窗外的风景。",
        "note": "从舷窗向外望，熟悉的大地变成了海洋、陆地和云层交织的蓝色星球。试着转动视线，找一找地球边缘那层薄薄的大气。",
        "shots": [
            {
                "id": "07-01",
                "start": 0,
                "end": 7,
                "world": "pad:vostok",
                "fromPose": {
                    "position": [
                        27.5,
                        13.7,
                        33
                    ],
                    "target": [
                        0,
                        11,
                        0
                    ],
                    "fov": 45
                },
                "toPose": {
                    "position": [
                        26,
                        13,
                        31
                    ],
                    "target": [
                        0,
                        9,
                        0
                    ],
                    "fov": 48
                },
                "description": "从上一章的地球视角过渡到任务发射场，运载火箭与塔架建立空间关系"
            },
            {
                "id": "07-02",
                "start": 7,
                "end": 15,
                "world": "pad:vostok",
                "fromPose": {
                    "position": [
                        26,
                        13,
                        31
                    ],
                    "target": [
                        0,
                        9,
                        0
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        21,
                        11,
                        30
                    ],
                    "target": [
                        0,
                        9,
                        0
                    ],
                    "fov": 48
                },
                "description": "点火升空，相机在侧下方跟随，塔架逐渐落出画面"
            },
            {
                "id": "07-03",
                "start": 15,
                "end": 23,
                "world": "earth:vostok",
                "fromPose": {
                    "position": [
                        10,
                        -3.5,
                        7
                    ],
                    "target": [
                        -0.3,
                        -0.1,
                        0
                    ],
                    "fov": 44
                },
                "toPose": {
                    "position": [
                        7.4,
                        -3.1,
                        5.1
                    ],
                    "target": [
                        0.25,
                        -0.2,
                        -0.1
                    ],
                    "fov": 44
                },
                "description": "以时间压缩推进飞行阶段，从侧下方接近朝向地球弧面的舷窗，再接入舱内所见"
            },
            {
                "id": "07-04",
                "start": 23,
                "end": 29,
                "world": "cabin",
                "fromPose": {
                    "position": [
                        0.12,
                        1.2,
                        0.7
                    ],
                    "target": [
                        0,
                        -10,
                        -72
                    ],
                    "fov": 58
                },
                "toPose": {
                    "position": [
                        0.12,
                        1.2,
                        0.7
                    ],
                    "target": [
                        0,
                        -10,
                        -72
                    ],
                    "fov": 58
                },
                "description": "深色舱体边缘掠过前景，在遮挡处切换到座椅附近的局部相机"
            },
            {
                "id": "07-05",
                "start": 29,
                "end": 38,
                "world": "cabin",
                "fromPose": {
                    "position": [
                        0,
                        1.18,
                        0.45
                    ],
                    "target": [
                        0,
                        -10,
                        -72
                    ],
                    "fov": 58
                },
                "toPose": {
                    "position": [
                        0,
                        1.18,
                        0.45
                    ],
                    "target": [
                        0,
                        -10,
                        -72
                    ],
                    "fov": 58
                },
                "description": "窗框与下缘少量仪表稳定下来，地球弧面从窗外缓慢经过"
            },
            {
                "id": "07-06",
                "start": 38,
                "end": 49,
                "world": "cabin",
                "fromPose": {
                    "position": [
                        0,
                        1.18,
                        0.45
                    ],
                    "target": [
                        0,
                        -10,
                        -72
                    ],
                    "fov": 58
                },
                "toPose": {
                    "position": [
                        0,
                        1.18,
                        0.45
                    ],
                    "target": [
                        0,
                        -10,
                        -72
                    ],
                    "fov": 58
                },
                "description": "用户轻轻转头，观察云层、海陆轮廓和大气薄边"
            },
            {
                "id": "07-07",
                "start": 49,
                "end": 57,
                "world": "cabin",
                "fromPose": {
                    "position": [
                        0,
                        1.18,
                        0.45
                    ],
                    "target": [
                        0,
                        -10,
                        -72
                    ],
                    "fov": 58
                },
                "toPose": {
                    "position": [
                        0,
                        1.18,
                        0.45
                    ],
                    "target": [
                        0,
                        -10,
                        -72
                    ],
                    "fov": 58
                },
                "description": "视线重新落在地球边缘，减弱所有数据和提示，保留临场感"
            },
            {
                "id": "07-08",
                "start": 57,
                "end": 62,
                "world": "cabin",
                "fromPose": {
                    "position": [
                        0,
                        1.18,
                        0.45
                    ],
                    "target": [
                        0,
                        -10,
                        -72
                    ],
                    "fov": 58
                },
                "toPose": {
                    "position": [
                        0,
                        1.18,
                        0.45
                    ],
                    "target": [
                        0,
                        -10,
                        -72
                    ],
                    "fov": 58
                },
                "description": "镜头朝窗外暗色天空偏转，窗框掠过；借暗部匹配衔接 1969 年的新场景"
            }
        ],
        "gates": [
            {
                "id": "6-launch",
                "at": 7,
                "kind": "launch",
                "label": "准备升空"
            },
            {
                "id": "6-look",
                "at": 38,
                "kind": "look",
                "label": "轻轻拖动视线，看看窗外的地球"
            }
        ],
        "transition": "window"
    },
    {
        "id": 7,
        "index": 8,
        "start": 256,
        "duration": 78,
        "group": 1,
        "year": "1969",
        "title": "脚步落在另一个世界",
        "english": "ANOTHER WORLD",
        "subtitle": "阿波罗 11 号 · 从地球到月面",
        "textbook": true,
        "narration": "从仰望到抵达，距离不再只是一种想象。",
        "note": "阿波罗 11 号将人类的足迹留在了月球。观察宇航员走下舷梯、踏上月面的过程，想一想：在另一个世界迈出第一步，会是什么感受？",
        "shots": [
            {
                "id": "08-01",
                "start": 0,
                "end": 10,
                "world": "coast:saturn",
                "fromPose": {
                    "position": [
                        10.5,
                        2.7,
                        20
                    ],
                    "target": [
                        0,
                        14,
                        0
                    ],
                    "fov": 47
                },
                "toPose": {
                    "position": [
                        19,
                        10,
                        34
                    ],
                    "target": [
                        0,
                        9.5,
                        0
                    ],
                    "fov": 49
                },
                "description": "从箭体脚下仰望建立尺度，再后退抬高机位，留出发动机与排焰槽的完整视野"
            },
            {
                "id": "08-02",
                "start": 10,
                "end": 23,
                "world": "coast:saturn",
                "fromPose": {
                    "position": [
                        19,
                        10,
                        34
                    ],
                    "target": [
                        0,
                        9.5,
                        0
                    ],
                    "fov": 49
                },
                "toPose": {
                    "position": [
                        26,
                        16,
                        36
                    ],
                    "target": [
                        0,
                        10.5,
                        0
                    ],
                    "fov": 49
                },
                "description": "点火蓄力时保留地面排焰，离架后镜头稍作停留，再平滑跟随箭体上升"
            },
            {
                "id": "08-03",
                "start": 23,
                "end": 36,
                "world": "transfer",
                "fromPose": {
                    "position": [
                        3.5,
                        13.7,
                        56
                    ],
                    "target": [
                        2,
                        0,
                        0
                    ],
                    "fov": 45
                },
                "toPose": {
                    "position": [
                        2,
                        13,
                        54
                    ],
                    "target": [
                        2,
                        0,
                        0
                    ],
                    "fov": 45
                },
                "description": "转为地月关系示意，表现奔月方向；明确时间与距离压缩，地球与月球都保留参考位置"
            },
            {
                "id": "08-04",
                "start": 36,
                "end": 47,
                "world": "moonOrbit:apollo",
                "fromPose": {
                    "position": [
                        14.5,
                        6.7,
                        22
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 45
                },
                "toPose": {
                    "position": [
                        13,
                        6,
                        20
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 45
                },
                "description": "月球轨道中的指令服务舱与登月舱分离，镜头转而跟随下降的一侧"
            },
            {
                "id": "08-05",
                "start": 47,
                "end": 62,
                "world": "lunar:apollo",
                "fromPose": {
                    "position": [
                        13.5,
                        6.7,
                        19
                    ],
                    "target": [
                        0,
                        3,
                        0
                    ],
                    "fov": 43
                },
                "toPose": {
                    "position": [
                        12,
                        6,
                        17
                    ],
                    "target": [
                        0,
                        3,
                        0
                    ],
                    "fov": 43
                },
                "description": "登月舱接近地表，进入最后一段辅助着陆体验；高度、下降速度、推进剂按需出现"
            },
            {
                "id": "08-06",
                "start": 62,
                "end": 65.8,
                "world": "lunar:apollo",
                "fromPose": {
                    "position": [
                        12,
                        6,
                        17
                    ],
                    "target": [
                        0,
                        3,
                        0
                    ],
                    "fov": 43
                },
                "toPose": {
                    "position": [
                        2.8,
                        2.4,
                        5.5
                    ],
                    "target": [
                        0,
                        1.2,
                        2.73
                    ],
                    "fov": 46
                },
                "description": "着陆稳定后再出舱，面向舷梯下降至脚垫，镜头跟到舷梯下方。"
            },
            {
                "id": "08-07",
                "start": 65.8,
                "end": 68.2,
                "world": "lunar:apollo",
                "fromPose": {
                    "position": [
                        2.8,
                        2.4,
                        5.5
                    ],
                    "target": [
                        0,
                        1.2,
                        2.73
                    ],
                    "fov": 46
                },
                "toPose": {
                    "position": [
                        0.75,
                        0.48,
                        4.22
                    ],
                    "target": [
                        -0.18,
                        0.028,
                        3.45
                    ],
                    "fov": 35
                },
                "description": "转身面向月面，左靴伸出；67.2秒接触后才出现与靴底一致的压痕。"
            },
            {
                "id": "08-08",
                "start": 68.2,
                "end": 72.8,
                "world": "lunar:apollo",
                "fromPose": {
                    "position": [
                        0.75,
                        0.48,
                        4.22
                    ],
                    "target": [
                        -0.18,
                        0.028,
                        3.45
                    ],
                    "fov": 35
                },
                "toPose": {
                    "position": [
                        0.53,
                        0.36,
                        4.05
                    ],
                    "target": [
                        -0.18,
                        0.014,
                        3.45
                    ],
                    "fov": 35
                },
                "description": "相机真正靠近第一个脚印；靴子移开后保留约3秒压痕近景，不生成放大的假脚印。"
            },
            {
                "id": "08-09",
                "start": 72.8,
                "end": 78,
                "world": "lunar:apollo",
                "fromPose": {
                    "position": [
                        0.53,
                        0.36,
                        4.05
                    ],
                    "target": [
                        -0.18,
                        0.014,
                        3.45
                    ],
                    "fov": 35
                },
                "toPose": {
                    "position": [
                        2.85,
                        1.95,
                        8.2
                    ],
                    "target": [
                        -80,
                        220,
                        -700
                    ],
                    "fov": 48
                },
                "orientation": "slerp",
                "description": "补入宇航员背后视角：先在身后一点看向地球，再顺势抬头，把地球放进远方。"
            }
        ],
        "gates": [
            {
                "id": "7-landing",
                "at": 50,
                "kind": "landing",
                "label": "控制最后一段月面下降"
            }
        ],
        "transition": "earth"
    },
    {
        "id": 8,
        "index": 9,
        "start": 334,
        "duration": 34,
        "group": 2,
        "year": "1970",
        "title": "东方红一号",
        "english": "A SIGNAL FROM CHINA",
        "subtitle": "中国第一颗人造地球卫星",
        "textbook": true,
        "narration": "来自中国的第一颗人造卫星，将新的信号带入太空。",
        "note": "东方红一号是中国第一颗人造地球卫星。观察它的多面体外壳和细长天线，想一想：来自太空的信号，怎样让地面的人知道它已经抵达？",
        "shots": [
            {
                "id": "09-01",
                "start": 0,
                "end": 7,
                "world": "pad:cz1",
                "fromPose": {
                    "position": [
                        25.5,
                        12.7,
                        34
                    ],
                    "target": [
                        0,
                        7.5,
                        0
                    ],
                    "fov": 45
                },
                "toPose": {
                    "position": [
                        24,
                        12,
                        32
                    ],
                    "target": [
                        0,
                        7.5,
                        0
                    ],
                    "fov": 45
                },
                "description": "延续地球的方向感，年份变化，再到地面发射场的简短建立镜头"
            },
            {
                "id": "09-02",
                "start": 7,
                "end": 15,
                "world": "pad:cz1",
                "fromPose": {
                    "position": [
                        24,
                        12,
                        32
                    ],
                    "target": [
                        0,
                        7.5,
                        0
                    ],
                    "fov": 45
                },
                "toPose": {
                    "position": [
                        14,
                        8,
                        23
                    ],
                    "target": [
                        0,
                        7.5,
                        0
                    ],
                    "fov": 44
                },
                "description": "简短展示长征一号发射，随后转入东方红一号在轨画面"
            },
            {
                "id": "09-03",
                "start": 15,
                "end": 24,
                "world": "earth:dfh",
                "fromPose": {
                    "position": [
                        7,
                        3,
                        11
                    ],
                    "target": [
                        0,
                        0.2,
                        0
                    ],
                    "fov": 42
                },
                "toPose": {
                    "position": [
                        3.8,
                        1.5,
                        6.4
                    ],
                    "target": [
                        0,
                        0.12,
                        0
                    ],
                    "fov": 37
                },
                "description": "近看东方红一号外形与天线，地球从其后方经过"
            },
            {
                "id": "09-04",
                "start": 24,
                "end": 30,
                "world": "earth:dfh",
                "fromPose": {
                    "position": [
                        3.8,
                        1.5,
                        6.4
                    ],
                    "target": [
                        0,
                        0.12,
                        0
                    ],
                    "fov": 37
                },
                "toPose": {
                    "position": [
                        4.8,
                        0.8,
                        5.8
                    ],
                    "target": [
                        0,
                        0.1,
                        0
                    ],
                    "fov": 37
                },
                "description": "以接收设备与在轨卫星的画面联系表达“信号抵达地面”"
            },
            {
                "id": "09-05",
                "start": 30,
                "end": 34,
                "world": "earth:dfh",
                "fromPose": {
                    "position": [
                        4.8,
                        0.8,
                        5.8
                    ],
                    "target": [
                        0,
                        0.1,
                        0
                    ],
                    "fov": 37
                },
                "toPose": {
                    "position": [
                        7,
                        3,
                        12
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 43
                },
                "description": "地球保持位置，镜头掠过天线，接入下一章的空间站外形"
            }
        ],
        "gates": [
            {
                "id": "8-signal",
                "at": 24,
                "kind": "signal",
                "label": "接收来自卫星的信号"
            }
        ],
        "transition": "strut"
    },
    {
        "id": 9,
        "index": 10,
        "start": 368,
        "duration": 34,
        "group": 2,
        "year": "1971",
        "title": "在太空多停留一会儿",
        "english": "A PLACE TO STAY",
        "subtitle": "礼炮一号 · 首个空间站",
        "textbook": true,
        "narration": "人类开始思考的不只是到达，还有怎样留下来。",
        "note": "空间站让航天员能够在太空中停留更久。工作、生活和科学实验，都需要在有限的舱内空间里安排妥当。",
        "shots": [
            {
                "id": "10-01",
                "start": 0,
                "end": 8,
                "world": "earth:salyut",
                "fromPose": {
                    "position": [
                        13.5,
                        4.7,
                        17
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 44
                },
                "toPose": {
                    "position": [
                        12,
                        4,
                        15
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 44
                },
                "description": "地球仍作环境参照，镜头沿空间站轴向移动，显示它与普通卫星不同的体量"
            },
            {
                "id": "10-02",
                "start": 8,
                "end": 18,
                "world": "earth:salyut",
                "fromPose": {
                    "position": [
                        12,
                        4,
                        15
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 44
                },
                "toPose": {
                    "position": [
                        11,
                        5,
                        19
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 46
                },
                "description": "从端部移动到侧面，太阳翼与舱体形成层次，暂不堆满结构标签"
            },
            {
                "id": "10-03",
                "start": 18,
                "end": 27,
                "world": "earth:salyut",
                "fromPose": {
                    "position": [
                        11,
                        5,
                        19
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 46
                },
                "toPose": {
                    "position": [
                        8,
                        3,
                        15
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 48
                },
                "description": "局部剖视出现工作、生活空间的功能示意；外部轮廓仍保留作为参照"
            },
            {
                "id": "10-04",
                "start": 27,
                "end": 30,
                "world": "earth:salyut",
                "fromPose": {
                    "position": [
                        8,
                        3,
                        15
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        12,
                        6,
                        22
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 46
                },
                "description": "退出剖视，恢复完整空间站，远处地球缓慢移动"
            },
            {
                "id": "10-05",
                "start": 30,
                "end": 34,
                "world": "earth:salyut",
                "fromPose": {
                    "position": [
                        12,
                        6,
                        22
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 46
                },
                "toPose": {
                    "position": [
                        16,
                        10,
                        27
                    ],
                    "target": [
                        0,
                        -4,
                        -6
                    ],
                    "fov": 48
                },
                "description": "镜头沿太阳翼指向星空，下一任务年代和火星目标逐渐出现"
            }
        ],
        "gates": [],
        "transition": "horizon"
    },
    {
        "id": 10,
        "index": 11,
        "start": 402,
        "duration": 40,
        "group": 2,
        "year": "1976",
        "title": "火星的地平线",
        "english": "THE MARTIAN HORIZON",
        "subtitle": "海盗一号 · 固定式着陆器",
        "textbook": true,
        "narration": "遥远的红色光点，变成了眼前的岩石、土壤与地平线。",
        "note": "海盗一号于7月20日着陆，由三条支腿稳稳支撑。7月28日，它开始用向前伸出的取样臂采集火星土壤，再送入着陆器的分析仪器。",
        "shots": [
            {
                "id": "11-01",
                "start": 0,
                "end": 8,
                "world": "marsOrbit:viking",
                "fromPose": {
                    "position": [
                        15.5,
                        6.7,
                        25
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 45
                },
                "toPose": {
                    "position": [
                        14,
                        6,
                        23
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 45
                },
                "description": "火星从目标逐步成为有体量的球体，环绕器与着陆器关系简洁交代"
            },
            {
                "id": "11-02",
                "start": 8,
                "end": 19,
                "world": "mars:viking",
                "fromPose": {
                    "position": [
                        12.5,
                        6.7,
                        18
                    ],
                    "target": [
                        0,
                        3,
                        0
                    ],
                    "fov": 44
                },
                "toPose": {
                    "position": [
                        11,
                        6,
                        16
                    ],
                    "target": [
                        0,
                        3,
                        0
                    ],
                    "fov": 44
                },
                "description": "经过明确的时间压缩，进入降落与接近地表的段落，不把在轨模型瞬移到地面"
            },
            {
                "id": "11-03",
                "start": 19,
                "end": 28,
                "world": "mars:viking",
                "fromPose": {
                    "position": [
                        11,
                        6,
                        16
                    ],
                    "target": [
                        0,
                        3,
                        0
                    ],
                    "fov": 44
                },
                "toPose": {
                    "position": [
                        6,
                        2.1,
                        8
                    ],
                    "target": [
                        0,
                        1,
                        0
                    ],
                    "fov": 48
                },
                "description": "相机沿着陆器支腿下降，落到其观察高度，看见岩块与远处地平线"
            },
            {
                "id": "11-04",
                "start": 28,
                "end": 36,
                "world": "mars:viking",
                "fromPose": {
                    "position": [
                        6,
                        2.1,
                        8
                    ],
                    "target": [
                        0,
                        1,
                        0
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        0,
                        2.2,
                        1
                    ],
                    "target": [
                        0,
                        1.8,
                        -25
                    ],
                    "fov": 55
                },
                "description": "用户选取观察方向，模拟图像按扫描感逐步呈现，强调“看见”"
            },
            {
                "id": "11-05",
                "start": 36,
                "end": 40,
                "world": "mars:viking",
                "fromPose": {
                    "position": [
                        0,
                        2.2,
                        1
                    ],
                    "target": [
                        0,
                        1.8,
                        -25
                    ],
                    "fov": 55
                },
                "toPose": {
                    "position": [
                        4,
                        3,
                        8
                    ],
                    "target": [
                        0,
                        1.5,
                        0
                    ],
                    "fov": 45
                },
                "description": "模拟图像收进一块资料画面，以相近的显示区域衔接下一任务地面监测画面"
            }
        ],
        "gates": [
            {
                "id": "10-photo",
                "at": 28,
                "kind": "photo",
                "label": "记录眼前的火星地平线"
            }
        ],
        "transition": "screen"
    },
    {
        "id": 11,
        "index": 12,
        "start": 442,
        "duration": 42,
        "group": 2,
        "year": "2003",
        "title": "出发，也要归来",
        "english": "THE JOURNEY HOME",
        "subtitle": "神舟五号 · 载人飞行与返回",
        "textbook": true,
        "narration": "太空旅程的另一半，是归来。",
        "note": "神舟五号的轨道舱和推进舱各带一对太阳翼。返回时先分离轨道舱，推进舱与返回舱保持连接完成制动，再分离推进舱。最后只有航天员乘坐的返回舱进入大气层并着陆。",
        "shots": [
            {
                "id": "12-01",
                "start": 0,
                "end": 8,
                "world": "pad:cz2f",
                "fromPose": {
                    "position": [
                        30,
                        16,
                        38
                    ],
                    "target": [
                        0,
                        9,
                        0
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        28,
                        15,
                        36
                    ],
                    "target": [
                        0,
                        9,
                        0
                    ],
                    "fov": 48
                },
                "description": "从地面任务画面来到发射场，2003 年与任务名完成交代"
            },
            {
                "id": "12-02",
                "start": 8,
                "end": 19,
                "world": "earth:shenzhou",
                "fromPose": {
                    "position": [
                        14.5,
                        6.7,
                        24
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 44
                },
                "toPose": {
                    "position": [
                        13,
                        6,
                        22
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 44
                },
                "description": "起飞后进入飞船在轨，重点展示神舟的结构轮廓，而不是复制东方一号座舱段"
            },
            {
                "id": "12-03",
                "start": 19,
                "end": 28,
                "world": "earth:shenzhou",
                "fromPose": {
                    "position": [
                        13,
                        6,
                        22
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 44
                },
                "toPose": {
                    "position": [
                        9,
                        4,
                        15
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 45
                },
                "description": "轨道舱先分离留轨，返回舱与推进舱一起调姿制动，随后推进舱分离，返回舱独自进入返回阶段"
            },
            {
                "id": "12-04",
                "start": 28,
                "end": 37,
                "world": "return:shenzhou",
                "fromPose": {
                    "position": [
                        13.5,
                        6.7,
                        20
                    ],
                    "target": [
                        0,
                        3,
                        0
                    ],
                    "fov": 46
                },
                "toPose": {
                    "position": [
                        12,
                        6,
                        18
                    ],
                    "target": [
                        0,
                        3,
                        0
                    ],
                    "fov": 46
                },
                "description": "以有明确阶段标识的镜头表现返回过程；不把整艘飞船完整落到地面"
            },
            {
                "id": "12-05",
                "start": 37,
                "end": 42,
                "world": "return:shenzhou",
                "fromPose": {
                    "position": [
                        12,
                        6,
                        18
                    ],
                    "target": [
                        0,
                        3,
                        0
                    ],
                    "fov": 46
                },
                "toPose": {
                    "position": [
                        14,
                        7,
                        23
                    ],
                    "target": [
                        3,
                        1.8,
                        0
                    ],
                    "fov": 47
                },
                "description": "触地后稍稍拉开镜头，完整看见返回舱、松垂的伞绳与逐渐瘪下落地的伞布"
            }
        ],
        "gates": [],
        "transition": "horizon"
    },
    {
        "id": 12,
        "index": 13,
        "start": 484,
        "duration": 48,
        "group": 3,
        "year": "2015",
        "title": "追随返回者",
        "english": "THE RETURNING STAGE",
        "subtitle": "猎鹰 9 号 · 一级陆上回收",
        "textbook": true,
        "narration": "二级继续加速入轨，一级沿返回弧线下降，经过再入和着陆点火，重新站回地面。",
        "note": "2015 年，猎鹰 9 号首次实现一级火箭陆上回收。一级到达高空后沿亚轨道轨迹返回，没有绕地入轨；二级继续加速，把载荷送入轨道。一级依次经历主机关机、分离、调姿、返程点火、再入点火和着陆点火。",
        "shots": [
            {
                "id": "13-01",
                "start": 0,
                "end": 8,
                "world": "earth:falcon",
                "fromPose": {
                    "position": [
                        20.5,
                        9.7,
                        30
                    ],
                    "target": [
                        0,
                        4.5,
                        0
                    ],
                    "fov": 46
                },
                "toPose": {
                    "position": [
                        19,
                        9,
                        28
                    ],
                    "target": [
                        0,
                        4.5,
                        0
                    ],
                    "fov": 46
                },
                "description": "相机自地面抬向高空，年代变化，进入当前任务分离前的建立镜头"
            },
            {
                "id": "13-02",
                "start": 8,
                "end": 16,
                "world": "earth:falcon",
                "fromPose": {
                    "position": [
                        19,
                        9,
                        28
                    ],
                    "target": [
                        0,
                        4.5,
                        0
                    ],
                    "fov": 46
                },
                "toPose": {
                    "position": [
                        20,
                        8,
                        29
                    ],
                    "target": [
                        0,
                        1,
                        0
                    ],
                    "fov": 44
                },
                "description": "一二级分离：二级继续执行运载任务，一级沿另一过程返回"
            },
            {
                "id": "13-03",
                "start": 16,
                "end": 25,
                "world": "earth:falcon",
                "fromPose": {
                    "position": [
                        20,
                        8,
                        29
                    ],
                    "target": [
                        0,
                        1,
                        0
                    ],
                    "fov": 44
                },
                "toPose": {
                    "position": [
                        23.5,
                        4.7,
                        36
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 47
                },
                "description": "一级翻转后返程点火，随后熄火滑行；二级持续点火运送载荷"
            },
            {
                "id": "13-04",
                "start": 25,
                "end": 36,
                "world": "recovery:falcon",
                "fromPose": {
                    "position": [
                        23.5,
                        14.7,
                        36
                    ],
                    "target": [
                        0,
                        10,
                        0
                    ],
                    "fov": 47
                },
                "toPose": {
                    "position": [
                        22,
                        14,
                        34
                    ],
                    "target": [
                        0,
                        10,
                        0
                    ],
                    "fov": 47
                },
                "description": "一级熄火滑行，短暂再入减速点火后再次关机，栅格舵引导下降"
            },
            {
                "id": "13-05",
                "start": 36,
                "end": 44,
                "world": "recovery:falcon",
                "fromPose": {
                    "position": [
                        22,
                        14,
                        34
                    ],
                    "target": [
                        0,
                        10,
                        0
                    ],
                    "fov": 47
                },
                "toPose": {
                    "position": [
                        13,
                        3,
                        22
                    ],
                    "target": [
                        0,
                        10,
                        0
                    ],
                    "fov": 45
                },
                "description": "熄火下降后，中心发动机执行着陆点火；四腿绕固定铰链展开，落稳关机"
            },
            {
                "id": "13-06",
                "start": 44,
                "end": 48,
                "world": "recovery:falcon",
                "fromPose": {
                    "position": [
                        13,
                        3,
                        22
                    ],
                    "target": [
                        0,
                        10,
                        0
                    ],
                    "fov": 45
                },
                "toPose": {
                    "position": [
                        15,
                        3,
                        24
                    ],
                    "target": [
                        0,
                        13,
                        0
                    ],
                    "fov": 49
                },
                "description": "一级静止，尾焰熄灭；镜头上仰，利用天空与月亮的构图接入月背任务"
            }
        ],
        "gates": [
            {
                "id": "12-recovery",
                "at": 36,
                "kind": "recovery",
                "label": "启动辅助着陆减速"
            }
        ],
        "transition": "horizon"
    },
    {
        "id": 13,
        "index": 14,
        "start": 532,
        "duration": 45,
        "group": 3,
        "year": "2019",
        "title": "月背与一条联系",
        "english": "A CONNECTION BEYOND SIGHT",
        "subtitle": "嫦娥四号 · 月球背面着陆",
        "textbook": true,
        "narration": "走到看不见地球的地方，也要为彼此保留一条联系。",
        "note": "月球挡住了月背与地球之间的直接通信。鹊桥中继卫星像一座通信桥梁，让嫦娥四号和玉兔二号的消息传回地球。",
        "shots": [
            {
                "id": "14-01",
                "start": 0,
                "end": 9,
                "world": "relay",
                "fromPose": {
                    "position": [
                        1.5,
                        24.7,
                        47
                    ],
                    "target": [
                        -7,
                        0,
                        0
                    ],
                    "fov": 49
                },
                "toPose": {
                    "position": [
                        0,
                        24,
                        45
                    ],
                    "target": [
                        -7,
                        0,
                        0
                    ],
                    "fov": 49
                },
                "description": "月亮在视野中变大；切入地月关系示意，明确目标是月球背面"
            },
            {
                "id": "14-02",
                "start": 9,
                "end": 19,
                "world": "relay",
                "fromPose": {
                    "position": [
                        0,
                        24,
                        45
                    ],
                    "target": [
                        -7,
                        0,
                        0
                    ],
                    "fov": 49
                },
                "toPose": {
                    "position": [
                        19,
                        15,
                        29
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 49
                },
                "description": "相机绕到月背一侧，月球遮住直接望向地球的方向；停住让用户看清"
            },
            {
                "id": "14-03",
                "start": 19,
                "end": 29,
                "world": "relay",
                "fromPose": {
                    "position": [
                        19,
                        15,
                        29
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 49
                },
                "toPose": {
                    "position": [
                        1,
                        15,
                        41
                    ],
                    "target": [
                        -5,
                        0,
                        0
                    ],
                    "fov": 49
                },
                "description": "鹊桥与中继链路出现，接通后再把视线带回月面，而非凭空出现信号"
            },
            {
                "id": "14-04",
                "start": 29,
                "end": 40,
                "world": "lunar:change",
                "fromPose": {
                    "position": [
                        9,
                        5.8,
                        13
                    ],
                    "target": [
                        0,
                        2.0,
                        1
                    ],
                    "fov": 43
                },
                "toPose": {
                    "position": [
                        8,
                        4.7,
                        12
                    ],
                    "target": [
                        0,
                        1.6,
                        1.1
                    ],
                    "fov": 43
                },
                "description": "嫦娥四号落月片段与随后巡视器展开用阶段标识衔接；近景看玉兔二号与坡道"
            },
            {
                "id": "14-05",
                "start": 40,
                "end": 45,
                "world": "lunar:change",
                "fromPose": {
                    "position": [
                        8,
                        4.7,
                        12
                    ],
                    "target": [
                        0,
                        1.6,
                        1.1
                    ],
                    "fov": 43
                },
                "toPose": {
                    "position": [
                        7.2,
                        3.4,
                        11.5
                    ],
                    "target": [
                        0,
                        1.05,
                        2.7
                    ],
                    "fov": 45
                },
                "description": "镜头停在月面车辙与岩块上，再通过地表构图匹配进入后面的火星段"
            }
        ],
        "gates": [
            {
                "id": "13-relay",
                "at": 20,
                "kind": "relay",
                "label": "选择鹊桥，接通月背通信"
            }
        ],
        "transition": "terrain"
    },
    {
        "id": 14,
        "index": 15,
        "start": 577,
        "duration": 46,
        "group": 3,
        "year": "2021",
        "title": "从着陆到巡视",
        "english": "THE NEXT TRACK",
        "subtitle": "天问一号 · 祝融号巡视",
        "textbook": true,
        "narration": "抵达，是开始。接下来的路，要一段一段探索。",
        "note": "2021 年 5 月 22 日，祝融号驶离着陆平台，开始在火星表面巡视探测。观察它如何驶下坡道，再沿着车辙，看看前方有哪些值得探索的地方。",
        "shots": [
            {
                "id": "15-01",
                "start": 0,
                "end": 8,
                "world": "marsOrbit:tianwen",
                "fromPose": {
                    "position": [
                        15.5,
                        6.7,
                        24
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 45
                },
                "toPose": {
                    "position": [
                        14,
                        6,
                        22
                    ],
                    "target": [
                        0,
                        0,
                        0
                    ],
                    "fov": 45
                },
                "description": "火星地表构图建立后拉到任务关系示意，交代环绕器与着陆巡视器"
            },
            {
                "id": "15-02",
                "start": 8,
                "end": 20,
                "world": "mars:zhurong",
                "fromPose": {
                    "position": [
                        9,
                        5.8,
                        13
                    ],
                    "target": [
                        0,
                        2.0,
                        1
                    ],
                    "fov": 43
                },
                "toPose": {
                    "position": [
                        8,
                        4.7,
                        12
                    ],
                    "target": [
                        0,
                        1.6,
                        1.1
                    ],
                    "fov": 43
                },
                "description": "通过任务阶段标识进入着陆过程，落稳后留一个完整结果画面"
            },
            {
                "id": "15-03",
                "start": 20,
                "end": 29,
                "world": "mars:zhurong",
                "fromPose": {
                    "position": [
                        8,
                        4.7,
                        12
                    ],
                    "target": [
                        0,
                        1.6,
                        1.1
                    ],
                    "fov": 43
                },
                "toPose": {
                    "position": [
                        7.2,
                        3.4,
                        11.5
                    ],
                    "target": [
                        0,
                        1.05,
                        3.6
                    ],
                    "fov": 45
                },
                "description": "时间推进至巡视准备，近景贴近坡道与车轮，祝融号驶下平台"
            },
            {
                "id": "15-04",
                "start": 29,
                "end": 41,
                "world": "mars:zhurong",
                "fromPose": {
                    "position": [
                        7.2,
                        3.4,
                        11.5
                    ],
                    "target": [
                        0,
                        1.05,
                        3.6
                    ],
                    "fov": 45
                },
                "toPose": {
                    "position": [
                        7.2,
                        3.4,
                        11.5
                    ],
                    "target": [
                        0,
                        1.05,
                        3.6
                    ],
                    "fov": 45
                },
                "description": "用户选择一个短程探测目标，镜头从车轮后侧跟随，车辙延伸"
            },
            {
                "id": "15-05",
                "start": 41,
                "end": 46,
                "world": "mars:zhurong",
                "fromPose": {
                    "position": [
                        7.2,
                        3.4,
                        11.5
                    ],
                    "target": [
                        0,
                        1.05,
                        3.6
                    ],
                    "fov": 45
                },
                "toPose": {
                    "position": [
                        7.2,
                        3.4,
                        11.5
                    ],
                    "target": [
                        0,
                        1.05,
                        3.6
                    ],
                    "fov": 45
                },
                "description": "探测画面经中继传回资料界面，再接入地球轨道的新章节"
            }
        ],
        "gates": [
            {
                "id": "14-rover",
                "at": 29,
                "kind": "rover",
                "label": "选择一个巡视目标"
            }
        ],
        "transition": "screen"
    },
    {
        "id": 15,
        "index": 16,
        "start": 623,
        "duration": 39,
        "group": 3,
        "year": "2022",
        "title": "太空中的家",
        "english": "A HOME IN ORBIT",
        "subtitle": "天宫 · 空间站基本构型",
        "textbook": true,
        "narration": "从短暂到访，到在太空中持续工作与生活。",
        "note": "天和核心舱、问天实验舱和梦天实验舱组成了天宫空间站的基本构型。它们分工合作，为航天员的生活、工作和科学实验提供空间。",
        "shots": [
            {
                "id": "16-01",
                "start": 0,
                "end": 8,
                "world": "earth:tiangong",
                "fromPose": {
                    "position": [
                        25,
                        19,
                        44
                    ],
                    "target": [
                        0,
                        -1,
                        0
                    ],
                    "fov": 46
                },
                "toPose": {
                    "position": [
                        23,
                        17,
                        40
                    ],
                    "target": [
                        0,
                        -1,
                        0
                    ],
                    "fov": 46
                },
                "description": "地球弧面映衬完整天宫，保留全部太阳翼与三个舱段，镜头从安全远景缓慢靠近"
            },
            {
                "id": "16-02",
                "start": 8,
                "end": 18,
                "world": "earth:tiangong",
                "fromPose": {
                    "position": [
                        23,
                        17,
                        40
                    ],
                    "target": [
                        0,
                        -1,
                        0
                    ],
                    "fov": 46
                },
                "toPose": {
                    "position": [
                        21,
                        15,
                        36
                    ],
                    "target": [
                        0,
                        -1,
                        0
                    ],
                    "fov": 47
                },
                "description": "沿完整构型的外侧平缓推进，太阳翼始终留在画面内，核心舱保持清晰可见"
            },
            {
                "id": "16-03",
                "start": 18,
                "end": 29,
                "world": "earth:tiangong",
                "fromPose": {
                    "position": [
                        21,
                        15,
                        36
                    ],
                    "target": [
                        0,
                        -1,
                        0
                    ],
                    "fov": 47
                },
                "toPose": {
                    "position": [
                        20,
                        14,
                        34
                    ],
                    "target": [
                        0,
                        -1,
                        0
                    ],
                    "fov": 48
                },
                "description": "展示完整构型，三个舱段逐一高亮，用户可点击查看名称与功能"
            },
            {
                "id": "16-04",
                "start": 29,
                "end": 35,
                "world": "earth:tiangong",
                "fromPose": {
                    "position": [
                        20,
                        14,
                        34
                    ],
                    "target": [
                        0,
                        -1,
                        0
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        23,
                        14,
                        32
                    ],
                    "target": [
                        0,
                        -4,
                        -8
                    ],
                    "fov": 48
                },
                "description": "资料标签消退；镜头从舱外望向地球，保留空间站与地球的共同构图"
            },
            {
                "id": "16-05",
                "start": 35,
                "end": 39,
                "world": "earth:tiangong",
                "fromPose": {
                    "position": [
                        23,
                        14,
                        32
                    ],
                    "target": [
                        0,
                        -4,
                        -8
                    ],
                    "fov": 48
                },
                "toPose": {
                    "position": [
                        27,
                        18,
                        33
                    ],
                    "target": [
                        0,
                        -18,
                        -28
                    ],
                    "fov": 50
                },
                "description": "沿地球弧面进入下一场的上空，再借云层遮挡衔接现代发射场"
            }
        ],
        "gates": [
            {
                "id": "15-station",
                "at": 19,
                "kind": "station",
                "label": "认识空间站的三个舱段"
            }
        ],
        "transition": "horizon"
    },
    {
        id: 16, index: 17, start: 662, duration: COSMIC_DURATION, group: 4,
        year: '尾声', title: '仰望之后', english: 'AFTER LOOKING UP',
        subtitle: '从脚下的世界，飞向更远的宇宙', textbook: false,
        narration: '仰望之后，我们向更远处出发。回望地球，我们共同的家园。月球相伴，地球只是旅程的起点。越过行星的轨道，太阳也成为一颗远方的星。我们的太阳，只是银河系亿万颗恒星中的一颗。银河之外，还有星系与星系之间更辽阔的天地。探索，还在继续。',
        note: '从地球到星系，真实的距离远比画面呈现的更辽阔。太阳位于银河系中远离中心的位置。“可观测宇宙”是光能够到达我们、让我们有机会看见的范围，并不是宇宙的一堵围墙。',
        shots: [
            [0, 7, '从山坡抬头，镜头沿视线升入星空'],
            [7, 15, '在连续飞行中转身回望，地球的完整轮廓逐渐显现'],
            [15, 23, '继续远离，月球进入画面，展开地月关系'],
            [23, 33, '地球缩入自己的轨道，太阳与八大行星逐步展开'],
            [33, 43, '太阳系缩为银河盘中的一个小点，旋臂与银核显现'],
            [43, 53, '银河系逐渐变小，视野中出现其他形态各异的星系'],
            [53, 64, '星系汇入更大的纤维与空隙结构，停留在可观测宇宙的示意视野'],
        ].map(([start, end, description], i): StoryShot => {
            const from = cosmicFlight(Number(start)), to = cosmicFlight(Number(end));
            return { id: '17-0' + (i + 1), start: Number(start), end: Number(end), world: 'finale',
                fromPose: { position: from.position, target: from.target, fov: from.fov },
                toPose: { position: to.position, target: to.target, fov: to.fov }, description: String(description) };
        }),
        gates: [], transition: 'horizon',
    }
];
export const TOTAL_DURATION = STORY.reduce((s, c) => s + c.duration, 0);
export function locateStory(time: number): { chapter: StoryChapter; local: number; shot: StoryShot } {
    const t = Math.min(Math.max(0, Number.isFinite(time) ? time : 0), TOTAL_DURATION - .0001);
    // The authored story and each chapter's shots are nonempty (validated by story tests).
    const chapter = STORY.find(c => t < c.start + c.duration) || STORY[STORY.length - 1]!;
    const local = t - chapter.start;
    const shot = chapter.shots.find(s => local < s.end) || chapter.shots[chapter.shots.length - 1]!;
    return { chapter, local, shot };
}
