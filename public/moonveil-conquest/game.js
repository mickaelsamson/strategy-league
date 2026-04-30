(() => {
  const PLAYER_COLORS = ['#2f9ed9', '#d64e5e', '#44ad68', '#d59b38', '#8b64d8', '#e5eef4'];
  const DEFAULT_NAMES = ['Mickael', 'Akari', 'Kuro', 'Ren', 'Sora', 'Nami'];
  const FACTIONS = ['Dawn House', 'Red Moon', 'Iron Lotus', 'Mist Clan', 'Sand Crown', 'Shadow Pact'];
  const LEADERS = [
    { mark: 'DA', title: 'Daimyo', signature: 'Clean command' },
    { mark: 'RO', title: 'Ronin', signature: 'Fast strikes' },
    { mark: 'ON', title: 'Onmyoji', signature: 'Stubborn defense' },
    { mark: 'SH', title: 'Shogun', signature: 'Cold expansion' },
    { mark: 'KA', title: 'Kage', signature: 'Hidden fronts' },
    { mark: 'AD', title: 'Admiral', signature: 'Bridges and islands' }
  ];
  const CARD_SYMBOLS = ['moon', 'saber', 'banner'];

  const TAISHO_REGIONS = {
    divin: { name: 'Divine Continent', bonus: 3 },
    forets: { name: 'Forest Continent', bonus: 4 },
    fer: { name: 'Iron Continent', bonus: 5 },
    sables: { name: 'Sands Continent', bonus: 4 },
    soleil: { name: 'Rising Sun Continent', bonus: 4 },
    demons: { name: 'Demon Isles', bonus: 2 }
  };

  const BRIDGE_PAIRS =   [
      {
          "from": "divin-2",
          "to": "forets-1"
      },
      {
          "from": "divin-3",
          "to": "forets-4"
      },
      {
          "from": "divin-4",
          "to": "demons-1"
      },
      {
          "from": "divin-4",
          "to": "soleil-2"
      },
      {
          "from": "divin-1",
          "to": "soleil-1"
      },
      {
          "from": "forets-5",
          "to": "demons-2"
      },
      {
          "from": "forets-6",
          "to": "fer-2"
      },
      {
          "from": "demons-2",
          "to": "fer-4"
      },
      {
          "from": "fer-6",
          "to": "sables-4"
      },
      {
          "from": "demons-4",
          "to": "sables-2"
      },
      {
          "from": "soleil-7",
          "to": "sables-1"
      }
  ];

  const TAISHO_TERRITORIES =   [
      {
          "id": "divin-1",
          "name": "Dawn Gate",
          "region": "divin",
          "label": {
              "x": 317,
              "y": 272
          },
          "path": "m 225.40348,382.46305 20.18955,10.76648 82.51926,18.24405 7.85898,-0.56135 18.80541,-60.34572 47.15386,-46.87318 4.77152,-34.24269 57.25826,-64.55588 -50.80267,-36.20743 -111.42907,-13.19186 -121.81414,114.51653 53.32877,41.82098 z",
          "neighbors": [
              "divin-2",
              "divin-3",
              "divin-4",
              "soleil-1"
          ],
          "bridgeNeighbors": [
              "soleil-1"
          ]
      },
      {
          "id": "divin-2",
          "name": "Northern Sanctuary",
          "region": "divin",
          "label": {
              "x": 524,
              "y": 134
          },
          "path": "m 462.056,202.55059 -49.3341,-34.09267 5.21417,-45.3232 98.66821,-79.81697 105.88784,46.927563 -7.21963,104.684567 -150.40885,10.02725 z",
          "neighbors": [
              "divin-1",
              "divin-3",
              "forets-1"
          ],
          "bridgeNeighbors": [
              "forets-1"
          ]
      },
      {
          "id": "divin-3",
          "name": "Star Citadel",
          "region": "divin",
          "label": {
              "x": 532,
              "y": 273
          },
          "path": "m 527.03263,366.19543 96.26167,-39.70794 29.68068,-94.25622 -39.30685,-38.10357 -150.40886,10.82943 -57.35591,65.77881 -4.41199,32.48831 z",
          "neighbors": [
              "divin-1",
              "divin-2",
              "divin-4",
              "forets-4"
          ],
          "bridgeNeighbors": [
              "forets-4"
          ]
      },
      {
          "id": "divin-4",
          "name": "Sacred Gardens",
          "region": "divin",
          "label": {
              "x": 435,
              "y": 385
          },
          "path": "m 334.50929,409.51318 20.8567,-60.16355 46.12538,-44.92211 133.56307,66.1799 2.00545,31.28504 -71.79516,60.56463 -97.46494,-42.11448 z",
          "neighbors": [
              "demons-1",
              "divin-1",
              "divin-3",
              "soleil-2"
          ],
          "bridgeNeighbors": [
              "demons-1",
              "soleil-2"
          ]
      },
      {
          "id": "forets-1",
          "name": "Silverwood",
          "region": "forets",
          "label": {
              "x": 762,
              "y": 144
          },
          "path": "m 693.10287,83.625909 87.87808,-18.426048 72.21496,108.934049 -30.42824,40.97269 -82.89098,-6.75052 -63.78248,-53.86076 17.00866,-70.869411 c 0,0 -41.56659,-35.526364 0,0 z",
          "neighbors": [
              "divin-2",
              "forets-2",
              "forets-4",
              "forets-5"
          ],
          "bridgeNeighbors": [
              "divin-2"
          ]
      },
      {
          "id": "forets-2",
          "name": "Fox Canopies",
          "region": "forets",
          "label": {
              "x": 888,
              "y": 102
          },
          "path": "m 950.16276,165.12355 39.33,-85.214987 L 879.30634,28.092854 780.66921,66.174279 853.39848,174.1757 Z",
          "neighbors": [
              "forets-1",
              "forets-3",
              "forets-5"
          ],
          "bridgeNeighbors": []
      },
      {
          "id": "forets-3",
          "name": "Pine March",
          "region": "forets",
          "label": {
              "x": 1057,
              "y": 141
          },
          "path": "m 988.55633,79.59642 93.64287,-17.167855 80.845,60.243565 -46.5093,92.70642 -126.73,-16.54357 -39.33,-34.02357 z",
          "neighbors": [
              "forets-2",
              "forets-5",
              "forets-6"
          ],
          "bridgeNeighbors": []
      },
      {
          "id": "forets-4",
          "name": "Moss Vale",
          "region": "forets",
          "label": {
              "x": 794,
              "y": 296
          },
          "path": "m 739.24921,209.40271 82.60842,6.91606 53.02307,115.26755 -34.96449,61.0918 -78.38194,-26.12731 -3.84225,-28.81689 -49.18082,-63.39715 z",
          "neighbors": [
              "demons-1",
              "divin-3",
              "forets-1",
              "forets-5"
          ],
          "bridgeNeighbors": [
              "divin-3"
          ]
      },
      {
          "id": "forets-5",
          "name": "Green Crown",
          "region": "forets",
          "label": {
              "x": 918,
              "y": 289
          },
          "path": "m 839.53198,391.14122 87.60334,34.58026 50.3335,-22.66928 29.58538,-68.39208 -22.28511,-33.42759 4.61071,-102.97235 -39.5752,-32.65913 -96.82474,9.2214 -31.12223,41.11209 51.87039,114.88333 z",
          "neighbors": [
              "demons-2",
              "forets-1",
              "forets-2",
              "forets-3",
              "forets-4",
              "forets-6"
          ],
          "bridgeNeighbors": [
              "demons-2"
          ]
      },
      {
          "id": "forets-6",
          "name": "Firefly Pass",
          "region": "forets",
          "label": {
              "x": 1047,
              "y": 263
          },
          "path": "m 989.76402,198.64441 126.41008,16.90591 4.2265,66.47095 -72.6186,47.64392 -41.4963,4.22648 -22.28506,-33.42759 z",
          "neighbors": [
              "fer-1",
              "fer-2",
              "forets-3",
              "forets-5"
          ],
          "bridgeNeighbors": [
              "fer-2"
          ]
      },
      {
          "id": "fer-1",
          "name": "Western Bastion",
          "region": "fer",
          "label": {
              "x": 1136,
              "y": 395
          },
          "path": "m 1170.5674,456.57221 46.9585,-40.73507 -65.6287,-95.61425 -88.8251,53.18189 -3.6551,46.52665 72.4019,28.17807 z",
          "neighbors": [
              "fer-2",
              "fer-4",
              "fer-5",
              "forets-6"
          ],
          "bridgeNeighbors": []
      },
      {
          "id": "fer-2",
          "name": "High Forge",
          "region": "fer",
          "label": {
              "x": 1253,
              "y": 345
          },
          "path": "m 1241.5466,266.32937 106.7303,51.87589 -37.9761,93.32698 -93.0788,4.21957 -64.7828,-94.81624 z",
          "neighbors": [
              "fer-1",
              "fer-3",
              "fer-5",
              "forets-6"
          ],
          "bridgeNeighbors": [
              "forets-6"
          ]
      },
      {
          "id": "fer-3",
          "name": "Ash Ramparts",
          "region": "fer",
          "label": {
              "x": 1399,
              "y": 443
          },
          "path": "m 1348.0287,318.45347 104.2482,56.59189 40.7064,26.80668 -22.8353,44.4296 18.3676,30.03341 -23.58,47.90454 -63.2935,34.99761 -78.9308,-45.67064 16.8782,-63.29356 -29.5369,-39.71361 z",
          "neighbors": [
              "fer-2",
              "fer-5",
              "fer-7"
          ],
          "bridgeNeighbors": []
      },
      {
          "id": "fer-4",
          "name": "Steel Gate",
          "region": "fer",
          "label": {
              "x": 1108,
              "y": 503
          },
          "path": "m 1058.864,420.71601 -37.2315,47.40811 -9.1838,62.79714 69.9953,24.32458 94.8162,25.56564 29.7852,-43.43676 -35.7423,-80.17184 -40.4582,-9.43198 z",
          "neighbors": [
              "demons-2",
              "fer-1",
              "fer-5",
              "fer-6",
              "fer-7"
          ],
          "bridgeNeighbors": [
              "demons-2"
          ]
      },
      {
          "id": "fer-5",
          "name": "Forge Basin",
          "region": "fer",
          "label": {
              "x": 1257,
              "y": 471
          },
          "path": "m 1171.3031,457.6993 46.6635,-41.94749 92.5824,-5.21242 28.5441,39.96182 -16.3818,64.53461 -116.6587,22.58711 z",
          "neighbors": [
              "fer-1",
              "fer-2",
              "fer-3",
              "fer-4",
              "fer-6",
              "fer-7"
          ],
          "bridgeNeighbors": []
      },
      {
          "id": "fer-6",
          "name": "Scarlet Tower",
          "region": "fer",
          "label": {
              "x": 1092,
              "y": 621
          },
          "path": "m 1012.2005,531.16947 -57.58471,68.50597 30.77804,37.72793 69.49877,20.60143 51.8759,36.73508 34.5012,19.85681 47.9046,-12.1623 24.3246,-39.7136 -37.2316,-82.90215 -93.5751,-24.82101 z",
          "neighbors": [
              "fer-4",
              "fer-5",
              "fer-7",
              "sables-3",
              "sables-4"
          ],
          "bridgeNeighbors": [
              "sables-4"
          ]
      },
      {
          "id": "fer-7",
          "name": "Hammer Bay",
          "region": "fer",
          "label": {
              "x": 1283,
              "y": 586
          },
          "path": "m 1323.2077,514.5394 -116.6587,22.83532 -29.2888,43.18855 36.4869,80.91647 107.7231,-16.87828 39.7136,-25.56564 39.7136,-58.57756 -3.2267,-4.46779 z",
          "neighbors": [
              "fer-3",
              "fer-4",
              "fer-5",
              "fer-6"
          ],
          "bridgeNeighbors": []
      },
      {
          "id": "sables-1",
          "name": "Jade Dunes",
          "region": "sables",
          "label": {
              "x": 686,
              "y": 791
          },
          "path": "m 597.11032,808.41266 11.70804,-24.25238 80.56251,-56.31012 58.26146,18.95588 10.31423,64.95178 -63.83672,43.48702 z",
          "neighbors": [
              "sables-2",
              "sables-5",
              "sables-8",
              "soleil-7"
          ],
          "bridgeNeighbors": [
              "soleil-7"
          ]
      },
      {
          "id": "sables-2",
          "name": "Nomad Oasis",
          "region": "sables",
          "label": {
              "x": 817,
              "y": 785
          },
          "path": "m 747.92109,746.52728 108.99633,-23.69485 24.80991,103.97859 -47.11095,21.18599 -77.21734,-36.51795 z",
          "neighbors": [
              "demons-4",
              "sables-1",
              "sables-3",
              "sables-8"
          ],
          "bridgeNeighbors": [
              "demons-4"
          ]
      },
      {
          "id": "sables-3",
          "name": "Glass Sea",
          "region": "sables",
          "label": {
              "x": 928,
              "y": 763
          },
          "path": "m 856.3599,722.2749 58.54022,-32.33651 85.30148,20.90723 -22.02228,104.81488 -49.34105,27.8763 -47.66847,-16.44702 z",
          "neighbors": [
              "fer-6",
              "sables-2",
              "sables-4"
          ],
          "bridgeNeighbors": []
      },
      {
          "id": "sables-4",
          "name": "Red Temple",
          "region": "sables",
          "label": {
              "x": 1064,
              "y": 788
          },
          "path": "m 978.45808,814.82421 22.02232,-104.25736 42.6507,9.75671 54.08,18.95588 76.3811,60.49157 -26.2037,33.45156 -100.6335,19.79217 z",
          "neighbors": [
              "fer-6",
              "sables-3"
          ],
          "bridgeNeighbors": [
              "fer-6"
          ]
      },
      {
          "id": "sables-5",
          "name": "Amber Coast",
          "region": "sables",
          "label": {
              "x": 585,
              "y": 846
          },
          "path": "m 595.7165,808.69143 -46.55342,29.27011 6.83692,44.03846 53.8,-6.9 18.2,-39.5 z",
          "neighbors": [
              "sables-1",
              "sables-6",
              "sables-8",
              "soleil-7"
          ],
          "bridgeNeighbors": []
      },
      {
          "id": "sables-6",
          "name": "Salt Basin",
          "region": "sables",
          "label": {
              "x": 558,
              "y": 900
          },
          "path": "m 549.16308,837.96154 -36.79671,39.30558 43.63363,37.53288 53.8,-39.7 -53.8,6.9 z",
          "neighbors": [
              "sables-5",
              "sables-7",
              "soleil-6",
              "soleil-7"
          ],
          "bridgeNeighbors": []
      },
      {
          "id": "sables-7",
          "name": "Mirage Steppe",
          "region": "sables",
          "label": {
              "x": 613,
              "y": 927
          },
          "path": "m 556,914.8 45.84929,39.4057 58.54023,5.01774 -28.38952,-44.22344 -22.2,-39.9 z",
          "neighbors": [
              "sables-6",
              "sables-8",
              "soleil-6"
          ],
          "bridgeNeighbors": []
      },
      {
          "id": "sables-8",
          "name": "Sunken Cliffs",
          "region": "sables",
          "label": {
              "x": 658,
              "y": 885
          },
          "path": "m 628,835.6 -18.2,39.5 22.2,39.9 28.38952,44.22344 33.73032,-104.53612 z",
          "neighbors": [
              "sables-1",
              "sables-2",
              "sables-5",
              "sables-7"
          ],
          "bridgeNeighbors": []
      },
      {
          "id": "soleil-1",
          "name": "Sakura Port",
          "region": "soleil",
          "label": {
              "x": 230,
              "y": 510
          },
          "path": "m 114.36437,486.986 89.52294,-52.49512 24.84144,18.74826 101.24059,28.12239 -9.37413,81.55492 -81.55492,17.34214 -103.58413,-59.05701 -8.90542,1.87482 z",
          "neighbors": [
              "divin-1",
              "soleil-2",
              "soleil-3",
              "soleil-4"
          ],
          "bridgeNeighbors": [
              "divin-1"
          ]
      },
      {
          "id": "soleil-2",
          "name": "Eastern Ricefields",
          "region": "soleil",
          "label": {
              "x": 407,
              "y": 558
          },
          "path": "m 329.50064,481.36153 -8.90543,81.08621 90.46035,78.74269 42.18358,-5.62448 45.93323,-57.65089 -8.90542,-30.93463 -54.83866,-49.68288 z",
          "neighbors": [
              "divin-4",
              "soleil-1",
              "soleil-4",
              "soleil-7"
          ],
          "bridgeNeighbors": [
              "divin-4"
          ]
      },
      {
          "id": "soleil-3",
          "name": "Dragon Plateau",
          "region": "soleil",
          "label": {
              "x": 151,
              "y": 598
          },
          "path": "m 60.463132,574.1654 67.493728,-50.15159 7.96801,-2.34353 102.64671,58.1196 -30.46591,80.61751 -73.58692,5.62448 -22.0292,-14.06119 -23.90403,-9.84284 7.499303,-20.62308 z",
          "neighbors": [
              "soleil-1",
              "soleil-4",
              "soleil-5"
          ],
          "bridgeNeighbors": []
      },
      {
          "id": "soleil-4",
          "name": "Lantern Bay",
          "region": "soleil",
          "label": {
              "x": 305,
              "y": 641
          },
          "path": "m 237.16547,580.25859 82.96104,-16.87343 89.05422,76.39915 -47.80805,70.77467 -93.7413,-7.4993 -59.99442,-43.12099 z",
          "neighbors": [
              "soleil-1",
              "soleil-2",
              "soleil-3",
              "soleil-5",
              "soleil-6",
              "soleil-7"
          ],
          "bridgeNeighbors": []
      },
      {
          "id": "soleil-5",
          "name": "Wind Coast",
          "region": "soleil",
          "label": {
              "x": 169,
              "y": 740
          },
          "path": "m 88.58552,642.59655 -28.122388,57.65089 16.404726,22.49791 -10.780248,30.93463 46.87065,37.49651 44.0584,8.43672 12.65508,5.62448 0.4687,5.62447 14.99861,19.68567 -1.87483,25.77886 28.5911,21.5605 48.74547,-126.08204 6.56189,-49.68288 -59.99443,-42.65229 -71.71209,5.62448 -22.4979,-12.65508 z",
          "neighbors": [
              "soleil-3",
              "soleil-4",
              "soleil-6"
          ],
          "bridgeNeighbors": []
      },
      {
          "id": "soleil-6",
          "name": "Mount Amateru",
          "region": "soleil",
          "label": {
              "x": 328,
              "y": 797
          },
          "path": "m 266.69397,703.05968 94.67871,7.0306 69.83726,93.74129 18.27955,34.68427 -46.40194,33.27816 -22.0292,4.21836 -39.37135,-17.81084 3.28095,-14.0612 -20.15438,-11.71766 -30.93462,15.93602 -22.96662,26.71627 -55.77607,6.09318 -4.68706,-3.74965 50.15159,-129.36298 z",
          "neighbors": [
              "soleil-4",
              "soleil-5",
              "soleil-7",
              "sables-6",
              "sables-7"
          ],
          "bridgeNeighbors": []
      },
      {
          "id": "soleil-7",
          "name": "Southern Archipelago",
          "region": "soleil",
          "label": {
              "x": 477,
              "y": 688
          },
          "path": "m 430.74123,803.36286 83.89846,-48.74547 8.90542,-35.62169 74.52432,-37.96522 -30.46592,-71.24338 -69.36855,-32.34075 -45.93323,58.58831 -44.52712,4.21835 -45.93323,68.89985 z",
          "neighbors": [
              "sables-1",
              "sables-5",
              "sables-6",
              "soleil-2",
              "soleil-4",
              "soleil-6"
          ],
          "bridgeNeighbors": [
              "sables-1"
          ]
      },
      {
          "id": "demons-1",
          "name": "Oni Cove",
          "region": "demons",
          "label": {
              "x": 679,
              "y": 475
          },
          "path": "m 591.50754,497.76625 21.5605,-56.24477 94.21,-49.21418 43.12099,32.80945 -6.56189,101.7093 -103.11542,21.09179 z",
          "neighbors": [
              "demons-2",
              "demons-3",
              "demons-4",
              "divin-4",
              "forets-4"
          ],
          "bridgeNeighbors": [
              "divin-4"
          ]
      },
      {
          "id": "demons-2",
          "name": "Black Caldera",
          "region": "demons",
          "label": {
              "x": 806,
              "y": 493
          },
          "path": "m 749.93032,423.71063 41.24617,-0.4687 89.05423,56.71348 2.34353,34.68428 -15.46731,26.71626 -97.49094,16.40473 -25.31015,-31.87204 z",
          "neighbors": [
              "demons-1",
              "demons-3",
              "demons-4",
              "fer-4",
              "forets-5"
          ],
          "bridgeNeighbors": [
              "fer-4",
              "forets-5"
          ]
      },
      {
          "id": "demons-3",
          "name": "Mask Altar",
          "region": "demons",
          "label": {
              "x": 703,
              "y": 590
          },
          "path": "m 639.78431,546.51172 104.52154,-20.15437 24.84144,32.80945 -20.15438,92.80388 -73.1182,-2.81224 -49.68289,-53.90124 12.65508,-23.90403 z",
          "neighbors": [
              "demons-1",
              "demons-2",
              "demons-4"
          ],
          "bridgeNeighbors": []
      },
      {
          "id": "demons-4",
          "name": "Mist Fort",
          "region": "demons",
          "label": {
              "x": 825,
              "y": 602
          },
          "path": "m 768.67858,558.22939 98.89706,-16.40473 31.87204,42.65229 -1.40612,42.18358 -51.55771,26.24756 -98.89706,-0.93741 z",
          "neighbors": [
              "demons-1",
              "demons-2",
              "demons-3",
              "sables-2"
          ],
          "bridgeNeighbors": [
              "sables-2"
          ]
      }
  ];

  const MAPS = {
    taisho: {
      name: 'Taisho World',
      source: '/moonveil-conquest/map.svg',
      prepared: true,
      width: 1536,
      height: 1024,
      regions: TAISHO_REGIONS,
      territories: TAISHO_TERRITORIES
    },
    europe: {
      name: 'Europe',
      source: '/moonveil-conquest/maps/europe.svg',
      regions: ['Nordic Reach', 'Western Europe', 'Central Europe', 'Eastern Europe', 'Mediterranean']
    },
    india: {
      name: 'India',
      source: '/moonveil-conquest/maps/india.svg',
      regions: ['North India', 'West India', 'Central India', 'East India', 'South India']
    },
    us: {
      name: 'United States',
      source: '/moonveil-conquest/maps/us.svg',
      regions: ['Pacific', 'Mountain', 'Midwest', 'South', 'Atlantic']
    }
  };

  const mapCache = new Map();
  let activeMap = MAPS.taisho;
  let REGIONS = TAISHO_REGIONS;
  let TERRITORIES = TAISHO_TERRITORIES;
  let MAP_VIEW_WIDTH = MAPS.taisho.width;
  let MAP_VIEW_HEIGHT = MAPS.taisho.height;

  const dom = {
    setupView: document.getElementById('setupView'),
    gameView: document.getElementById('gameView'),
    form: document.getElementById('setupForm'),
    playerCount: document.getElementById('playerCount'),
    mapSelect: document.getElementById('mapSelect'),
    pace: document.getElementById('pace'),
    aiStyle: document.getElementById('aiStyle'),
    deploymentStyle: document.getElementById('deploymentStyle'),
    slots: document.getElementById('slots'),
    shuffleBtn: document.getElementById('shuffleBtn'),
    activePlayer: document.getElementById('activePlayer'),
    turnHud: document.getElementById('turnHud'),
    phaseHud: document.getElementById('phaseHud'),
    reserveHud: document.getElementById('reserveHud'),
    cardsHud: document.getElementById('cardsHud'),
    territoryLayer: document.getElementById('territoryLayer'),
    fxLayer: document.getElementById('fxLayer'),
    sourceMapLayer: document.getElementById('sourceMapLayer'),
    mapImage: document.querySelector('.map-image'),
    mapFrame: document.querySelector('.map-frame'),
    mapStage: document.getElementById('mapStage'),
    zoomOutBtn: document.getElementById('zoomOutBtn'),
    zoomInBtn: document.getElementById('zoomInBtn'),
    zoomResetBtn: document.getElementById('zoomResetBtn'),
    zoomLevel: document.getElementById('zoomLevel'),
    battleHud: document.getElementById('battleHud'),
    deployPanel: document.getElementById('deployPanel'),
    deployTerritory: document.getElementById('deployTerritory'),
    deployRange: document.getElementById('deployRange'),
    deployValue: document.getElementById('deployValue'),
    deployMax: document.getElementById('deployMax'),
    deployConfirmBtn: document.getElementById('deployConfirmBtn'),
    deployCloseBtn: document.getElementById('deployCloseBtn'),
    territoryInfo: document.getElementById('territoryInfo'),
    playersPanel: document.getElementById('playersPanel'),
    regionsPanel: document.getElementById('regionsPanel'),
    cardsPanel: document.getElementById('cardsPanel'),
    logList: document.getElementById('logList'),
    notice: document.getElementById('notice'),
    cardsBtn: document.getElementById('cardsBtn'),
    restartBtn: document.getElementById('restartBtn'),
    reinforceBtn: document.getElementById('reinforceBtn'),
    attackBtn: document.getElementById('attackBtn'),
    blitzBtn: document.getElementById('blitzBtn'),
    fortifyBtn: document.getElementById('fortifyBtn'),
    maxFortifyBtn: document.getElementById('maxFortifyBtn'),
    nextBtn: document.getElementById('nextBtn')
  };

  let state = null;
  let noticeTimer = null;
  let startingGame = false;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const roll = sides => Math.floor(Math.random() * sides) + 1;
  const byId = id => TERRITORIES.find(territory => territory.id === id);
  const regionTerritories = region => TERRITORIES.filter(territory => territory.region === region);

  function getSavedName(){
    try{
      return JSON.parse(localStorage.getItem('user') || 'null')?.username || 'Player';
    }catch(error){
      return 'Player';
    }
  }

  function escapeHtml(text){
    return String(text || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function hexToRgba(hex, alpha){
    const clean = hex.replace('#', '');
    const value = parseInt(clean.length === 3 ? clean.split('').map(ch => ch + ch).join('') : clean, 16);
    const r = value >> 16;
    const g = (value >> 8) & 255;
    const b = value & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function shuffle(list){
    const copy = [...list];
    for(let i = copy.length - 1; i > 0; i -= 1){
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function notice(text){
    dom.notice.textContent = text;
    dom.notice.classList.add('visible');
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => dom.notice.classList.remove('visible'), 2600);
  }

  function slugify(text){
    return String(text || 'territory')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'territory';
  }

  function readSvgViewBox(svg){
    const rawViewBox = svg.getAttribute('viewBox') || svg.getAttribute('viewbox');
    if(rawViewBox){
      const values = rawViewBox.trim().split(/[\s,]+/).map(Number);
      if(values.length === 4 && values.every(Number.isFinite)){
        return { x: values[0], y: values[1], width: values[2], height: values[3] };
      }
    }

    const width = parseFloat(svg.getAttribute('width')) || MAPS.taisho.width;
    const height = parseFloat(svg.getAttribute('height')) || MAPS.taisho.height;
    return { x: 0, y: 0, width, height };
  }

  function labelFromPath(path, index){
    return path.getAttribute('name') ||
      path.getAttribute('data-name') ||
      path.getAttribute('aria-label') ||
      path.id ||
      `Territory ${index + 1}`;
  }

  function cleanSvgNode(svg){
    svg.querySelectorAll('script, foreignObject').forEach(node => node.remove());
    svg.querySelectorAll('*').forEach(node => {
      [...node.attributes].forEach(attribute => {
        if(attribute.name.toLowerCase().startsWith('on')) node.removeAttribute(attribute.name);
      });
    });
  }

  function svgRootAttributes(svg){
    const skip = new Set(['id', 'width', 'height', 'viewbox', 'viewBox', 'xmlns', 'version']);
    return [...svg.attributes]
      .filter(attribute => !skip.has(attribute.name))
      .map(attribute => [attribute.name, attribute.value]);
  }

  function applySvgRootAttributes(target, attributes){
    [...target.attributes].forEach(attribute => {
      if(!['id', 'class', 'viewBox', 'aria-hidden'].includes(attribute.name)){
        target.removeAttribute(attribute.name);
      }
    });
    for(const [name, value] of attributes){
      target.setAttribute(name, value);
    }
  }

  function pathTransform(path, root){
    const transforms = [];
    let node = path;
    while(node && node !== root){
      if(node.getAttribute?.('transform')) transforms.unshift(node.getAttribute('transform'));
      node = node.parentNode;
    }
    return transforms.join(' ');
  }

  function buildRegionSet(map, territories){
    const names = map.regions || ['North', 'West', 'Central', 'East', 'South'];
    const regions = Object.fromEntries(names.map((name, index) => [
      `region-${index}`,
      { name, bonus: 2 }
    ]));

    for(const territory of territories){
      const count = territories.filter(item => item.region === territory.region).length;
      regions[territory.region].bonus = clamp(Math.floor(count / 3), 2, 8);
    }

    return regions;
  }

  function assignGeneratedRegion(map, center, viewBox){
    const names = map.regions || [];
    const xRatio = (center.x - viewBox.x) / viewBox.width;
    const yRatio = (center.y - viewBox.y) / viewBox.height;
    let index = 2;

    if(yRatio < .28) index = 0;
    else if(xRatio < .34) index = 1;
    else if(xRatio > .67) index = 3;
    else if(yRatio > .62) index = 4;

    return `region-${Math.min(index, Math.max(0, names.length - 1))}`;
  }

  function connectTerritories(a, b){
    if(!a.neighbors.includes(b.id)) a.neighbors.push(b.id);
    if(!b.neighbors.includes(a.id)) b.neighbors.push(a.id);
  }

  function bboxGap(a, b){
    const dx = Math.max(0, Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width)));
    const dy = Math.max(0, Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height)));
    return Math.hypot(dx, dy);
  }

  function centerDistance(a, b){
    return Math.hypot(a.label.x - b.label.x, a.label.y - b.label.y);
  }

  function inferGeneratedNeighbors(territories, viewBox){
    const diagonal = Math.hypot(viewBox.width, viewBox.height);
    const touchGap = Math.max(5, diagonal * .01);
    const centerLimit = diagonal * .18;
    const minimum = territories.length > 90 ? 2 : 3;
    const maximum = territories.length > 90 ? 5 : 7;

    for(let i = 0; i < territories.length; i += 1){
      for(let j = i + 1; j < territories.length; j += 1){
        const a = territories[i];
        const b = territories[j];
        if(bboxGap(a.box, b.box) <= touchGap && centerDistance(a, b) <= centerLimit){
          connectTerritories(a, b);
        }
      }
    }

    for(const territory of territories){
      const nearest = territories
        .filter(item => item.id !== territory.id)
        .map(item => ({ item, distance: centerDistance(territory, item) }))
        .sort((a, b) => a.distance - b.distance);

      for(const candidate of nearest){
        if(territory.neighbors.length >= minimum) break;
        if(candidate.distance <= centerLimit || territory.neighbors.length === 0){
          connectTerritories(territory, candidate.item);
        }
      }
    }

    for(const territory of territories){
      territory.neighbors = territory.neighbors
        .map(id => territories.find(item => item.id === id))
        .filter(Boolean)
        .sort((a, b) => centerDistance(territory, a) - centerDistance(territory, b))
        .slice(0, maximum)
        .map(item => item.id);
    }

    for(const territory of territories){
      for(const neighborId of territory.neighbors){
        const neighbor = territories.find(item => item.id === neighborId);
        if(neighbor && !neighbor.neighbors.includes(territory.id)){
          neighbor.neighbors.push(territory.id);
        }
      }
      territory.neighbors.sort();
    }
  }

  async function loadGeneratedMap(mapId){
    if(mapCache.has(mapId)) return mapCache.get(mapId);
    const map = MAPS[mapId] || MAPS.taisho;
    const response = await fetch(map.source);
    if(!response.ok) throw new Error(`Unable to load ${map.name}`);
    const svgText = await response.text();
    const documentSvg = new DOMParser().parseFromString(svgText, 'image/svg+xml');
    const svg = documentSvg.querySelector('svg');
    if(!svg) throw new Error(`Invalid SVG for ${map.name}`);
    cleanSvgNode(svg);

    const viewBox = readSvgViewBox(svg);
    const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    tempSvg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
    applySvgRootAttributes(tempSvg, svgRootAttributes(svg));
    tempSvg.innerHTML = svg.innerHTML;
    tempSvg.style.position = 'absolute';
    tempSvg.style.width = '0';
    tempSvg.style.height = '0';
    tempSvg.style.overflow = 'hidden';
    tempSvg.style.pointerEvents = 'none';
    document.body.appendChild(tempSvg);

    const groupedPaths = new Map();
    const sourcePaths = [...svg.querySelectorAll('path[d]')];
    const tempPaths = [...tempSvg.querySelectorAll('path[d]')];
    sourcePaths.forEach((sourcePath, index) => {
      const key = sourcePath.id ||
        sourcePath.getAttribute('name') ||
        sourcePath.getAttribute('data-name') ||
        sourcePath.getAttribute('class') ||
        `territory-${index + 1}`;
      const name = sourcePath.getAttribute('name') ||
        sourcePath.getAttribute('data-name') ||
        sourcePath.getAttribute('class') ||
        labelFromPath(sourcePath, index);
      if(!groupedPaths.has(key)){
        groupedPaths.set(key, {
          key,
          name,
          parts: []
        });
      }
      groupedPaths.get(key).parts.push({
        d: sourcePath.getAttribute('d'),
        transform: pathTransform(sourcePath, svg),
        tempPath: tempPaths[index] || null
      });
    });

    const seenIds = new Set();
    const territories = [...groupedPaths.values()]
      .map((entry, index) => {
        const baseId = slugify(entry.key || entry.name);
        let id = baseId;
        let serial = 2;
        while(seenIds.has(id)){
          id = `${baseId}-${serial}`;
          serial += 1;
        }
        seenIds.add(id);
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        for(const part of entry.parts){
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', part.d);
          if(part.transform) path.setAttribute('transform', part.transform);
          group.appendChild(path);
        }
        tempSvg.appendChild(group);
        let box;
        try{
          box = group.getBBox();
        }catch(error){
          group.remove();
          return null;
        }
        group.remove();

        if(box.width <= 0 || box.height <= 0) return null;
        const label = {
          x: box.x + box.width / 2,
          y: box.y + box.height / 2
        };
        return {
          id,
          name: entry.name,
          region: assignGeneratedRegion(map, label, viewBox),
          label,
          box: { x: box.x, y: box.y, width: box.width, height: box.height },
          parts: entry.parts.map(part => ({
            d: part.d,
            transform: part.transform
          })),
          path: entry.parts.map(part => part.d).join(' '),
          neighbors: [],
          bridgeNeighbors: []
        };
      })
      .filter(Boolean);

    tempSvg.remove();
    if(territories.length < 2) throw new Error(`${map.name} does not expose enough territories`);
    inferGeneratedNeighbors(territories, viewBox);

    const config = {
      ...map,
      id: mapId,
      width: viewBox.width,
      height: viewBox.height,
      rawSvg: svg.innerHTML,
      rootAttributes: svgRootAttributes(svg),
      regions: buildRegionSet(map, territories),
      territories: territories.map(({ box, ...territory }) => territory)
    };
    mapCache.set(mapId, config);
    return config;
  }

  async function loadMapConfig(mapId){
    const map = MAPS[mapId] || MAPS.taisho;
    if(map.prepared){
      return {
        ...map,
        id: mapId,
        regions: map.regions,
        territories: map.territories
      };
    }
    return loadGeneratedMap(mapId);
  }

  function applyMapConfig(config){
    activeMap = config;
    REGIONS = config.regions;
    TERRITORIES = config.territories;
    MAP_VIEW_WIDTH = config.width;
    MAP_VIEW_HEIGHT = config.height;
    if(config.rawSvg){
      applySvgRootAttributes(dom.sourceMapLayer, config.rootAttributes || []);
      dom.sourceMapLayer.setAttribute('viewBox', `0 0 ${MAP_VIEW_WIDTH} ${MAP_VIEW_HEIGHT}`);
      dom.sourceMapLayer.innerHTML = config.rawSvg;
      dom.sourceMapLayer.hidden = false;
      dom.sourceMapLayer.classList.remove('is-hidden');
      dom.mapImage.hidden = true;
      dom.mapImage.classList.add('is-hidden');
    }else{
      dom.sourceMapLayer.innerHTML = '';
      dom.sourceMapLayer.hidden = true;
      dom.sourceMapLayer.classList.add('is-hidden');
      dom.mapImage.src = config.source;
      dom.mapImage.alt = `${config.name} conquest map`;
      dom.mapImage.hidden = false;
      dom.mapImage.classList.remove('is-hidden');
    }
    dom.territoryLayer.setAttribute('viewBox', `0 0 ${MAP_VIEW_WIDTH} ${MAP_VIEW_HEIGHT}`);
    dom.fxLayer.setAttribute('viewBox', `0 0 ${MAP_VIEW_WIDTH} ${MAP_VIEW_HEIGHT}`);
  }

  async function loadSelectedMap(){
    const mapId = dom.mapSelect?.value || 'taisho';
    const config = await loadMapConfig(mapId);
    applyMapConfig(config);
    return config;
  }

  function showBattleRoll(originId, targetId, attackRolls, defenseRolls, summary){
    const origin = byId(originId);
    const target = byId(targetId);
    const attackDice = attackRolls.map((value, index) => `<span class="die attack" style="--i:${index}">${value}</span>`).join('');
    const defenseDice = defenseRolls.map((value, index) => `<span class="die defend" style="--i:${index + attackRolls.length}">${value}</span>`).join('');
    dom.battleHud.innerHTML = `
      <strong>${escapeHtml(shortName(origin.name))} -> ${escapeHtml(shortName(target.name))}</strong>
      <div class="dice-line"><span>Attack</span>${attackDice}</div>
      <div class="dice-line"><span>Defense</span>${defenseDice}</div>
      <small>${summary.defenderLosses} defense loss${summary.defenderLosses === 1 ? '' : 'es'} · ${summary.attackerLosses} attack loss${summary.attackerLosses === 1 ? '' : 'es'}${summary.captured ? ' · conquest' : ''}</small>
    `;
    dom.battleHud.classList.add('visible');
  }

  function animateAttack(originId, targetId, captured = false){
    const origin = byId(originId);
    const target = byId(targetId);
    if(!origin || !target || !dom.fxLayer) return;
    const points = arrowPoints(origin, target, 34, 38);
    const markerId = ensureArrowMarker(captured ? '#8ee1bb' : '#fff1b8', captured ? 'captureArrowHead' : 'attackArrowHead');
    const shot = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    shot.setAttribute('class', captured ? 'attack-vector captured' : 'attack-vector');
    shot.setAttribute('x1', points.x1);
    shot.setAttribute('y1', points.y1);
    shot.setAttribute('x2', points.x2);
    shot.setAttribute('y2', points.y2);
    shot.setAttribute('marker-end', `url(#${markerId})`);

    const spark = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    spark.setAttribute('class', captured ? 'attack-spark captured' : 'attack-spark');
    spark.setAttribute('cx', target.label.x);
    spark.setAttribute('cy', target.label.y);
    spark.setAttribute('r', captured ? 34 : 22);

    dom.fxLayer.append(shot, spark);
    window.setTimeout(() => {
      shot.remove();
      spark.remove();
    }, 760);
  }

  function arrowPoints(origin, target, startOffset = 34, endOffset = 42){
    const dx = target.label.x - origin.label.x;
    const dy = target.label.y - origin.label.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const ux = dx / length;
    const uy = dy / length;
    return {
      x1: origin.label.x + ux * startOffset,
      y1: origin.label.y + uy * startOffset,
      x2: target.label.x - ux * endOffset,
      y2: target.label.y - uy * endOffset
    };
  }

  function ensureArrowMarker(color, id){
    if(dom.fxLayer.querySelector(`#${id}`)) return id;
    const defs = dom.fxLayer.querySelector('defs') || document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    if(!defs.parentNode) dom.fxLayer.prepend(defs);
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', id);
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '8');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '7');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('orient', 'auto-start-reverse');
    marker.innerHTML = `<path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"></path>`;
    defs.appendChild(marker);
    return id;
  }

  function renderAttackPreview(){
    dom.fxLayer.querySelectorAll('.attack-preview').forEach(node => node.remove());
    const originState = selectedTerritory();
    const targetState = targetTerritory();
    if(!canAttack(originState, targetState)) return;

    const origin = byId(originState.id);
    const target = byId(targetState.id);
    const points = arrowPoints(origin, target, 36, 42);
    const markerId = ensureArrowMarker('#fff1b8', 'previewArrowHead');
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', 'attack-preview');
    group.innerHTML = `
      <line class="attack-preview-line" x1="${points.x1}" y1="${points.y1}" x2="${points.x2}" y2="${points.y2}" marker-end="url(#${markerId})"></line>
      <text class="attack-preview-label" x="${(origin.label.x + target.label.x) / 2}" y="${(origin.label.y + target.label.y) / 2 - 12}">Confirm attack</text>
    `;
    group.addEventListener('click', () => confirmAttack(false));
    dom.fxLayer.appendChild(group);
  }

  function renderSlots(){
    const count = Number(dom.playerCount.value);
    dom.slots.innerHTML = '';

    for(let i = 0; i < count; i += 1){
      const row = document.createElement('div');
      row.className = 'slot';
      const leaderOptions = LEADERS.map((leader, leaderIndex) => (
        `<option value="${leaderIndex}"${leaderIndex === i ? ' selected' : ''}>${leader.mark} - ${leader.title}</option>`
      )).join('');
      row.innerHTML = `
        <div class="slot-number">${i + 1}</div>
        <label>Name<input data-field="name" value="${escapeHtml(i === 0 ? getSavedName() : DEFAULT_NAMES[i])}"></label>
        <label>Commander<select data-field="leader">${leaderOptions}</select></label>
        <label>House<select data-field="faction">
          ${FACTIONS.map((faction, index) => `<option value="${escapeHtml(faction)}"${index === i ? ' selected' : ''}>${escapeHtml(faction)}</option>`).join('')}
        </select></label>
        <label>Type<select data-field="type">
          <option value="human"${i === 0 ? ' selected' : ''}>Human</option>
          <option value="ai"${i !== 0 ? ' selected' : ''}>AI</option>
          <option value="closed">Closed</option>
        </select></label>
      `;
      dom.slots.appendChild(row);
    }
  }

  function readSetup(){
    return [...dom.slots.querySelectorAll('.slot')].map((slot, index) => {
      const name = slot.querySelector('[data-field="name"]').value.trim() || `Player ${index + 1}`;
      return {
        id: index,
        name,
        faction: slot.querySelector('[data-field="faction"]').value,
        leader: LEADERS[Number(slot.querySelector('[data-field="leader"]').value)] || LEADERS[index % LEADERS.length],
        type: slot.querySelector('[data-field="type"]').value,
        color: PLAYER_COLORS[index % PLAYER_COLORS.length],
        cards: [],
        alive: true
      };
    }).filter(player => player.type !== 'closed');
  }

  function startingTroops(playerCount){
    const quick = { 2: 30, 3: 27, 4: 23, 5: 20, 6: 18 };
    const classic = { 2: 40, 3: 35, 4: 30, 5: 25, 6: 20 };
    const base = (dom.pace.value === 'classic' ? classic : quick)[playerCount] || 27;
    const ownedShare = Math.ceil(TERRITORIES.length / Math.max(1, playerCount));
    const mapReserve = Math.ceil(ownedShare * (dom.pace.value === 'classic' ? .45 : .25));
    return Math.max(base, ownedShare + mapReserve);
  }

  async function startGame(event){
    event.preventDefault();
    if(startingGame) return;
    const players = readSetup();
    if(players.length < 2){
      notice('Open at least two players.');
      return;
    }

    startingGame = true;
    const submitButton = event.submitter;
    if(submitButton) submitButton.disabled = true;

    if(!players.some(player => player.type === 'human')){
      players[0].type = 'human';
    }

    let mapConfig;
    try{
      mapConfig = await loadSelectedMap();
    }catch(error){
      console.error(error);
      notice('This map could not be loaded.');
      startingGame = false;
      if(submitButton) submitButton.disabled = false;
      return;
    }

    state = {
      players,
      mapId: mapConfig.id,
      mapName: mapConfig.name,
      territories: TERRITORIES.map(territory => ({
        id: territory.id,
        owner: null,
        troops: 0
      })),
      activeIndex: 0,
      phase: 'reinforce',
      turn: 1,
      pendingReinforcements: 0,
      tradeLevel: 0,
      capturedThisTurn: false,
      selectedId: null,
      targetId: null,
      deployAmount: 1,
      mapZoom: 1,
      logs: [],
      aiQueued: false,
      aiRunning: false,
      gameOver: false,
      aiStyle: dom.aiStyle.value,
      deploymentStyle: dom.deploymentStyle.value,
      draftStep: null,
      draftReserves: {}
    };
    dom.battleHud.innerHTML = '';
    dom.battleHud.classList.remove('visible');
    closeDeployPanel();
    dom.fxLayer.innerHTML = '';
    setMapZoom(1);

    if(state.deploymentStyle === 'draft'){
      beginDraftDeployment();
    }else{
      seedTerritories();
      state.pendingReinforcements = calculateReinforcements(currentPlayer().id);
      addLog(`${currentPlayer().name} opens the conquest with ${state.pendingReinforcements} reinforcements.`);
    }

      dom.setupView.hidden = true;
      dom.setupView.classList.add('is-hidden');
      dom.gameView.hidden = false;
      dom.gameView.classList.remove('is-hidden');
      startingGame = false;
      if(submitButton) submitButton.disabled = false;
      render();
  }

  function seedTerritories(){
    const territoryOrder = shuffle(state.territories.map(territory => territory.id));
    territoryOrder.forEach((territoryId, index) => {
      const territory = state.territories.find(item => item.id === territoryId);
      territory.owner = state.players[index % state.players.length].id;
      territory.troops = 1;
    });

    const total = startingTroops(state.players.length);
    for(const player of state.players){
      const owned = ownedTerritories(player.id);
      let reserve = Math.max(0, total - owned.length);
      while(reserve > 0){
        owned[Math.floor(Math.random() * owned.length)].troops += 1;
        reserve -= 1;
      }
    }
  }

  function beginDraftDeployment(){
    const total = startingTroops(state.players.length);
    state.phase = 'draft';
    state.draftStep = 'territories';
    state.draftReserves = Object.fromEntries(state.players.map(player => [player.id, total]));
    state.pendingReinforcements = 0;
    state.selectedId = null;
    state.targetId = null;
    addLog(`${currentPlayer().name} starts the territory draft.`);
  }

  function unclaimedTerritories(){
    return state.territories.filter(territory => territory.owner === null);
  }

  function totalDraftReserve(){
    return Object.values(state.draftReserves || {}).reduce((sum, value) => sum + value, 0);
  }

  function currentPlayer(){
    return state.players[state.activeIndex];
  }

  function playerById(id){
    return state.players.find(player => player.id === id);
  }

  function territoryState(id){
    return state.territories.find(territory => territory.id === id);
  }

  function selectedTerritory(){
    return territoryState(state.selectedId);
  }

  function targetTerritory(){
    return territoryState(state.targetId);
  }

  function ownedTerritories(owner){
    return state.territories.filter(territory => territory.owner === owner);
  }

  function territoryTroops(owner){
    return ownedTerritories(owner).reduce((sum, territory) => sum + territory.troops, 0);
  }

  function calculateReinforcements(owner){
    const owned = ownedTerritories(owner);
    let amount = Math.max(3, Math.floor(owned.length / 3));
    for(const [regionId, region] of Object.entries(REGIONS)){
      const territories = regionTerritories(regionId);
      const allOwned = territories.length > 0 && territories.every(territory => territoryState(territory.id).owner === owner);
      if(allOwned) amount += region.bonus;
    }
    return amount;
  }

  function addLog(text){
    state.logs.unshift(text);
    state.logs = state.logs.slice(0, 12);
  }

  function regionOwner(regionId){
    const territories = regionTerritories(regionId);
    if(!territories.length) return null;
    const owners = new Set(territories.map(territory => territoryState(territory.id).owner));
    return owners.size === 1 ? [...owners][0] : null;
  }

  function areNeighbors(a, b){
    const source = byId(a);
    return Boolean(source && source.neighbors.includes(b));
  }

  function canAttack(origin, target){
    const player = currentPlayer();
    return Boolean(origin && target &&
      state.phase === 'attack' &&
      origin.owner === player.id &&
      target.owner !== player.id &&
      origin.troops > 1 &&
      areNeighbors(origin.id, target.id));
  }

  function canFortify(origin, target){
    const player = currentPlayer();
    return Boolean(origin && target &&
      state.phase === 'fortify' &&
      origin.owner === player.id &&
      target.owner === player.id &&
      origin.id !== target.id &&
      origin.troops > 1 &&
      areNeighbors(origin.id, target.id));
  }

  function phaseLabel(phase = state.phase){
    if(phase === 'draft') return state.draftStep === 'armies' ? 'Army Draft' : 'Territory Draft';
    if(phase === 'reinforce') return 'Reinforce';
    if(phase === 'attack') return 'Attack';
    if(phase === 'fortify') return 'Fortification';
    return 'Victory';
  }

  function render(){
    if(!state) return;
    renderStatus();
    renderMap();
    updateZoomControls();
    renderTerritoryInfo();
    renderPlayers();
    renderCards();
    renderRegions();
    renderLog();
    renderControls();
    maybeRunAi();
  }

  function renderStatus(){
    const player = currentPlayer();
    dom.activePlayer.textContent = `${player.name} - ${player.faction}`;
    dom.activePlayer.style.color = player.color;
    dom.turnHud.textContent = String(state.turn);
    dom.phaseHud.textContent = phaseLabel();
    dom.reserveHud.textContent = state.phase === 'draft'
      ? String(state.draftReserves?.[player.id] || 0)
      : String(state.pendingReinforcements);
    dom.cardsHud.textContent = String(player.cards.length);
  }

  function renderMap(){
    const edges = [];
    const seen = new Set();
    const showEdges = activeMap.prepared || TERRITORIES.length <= 80;
    if(showEdges){
      for(const territory of TERRITORIES){
        for(const neighborId of territory.neighbors){
          const key = [territory.id, neighborId].sort().join(':');
          if(seen.has(key)) continue;
          seen.add(key);
          const neighbor = byId(neighborId);
          const aState = territoryState(territory.id);
          const bState = territoryState(neighborId);
          const relation = aState.owner !== null && aState.owner === bState.owner ? 'owned' : 'front';
          const bridge = territory.bridgeNeighbors.includes(neighborId) ? 'bridge' : 'local';
          edges.push(`<line class="connection-line ${relation} ${bridge}" x1="${territory.label.x}" y1="${territory.label.y}" x2="${neighbor.label.x}" y2="${neighbor.label.y}"></line>`);
        }
      }
    }

    const generatedMap = !activeMap.prepared;
    const territoryShape = (territory, className, style) => {
      const title = `<title>${escapeHtml(territory.name)}</title>`;
      if(territory.parts?.length){
        const parts = territory.parts.map(part => (
          `<path class="${className}" data-territory-id="${territory.id}" d="${part.d}"${part.transform ? ` transform="${escapeHtml(part.transform)}"` : ''} style="${style}"></path>`
        )).join('');
        return `<g>${title}${parts}</g>`;
      }
      return `<path class="${className}" data-territory-id="${territory.id}" d="${territory.path}" style="${style}">${title}</path>`;
    };

    const paths = TERRITORIES.map(territory => {
      const info = territoryState(territory.id);
      const owner = playerById(info.owner);
      const selected = state.selectedId === territory.id;
      const targeted = state.targetId === territory.id;
      const selectable = isSelectableTerritory(info);
      const className = [
        'territory-shape',
        generatedMap ? 'generated' : '',
        selected ? 'focused' : '',
        targeted ? 'targeted' : '',
        selectable ? 'selectable' : ''
      ].filter(Boolean).join(' ');
      const fill = owner
        ? hexToRgba(owner.color, generatedMap ? .18 : .36)
        : (generatedMap ? 'rgba(255,255,255,.015)' : 'rgba(255,255,255,.08)');
      const hover = owner
        ? hexToRgba(owner.color, generatedMap ? .32 : .58)
        : (generatedMap ? 'rgba(255,241,184,.14)' : 'rgba(255,241,184,.22)');
      const stroke = owner ? owner.color : (generatedMap ? 'rgba(255,248,214,.28)' : 'rgba(255,248,214,.72)');
      return territoryShape(territory, className, `--territory-fill:${fill};--territory-hover:${hover};--territory-stroke:${stroke}`);
    }).join('');

    const compactTokens = generatedMap || TERRITORIES.length > 80;
    const neutralRadius = compactTokens ? 13 : 21;
    const ownerRadius = compactTokens ? 16 : 25;
    const labelY = compactTokens ? 29 : 43;
    const markY = compactTokens ? -19 : -27;
    const tokens = TERRITORIES.map(territory => {
      const info = territoryState(territory.id);
      const owner = playerById(info.owner);
      if(!owner){
        return `
          <g class="territory-token unclaimed ${compactTokens ? 'compact' : ''}" transform="translate(${territory.label.x} ${territory.label.y})" style="--owner-color:#f0c76e">
            <circle r="${neutralRadius}"></circle>
            <text y="1">?</text>
            <text class="territory-label" y="${labelY}">${escapeHtml(shortName(territory.name))}</text>
          </g>
        `;
      }
      return `
        <g class="territory-token ${compactTokens ? 'compact' : ''}" transform="translate(${territory.label.x} ${territory.label.y})" style="--owner-color:${owner.color}">
          <circle r="${ownerRadius}"></circle>
          <text class="commander-mark" y="${markY}">${escapeHtml(owner.leader.mark)}</text>
          <text y="1">${info.troops}</text>
          <text class="territory-label" y="${labelY}">${escapeHtml(shortName(territory.name))}</text>
        </g>
      `;
    }).join('');

    dom.territoryLayer.innerHTML = `
      <g>${edges.join('')}</g>
      <g>${paths}</g>
      <g>${tokens}</g>
    `;

    dom.territoryLayer.querySelectorAll('[data-territory-id]').forEach(path => {
      path.addEventListener('click', () => selectTerritory(path.dataset.territoryId));
    });

    renderAttackPreview();
  }

  function setMapZoom(value){
    const zoom = clamp(value, .8, 2.2);
    if(state) state.mapZoom = zoom;
    dom.mapStage.style.setProperty('--map-zoom', String(zoom));
    updateZoomControls(zoom);
    positionDeployPanel();
  }

  function updateZoomControls(value = state?.mapZoom || 1){
    if(!dom.zoomLevel) return;
    const zoom = clamp(value, .8, 2.2);
    dom.zoomLevel.textContent = `${Math.round(zoom * 100)}%`;
    dom.zoomOutBtn.disabled = zoom <= .8;
    dom.zoomInBtn.disabled = zoom >= 2.2;
  }

  function shortName(name){
    const compact = {
      'Dawn Gate': 'Dawn Gate',
      'Northern Sanctuary': 'North Sanct.',
      'Star Citadel': 'Star Citadel',
      'Sacred Gardens': 'Gardens',
      'Silverwood': 'Silverwood',
      'Fox Canopies': 'Fox Canopies',
      'Pine March': 'Pine March',
      'Moss Vale': 'Moss Vale',
      'Green Crown': 'Green Crown',
      'Firefly Pass': 'Firefly Pass',
      'Steel Gate': 'Steel Gate',
      'Forge Basin': 'Forge Basin',
      'Hammer Bay': 'Hammer Bay',
      'Nomad Oasis': 'Nomad Oasis',
      'Glass Sea': 'Glass Sea',
      'Amber Coast': 'Amber Coast',
      'Salt Basin': 'Salt Basin',
      'Mirage Steppe': 'Mirage',
      'Sunken Cliffs': 'Sunken Cliffs',
      'Eastern Ricefields': 'Eastern Fields',
      'Lantern Bay': 'Lantern Bay',
      'Wind Coast': 'Wind Coast',
      'Southern Archipelago': 'Archipelago',
      'Mask Altar': 'Mask Altar',
      'Mist Fort': 'Mist Fort'
    };
    if(compact[name]) return compact[name];
    if(String(name).length > 15) return String(name).slice(0, 13);
    return name;
  }

  function isSelectableTerritory(territory){
    const player = currentPlayer();
    if(player.type !== 'human' || state.gameOver) return false;
    if(state.phase === 'draft'){
      if(state.draftStep === 'territories') return territory.owner === null;
      return territory.owner === player.id && (state.draftReserves?.[player.id] || 0) > 0;
    }
    if(state.phase === 'reinforce') return territory.owner === player.id;
    if(state.phase === 'attack'){
      if(territory.owner === player.id && territory.troops > 1) return true;
      const selected = selectedTerritory();
      return Boolean(selected && territory.owner !== player.id && areNeighbors(selected.id, territory.id));
    }
    if(state.phase === 'fortify'){
      if(territory.owner === player.id && territory.troops > 1) return true;
      const selected = selectedTerritory();
      return Boolean(selected && territory.owner === player.id && areNeighbors(selected.id, territory.id));
    }
    return false;
  }

  function renderTerritoryInfo(){
    const selected = selectedTerritory();
    const target = targetTerritory();
    if(!selected){
      dom.territoryInfo.innerHTML = '<div class="info-card"><strong>No territory</strong><span>Select a territory to view the front, neighbors, and available orders.</span></div>';
      return;
    }

    const territory = byId(selected.id);
    const owner = playerById(selected.owner);
    const neighbors = territory.neighbors.map(id => {
      const neighborState = territoryState(id);
      const neighborOwner = playerById(neighborState.owner);
      const bridge = territory.bridgeNeighbors.includes(id) ? ' bridge' : '';
      return `${byId(id).name}${bridge} (${neighborOwner?.name || 'Unclaimed'}, ${neighborState.troops})`;
    }).join(', ');

    dom.territoryInfo.innerHTML = `
      <div class="info-card">
        <strong>${escapeHtml(territory.name)}</strong>
        <span>Control: ${escapeHtml(owner?.name || 'Unclaimed')} · Armies: ${selected.troops}</span>
        <span>Region: ${escapeHtml(REGIONS[territory.region].name)}</span>
        <span>Neighbors: ${escapeHtml(neighbors)}</span>
      </div>
      ${target ? `<div class="info-card"><strong>Target</strong><span>${escapeHtml(byId(target.id).name)} · ${escapeHtml(playerById(target.owner)?.name || 'Unclaimed')} · ${target.troops} armies</span></div>` : ''}
    `;
  }

  function renderPlayers(){
    dom.playersPanel.innerHTML = state.players.map(player => {
      const territories = ownedTerritories(player.id).length;
      const troops = territoryTroops(player.id);
      return `<div class="player-row ${player.alive ? '' : 'defeated'}" style="color:${player.color}">
        <strong><span style="background:${player.color}">${escapeHtml(player.leader.mark)}</span> ${escapeHtml(player.name)}</strong>
        <span>${escapeHtml(player.leader.title)} · ${escapeHtml(player.faction)} · ${player.type === 'ai' ? 'AI' : 'Human'} · ${territories} territories · ${troops} armies · ${player.cards.length} cards${state.phase === 'draft' ? ` · ${state.draftReserves?.[player.id] || 0} draft` : ''}</span>
      </div>`;
    }).join('');
  }

  function renderCards(){
    const player = currentPlayer();
    if(!player.cards.length){
      dom.cardsPanel.innerHTML = '<div class="card-row"><b>0</b><span>No cards in hand.</span></div>';
      return;
    }

    dom.cardsPanel.innerHTML = player.cards.map(card => `
      <div class="card-row">
        <b>${cardIcon(card.symbol)}</b>
        <span><strong>${escapeHtml(card.territoryName)}</strong>${escapeHtml(card.symbol)}</span>
      </div>
    `).join('');
  }

  function cardIcon(symbol){
    if(symbol === 'moon') return 'M';
    if(symbol === 'saber') return 'S';
    if(symbol === 'banner') return 'B';
    return 'W';
  }

  function renderRegions(){
    dom.regionsPanel.innerHTML = Object.entries(REGIONS).map(([regionId, region]) => {
      const owner = regionOwner(regionId);
      const ownerName = owner === null ? 'Contested' : playerById(owner).name;
      const territories = regionTerritories(regionId).map(territory => territory.name).join(', ');
      return `<div class="region-row">
        <strong>${escapeHtml(region.name)} +${region.bonus}</strong>
        <span>${escapeHtml(ownerName)} · ${escapeHtml(territories)}</span>
      </div>`;
    }).join('');
  }

  function renderLog(){
    dom.logList.innerHTML = state.logs.length
      ? state.logs.map(entry => `<div class="log-entry">${escapeHtml(entry)}</div>`).join('')
      : '<div class="log-entry">The war begins.</div>';
  }

  function renderControls(){
    const player = currentPlayer();
    const human = player.type === 'human' && !state.gameOver;
    const selected = selectedTerritory();
    const target = targetTerritory();
    const tradeSet = findTradeSet(player.cards);
    const mandatoryTrade = player.cards.length >= 5;
    const draftingArmies = state.phase === 'draft' && state.draftStep === 'armies';

    dom.cardsBtn.disabled = !human || state.phase !== 'reinforce' || !tradeSet;
    dom.reinforceBtn.disabled = !human || (
      state.phase === 'reinforce'
        ? state.pendingReinforcements <= 0 || !selected || selected.owner !== player.id
        : !draftingArmies || !selected || selected.owner !== player.id || (state.draftReserves?.[player.id] || 0) <= 0
    );
    dom.attackBtn.disabled = !human || !canAttack(selected, target);
    dom.blitzBtn.disabled = !human || !canAttack(selected, target);
    dom.fortifyBtn.disabled = !human || !canFortify(selected, target);
    dom.maxFortifyBtn.disabled = !human || !canFortify(selected, target);
    dom.nextBtn.disabled = !human || state.phase === 'draft' || (state.phase === 'reinforce' && (state.pendingReinforcements > 0 || mandatoryTrade));

    dom.reinforceBtn.textContent = draftingArmies ? 'Draft +1' : 'Deploy';
    dom.nextBtn.textContent = state.phase === 'draft' ? 'Drafting' : (state.phase === 'fortify' ? 'End Turn' : 'Next Phase');
    renderDeployPanel();
  }

  function selectTerritory(id){
    if(!state) return;
    const clicked = territoryState(id);
    const player = currentPlayer();
    if(player.type !== 'human' || state.gameOver){
      state.selectedId = id;
      state.targetId = null;
      render();
      return;
    }

    if(state.phase === 'draft'){
      if(state.draftStep === 'territories' && clicked.owner === null){
        claimDraftTerritory(id);
        return;
      }
      if(state.draftStep === 'armies' && clicked.owner === player.id){
        state.selectedId = id;
        state.targetId = null;
        placeDraftArmy(id);
        return;
      }
      render();
      return;
    }

    if(state.phase === 'reinforce'){
      if(clicked.owner === player.id){
        state.selectedId = id;
        state.targetId = null;
        openDeployPanel();
      }
      render();
      return;
    }

    if(state.phase === 'attack'){
      const selected = selectedTerritory();
      if(clicked.owner === player.id){
        state.selectedId = id;
        state.targetId = null;
      }else if(selected && selected.owner === player.id && areNeighbors(selected.id, clicked.id)){
        state.targetId = id;
      }else{
        const origin = findBestOwnedNeighborFor(clicked.id, player.id, true);
        if(origin){
          state.selectedId = origin.id;
          state.targetId = clicked.id;
        }
      }
      render();
      return;
    }

    if(state.phase === 'fortify'){
      const selected = selectedTerritory();
      if(clicked.owner === player.id && selected && selected.id !== clicked.id && areNeighbors(selected.id, clicked.id)){
        state.targetId = id;
      }else if(clicked.owner === player.id){
        state.selectedId = id;
        state.targetId = null;
      }
      render();
    }
  }

  function findBestOwnedNeighborFor(territoryId, owner, needsAttackTroops){
    return byId(territoryId).neighbors
      .map(id => territoryState(id))
      .filter(territory => territory.owner === owner && (!needsAttackTroops || territory.troops > 1))
      .sort((a, b) => b.troops - a.troops)[0] || null;
  }

  function reinforceSelected(){
    const selected = selectedTerritory();
    const player = currentPlayer();
    if(state.phase === 'draft' && state.draftStep === 'armies'){
      if(selected && selected.owner === player.id) placeDraftArmy(selected.id);
      return;
    }
    if(state.phase === 'reinforce'){
      openDeployPanel();
      return;
    }
    if(!selected || selected.owner !== player.id || state.pendingReinforcements <= 0) return;
    selected.troops += 1;
    state.pendingReinforcements -= 1;
    if(state.pendingReinforcements === 0){
      addLog(`${player.name} finishes reinforcements.`);
    }
    render();
  }

  function openDeployPanel(){
    const selected = selectedTerritory();
    const player = currentPlayer();
    if(!selected || selected.owner !== player.id || state.phase !== 'reinforce' || state.pendingReinforcements <= 0) return;
    state.deployAmount = clamp(state.deployAmount || 1, 1, state.pendingReinforcements);
    dom.deployPanel.hidden = false;
    dom.deployPanel.classList.remove('is-hidden');
    renderDeployPanel();
  }

  function closeDeployPanel(){
    if(!dom.deployPanel) return;
    dom.deployPanel.hidden = true;
    dom.deployPanel.classList.add('is-hidden');
  }

  function renderDeployPanel(){
    if(!dom.deployPanel || dom.deployPanel.hidden || !state) return;
    const selected = selectedTerritory();
    const player = currentPlayer();
    if(!selected || selected.owner !== player.id || state.phase !== 'reinforce' || state.pendingReinforcements <= 0){
      closeDeployPanel();
      return;
    }

    const max = Math.max(1, state.pendingReinforcements);
    const amount = clamp(Number(state.deployAmount) || 1, 1, max);
    state.deployAmount = amount;
    dom.deployTerritory.textContent = `${byId(selected.id).name} - ${state.pendingReinforcements} reserve`;
    dom.deployRange.max = String(max);
    dom.deployRange.value = String(amount);
    dom.deployValue.textContent = String(amount);
    dom.deployMax.textContent = String(max);
    dom.deployConfirmBtn.textContent = `Deploy ${amount}`;
    positionDeployPanel();
  }

  function positionDeployPanel(){
    if(!dom.deployPanel || dom.deployPanel.hidden || !state || !dom.mapFrame) return;
    const selected = selectedTerritory();
    if(!selected) return;
    const territory = byId(selected.id);
    if(!territory) return;

    const frame = dom.mapFrame.getBoundingClientRect();
    const frameRatio = frame.width / frame.height;
    const mapRatio = MAP_VIEW_WIDTH / MAP_VIEW_HEIGHT;
    let mapWidth = frame.width;
    let mapHeight = frame.height;
    let offsetX = 0;
    let offsetY = 0;

    if(frameRatio > mapRatio){
      mapHeight = frame.height;
      mapWidth = mapHeight * mapRatio;
      offsetX = (frame.width - mapWidth) / 2;
    }else{
      mapWidth = frame.width;
      mapHeight = mapWidth / mapRatio;
      offsetY = (frame.height - mapHeight) / 2;
    }

    const baseX = offsetX + (territory.label.x / MAP_VIEW_WIDTH) * mapWidth;
    const baseY = offsetY + (territory.label.y / MAP_VIEW_HEIGHT) * mapHeight;
    const zoom = state.mapZoom || 1;
    const visualX = frame.width / 2 + (baseX - frame.width / 2) * zoom;
    const visualY = frame.height / 2 + (baseY - frame.height / 2) * zoom;
    const panelWidth = dom.deployPanel.offsetWidth || 220;
    const panelHeight = dom.deployPanel.offsetHeight || 124;

    dom.deployPanel.style.left = `${clamp(visualX, panelWidth / 2 + 8, frame.width - panelWidth / 2 - 8)}px`;
    dom.deployPanel.style.top = `${clamp(visualY - 12, panelHeight + 10, frame.height - 10)}px`;
  }

  function confirmDeploy(){
    const selected = selectedTerritory();
    const player = currentPlayer();
    if(!selected || selected.owner !== player.id || state.phase !== 'reinforce') return;
    const amount = clamp(Number(state.deployAmount) || 1, 1, state.pendingReinforcements);
    selected.troops += amount;
    state.pendingReinforcements -= amount;
    addLog(`${player.name} deploys ${amount} arm${amount > 1 ? 'ies' : 'y'} to ${byId(selected.id).name}.`);
    if(state.pendingReinforcements <= 0){
      closeDeployPanel();
      addLog(`${player.name} finishes reinforcements.`);
    }else{
      state.deployAmount = clamp(amount, 1, state.pendingReinforcements);
    }
    render();
  }

  function claimDraftTerritory(territoryId, silent = false){
    const territory = territoryState(territoryId);
    const player = currentPlayer();
    if(!territory || territory.owner !== null || state.phase !== 'draft' || state.draftStep !== 'territories') return;

    territory.owner = player.id;
    territory.troops = 1;
    state.draftReserves[player.id] = Math.max(0, (state.draftReserves[player.id] || 0) - 1);
    state.selectedId = territoryId;
    state.targetId = null;
    addLog(`${player.name} claims ${byId(territoryId).name}.`);

    if(unclaimedTerritories().length === 0){
      state.draftStep = 'armies';
      state.activeIndex = state.players.findIndex(item => (state.draftReserves[item.id] || 0) > 0);
      if(state.activeIndex < 0){
        beginFirstTurn();
        return;
      }
      addLog(`${currentPlayer().name} starts drafting remaining armies.`);
    }else{
      advanceDraftTurn();
    }
    if(!silent) render();
  }

  function placeDraftArmy(territoryId, silent = false){
    const territory = territoryState(territoryId);
    const player = currentPlayer();
    if(!territory || territory.owner !== player.id || state.phase !== 'draft' || state.draftStep !== 'armies') return;
    if((state.draftReserves[player.id] || 0) <= 0) return;

    territory.troops += 1;
    state.draftReserves[player.id] -= 1;
    state.selectedId = territoryId;
    state.targetId = null;
    addLog(`${player.name} drafts +1 army to ${byId(territoryId).name}.`);

    if(totalDraftReserve() <= 0){
      beginFirstTurn();
      return;
    }
    advanceDraftTurn();
    if(!silent) render();
  }

  function advanceDraftTurn(){
    if(state.phase !== 'draft') return;
    const needsReserve = state.draftStep === 'armies';
    let next = state.activeIndex;
    do{
      next = (next + 1) % state.players.length;
    }while(needsReserve && (state.draftReserves[state.players[next].id] || 0) <= 0);
    state.activeIndex = next;
  }

  function beginFirstTurn(){
    state.phase = 'reinforce';
    state.draftStep = null;
    state.activeIndex = 0;
    state.selectedId = null;
    state.targetId = null;
    state.pendingReinforcements = calculateReinforcements(currentPlayer().id);
    addLog(`${currentPlayer().name} opens the conquest with ${state.pendingReinforcements} reinforcements.`);
    render();
  }

  function resolveAttack(silent = false){
    const origin = selectedTerritory();
    const target = targetTerritory();
    if(!canAttack(origin, target)) return null;

    const attacker = currentPlayer();
    const defender = playerById(target.owner);
    const attackerDice = Math.min(3, origin.troops - 1);
    const defenderDice = Math.min(2, target.troops);
    const attackRolls = Array.from({ length: attackerDice }, () => roll(6)).sort((a, b) => b - a);
    const defenseRolls = Array.from({ length: defenderDice }, () => roll(6)).sort((a, b) => b - a);
    const comparisons = Math.min(attackRolls.length, defenseRolls.length);
    const summary = { attackerLosses: 0, defenderLosses: 0, captured: false };
    const originId = origin.id;
    const targetId = target.id;

    for(let i = 0; i < comparisons; i += 1){
      if(attackRolls[i] > defenseRolls[i]){
        target.troops -= 1;
        summary.defenderLosses += 1;
      }else{
        origin.troops -= 1;
        summary.attackerLosses += 1;
      }
    }

    const originName = byId(origin.id).name;
    const targetName = byId(target.id).name;
    if(target.troops <= 0){
      const moved = clamp(attackerDice - summary.attackerLosses, 1, origin.troops - 1);
      target.owner = attacker.id;
      target.troops = moved;
      origin.troops -= moved;
      state.capturedThisTurn = true;
      state.targetId = target.id;
      summary.captured = true;
      if(!silent){
        addLog(`${attacker.name} takes ${targetName} from ${originName}.`);
        notice(`${targetName} conquered.`);
      }
      updatePlayerLife(defender.id);
      checkWinner();
    }else if(!silent){
      addLog(`${originName} attacks ${targetName}: ${attackRolls.join('-')} against ${defenseRolls.join('-')} (${summary.defenderLosses}/${summary.attackerLosses}).`);
    }

    if(!silent){
      showBattleRoll(originId, targetId, attackRolls, defenseRolls, summary);
      animateAttack(originId, targetId, summary.captured);
    }

    return summary;
  }

  function confirmAttack(blitz = false){
    const origin = selectedTerritory();
    const target = targetTerritory();
    if(!canAttack(origin, target)) return;

    const originName = byId(origin.id).name;
    const targetName = byId(target.id).name;
    const attackerDice = Math.min(3, origin.troops - 1);
    const defenderDice = Math.min(2, target.troops);
    animateAttack(origin.id, target.id, false);

    const confirmed = window.confirm(
      `${blitz ? 'Blitz attack' : 'Attack'} ${targetName} from ${originName}?\n\n` +
      `Attack dice: ${attackerDice}\nDefense dice: ${defenderDice}`
    );
    if(!confirmed){
      notice('Attack cancelled.');
      return;
    }

    if(blitz){
      runBlitzAttack();
    }else{
      resolveAttack(false);
      render();
    }
  }

  function blitzAttack(){
    const origin = selectedTerritory();
    const target = targetTerritory();
    if(!canAttack(origin, target)) return;
    confirmAttack(true);
  }

  function runBlitzAttack(){
    const origin = selectedTerritory();
    const target = targetTerritory();
    if(!canAttack(origin, target)) return;

    const originName = byId(origin.id).name;
    const targetName = byId(target.id).name;
    let rounds = 0;
    let attackerLosses = 0;
    let defenderLosses = 0;
    let captured = false;

    while(canAttack(selectedTerritory(), targetTerritory()) && rounds < 80){
      const result = resolveAttack(true);
      if(!result) break;
      rounds += 1;
      attackerLosses += result.attackerLosses;
      defenderLosses += result.defenderLosses;
      captured = result.captured;
      if(captured || state.gameOver) break;
    }

    addLog(`${originName} blitzes ${targetName}: ${defenderLosses} defense losses, ${attackerLosses} attack losses${captured ? ', conquest successful' : ''}.`);
    dom.battleHud.innerHTML = `
      <strong>${escapeHtml(shortName(originName))} -> ${escapeHtml(shortName(targetName))}</strong>
      <div class="dice-line"><span>Blitz</span><b>${rounds}</b><span>rounds</span></div>
      <small>${defenderLosses} defense losses · ${attackerLosses} attack losses${captured ? ' · conquest' : ''}</small>
    `;
    dom.battleHud.classList.add('visible');
    animateAttack(origin.id, target.id, captured);
    if(captured) notice(`${targetName} conquered by blitz.`);
    render();
  }

  function fortifySelected(max = false){
    const origin = selectedTerritory();
    const target = targetTerritory();
    if(!canFortify(origin, target)) return;
    const amount = max ? origin.troops - 1 : 1;
    origin.troops -= amount;
    target.troops += amount;
    addLog(`${currentPlayer().name} moves ${amount} arm${amount > 1 ? 'ies' : 'y'} to ${byId(target.id).name}.`);
    render();
  }

  function nextPhase(){
    if(state.gameOver) return;
    const player = currentPlayer();
    if(state.phase === 'reinforce'){
      if(player.cards.length >= 5){
        notice('Trade cards before leaving reinforcements.');
        return;
      }
      if(state.pendingReinforcements > 0){
        notice('Place all reinforcements before moving on.');
        return;
      }
      state.phase = 'attack';
      state.selectedId = null;
      state.targetId = null;
      addLog(`${player.name} opens attacks.`);
    }else if(state.phase === 'attack'){
      state.phase = 'fortify';
      state.selectedId = null;
      state.targetId = null;
      addLog(`${player.name} moves to fortification.`);
    }else{
      finishTurn();
      return;
    }
    render();
  }

  function finishTurn(){
    const player = currentPlayer();
    if(state.capturedThisTurn){
      const card = drawCard(player);
      addLog(`${player.name} gains a ${card.symbol} card (${card.territoryName}).`);
    }

    state.capturedThisTurn = false;
    state.selectedId = null;
    state.targetId = null;

    let next = state.activeIndex;
    do{
      next = (next + 1) % state.players.length;
      if(next === 0) state.turn += 1;
    }while(!state.players[next].alive);

    state.activeIndex = next;
    state.phase = 'reinforce';
    state.pendingReinforcements = calculateReinforcements(currentPlayer().id);
    addLog(`${currentPlayer().name} receives ${state.pendingReinforcements} reinforcements.`);
    render();
  }

  function updatePlayerLife(playerId){
    const player = playerById(playerId);
    if(!player) return;
    player.alive = ownedTerritories(playerId).length > 0;
    if(!player.alive){
      const victor = currentPlayer();
      victor.cards.push(...player.cards);
      player.cards = [];
      addLog(`${player.name} is eliminated. ${victor.name} takes their cards.`);
    }
  }

  function checkWinner(){
    const alive = state.players.filter(player => player.alive);
    if(alive.length !== 1) return;
    state.gameOver = true;
    state.phase = 'victory';
    state.pendingReinforcements = 0;
    addLog(`${alive[0].name} wins Moonveil Conquest.`);
    notice(`${alive[0].name} wins the conquest.`);
  }

  function drawCard(player){
    const territory = TERRITORIES[Math.floor(Math.random() * TERRITORIES.length)];
    const wild = Math.random() > .92;
    const symbol = wild ? 'wild' : CARD_SYMBOLS[TERRITORIES.indexOf(territory) % CARD_SYMBOLS.length];
    const card = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      territoryId: territory.id,
      territoryName: territory.name,
      symbol
    };
    player.cards.push(card);
    return card;
  }

  function findTradeSet(cards){
    if(cards.length < 3) return null;
    const regular = CARD_SYMBOLS;
    for(const symbol of regular){
      const matches = cards.map((card, index) => ({ card, index })).filter(item => item.card.symbol === symbol);
      if(matches.length >= 3) return matches.slice(0, 3).map(item => item.index);
    }

    const oneEach = [];
    const used = new Set();
    for(const symbol of regular){
      const index = cards.findIndex((card, cardIndex) => card.symbol === symbol && !used.has(cardIndex));
      if(index >= 0){
        oneEach.push(index);
        used.add(index);
      }
    }
    if(oneEach.length === 3) return oneEach;

    const jokerIndex = cards.findIndex(card => card.symbol === 'wild');
    if(jokerIndex >= 0){
      for(const symbol of regular){
        const matches = cards.map((card, index) => ({ card, index })).filter(item => item.card.symbol === symbol);
        if(matches.length >= 2) return [jokerIndex, ...matches.slice(0, 2).map(item => item.index)];
      }

      const mixed = cards.map((card, index) => ({ card, index })).filter(item => item.index !== jokerIndex).slice(0, 2);
      if(mixed.length === 2) return [jokerIndex, ...mixed.map(item => item.index)];
    }

    return null;
  }

  function tradeCards(silent = false){
    const player = currentPlayer();
    const indexes = findTradeSet(player.cards);
    if(!indexes){
      if(!silent) notice('No three-card set yet.');
      return false;
    }

    const traded = indexes.map(index => player.cards[index]);
    player.cards = player.cards.filter((_, index) => !indexes.includes(index));
    const tradeValues = [4, 6, 8, 10, 12, 15];
    const value = tradeValues[state.tradeLevel] || 15 + (state.tradeLevel - tradeValues.length + 1) * 5;
    state.tradeLevel += 1;
    state.pendingReinforcements += value;

    const ownedMatch = traded.find(card => territoryState(card.territoryId)?.owner === player.id);
    if(ownedMatch){
      territoryState(ownedMatch.territoryId).troops += 2;
      addLog(`${player.name} adds +2 to ${ownedMatch.territoryName} thanks to the cards.`);
    }

    addLog(`${player.name} trades 3 cards for ${value} reinforcements.`);
    if(!silent) notice(`${value} reinforcements added.`);
    render();
    return true;
  }

  function maybeRunAi(){
    if(!state || state.gameOver || state.aiQueued || state.aiRunning || currentPlayer().type !== 'ai') return;
    state.aiQueued = true;
    window.setTimeout(() => {
      if(!state || state.gameOver || currentPlayer().type !== 'ai') return;
      state.aiQueued = false;
      state.aiRunning = true;
      runAiTurn();
      state.aiRunning = false;
      render();
    }, 620);
  }

  function runAiTurn(){
    const player = currentPlayer();
    if(state.phase === 'draft'){
      runAiDraftAction(player);
      return;
    }

    while(findTradeSet(player.cards) && (player.cards.length >= 5 || Math.random() > .48)){
      tradeCards(true);
    }

    while(state.pendingReinforcements > 0){
      const target = bestReinforcementTarget(player.id);
      target.troops += 1;
      state.pendingReinforcements -= 1;
    }
    addLog(`${player.name} places reinforcements.`);

    state.phase = 'attack';
    const maxAttacks = state.aiStyle === 'bold' ? 16 : 9;
    for(let i = 0; i < maxAttacks; i += 1){
      const option = bestAttackOption(player.id);
      if(!option) break;
      state.selectedId = option.origin.id;
      state.targetId = option.target.id;
      resolveAttack(true);
      if(state.gameOver) break;
      if(state.aiStyle !== 'bold' && Math.random() < .22) break;
    }

    if(state.gameOver){
      render();
      return;
    }

    state.phase = 'fortify';
    aiFortify(player.id);
    finishTurn();
  }

  function runAiDraftAction(player){
    if(state.draftStep === 'territories'){
      const choices = unclaimedTerritories();
      const target = choices.sort((a, b) => byId(b.id).neighbors.length - byId(a.id).neighbors.length + Math.random() - .5)[0];
      if(target) claimDraftTerritory(target.id, true);
      return;
    }

    const target = bestReinforcementTarget(player.id);
    if(target) placeDraftArmy(target.id, true);
  }

  function bestReinforcementTarget(owner){
    const border = ownedTerritories(owner).filter(territory => byId(territory.id).neighbors.some(neighbor => territoryState(neighbor).owner !== owner));
    const pool = border.length ? border : ownedTerritories(owner);
    return pool.sort((a, b) => {
      const aThreat = enemyNeighborTroops(a.id, owner) - a.troops;
      const bThreat = enemyNeighborTroops(b.id, owner) - b.troops;
      return bThreat - aThreat;
    })[0];
  }

  function enemyNeighborTroops(territoryId, owner){
    return byId(territoryId).neighbors.reduce((sum, neighborId) => {
      const neighbor = territoryState(neighborId);
      return sum + (neighbor.owner === owner ? 0 : neighbor.troops);
    }, 0);
  }

  function bestAttackOption(owner){
    const options = [];
    for(const origin of ownedTerritories(owner).filter(territory => territory.troops > 1)){
      for(const neighborId of byId(origin.id).neighbors){
        const target = territoryState(neighborId);
        if(target.owner === owner) continue;
        const score = origin.troops - target.troops + Math.random() * 1.6;
        const threshold = state.aiStyle === 'bold' ? .5 : 2.4;
        if(score >= threshold) options.push({ origin, target, score });
      }
    }
    return options.sort((a, b) => b.score - a.score)[0] || null;
  }

  function aiFortify(owner){
    const interior = ownedTerritories(owner)
      .filter(territory => territory.troops > 2 && byId(territory.id).neighbors.every(neighbor => territoryState(neighbor).owner === owner))
      .sort((a, b) => b.troops - a.troops)[0];
    if(!interior) return;

    const target = byId(interior.id).neighbors
      .map(id => territoryState(id))
      .filter(territory => territory.owner === owner)
      .sort((a, b) => enemyNeighborTroops(b.id, owner) - enemyNeighborTroops(a.id, owner))[0];
    if(!target) return;

    const amount = Math.floor((interior.troops - 1) / 2);
    if(amount <= 0) return;
    interior.troops -= amount;
    target.troops += amount;
    addLog(`${playerById(owner).name} fortifies ${byId(target.id).name}.`);
  }

  function shuffleSetup(){
    [...dom.slots.querySelectorAll('.slot')].forEach((slot, index) => {
      slot.querySelector('[data-field="faction"]').value = FACTIONS[Math.floor(Math.random() * FACTIONS.length)];
      slot.querySelector('[data-field="leader"]').value = String((index + Math.floor(Math.random() * LEADERS.length)) % LEADERS.length);
      if(index !== 0) slot.querySelector('[data-field="type"]').value = Math.random() > .16 ? 'ai' : 'closed';
    });
  }

  function bind(){
    dom.playerCount.addEventListener('change', renderSlots);
    dom.mapSelect.addEventListener('change', () => {
      const map = MAPS[dom.mapSelect.value] || MAPS.taisho;
      notice(`${map.name} selected.`);
    });
    dom.shuffleBtn.addEventListener('click', shuffleSetup);
    dom.form.addEventListener('submit', startGame);
    dom.cardsBtn.addEventListener('click', () => tradeCards(false));
    dom.restartBtn.addEventListener('click', () => {
      state = null;
      closeDeployPanel();
      setMapZoom(1);
      dom.gameView.hidden = true;
      dom.gameView.classList.add('is-hidden');
      dom.setupView.hidden = false;
      dom.setupView.classList.remove('is-hidden');
      renderSlots();
    });
    dom.deployRange.addEventListener('input', () => {
      if(!state) return;
      state.deployAmount = Number(dom.deployRange.value) || 1;
      renderDeployPanel();
    });
    dom.deployConfirmBtn.addEventListener('click', confirmDeploy);
    dom.deployCloseBtn.addEventListener('click', closeDeployPanel);
    dom.zoomOutBtn.addEventListener('click', () => setMapZoom((state?.mapZoom || 1) - .2));
    dom.zoomInBtn.addEventListener('click', () => setMapZoom((state?.mapZoom || 1) + .2));
    dom.zoomResetBtn.addEventListener('click', () => setMapZoom(1));
    window.addEventListener('resize', positionDeployPanel);
    dom.reinforceBtn.addEventListener('click', reinforceSelected);
    dom.attackBtn.addEventListener('click', () => confirmAttack(false));
    dom.blitzBtn.addEventListener('click', blitzAttack);
    dom.fortifyBtn.addEventListener('click', () => fortifySelected(false));
    dom.maxFortifyBtn.addEventListener('click', () => fortifySelected(true));
    dom.nextBtn.addEventListener('click', nextPhase);
  }

  applyMapConfig({ ...MAPS.taisho, id: 'taisho' });
  renderSlots();
  bind();
})();
