# 神谷朔的说话方式

角色资料将神谷朔设定为年轻宫司，原语音指令却使用“年长男性、安稳温厚”，并沿用全员共用的重音、上扬和收尾要求。这个不匹配值得先纠正；仅凭配置，还无法断定播音感全部来自哪一项。

本地 0.8.15 保留龙楠 `longnan_v3.1`、语速 `1.026` 和音高 `1`，只调整他的表达：年轻、温和、有礼，像坐在桌边对一个人接话；短停顿、轻收句尾，谈到疑点略有犹豫。`delivery` 为角色单独的发声方向，未设置时继续沿用共用指令，因此其他五人的参数保持原样。

用同一句台词分别生成调整前、调整后样音，共两次真实 Qwen 合成。两次均返回完整音频；这说明请求可用，听感改善仍须试听判断。样音和记录在 `qa/miyazaki-conversation-v1/`，不写入玩家存档。本轮未更新线上语音配置；若调整版仍有明显播音感，再比较其他音色。

当前 `qwen-audio-3.1-tts-flash` 支持通过自然语言指令控制语气、情感与说话方式，依据为[阿里云实时语音合成说明](https://help.aliyun.com/zh/model-studio/realtime-tts-user-guide)。

本地 0.8.16 按试听反馈，仅将神谷朔语速从 `1.026` 调至 `1.08`，参数提高约 5.3%。同句新样音为 7.01 秒，上一交谈版为 7.38 秒；复用上一版音频作对照，本轮只合成一次。音色、音高、发声指令及其他人物设置保持，线上配置未替换。新样音在 `qa/miyazaki-rate-v1/slightly-faster.wav`。

本地 0.8.17 根据下一轮试听反馈，只更新神谷朔的发声指令：句内起伏和语义重音更鲜明，每句最后两三个字渐弱、尾字轻收，问句在句中表达上扬。语速保持 `1.08`。同句一次真实合成得到 7.16 秒样音，供用户试听，不据此断言主观效果；其他配置与线上版本保持。样音位于 `qa/miyazaki-prosody-v1/more-expression-soft-endings.wav`。

0.9.0 将以上三轮已试听的调整一并发布，保留龙楠音色和其他五人配置，本轮复用已有样音与验证记录。

## English


Kamiya's public character profile describes a young shrine priest, while his old voice direction described an older man. Local version 0.8.15 corrects that mismatch and gives him an individual conversational direction. The voice ID, rate, pitch, and the other five characters' settings stay the same.

Two samples use the same line and synthesis settings, with only the speaking direction changed. Both requests returned complete audio; perceived improvement still needs listening. Production voice settings have not been updated in this iteration.

Local version 0.8.16 raises only Kamiya's rate from `1.026` to `1.08`, about 5.3%. One new sample of the same line lasts 7.01 seconds, compared with the earlier conversational sample's 7.38 seconds. All other voice settings remain unchanged; production has not been updated.

Local version 0.8.17 requests clearer variation and emphasis within sentences, with a gradual reduction in volume over the last two or three words and a light final syllable. The rate stays at `1.08`. One real synthesis produced a 7.16-second sample for listening; other settings and production remain unchanged.

Version 0.9.0 deploys these three previously auditioned changes together, retaining the Longnan voice and the other five profiles. This release reuses the existing samples and verification records.
