# Moonveil Nexus Module

Module indépendant à placer dans ton site :

```txt
/moonveil/
  index.html
  style.css
  game.js
  assets/
    moonveil-nexus-bg.png
    moonveil-board-reference.png
```

## Installation

1. Copie le dossier `moonveil` à la racine de ton site.
2. Va sur :
   `/moonveil/`

## Intégration XP

Le jeu déclenche automatiquement un event JS à la fin :

```js
window.addEventListener("moonveil:gameover", (event) => {
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
