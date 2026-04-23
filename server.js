socket.on("disconnect", ()=>{

  const username = socket.username;
  if(!username) return;

  delete onlineUsers[username];

  const gameId = playerGames[username];
  const game = chessGames[gameId];

  if(game){

    const opponent = game.players.find(p=>p.username !== username);

    if(opponent){

      /* 🔥 SIGNAL DISCONNECT */
      io.to(opponent.id).emit("opponent_disconnected",{
        player: username
      });

      let timeLeft = 60;

      const interval = setInterval(()=>{

        timeLeft--;

        io.to(opponent.id).emit("disconnect_timer",{
          time: timeLeft
        });

        if(timeLeft <= 0){

          clearInterval(interval);

          io.to(opponent.id).emit("player_left",{
            winner: opponent.username
          });

          delete chessGames[gameId];
          delete playerGames[username];
          delete playerGames[opponent.username];
        }

      },1000);

      pendingDisconnects[username] = interval;
    }
  }

  update();
});
