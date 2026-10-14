# 苔溪镇 3D · 咖啡馆街区

使用 Cocos Creator 3.8.8 制作的原生 3D 原型。圆润角色、房屋、树木、家具和河岸均由 Cocos 网格生成；界面使用 Cocos Canvas，文字输入使用 EditBox。

采用竖屏全画面场景：地图跟随角色，连续地形铺满边缘；角色旁出现分段气泡，手记以装订小册子翻页阅读。桌面预览保留同一竖向构图，微信版按系统菜单和安全区预留空间。

本机试玩地址：**http://127.0.0.1:4319/**。

远程网页测试入口已部署到阿里云 `https://47.116.35.204/mossvale/`，需用本次测试邀请链接首次进入。网页资源在服务器，模型调用和存档通过加密通道连接本机，因此 Mac 需要保持开机联网。部署位置和撤回方式见 [远程试玩记录](../deploy/README.md)。这与微信小游戏 AppID 申请、上传审核分别进行。

## 操作

- 轻点空地，人物沿路走过去；轻点居民或名字，走近后直接交谈。
- 长按约半秒打开互动选项。长按居民可帮忙、送点心、邀请下午茶或查看共同回忆；长按对话正文也可打开这些选项。
- 长按空地可查看手记、切换全景或休息一小时。
- 松开长按保留花瓣菜单，拖动取消触发；点击菜单外即可收起。
- 轻点气泡继续听，点“聊两句”唤起输入；发送后收起输入，失败时保留原文。
- 手记左右箭头翻页，阅读居民近况与已经发生的记忆。

画面只保留小镇、时间天气和简短提示。模型名称、调用次数等运行信息留在开发资料中。

十二位居民沿用原型中的人格，例如林夏热情、念旧，许知远慢热、细心，陈默务实、守时。狐狸、兔子和熊是本版原创的视觉化身，以衣着配色区分居民。

## 编辑与构建

编辑器安装在：`~/Applications/CocosCreator-3.8.8/CocosCreator.app`。安装包来自 Cocos 官网，签名为 Xiamen YAJI Software Co.,LTD。

双击「打开Cocos工程.command」可打开当前工程。进入 `assets/scenes/CafeStreet.scene` 后预览。街区在运行时生成，编辑模式的场景树只包含入口节点。模型尺寸与颜色集中在 `StreetWorld.ts`，便于后续替换为美术模型。

```sh
npm run build           # Cocos Web Mobile 构建
node scripts/build.mjs wechat  # 微信小游戏构建
npm start               # 使用现有 Brizo 配置启动本机 3D 服务
```

自定义编辑器路径时设置 `COCOS_CREATOR` 为编辑器可执行文件的完整路径。构建使用官方命令行入口，日志保存于 `qa/`。脚本同时检查 Cocos 的成功退出码和输出中的入口场景。`extensions/import-ready` 处理本机遇到的 3.8.8 命令行导入时序问题；仅在场景被误识别为普通文件时重新加载资源进程。

## 目录

| 文件 | 用途 |
| --- | --- |
| `assets/scripts/Mossvale.ts` | 游戏循环、输入、镜头、碰撞与网格寻路 |
| `assets/scripts/StreetWorld.ts` | 原创低面数模型和人物动作 |
| `assets/scripts/TownHud.ts` | Cocos 界面、交谈、记忆与手记 |
| `assets/scripts/TownApi.ts` | HTTP 与微信 wx.request 适配 |
| `assets/materials/VillageClay.mtl` | 构建时引用的基础材质 |
| `assets/scenes/CafeStreet.scene` | Cocos 入口场景 |
| `build/web-mobile/` | 本机可运行的 Cocos Web 构建 |
| `build/wechatgame/` | 微信小游戏工程输出 |
| `scripts/start.mjs` | 独立服务启动入口 |

## 模型服务与存档

3D 版本使用 4319 端口、父目录 `.data-cocos/` 存档和独立 Electron 服务资料目录。2D 版本继续使用 4317 与 `.data/`。服务器在 `MOSSVALE_SCENE=cafe-street` 时启用十二位居民的场景行动；旧三人存档先备份，再补入其他居民，保留原记忆、聊天、信任与约定。

DeepSeek 仍在服务端读取用户授权的 Brizo 加密配置。客户端不接触服务密钥。聊天和重要互动调用模型，走动、动画和普通日程由程序执行。回应失败时用简短提示说明，模型预算与失败记录仍由后端保留。

## 微信接入状态

2026-10-12，用户提供的 AppID `wx3dfe91fe51cb2c34` 已写入微信构建配置。导出目标为小游戏（`compileType: game`），保持竖屏（`deviceOrientation: portrait`）。可导入的压缩包为 `苔溪镇-竖屏-微信工程.zip`。本机已安装微信开发者工具，用户已导入并运行模拟器。为连接 Mac 上的调试服务，本地 `project.private.config.json` 设置了 `urlCheck: false`；发布配置保留校验。上传包体、手机预览及审核仍待验证，见[微信接入记录](../docs/wechat-test-handoff.md)。

微信客户端默认请求 `http://127.0.0.1:4319`，仅供同一电脑的开发环境使用。手机联网前，将 `TownApi.ts` 中的服务地址改为手机可访问的 HTTPS 后端，或在微信客户端存储中设置 `mossvale3d-endpoint`；再配置合法请求域名和账号授权。手机访问不了电脑的 127.0.0.1。本轮服务仍只监听本机。现有远程网页的聊天与存档依赖 Mac 保持开机联网，微信工程尚未接入这条通道。

## 当前范围

当前版本包含十二位居民、九个室外活动地点、自主走动与交谈、共同劳动、场景互动、赠礼和记忆关系。玩法见[小镇生活](../docs/living-town.md)。房屋目前是外观，室内、装修、换装和多人联机尚未制作。人物动作由节点组合驱动，后续可替换为骨骼动画。

当前配置以 390×844 为竖屏设计基准，按实际比例调整正交镜头，帧率上限为 30。`townLite` 引擎配置只保留本原型需要的渲染和界面模块。微信真机帧率、发热和内存需要在接入后单独测量。本轮游戏化界面记录见 `qa/verification-cartoon.md`，此前触控记录见 `qa/verification-touch.md`。

手记现使用 imagegen 原创底图，动态文字和翻页继续由 Cocos 控制。素材与提示词见 `../docs/journal-art-v2.md`，本轮验证见 `qa/verification-journal-v2.md`。
