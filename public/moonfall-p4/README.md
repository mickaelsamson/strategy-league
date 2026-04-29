# Moonveil Nexus Module

Module indépendant à placer dans ton site :

```txt
/moonfall/
  index.html
  style.css
  game.js
  assets/
    moonveil-nexus-bg.png
    moonfall-board-reference.png
```

## Installation

1. Copie le dossier `moonfall` à la racine de ton site.
2. Va sur :
   `/moonfall/`

## Intégration XP

Le jeu déclenche automatiquement un event JS à la fin :

```js
window.addEventListener("moonfall:gameover", (event) => {
  console.log(event.detail);
});
```

Payload :

```js
{
  winner: "player" | "rival" | "draw",
  turns: number,
  durationSeconds: number,
  xp: number
}
```

## Contrôles

- Clic sur une colonne
- Touches 1 à 7
- Flèches gauche/droite + Entrée

## Notes

- Le style est inspiré dark fantasy / moonlit Asian aesthetic, sans personnage reconnaissable.
- Aucun fichier principal du site n'est modifié.
