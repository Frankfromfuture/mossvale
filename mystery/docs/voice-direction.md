# 神谷朔的说话方式

角色资料将神谷朔设定为年轻宫司，原语音指令却使用“年长男性、安稳温厚”，并沿用全员共用的重音、上扬和收尾要求。这个不匹配值得先纠正；仅凭配置，还无法断定播音感全部来自哪一项。

本地 0.8.15 保留龙楠 `longnan_v3.1`、语速 `1.026` 和音高 `1`，只调整他的表达：年轻、温和、有礼，像坐在桌边对一个人接话；短停顿、轻收句尾，谈到疑点略有犹豫。`delivery` 为角色单独的发声方向，未设置时继续沿用共用指令，因此其他五人的参数保持原样。

用同一句台词分别生成调整前、调整后样音，共两次真实 Qwen 合成。两次均返回完整音频；这说明请求可用，听感改善仍须试听判断。样音和记录在 `qa/miyazaki-conversation-v1/`，不写入玩家存档。本轮未更新线上语音配置；若调整版仍有明显播音感，再比较其他音色。

当前 `qwen-audio-3.1-tts-flash` 支持通过自然语言指令控制语气、情感与说话方式，依据为[阿里云实时语音合成说明](https://help.aliyun.com/zh/model-studio/realtime-tts-user-guide)。

## English

Kamiya's public character profile describes a young shrine priest, while his old voice direction described an older man. Local version 0.8.15 corrects that mismatch and gives him an individual conversational direction. The voice ID, rate, pitch, and the other five characters' settings stay the same.

Two samples use the same line and synthesis settings, with only the speaking direction changed. Both requests returned complete audio; perceived improvement still needs listening. Production voice settings have not been updated in this iteration.
