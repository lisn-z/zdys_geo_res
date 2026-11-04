# 海—气相互作用资料说明

浏览器从 OSS 目录 `/geo-resources-folder/images/ocean-atmosphere/` 读取历史月平均格网、地形资料与背景图，不再依赖 `public` 中的副本。该目录发布 `climate-snapshots.json`、`world-countries.geojson`、`world-elevation.json` 和 `ocean-atmosphere-backdrop.png`，资源名保持不变。开发环境沿用 Vite 的 `/geo-resources-folder` 代理；部署环境沿用已有资源服务路径。

本目录保留资料说明和来源清单 `sources.json`；原始下载与转换脚本保存在 `source-data`，不随课件发布。水体法线、太阳纹理与原 Logo 继续使用原有 OSS 地址。

## 海温与海温距平

- 产品：[NOAA ERSST v5](https://www.ncei.noaa.gov/products/extended-reconstructed-sst)，2° × 2° 月平均海表温度分析。
- 引用：Huang et al. (2017), NOAA Extended Reconstructed Sea Surface Temperature (ERSST), Version 5. [DOI: 10.7289/V5T72FNM](https://doi.org/10.7289/V5T72FNM)。
- 选取：中性案例 2013 年 12 月、厄尔尼诺案例 2015 年 12 月、拉尼娜案例 2010 年 12 月，统一月份以减少季节差异。
- 距平直接读取该产品的 `ssta`，基准为 **1971—2000 年同期月平均**。这不是 ONI；不能把本图的单月格网距平当作 ENSO 的完整诊断标准。
- 原始 NetCDF 保留在 `scripts/ocean-atmosphere/source-data/ersst.v5.YYYYMM.nc`（相对项目根目录）。

## 海平面气压

- 产品：[NCEP/NCAR Reanalysis 1](https://psl.noaa.gov/data/gridded/data.ncep.reanalysis.html)，2.5° × 2.5° 月平均海平面气压再分析。
- 资料由 NOAA Physical Sciences Laboratory, Boulder, Colorado, USA 提供：[NOAA PSL](https://psl.noaa.gov/)。
- 气压月份与海温一一对应。由 NOAA OPeNDAP 下载单月子集，原始 ASCII 保留在 `scripts/ocean-atmosphere/source-data/slp.YYYYMM.ascii`（相对项目根目录）。
- 源单位 millibars，等值展示为 hPa，**没有乘除 100**。海平面气压经过订正，不是地形顶部的实测站压。

## 地形与场景资产

- `world-countries.geojson`：沿用诗境山河项目的 Natural Earth 1:110m 大陆/国家轮廓，Natural Earth 数据属于公有领域。[项目地址](https://www.naturalearthdata.com/)。
- `world-elevation.json`：沿用该项目通过 [Open-Elevation](https://www.open-elevation.com/) 获取的陆地高程；2° 格网，范围 180°W—180°E、60°S—84°N，3861 个陆地采样点。高程在 3D 中可有垂直夸张。这份数据不包含真实海底地形，南极高程也不在格网范围内。
- [水体法线](https://zdys.szjx.ai-study.net/geo-resources-folder/images/waternormals.jpg)、[太阳纹理](https://zdys.szjx.ai-study.net/geo-resources-folder/images/sun.png) 和 [原 Logo](https://jingan-deploy-test.oss-cn-shanghai.aliyuncs.com/geo/image/logo01.png)：沿用现有组件的 OSS 地址，运行时远程引用，不在本目录重复保存图片。完整 URL 也列于 `sources.json`。

## 转换、复现和使用边界

`climate-snapshots.json` 保留原始网格，值四舍五入至 0.01，缺测值设为 `null`。保留源数据的经纬度顺序，压力纬度从北向南，海温纬度从南向北。未补造观测资料。渲染器可插值显示，但插值不增加资料实际分辨率。

在项目根目录用 `python scripts/ocean-atmosphere/source-data/build-climate-data.py scripts/ocean-atmosphere/dist` 重新生成格网和 `sources.json`，需要 `numpy` 与 `h5py`。将生成的资料上传至上述 OSS 目录，更新本目录的来源清单；不再生成到 `public`。清单中记录原始 URL、文件尺寸、SHA-256、基准期及处理时间。生成脚本从自身所在目录读取原始资料，将处理后的数据写入命令指定的发布目录。

这些资料用于大尺度教学比较，不是实时天气。海温分析与气压再分析经过数据融合或模式处理，不等同于每个格点都有现场直接观测。气流、洋流、云雨、温跃层等动画是机制示意，并非从上述海温与气压格网直接求出的真实流场。三个历史月份只是案例，不代表所有 ENSO 事件的区域影响都相同。
