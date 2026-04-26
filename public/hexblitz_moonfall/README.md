# Hex Blitz Moonfall V3

Full premium module ready to integrate.

## Structure

```txt
/hex-blitz-moonfall-v3/
  index.html
  style.css
  game.js
  assets/
    bg/moonfall-mockup-bg.png
    tiles/hex_empty.png
    tiles/hex_crimson.png
    tiles/hex_ivory.png
    tiles/hex_fire.png
    tiles/hex_ice.png
    tiles/hex_shadow.png
    fx/victory_burst.png
    fx/path_glow.png
```

## URL

```txt
/hex-blitz-moonfall-v3/
```

## Gameplay

- Local PvP.
- Crimson connects left to right.
- Lunar connects top to bottom.
- Full win detection with path highlight.
- Timer, tile counters, surrender, reset.
- Skin buttons: Default, Fire, Ice, Shadow.

## XP hook

```js
window.addEventListener("hexblitz:gameover", (event) => {
  console.log(event.detail);
});
```

Payload:

```js
{
  winner: "crimson" | "lunar",
  turns: number,
  durationSeconds: number,
  pathLength: number,
  xp: 35
}
```

## Optional Express

```js
app.use('/hex-blitz-moonfall-v3', express.static(path.join(__dirname, 'hex-blitz-moonfall-v3')));
```
