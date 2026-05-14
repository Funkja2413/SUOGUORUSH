# Character Asset Layout

角色动画统一放在 `assets/characters` 下。默认使用 4x3 雪碧图，12 帧。

推荐规格：

- 雪碧图尺寸：1536x1152
- 单帧尺寸：384x384
- 排布：4 列 x 3 行
- 背景：透明底优先，会按原透明通道直接绘制；黑底或白底的非透明素材，运行时会抠掉接近纯黑/纯白的底色

## Heroes

英雄目录：`assets/characters/heroes/<hero_id>/`

每个英雄固定 6 个状态：

- `idle.png`
- `walk.png`
- `attack.png`
- `skill1.png`
- `skill2.png`
- `death.png`

当前英雄目录：

- `heroes/liubei/`
- `heroes/lvbu/`

## Enemies

小兵目录：`assets/characters/enemies/<enemy_id>/`

三向地面小兵固定 4 个状态：

- `walk_side.png`
- `walk_front.png`
- `walk_back.png`
- `attack.png`

飞行小兵也使用三向移动和攻击状态：

- `walk_side.png`
- `walk_front.png`
- `walk_back.png`
- `attack.png`

当前小兵目录：

- `enemies/knife_soldier/`
- `enemies/iron_cavalry/`
- `enemies/warlock/`
- `enemies/eagle_scout/`
