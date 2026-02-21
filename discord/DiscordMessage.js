const {Client, GatewayIntentBits, EmbedBuilder} = require('discord.js');

class DiscordMessage {

    async recapDaily(players, dailyClanFame, clanName, discordChannelId, discordToken) {
        // 1. COLLECTE ET TRI DES DONNÉES
        const lowDecksMap = {};

        // Regroupe les joueurs selon le nombre de decks qu'il leur reste à jouer
        players.forEach(p => {
            const missed = 4 - p.decksUsedToday;
            if (missed > 0) {
                if (!lowDecksMap[missed]) lowDecksMap[missed] = [];
                lowDecksMap[missed].push(p);
            }
        });

        // Tri pour le Top 3 (Podium) basé sur la renommée (fame)
        const sortedByFame = [...players].sort((a, b) => b.fame - a.fame);
        const top3 = sortedByFame.slice(0, 3);

        // 2. CALCUL DES INDICATEURS CLÉS

        // Pour l'efficacité du JOUR, on divise les points du jour par les attaques du JOUR
        const totalAttacks = players.reduce((sum, p) => sum + p.decksUsedToday, 0);

        const remainingAttacks = players.reduce((sum, p) => sum + Math.max(0, 4 - p.decksUsedToday), 0);
        const famePerAtk = totalAttacks > 0 ? Math.round(dailyClanFame / totalAttacks) : 0;

        // Ajustement automatique du texte (singulier/pluriel)
        const attackLabel = remainingAttacks <= 1 ? 'Attaque restante' : 'Attaques restantes';
        const attackWord = remainingAttacks <= 1 ? 'attaque' : 'attaques';

        // 3. CONSTRUCTION DE L'EMBED DISCORD
        const embed = new EmbedBuilder()
            .setAuthor({ name: `⚔️ RAPPORT DE GUERRE • ${clanName}` })
            .setColor('#2b2d31')
            .addFields(
                // En-tête avec les statistiques globales du clan
                { name: '🏆 Points', value: `**${dailyClanFame.toLocaleString()}** points`, inline: true },
                { name: '🎯 Efficacité', value: `**${famePerAtk}** pts/atk`, inline: true },
                { name: `⚠️ ${attackLabel}`, value: `**${remainingAttacks}** ${attackWord}`, inline: true }
            )
            .setTimestamp();

        // 4. SECTION DES MEILLEURS JOUEURS (PODIUM)
        if (top3.length > 0) {
            const podiumText = top3.map((p, i) => {
                const icons = ['🥇', '🥈', '🥉'];
                // Les points sont ici affichés normalement entre parenthèses, sans gras
                return `${icons[i]} **${p.name}** (${p.fame})`;
            }).join('  |  ');

            embed.addFields({ name: '\u200B\n🏆 TOP PERFORMERS', value: podiumText, inline: false });
        }

        // 5. LISTE DES JOUEURS N'AYANT PAS FINI LEURS ATTAQUES
        const sortedMissedKeys = Object.keys(lowDecksMap).sort((a, b) => b - a);

        if (sortedMissedKeys.length > 0) {
            embed.addFields({ name: '\u200B\n🚨 ATTAQUES NON COMPLETÉES', value: '', inline: false });

            sortedMissedKeys.forEach((missedCount) => {
                const count = parseInt(missedCount, 10);
                const title = `▶️ ${count} ${count > 1 ? 'attaques' : 'attaque'}`;

                const playersList = lowDecksMap[missedCount].sort((a, b) => b.fame - a.fame);

                // Séparation de la liste en deux colonnes pour réduire la hauteur du message
                const midpoint = Math.ceil(playersList.length / 2);

                // On affiche le pseudo en gras et les points en texte normal pour une lecture fluide
                const col1 = playersList.slice(0, midpoint).map(p => `• **${p.name}** (${p.fame})`).join('\n');
                const col2 = playersList.slice(midpoint).map(p => `• **${p.name}** (${p.fame})`).join('\n');

                embed.addFields(
                    { name: title, value: col1 || '\u200B', inline: true },
                    { name: '\u200B', value: col2 || '\u200B', inline: true },
                    { name: '\u200B', value: '\u200B', inline: true } // Champ vide pour forcer l'alignement de la grille
                );
            });
        } else {
            // Message de félicitations si tout le monde a joué
            embed.addFields({ name: '\u200B\n🎉 ÉTAT DU CLAN', value: 'Tous les membres sont à jour dans leurs combats !' });
        }

        // 6. INITIALISATION DU CLIENT ET ENVOI
        const client = new Client({ intents: [GatewayIntentBits.Guilds] });
        client.once('ready', async () => {
            try {
                const channel = await client.channels.fetch(discordChannelId);
                await channel.send({ embeds: [embed] });
                console.log('✅ Daily Recap envoyé.');
            } catch (err) {
                console.error('Erreur Discord:', err);
            } finally {
                client.destroy(); // Déconnexion propre du bot
            }
        });

        await client.login(discordToken);
    }

    async recapWeekly(players, discordChannelId, discordToken) {
         // --- 1 : Joueurs en danger (< 1800) ---
  const lowFame = players 
    .filter(p => p.fame < 1800)
    .sort((a, b) => b.fame - a.fame); // Tri décroissant 

  const embedLow = new EmbedBuilder()
    .setTitle('📉 Weekly Clan War Recap (Avertissements)')
    .setColor('#e74c3c') // Rouge
    .setDescription('Joueurs sous la barre des **1800 points**')
    .addFields({
      name: 'Membres concernés',
      value: lowFame.length
        ? lowFame.map(p =>
          `• **${p.name}** — ${p.fame} points | ${p.decksUsed} decks | ${p.role} | ID : ${p.tag}`
        ).join('\n')
        : '🎉 Personne en dessous de 1800 !'
    });

  // --- 2 : Promotions (>= 2800 & role === 'member') ---
  const toPromote = players
    .filter(p => p.fame >= 2800 && p.role === 'member') // Uniquement les 'member'
    .sort((a, b) => b.fame - a.fame); // Tri décroissant (les plus gros scores en haut)

  const embedHigh = new EmbedBuilder()
    .setTitle('🆙 Promotions Recommandées')
    .setColor('#2ecc71') // Vert
    .setDescription('Membres éligibles pour devenir **Elder** (>= 2800 points)')
    .addFields({
      name: 'À promouvoir',
      value: toPromote.length
        ? toPromote.map(p =>
          `• **${p.name}** — ${p.fame} points | ${p.decksUsed} decks | ID : ${p.tag}`
        ).join('\n')
        : 'Aucune promotion à faire cette semaine.'
    })
    .setTimestamp();

  // --- ENVOI DISCORD ---
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  client.once('ready', async () => {
    try {
      const channel = await client.channels.fetch(discordChannelId);

      // Envoi du rapport négatif
      await channel.send({ embeds: [embedLow] });

      // Envoi du rapport positif
      await channel.send({ embeds: [embedHigh] });

      console.log('✅ Les 2 rapports Discord ont été envoyés.');
    } catch (error) {
      console.error('Erreur lors de l\'envoi Discord:', error);
    } finally {
      client.destroy();
    }
  });

  await client.login(discordToken);
    }
};

module.exports = {DiscordMessage};