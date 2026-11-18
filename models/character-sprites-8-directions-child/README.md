# Character Sprites, 8 Directions

20 animated characters as transparent PNG sprites for isometric games, cozy sims, RPGs and platformers.
Every character walks and runs in 8 directions, plus an idle frame and a side view for platformers.
210 sprites per character and size, two sizes, CC0. Created by grab3d.

Rendered from the matching rigged 3D models on https://grab3d.com, so you can mix 2D and 3D versions of the same character.
The isometric sprites use the exact projection and scale of **Cozy Isometric Furniture Sprites**, so characters and furniture fit on the same floor grid.

## Style

Soft, flat light from the upper left of the screen and colours lifted towards pastel, so the characters sit well next to the grab3d furniture and vehicle sprites.
A subtle 1 px outline in a darkened version of the local colour keeps the silhouette readable on light and dark floors (1 px in both sizes).
There is no ground shadow, so the sprites fit on any floor and you can add a shadow that matches your game.

## Animations

| Animation | Frames per direction | Loop | Suggested frame rate |
|---|---|---|---|
| `walk` | 12 | yes | 12 fps (one cycle = 1.0 s, two steps) |
| `run` | 8 | yes | 12 fps (one cycle = 0.67 s, two steps) |
| `idle` | 1 | no | still frame |

Frames are spread evenly over one full cycle and the last frame leads straight back into the first, so the loop has no double frame and no hitch.
12 frames for walk give 6 frames per step (contact, down, passing, up and the in-betweens), 8 frames for run give 4 per step, which is enough for a fast motion and keeps the sheets small.
At 12 fps both clips play at their original speed (walk 11.5 fps, run 12.8 fps exactly).

**About idle:** the source models have no idle clip. The idle sprite is a still frame made from the walk cycle: arms and upper body from the passing pose, legs in the rest pose. There is no breathing animation.

## Views and directions

| View | Folder | Directions | Camera |
|---|---|---|---|
| Isometric | `iso` | S, SW, W, NW, N, NE, E, SE | orthographic, true 2:1 isometric (30° elevation, 45° azimuth) |
| Side | `side` | E, W | orthographic, level (platformer) |

Directions are screen directions in which the character looks and walks. S faces the viewer, N faces away, E looks right.
The 8 directions are equal 45° steps on the floor: SE, SW, NE and NW run exactly along the 2:1 grid lines (tile rows), N, E, S and W run along the tile diagonals (straight up, right, down and left on screen).
To pick a direction from a movement vector in floor space, round its angle to the nearest 45°.

## Sizes and scale

| Size | Frame | Floor tile (1 m × 1 m) | 1 m height (iso) | Side view |
|---|---|---|---|---|
| `1x` | 128 × 128 px | 64 × 32 px diamond | 39.2 px | 1 m = 32 px |
| `2x` | 256 × 256 px | 128 × 64 px diamond | 78.4 px | 1 m = 64 px |

All characters share one scale, so the goblin is smaller than the queen, and they match the furniture kit (a 1 m tile is 128 × 64 px in 2x in both kits).
The side view uses the scale of the side view in **Cozy Cars Sprites** (1 m = 64 px in 2x), so cars and characters fit together in a side scroller.
The frame is smaller than in the furniture kit (256 instead of 512 px in 2x) because a character needs less room than a bed. The scale is the same.

## Pivot (anchor)

The pivot is the point on the floor between the feet. It sits at the same spot in every frame, direction and animation, measured from the top left:

* isometric: x 0.5, y 0.8125 (2x: pixel 128, 208 · 1x: pixel 64, 104)
* side: x 0.5, y 0.875 (2x: pixel 128, 224 · 1x: pixel 64, 112)

The clips are in place (no root motion). The body bobs and sways naturally, but the character never drifts away from the pivot, and the standing foot touches the floor line of the pivot.
Place the sprite by putting the pivot on the floor position of the character. Use the floor position for Y sorting.

## Characters and movement speed

The feet do not slide when the character moves at the ground speed of the clip. In metres per second, which is tiles per second on a 1 m grid:

| Character | Slug | Height | Walk | Run | 3D model on grab3d.com |
|---|---|---|---|---|---|
| Herbalist Witch | `witch` | 1.62 m | 1.40 m/s | 5.1 m/s | witch |
| Astronaut | `astronaut` | 1.86 m | 1.54 m/s | 5.5 m/s | astronaut-in-spacesuit |
| Dwarf Gem Cutter | `dwarf` | 1.39 m | 1.09 m/s | 3.8 m/s | dwarf |
| Teen | `teen` | 1.61 m | 1.32 m/s | 4.8 m/s | teen-character |
| Elderly Woman | `elderly-woman` | 1.56 m | 1.29 m/s | 4.8 m/s | elderly-woman |
| Elf Cartographer | `elf` | 1.69 m | 1.48 m/s | 5.3 m/s | elf |
| Winter King | `king` | 1.83 m | 1.57 m/s | 5.7 m/s | king |
| Desert Queen | `queen` | 1.93 m | 1.63 m/s | 5.8 m/s | queen |
| Goblin Tinkerer | `goblin` | 1.08 m | 0.83 m/s | 2.9 m/s | goblin |
| Orc Steppe Rider | `orc` | 1.89 m | 1.59 m/s | 5.6 m/s | orc |
| Cyborg Courier | `cyborg` | 1.76 m | 1.46 m/s | 5.4 m/s | cyborg |
| Android | `android` | 1.72 m | 1.51 m/s | 5.4 m/s | android |
| Grey Alien | `alien-grey` | 1.37 m | 1.14 m/s | 4.1 m/s | alien-grey |
| Wooden Mannequin | `mannequin` | 1.76 m | 1.55 m/s | 5.5 m/s | stylized-mannequin |
| Chef | `chef` | 1.89 m | 1.43 m/s | 5.0 m/s | chef |
| Farmer | `farmer` | 1.78 m | 1.55 m/s | 5.4 m/s | farmer |
| Child | `child` | 1.23 m | 0.98 m/s | 3.3 m/s | child |
| Wizard | `wizard` | 1.90 m | 1.54 m/s | 5.4 m/s | wizard |
| Nurse | `nurse` | 1.60 m | 1.29 m/s | 4.5 m/s | nurse |
| Robot | `robot` | 1.41 m | 1.19 m/s | 4.1 m/s | robot |

Screen pixels per metre in 2x isometric: 90.5 px along E/W, 45.3 px along N/S, 71.6 px along the grid lines (SE, SW, NE, NW). Half these values in 1x.
If you move your characters slower, lower the frame rate in the same ratio.

## Engine notes

**Godot 4 (AnimatedSprite2D):** create a `SpriteFrames` resource, add an animation such as `walk_SE`, click "Add frames from sprite sheet" and load `sheets/2x/<character>_iso_walk.png`. Set Horizontal to 12 (8 for run) and Vertical to 8, then select the row of the direction (row order S, SW, W, NW, N, NE, E, SE). Set the speed to 12 FPS and Loop on. Keep `centered = true` and set `offset = Vector2(0, -80)` (2x) or `Vector2(0, -40)` (1x), so the node position is the floor point. For the side view the offset is `Vector2(0, -96)` (2x) or `Vector2(0, -48)` (1x). Turn on Y sort.

**Unity:** import a sheet as Sprite (2D and UI), Sprite Mode Multiple, Pixels Per Unit 128 for 2x or 64 for 1x (same as the furniture kit, one floor tile is 1 × 0.5 units). In the Sprite Editor slice Grid By Cell Size 256 × 256 (2x) or 128 × 128 (1x) with pivot Custom x 0.5, y 0.1875 (Unity measures from the bottom). Select the frames of one row and drag them into the scene to create an animation clip, then set its Samples to 12. For the side view use pivot y 0.125 and Pixels Per Unit 64 (2x) or 32 (1x), then 1 unit is 1 m.

**Phaser, PixiJS and TexturePacker importers:** load `atlas/2x/<character>.json` or `atlas/1x/<character>.json`. The `animations` block lists the frames of every clip in order, for example `iso_walk_SE` or `side_run_E`. Frames are trimmed, the `pivot` field and `spriteSourceSize` restore the floor point.

## Files

```
png/1x/iso/<character>/<character>_iso_<anim>_<dir>_<frame>.png   single frames, 128 px
png/1x/side/<character>/<character>_side_<anim>_<E|W>_<frame>.png
png/2x/...                                                         same in 256 px
sheets/1x/<character>_iso_<anim>.png + .json    one row per direction (S, SW, W, NW, N, NE, E, SE), one column per frame
sheets/1x/<character>_side_<anim>.png + .json   rows E, W
sheets/2x/...
atlas/1x/<character>.png + .json                all frames of one character packed and trimmed
atlas/2x/...
preview/<character>.webp                        animated preview
zip/character-sprites-8-directions-<character>.zip   everything for one character
vorschau.png                                    overview on light and dark background
```

The JSON files use the TexturePacker "JSON Hash" format with `frames`, `animations` and a `meta.grab3d` block
(tile size, pixels per metre, pivot, camera, frame rate, grid layout, outline width, height and ground speed of the character).
In the sheets the animations are named `<anim>_<dir>`, in the atlas `<view>_<anim>_<dir>`.
Transparent edge pixels carry the neighbouring colour, which avoids dark fringes with bilinear filtering.

## License

CC0 1.0 Universal (public domain). Use the sprites in personal, commercial and open source projects, change them and share them.
No attribution required. A link to https://grab3d.com is appreciated but never needed. See `LICENSE.txt`.

Created by grab3d · https://grab3d.com
