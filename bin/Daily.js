require("dotenv").config();

const { ClashApi } = require("../api/ClashApi");
const { DiscordMessage } = require("../discord/DiscordMessage");
const { Discord } = require("../discord/Discord");

async function runDailyTask() {
  try {
    const clashApi = new ClashApi(process.env.CLASH_API_TOKEN);
    const discordMessage = new DiscordMessage();
    const discord = new Discord();
    const clanTag = process.env.CLAN_TAG;
    const reportChannelId = process.env.REPORT_CHANNEL_ID;
    const absentsChannelId = process.env.ABSENTS_CHANNEL_ID;
    const discordToken = process.env.DISCORD_TOKEN;

    // 1. Récupération des données brutes
    const riverRaceData = await clashApi.getRiverRace(clanTag);
    const membersData = await clashApi.getMembers(clanTag);
    const absentsData = await discord.getAbsentsMessages(
      discordToken,
      absentsChannelId,
    );

    const absentsMessages = absentsData.absents; // Le tableau des joueurs
    
    const playersInClan = membersData.items;
    const playersRiverRace = riverRaceData.clan.participants;
    const dailyClanFame = riverRaceData.clan.periodPoints;
    const clanName = riverRaceData.clan.name;
    
    // 2. Création d'une liste contenant uniquement les tags des membres actuels
    // Cela crée un tableau du genre : ['#TAG1', '#TAG2', '#TAG3'...]
    const currentMemberTags = new Set(
        playersInClan.map((member) => member.tag),
    );
    
    // 3. Le filtrage : on garde les membres encore présent dans le clan
    const activeParticipants = playersRiverRace.filter((participant) =>
        currentMemberTags.has(participant.tag),
);

// // 4. On appel les fonctions discord
await discordMessage.recapDaily(
    activeParticipants,
    dailyClanFame,
    clanName,
    reportChannelId,
    discordToken,
);
await discordMessage.recapAbsents(
    absentsMessages,
    reportChannelId,
    discordToken,
);
  } catch (error) {
    console.error("Erreur lors de la tâche quotidienne :", error);
  }
}

runDailyTask();
