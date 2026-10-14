# 手记简化版

2026-10-11。使用内置 imagegen 编辑 v2 底图，按用户要求将装饰简化约三成。去掉右下花草，减少纹理细节，保留纸页、装订与动物朋友。透明 PNG 为 1024×1536。

正式素材：[journal-notebook-v3.png](../cocos/assets/resources/journal-notebook-v3.png)。旧版已移到文档归档，避免两张大图同时进入游戏包。

底图不再包含横线。Cocos 正文采用固定字号与行距，横线按同一基线绘制并贴住中文字底部，避免换行后逐行错位。

## 实际生成提示词

Edit the supplied notebook game asset. This is the actual edit target, not just inspiration. Preserve the tall 2:3 aspect ratio, straight-on orthographic view, exact page and cover silhouette, layout and margins, moss-green linen cover, cream paper and left brass binding. Make the illustration approximately 30% simpler and cleaner: reduce tiny texture and distressed paper detail, use broader gentle color shapes, fewer leaflets and flower accents, simpler flat brass loops with gentle volume, clean cozy cartoon rendering. Keep one modest botanical decoration top left, a simple tiny tea cup top right, and the three tiny animal friends bottom left simplified into clear friendly shapes. Remove the extra bottom-right plant cluster, keep that area empty. Maintain the overall warm moss-green/cream/ochre palette and handmade game-prop charm. The upper header region and central writing area must remain clean and light. CRITICAL: remove ALL the preprinted horizontal ruled lines entirely, leave the central paper blank for precisely aligned game-engine text and lines. Do not generate any text, letters, numbers, pagination, buttons or interface. Keep all decorative elements out of the central writing area from x=21% to 88% and y=36% to 67%. Leave bottom-center pagination region clear. The object should occupy exactly the same position and size as the reference, at 1024x1536. True transparent RGBA outside the notebook with only a subtle soft contact shadow; no colored backdrop or checkerboard.
