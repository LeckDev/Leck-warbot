require("dotenv").config();

const { ClashApi } = require("../api/ClashApi");
const { DiscordMessage } = require("../discord/DiscordMessage");
const { Discord } = require("../discord/Discord");
const { DiscordConnection } = require('../discord/DiscordConnection');

async function runDailyTask() {
    let client = null; // On déclare le client ici pour pouvoir le détruire dans le 'finally'
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

        // 1. Récupération des données brutes
        const riverRaceData = await clashApi.getRiverRace(clanTag);
        const membersData = await clashApi.getMembers(clanTag);
        const absentsData = await discord.getAbsentsMessages(absentsChannelId);

        const absentsMessages = absentsData.absents; // Le tableau des joueurs

        const playersInClan = membersData.items;
        const playersRiverRace = riverRaceData.clan.participants;
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

        // 4.  Récupération des statistiques en fonction de si on est en coliseum ou non
        let fame = 0;
        let totalAttacks = 0;
        if(riverRaceData.periodType == "colosseum") {
            totalAttacks = activeParticipants.reduce((sum, p) => sum + p.decksUsed, 0);
            fame = riverRaceData.clan.fame
        }
        else {
             totalAttacks = activeParticipants.reduce((sum, p) => sum + p.decksUsedToday, 0);
             fame = riverRaceData.clan.periodPoints;
        }

        // // 4. On appel les fonctions discord
        await discordMessage.recapDaily(
            activeParticipants,
            fame,
            clanName,
            totalAttacks,
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
    finally {
        DiscordConnection.destroyClient(client);
    }
}

runDailyTask();
