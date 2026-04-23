/* ================= LEADERBOARD API ================= */

app.get("/api/leaderboard/:type", async (req,res)=>{

  const type = req.params.type;

  try{

    let users;

    if(type === "chess"){
      users = await User.find().sort({ elo: -1 }).limit(10);
      return res.json(users.map(u=>({
        username: u.username,
        chessElo: u.elo || 1000
      })));
    }

    if(type === "strategy"){
      users = await User.find().sort({ strategyPoints: -1 }).limit(10);
      return res.json(users.map(u=>({
        username: u.username,
        strategyPoints: u.strategyPoints || 0
      })));
    }

    /* GLOBAL */
    users = await User.find().sort({ elo: -1 }).limit(10);

    res.json(users.map(u=>({
      username: u.username,
      xp: u.elo || 1000
    })));

  }catch(err){
    console.error(err);
    res.status(500).json([]);
  }

});
