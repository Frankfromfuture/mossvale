# 阿里云远程试玩

2026-10-14，当前网格版入口为 `https://www.iambrizo.com/mossvale/`，保留邀请访问。邀请链接换成限定该路径的 Secure、HttpOnly Cookie，随后进入网格版并接续当前小镇；邀请凭证单独保存在服务器，本文不记录链接凭证。

网页、后端、存档和模型调用现在都在阿里云运行，Mac 关机也能继续玩。独立容器为 `mossvale-cloud`，发布目录为 `/srv/mossvale-cloud/releases/20261014-grid-v1`，持久存档为 `/srv/mossvale-cloud/data`。九份原2D存档及其备份已复制，交付前再次同步正在使用的存档。此后本机和云端各自保存，继续云端游戏请使用邀请链接。

模型配置通过SSH传输，服务器使用AES-256-GCM密文及受限的独立密钥文件保存，运行时才解密；API密钥没有写入环境文件、源码、网页或日志。保留当前实验阶段无限模型调用，以及已有并发限制、超时和失败退避。入口网关监听 `127.0.0.1:8792`，游戏后端监听 `127.0.0.1:8793`，不使用Mac反向通道。容器随服务器自动启动，存档和密文配置在容器外持久保存。

DeepSeek流式回复、实时状态推送、重新打开后的聊天记录以及云端磁盘保存已通过后台Chrome390×844隔离小镇验证。一次真实玩家回复首段文字1299ms、完整1485ms，只代表本次样本。TypeSafe对上海节点返回HTTP451，明确说明该地区不可用；Jev暂由现有人格规则接管。独立场景中的两次实际接管和两句DeepSeek闲谈已记录，未宣称Jev在云端可用。证据见 `cocos-2d/qa/cloud-deployment.json`。

发布复用上一轮已验收的Web产物，新增Linux云端入口 `server/cloud-entry.mjs` 和子路径网关 `deploy/cloud-gateway.mjs`；既有游戏规则未重写。域名所在Nginx配置只新增 `/mossvale` 路由，校验后热重载，官网回归返回200。迁移脚本为 `deploy/install-cloud.py`，修改前配置保存在 `/srv/mossvale-cloud/backups/nginx-before-cloud.conf`；原2D存档、本机官网及旧3D试玩保留。

以下是旧3D试玩的部署记录，仍沿用Mac反向通道，与当前网格版分开运行。

2026-10-11，沿用 Brizo 上海 ECS `i-uf6g70l000wno5rnr2hf`，公网地址 `47.116.35.204`。新增 `/mossvale/` 路径与独立 `mossvale-preview` 容器；现有官网、订阅和设备同步容器保留。

这是临时远程测试方式：Cocos 网页和素材放在阿里云，API 经 SSH 加密通道访问 Mac 上的苔溪镇服务。模型配置仍由本机 Brizo 加密存储读取，存档仍在 Mossvale 的 `.data-cocos/`。手机可跨网络打开，但 Mac 必须开机联网，本机后台服务与 SSH 通道也须运行。Mac 离线时网页画面仍可加载，交谈和存档暂不可用。尚未把模型凭据、后端和存档迁至云端。

## 运行位置

| 项目 | 位置 |
| --- | --- |
| 公网入口 | `https://47.116.35.204/mossvale/`，首次需使用测试邀请链接 |
| 网页发布目录 | `/srv/mossvale-preview/releases/20261011-01/public` |
| 网关脚本 | 同一发布目录下 `deploy/preview-gateway.mjs` |
| 访问凭证 | 服务器 `/srv/mossvale-preview/preview.env`，权限 0600 |
| 网关监听 | 服务器 `127.0.0.1:8791` |
| SSH 反向转发 | 服务器 `127.0.0.1:14319` → Mac `127.0.0.1:4319` |
| 本机通道进程 | `node deploy/start-tunnel.mjs`，断线后每十秒重连 |
| 本机游戏服务 | `node cocos/scripts/start.mjs`，独立隐藏后台进程 |
| 日志 | `cocos/qa/remote-preview-tunnel.log`、`remote-preview-service.log` |

测试邀请链接会换成限定 `/mossvale/` 路径的 Secure、HttpOnly Cookie，再跳回不含凭证的页面。页面和 API 均验证测试访问权限；写入请求还校验来源。访问凭证与模型 API Key 分开，邀请链接不要放入公开文档。轮换服务器环境文件中的访问凭证并重新创建网关容器，可以撤销旧链接。

`TownApi.ts` 已支持网页子目录，同一 Cocos 构建可在本机根路径与远程 `/mossvale/` 下运行。原始网页脚本没有模型密钥。

## 部署与撤回

`install-preview.py` 仅供本次已确认的服务器首次安装，已有目录时停止，避免覆盖发布。它复用已部署的 Node 与 Nginx 镜像，先校验新增代理配置再热重载。服务器 Python 为 3.6，脚本保留兼容。

代理只在 IP 的 HTTPS 虚拟主机中新增 `nginx-location.conf` 所示路径；原有 `/v1/sync/` 和官网域名的路由没有改动。修改前的完整配置保存在 `/srv/mossvale-preview/backups/nginx-before-preview.conf`。

撤回时只移除当前 Nginx 配置中的 `/mossvale` 两段路由，校验后热重载，再停止 `mossvale-preview` 与本机通道。若服务器后来新增了其他配置，不直接用旧备份覆盖整个配置。TLS 证书继续使用 Brizo 的既有续期任务。
