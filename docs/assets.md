# 美术来源

地图 `public/assets/town.png` 使用本次会话的内置 ImageGen 生成，未使用外部游戏截图或商业游戏素材。原图为 1536×1024，完整保留；地图坐标、入口与角色均由代码独立维护。

居民图集 `public/assets/residents.png` 来自 Kenney 的 [Roguelike Characters](https://kenney.nl/assets/roguelike-characters)，许可为 CC0。随项目保留原始 `Kenney-LICENSE.txt`。图块为 16×16 像素、间隔 1 像素；界面通过精确图集坐标引用第 0、1 列、第 5—10 行的完整角色。使用 CSS background-position 进行图集显示，未生成或导出裁切图像。

界面图标来自项目依赖 `@phosphor-icons/react`，许可随 npm 包保留。字体使用系统字体。

ImageGen 的原始提示词见 `imagegen-prompt.txt`。这张背景适合第一轮玩法验证；量产应重新整理可拼接瓦片、入口、遮挡层与碰撞区域，补齐角色方向与动作帧。
