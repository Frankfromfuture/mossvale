# 2D 街区美术

2026-10-12 部件版更新：另用内置 imagegen 生成透明 `object-atlas.png` 和地面材质 `terrain-atlas.png`。物品图集包含桌、椅、空书架、木工台、柜台、咖啡机、杯、书、盆栽、树、灌木、花、两种门姿态、墙段、长椅、喷泉、木箱、石块与灯。地面图集包含草地、石板、木地板和土壤。原图完整保留，`atlas-frames.json` 只记录各精灵的像素范围，运行时由 SpriteFrame 引用。物品与地块分别创建原生节点；杯子和书未烘焙到桌面上。

此前整张地图已归档到 `docs/art-archive/2d-cafe-map-v1.png`，以下保留初版生成记录。

2026-10-12，使用内置 imagegen 生成 `cocos-2d/assets/resources/cafe-map.png`，1024×1536。原始生成结果完整复制到工程，未使用 RimWorld 的地图或人物素材。

生成要求：竖向、固定俯视、正交的平面街区。咖啡馆与书屋去掉屋顶、展示室内；主路横穿街区，下方安排木工棚、喷泉和长椅。使用苔绿草地、奶油色石板、木棕家具与少量花草，入口和地面留出行走空间，画面不包含角色、界面或文字。生成后的墙壁、桌椅、书架、柜台与喷泉按实际像素位置登记到碰撞数据。

地图以每 32 个原图像素对应一个世界单位，中心为坐标原点。原生 Sprite 显示底图，玩家与居民独立移动，地图不是交互截图。碰撞和活动地点共用 `town-layout.json`。

居民继续使用项目已有的 [Kenney Roguelike Characters](https://kenney.nl/assets/roguelike-characters) 图集，许可 CC0。原始图集与 `Kenney-LICENSE.txt` 均已复制到新工程。角色按图集坐标显示，走动时有轻微步伐起伏；尚未新增方向帧。

手记沿用项目 imagegen 原创 `journal-notebook-v3.png`，文字、基线、翻页与内容仍由 Cocos 绘制。
