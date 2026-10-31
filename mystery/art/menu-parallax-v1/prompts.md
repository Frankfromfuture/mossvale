# 首页前后景

使用内置 imagegen，基于原窗景分离两张 1536×1024 图片。透明桌子保留台灯、茶杯、书、花瓶及座椅；生成图的桌子较大，页面按 80% 比例放回左下角。背景已补齐原桌子遮挡的窗景与地毯。原图保留。

正式资源：`public/art/menu/reading-room-background-v2.png`、`public/art/menu/reading-desk-v2.png`。交互：首页空白区域或 Logo 上按住拖动，前景最大 18×12px、背景最大 6×4px；松手 0.65 秒归位。菜单按钮固定，滚动面板及减少动态效果设置保留原生操作。

## 背景提示词

Use case: precise-object-edit. Edit the supplied existing watercolor illustration into the BACKGROUND PLATE for a two-layer parallax scene. Keep EXACT same 1536x1024 canvas, camera, framing, mountains, lake, sky, all window architecture and painted color/style. Remove ONLY the entire left foreground wooden writing desk, its drawers/legs, chair and draped blanket, lamp, teacup, flat green book and small far-left tabletop vase/flowers. Seamlessly reconstruct the hidden background: continue the left wooden window jamb downward, the misty trees and window view behind desk, the lower window sill and patterned floor carpet. Keep the right-edge books and cabinet unchanged. Do not add any new props. No desk, lamp, chair or table objects may remain in this background plate. Precise local removal, not a redesign. No text, no logo. Output exactly the original wide 3:2 composition.

## 前景提示词

Use case: background-extraction. Extract ONLY the LEFT foreground wooden writing desk and ALL things physically on or in front of this desk from the supplied watercolor illustration: desk top, drawers and legs, brass and cream glowing oil lamp, blue patterned cup/saucer, closed green book, far-left tabletop vase with flowers, foreground chair and draped blanket. Remove everything else to REAL TRANSPARENT ALPHA: mountains, sky, lake, trees, window and frame, wall, floor, carpet, right-edge stack of books and cabinet. Crucial: preserve exact original position, size, silhouette, details and watercolor colors on the SAME 1536x1024 wide canvas. Do NOT center, enlarge, relocate, restyle or complete the cropped left/bottom objects. Keep the existing cropped desk anchored to the lower-left; its tabletop rightmost corner stays approximately x=630 y=785. The lamp stays approximately x=116..255 y=552..780, book x=60..338 y=777..854. All canvas outside that desk/chair/lamp/props silhouette must be genuinely transparent including between chair/desk legs. This is a precisely registered foreground layer for overlay on the original image, not a standalone centered product picture. No borders, checkerboard, text or watermark.
