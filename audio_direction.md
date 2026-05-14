# 虎牢关音频方向

## 目标风格

音频目标改为写实奇幻战场风格，参考方向是魔兽世界、Kingdom Rush 一类中世纪奇幻塔防与 RPG 战斗音乐。不要使用明显像素小游戏、8-bit、chiptune、单薄电子合成器或玩具感音色。

## 背景音乐

- 写实管弦/混合管弦，而不是纯 Web Audio 合成。
- 核心情绪：战场压迫、英雄防守、奇幻史诗、紧张但不吵。
- 乐器方向：低音战鼓、定音鼓、大鼓、铜管号角、低弦、合唱垫、军鼓滚奏，少量民族/古风点缀可以有，但不能变成电子古风。
- 循环要求：必须是 seamless loop，建议 60-120 秒循环版，另可准备 boss/high intensity 版本。
- 游戏内层级：普通关卡循环、开波短号角/鼓点、Boss 或最后一波强化层。

## 音效方向

- 塔防游戏反馈优先：短、清楚、可重复播放、不抢 BGM。
- 建塔：木石搭建、锤击、低沉确认音。
- 升级：金属/魔法强化，上扬但不卡通。
- 拆塔：木石坍塌、碎石、低频短尾。
- 弓塔：真实弓弦、箭矢破空。
- 弩塔：机械弩机、木质机括、重箭破空。
- 法术塔：魔法能量、低频咒术层、不要科幻激光。
- 火塔：火焰喷发、燃烧尾音。
- 投石/瞭望塔：重物抛射、空气位移、石块冲击感。
- 英雄点击：短促英雄确认音或盔甲/旗帜质感。
- 英雄攻击：刀剑挥砍、金属破风。
- 英雄死亡：沉重倒地、低鼓/铜锣，不要喜剧化。
- 小兵攻击：轻武器挥砍或撞击。
- 小兵死亡：短促倒地/盔甲落地。

## 当前运行素材

```text
assets/audio/bgm_hulaoguan_ambient.mp3
assets/audio/bgm_hulaoguan_boss_loop.wav
assets/audio/stinger_wave_start_short.wav
assets/audio/tower_build_01.ogg
assets/audio/tower_upgrade_01.ogg
assets/audio/tower_dismantle_01.ogg
assets/audio/tower_arrow_shot_01.ogg
assets/audio/tower_crossbow_shot_01.ogg
assets/audio/tower_magic_shot_01.ogg
assets/audio/tower_fire_shot_01.ogg
assets/audio/tower_stone_shot_01.ogg
assets/audio/hero_select_01.ogg
assets/audio/hero_attack_01.ogg
assets/audio/hero_skill_01.ogg
assets/audio/hero_death_01.ogg
assets/audio/enemy_attack_sword_01.ogg
assets/audio/enemy_attack_sword_02.ogg
assets/audio/enemy_attack_sword_03.ogg
assets/audio/enemy_attack_cavalry_heavy_01.ogg
assets/audio/enemy_attack_cavalry_heavy_02.ogg
assets/audio/enemy_attack_cavalry_trot_01.ogg
assets/audio/enemy_attack_warlock_spell_01.ogg
assets/audio/enemy_attack_warlock_spell_02.ogg
assets/audio/enemy_attack_eagle_screech_01.ogg
assets/audio/enemy_attack_eagle_screech_02.ogg
assets/audio/enemy_death_shout_01.wav
assets/audio/enemy_death_shout_02.wav
assets/audio/enemy_death_shout_03.wav
assets/audio/enemy_death_cavalry_01.wav
assets/audio/enemy_death_cavalry_02.wav
assets/audio/enemy_death_warlock_01.mp3
assets/audio/enemy_death_warlock_02.mp3
assets/audio/enemy_death_eagle_screech_01.ogg
```

## 当前审核结论

试听与下载源素材已从运行包中移除。主干只保留游戏实际加载的音频文件和 `assets/audio/CREDITS.md` 授权说明。
