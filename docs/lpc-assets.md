# 本机 2D 的 LPC 素材

2026-10-13，本机 `http://127.0.0.1:4321/` 从黑底网格改为 LPC 像素场景。3D 工程和原有存档继续保留，本轮没有发布远程版本。原远程 3D 的聊天与存档仍依赖 Mac 在线。

## 已实现

地图内每一格都有地面贴图，现有 29 类物件全部接入 LPC：草地、石路、木地板、泥地、墙、门、树木、花草、桌椅、书架、工作台、柜台、咖啡机、杯子、书、盆栽、喷泉、木箱、石块、灯、床、靠椅、沙发、小桌、洗手盆、地毯。格子仍是 1 米，逻辑尺寸、碰撞和寻路沿用原规则；画面按每米 32 像素显示，纹理使用最近邻采样。

人物由 Universal LPC 原始图层组合，准备了 18 种外观，包含四方向行走和坐姿。常住居民、村长及游客使用不同外观，原有编号在资料和对话中保留。坐姿读取服务器已有的坐下状态，日常任务图标仍显示真实活动。

杯、书、盆栽和咖啡机仍是独立实体。放到承载面上后，其 `parentId`、属性、状态和操作记录分别保存。桌面有自己的显示高度，点击与摆放会换算到对应位置；移动或旋转家具时，服务器带动承载物。人物、树木和家具按落脚位置排序，桌上小物跟随承载家具参与遮挡。

运行时使用两张图集，合计约 436 KiB，包含 62 个场景图块和 720 个人物帧；原始素材库单独放在 `vendor/lpc/`。地面分块显示，视野外物件停止绘制。移动、长按菜单、经济、村民、生活记录、双指平移和缩放接口沿用。地图页新增“LPC 素材与作者署名”，发布目录同时提供派生图集与逐文件署名下载。

## 下载范围与来源

LPC 是持续扩充的社区素材体系，没有覆盖全网的单一“完整版”。本次归档以以下两个合集的当前页面为清单，去重后共 391 个资源条目，下载条目正文中的全部原始附件；另保存 Universal LPC 角色库的完整 ZIP 和解包内容。

- [LPC Collection](https://opengameart.org/content/lpc-collection)
- [LPC Tiles](https://opengameart.org/content/lpc-tiles)
- [Universal LPC Spritesheet Character Generator](https://github.com/LiberatedPixelCup/Universal-LPC-Spritesheet-Character-Generator)，快照提交 `58ce1aa479e4df32845a73a5d0afc221c3a893c2`，ZIP 内含 89,358 个文件。

`vendor/lpc/collections.json` 保存合集与资源页清单。每个资源目录保留 `source.html` 和包含文件地址、字节数、SHA-256、许可链接的 `manifest.json`，总清单为 `vendor/lpc/manifest.json`。角色库原始 `CREDITS.csv` 和许可文件一并保留。本次完成 391 个条目、992 个原始附件，共约 1.54 GB；另有完整角色库。文件大小和 SHA-256 已归档，243 个 ZIP 的目录均可读取，无失败项。完整统计见 `vendor/lpc/README.md`。

## 署名与派生素材

游戏选用 13 组场景资源，以及角色库的 32 个原始图层文件。`cocos-2d/legal/lpc-credits.html` 包含完整上游署名，发布时复制到 `/lpc-credits.html`。`lpc-art.json` 逐图块记录原图路径、裁切坐标和拼接信息。地图图集的修改包括裁切、家具拼接、图集整理；角色图集另调整了服装和头发颜色。各部分原始许可分别保留。

复现入口：

1. `python3 cocos-2d/scripts/fetch-lpc.py` 保存资源页和附件。
2. 大附件较慢时，执行 `index-lpc-pending.py` 建立未完成清单，再用 `fetch-lpc-pending.py` 分块续传。分块请求校验服务器返回范围与长度，完整后才生成原文件。
3. `python3 cocos-2d/scripts/prepare-lpc.py` 裁切并打包图集，自动展开选用素材包；完整角色 ZIP 需解包到 `vendor/lpc/characters/`。
4. `python3 cocos-2d/scripts/prepare-lpc-credits.py` 生成署名页。
5. 在 `cocos-2d/` 执行 `npm run build`，产出本机 Web 版本及素材署名文件。

本轮没有增加新的家具种类、物理堆叠高度系统或任意物体承载规则。当前“叠放”指现有桌面、柜台、书架等承载面放置小物；存档和服务器继续检查占位、距离与通路。

## 验收

后台 Chrome，独立试玩存档。将 `terrace-cup-2` 从原桌移到 `terrace-table-1`，命中检查返回杯子本身；再将整桌从 `(-9,-5)` 移到 `(-13,-6)`，两个杯子与盆栽同步移动。刷新后，物件坐标、`parentId` 和客户端节点归属一致。原有服务器还拒绝了占用墙体的位置。

桌面 1280×900 与窄屏 390×844 验证了显示、右上角入口、滚动平移和署名页。120 帧后台桌面采样中，帧间隔中位数与 P95 均约 16.7ms；这不是手机真机性能结果。TypeScript 检查与 Cocos Web 构建通过，未运行自动测试套件，未重启服务。窄屏验收发现入口文字与浅色石路对比不足，已加描边并重新确认。
