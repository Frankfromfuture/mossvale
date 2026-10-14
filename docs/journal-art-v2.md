# 手记原画 v2

2026-10-11，使用内置 imagegen 生成；原图保留透明通道，复制到 `cocos/assets/resources/journal-notebook-v2.png`。游戏文字、页码与操作由 Cocos 实时绘制。以下为实际生成提示词。

```text
Use case: stylized-concept.
Asset type: production-ready transparent 2D UI prop sprite for a portrait cozy animal village game, not a mockup of a screen.
Primary request: one exquisitely illustrated open field journal, a single tall right-hand page with its binding on the left. Straight-on perfectly flat front view, no perspective tilt, no tabletop, nothing behind it. Portrait image 1024x1536; notebook occupies almost the entire image with 3% transparent breathing room, the entire silhouette stays inside the image.
Style: premium hand-painted cozy game illustration, warm gouache, delicate colored-pencil edge work, soft sculpted volume and tasteful tactile material details, clear at mobile scale. Much more lovingly crafted than a flat vector panel.
Materials: slightly worn moss-green linen cover visible as a narrow border, rounded book corners, cream deckle-edged paper with fine subtle fibers and layered page edges; six small brass binding loops and softly reinforced punched holes on the left; a narrow sage ribbon bookmark hanging a little below the bottom edge.
Composition for runtime overlays: upper 10-18% of the page is clean blank space for the game's title; upper 25-36% is blank for a resident name and subtitle; central x=19%-88%, y=39%-73% is completely uncluttered cream paper for live Chinese story text. A few whisper-light widely spaced ruled pencil lines only in the central writing region. Lower center y=87%-94% must stay blank for page arrows and page count.
Decorations: a delicate pressed fern tucked under a little translucent washi tape in the upper-left paper corner, a small elegant teacup-and-leaf painted vignette near the upper-right corner, and a tiny charming original fox, rabbit and bear trio huddled together as a die-cut watercolor sticker at lower-left, confined to x=17%-43%,y=76%-86%. Keep these small and beautifully finished. No face portrait placeholder, no framed photos, no blank boxes.
Lighting: gentle warm diffuse light, subtle paper edge shadows and binding depth, no heavy outer drop shadow.
Constraints: genuine transparent outside background. No words, no letters, no numbers, no glyphs, no title, no UI controls baked into the artwork. No watermark, no logos, no arrows, no buttons, no browser, no phone frame, no scene background. The result is one reusable notebook background asset, with ample clean space for real game text.
```

构建纹理参考：[Cocos 3.8 纹理说明](https://docs.cocos.com/creator/3.8/manual/zh/asset/compress-texture.html)。
