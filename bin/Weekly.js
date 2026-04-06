require("dotenv").config();

const { ClashApi } = require("../api/ClashApi");
const { DiscordMessage } = require("../discord/DiscordMessage");
const { Discord } = require("../discord/Discord");
const { DiscordConnection } = require('../discord/DiscordConnection');

async function runWeeklyTask() {
  try {
    //On créé le client discord
    const discordToken = process.env.DISCORD_TOKEN;
    client = await DiscordConnection.createClient(discordToken);

    const clashApi = new ClashApi(process.env.CLASH_API_TOKEN);
    const discordMessage = new DiscordMessage(client);
    const discord = new Discord(client);
    const clanTag = process.env.CLAN_TAG;
    const reportChannelId = process.env.REPORT_CHANNEL_ID;
    const absentsChannelId = process.env.ABSENTS_CHANNEL_ID;
    const demotePoints = parseInt(process.env.DEMOTE_POINTS);
    const promotePoints = parseInt(process.env.PROMOTE_POINTS);

    // 1. Récupération des données brutes
    const warLogData = await clashApi.getWarLog(clanTag);
    const membersData = await clashApi.getMembers(clanTag);
    const absentsData = await discord.getAbsentsMessages(absentsChannelId);
    
    const absentsMessages = absentsData.absents; // Le tableau des joueurs

    const threadIdToArchive = absentsData.threadId;


    // On récupère la dernière guerre (le premier et seul élément du tableau items car limit=1)
    const lastWar = warLogData.items[0];

    // On formate le tag pour qu'il commence par un '#' pour la comparaison
    const formattedTag = clanTag.replace("%23", "#");

    // On cherche notre clan dans le tableau standings
    const myClanStanding = lastWar.standings.find(
      (standing) => standing.clan.tag === formattedTag,
    );

    const playersWarLog = myClanStanding.clan.participants;

    // 3. Filtrer pour ne garder que les membres actuels ET ajouter leur rôle
    const playersInClan = membersData.items;

    // Création du dictionnaire : { "#TAG1" => "coLeader", "#TAG2" => "member" ... }
    const currentMembersMap = new Map(
      playersInClan.map((member) => [member.tag, member.role]),
    );

    // On filtre et on ajoute le rôle dans le même mouvement
    const activeParticipants = playersWarLog
      .filter((participant) => currentMembersMap.has(participant.tag))
      .map((participant) => ({
        ...participant, // On garde fame, decksUsed, boatAttacks, etc.
        role: currentMembersMap.get(participant.tag), // On ajoute la nouvelle propriété 'role'
      }));

    await discordMessage.recapWeekly(
      activeParticipants,
      reportChannelId,
      demotePoints,
      promotePoints
    );

    await discordMessage.recapAbsents(
    absentsMessages,
    reportChannelId,
);

    // On vérifie qu'on a bien un ID avant d'archiver
    if (threadIdToArchive) {
      await discord.archiveThread(threadIdToArchive);
    }

    // Créé le nouveau thread discord
    await discord.createWeeklyAbsenceThread(absentsChannelId);

  } catch (error) {
    console.error("Erreur lors de la tâche hebdomadaire :", error);
  }
  finally{
    DiscordConnection.destroyClient(client);
  }
}

runWeeklyTask();
