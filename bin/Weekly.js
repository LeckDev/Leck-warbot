require('dotenv').config();

const { ClashApi } = require('../api/ClashApi')
const { DiscordMessage } = require('../discord/DiscordMessage')

async function runWeeklyTask() {
    try {
        const clashApi = new ClashApi(process.env.CLASH_API_TOKEN);
        const discordMessage = new DiscordMessage();
        const clanTag = process.env.CLAN_TAG;
        const discordChannelId = process.env.REPORT_CHANNEL_ID;
        const discordToken = process.env.DISCORD_TOKEN;

        // 1. Récupération des données brutes
        const warLogData = await clashApi.getWarLog(clanTag);
        const membersData = await clashApi.getMembers(clanTag);

        // On récupère la dernière guerre (le premier et seul élément du tableau items car limit=1)
        const lastWar = warLogData.items[0];

        // On formate le tag pour qu'il commence par un '#' pour la comparaison
        const formattedTag = clanTag.replace('%23', '#')

        // On cherche notre clan dans le tableau standings
        const myClanStanding = lastWar.standings.find(
            standing => standing.clan.tag === formattedTag
        );

        const playersWarLog = myClanStanding.clan.participants;

        // 3. Filtrer pour ne garder que les membres actuels ET ajouter leur rôle
        const playersInClan = membersData.items;

        // Création du dictionnaire : { "#TAG1" => "coLeader", "#TAG2" => "member" ... }
        const currentMembersMap = new Map(playersInClan.map(member => [member.tag, member.role]));

        // On filtre et on ajoute le rôle dans le même mouvement
        const activeParticipants = playersWarLog
            .filter(participant => currentMembersMap.has(participant.tag))
            .map(participant => ({
                ...participant, // On garde fame, decksUsed, boatAttacks, etc.
                role: currentMembersMap.get(participant.tag) // On ajoute la nouvelle propriété 'role'
            }));
            
        await discordMessage.recapWeekly(activeParticipants, discordChannelId, discordToken)

    } catch (error) {
        console.error("Erreur lors de la tâche hebdomadaire :", error);

    }
}

runWeeklyTask();