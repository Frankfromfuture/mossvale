<p align="center">
  <img src="mystery/public/art/brand/mossvale-logo-v2-calligraphy.png" alt="青苔镇 Mossvale" width="480">
</p>

# 青苔镇 Mossvale

当前版本 **0.8**（`0.8.0`） · [版本记录：0.2 → 0.8](CHANGELOG.md)

青苔镇是一款由 AI 扮演人物的单人剧本杀。走进手绘风格的 3D 场景，与人物自由交谈、寻找物证、核对口供，再把散落的线索拼成自己的推断。

**[进入测试版 · www.iambrizo.com/mossvale](https://www.iambrizo.com/mossvale/)**

当前剧本为《雾灯未眠》。六位主角各有经历、秘密和个人目标；你选择其中一人，其他角色由 AI 扮演。首次从白川澄开始，完成调查后可按结案成绩解锁更多角色。

![青苔镇首页](mystery/docs/images/home.png)

## 可以怎样玩

- 在场景中走动、进入房间、查看物件，把发现记入手记。
- 用文字或语音询问人物，出示证据、私下交谈，也会遇到对方的反问。
- 从不同主角的视角完成主线与个人支线，决定哪些秘密说出口。
- 对照行动点和调查评分完成结案；当前浏览器会保存调查进度，之后可以继续。

桌面和手机浏览器均可体验。存档按浏览器访客区分，暂未提供跨设备账号同步。

## 本地运行

使用 Node.js 22 或更新版本，在项目根目录执行：

```sh
npm run setup
npm run build
npm start
```

然后打开 [http://127.0.0.1:4331/](http://127.0.0.1:4331/)。

人物对话使用 DeepSeek，服务从 `DEEPSEEK_API_KEY` 环境变量读取密钥；`DEEPSEEK_BASE_URL` 和 `DEEPSEEK_MODEL` 可指定服务地址与模型。语音识别和朗读使用 Qwen，可通过 `DASHSCOPE_API_KEY` 配置。环境变量由启动环境注入，程序不会自动读取 `.env` 文件。

本机已有 Brizo 配置时，macOS 启动器也支持读取该配置。密钥保留在服务端，本地存档写入 `mystery/.data/`。

## 项目结构

| 目录 | 内容 |
| --- | --- |
| `mystery/src/` | 3D 场景、人物表现和交互界面 |
| `mystery/server/` | 调查规则、角色存档、AI 对话与语音服务 |
| `mystery/shared/` | 前后端共用的布局与规则 |
| `mystery/public/` | Logo、场景图片、字体和音频 |
| `mystery/art/` | 美术来源、生成提示词与源素材 |
| `mystery/docs/` | 玩法与实现说明 |
| `mystery/deploy/` | 部署与版本记录 |

前端使用 Three.js，后端为 Node.js，网页由 esbuild 构建。根目录的 npm 命令统一转交给 `mystery/`。

仓库当前维护 AI 剧本杀。早期 AI 小镇的 2D、3D 和微信工程已在本地归档，旧版本仍可从 Git 历史查看。玩家存档、本地验证数据和归档压缩包不随源码上传。
