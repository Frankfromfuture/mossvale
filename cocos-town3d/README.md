# 苔溪镇 · 立体生活

独立的斜视角 3D 版本，承接当前 LPC 2D 的服务器玩法。本机入口为 http://127.0.0.1:4322/，版本选择页为 `/modes.html`。

使用 Cocos Creator 3.8.8。运行已有构建：

```sh
cd cocos-town3d
npm start
```

源码修改合并完成后，执行一次 `npm run build`。`COCOS_CREATOR` 可指定编辑器可执行文件。构建前会从 `cocos-2d/assets/resources/` 同步地图和物件定义；存档不会随之复制。

本版存档在根目录 `.data-cocos-town3d/`，浏览器会话使用 `mossvale_living3d`。原 LPC 2D、早期 3D 和最初网页小镇继续保留各自工程与存档。

完整范围、素材来源及验收限制见 [立体生活说明](../docs/living-3d.md)。
