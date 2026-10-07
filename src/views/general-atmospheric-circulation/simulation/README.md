# 三维地表图层

从本机“三圈环流-self”项目的 `src/simulation` 迁入：

- `surface-arrows.ts`：球面平面箭头、端点裁剪、交错出现与沿路径运动。
- `geographic-paths.ts`、`model.ts`：同一套季风/洋流经纬度路径、跨日界线插值、季节换向。
- `flow-effects.ts`、`shaders.ts`：气压带羽化边缘、洋流连续流线及脉冲。
- `PressureField.ts`、`pressure-data.ts`、`PressureCenterText.ts`、`contour-labels.ts`：球面气压场、等压线、区域极值定位与贴球文字。
- `Sunlight.ts`：以2026年每月15日为参考的太阳直射纬线，不表示整圈同时直射。

`SurfaceClimate.ts` 将参考项目的图层接入现有四阶段页面，不替换原来的单圈/三圈烟流、相机或背景。颜色集中在 `model.palette` 和 `pressure-data`，图例和图层共用它们。

沿用当前页面的 NOAA/NCEP 1981—2010 年1月、7月气候平均资料；文件与参考项目完全相同。气压中心的 H/L 位于相应月份的区域局部极值。气压场切换时的插值仅是视觉过渡，不作为中间月份的数据；过渡期间隐藏等压线数值并淡出旧月份的气压中心文字。

月份切换保留几何体、顶点缓冲区和运动相位，使用参考项目的指数缓动。`seasonal-warp.ts` 对原有环流剖面使用相同纬度变换。暂停只停止气流运动，月份和图层切换仍平滑过渡。

风带、季风和洋流均是教学示意路径，箭头长短与动画速度不代表实测风速或流速。

## 校验

在本页面目录运行：

```powershell
node --experimental-transform-types --test tests/*.test.mjs
```

测试包括球面贴合、箭头/季风方向、北印度洋洋流换向、跨日界线路径、真实气压极值及等压线数值、切月时缓冲区/相位保留、开关和四阶段三维模式。
