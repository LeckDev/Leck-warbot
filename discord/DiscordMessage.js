const { EmbedBuilder } = require("discord.js");

class DiscordMessage {

  constructor(client) {
    this.client = client;
  }
  async recapDaily(players, clanFame, clanName, totalAttacks, discordChannelId) {

    try {
      // 1. COLLECTE ET TRI DES DONNÉES
      const lowDecksMap = {};

      // Regroupe les joueurs selon le nombre de decks qu'il leur reste à jouer
      players.forEach((p) => {
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

      const remainingAttacks = players.reduce(
        (sum, p) => sum + Math.max(0, 4 - p.decksUsedToday),
        0,
      );
      const famePerAtk =
        totalAttacks > 0 ? Math.round(clanFame / totalAttacks) : 0;

      // Ajustement automatique du texte (singulier/pluriel)
      const attackLabel =
        remainingAttacks <= 1 ? "Attaque restante" : "Attaques restantes";
      const attackWord = remainingAttacks <= 1 ? "attaque" : "attaques";

      // 3. CONSTRUCTION DE L'EMBED DISCORD
      const embed = new EmbedBuilder()
        .setAuthor({ name: `⚔️ RAPPORT DE GUERRE • ${clanName}` })
        .setColor("#2b2d31")
        .addFields(
          // En-tête avec les statistiques globales du clan
          {
            name: "🏆 Points",
            value: `**${clanFame.toLocaleString()}** points`,
            inline: true,
          },
          {
            name: "🎯 Efficacité",
            value: `**${famePerAtk}** pts/atk`,
            inline: true,
          },
          {
            name: `⚠️ ${attackLabel}`,
            value: `**${remainingAttacks}** ${attackWord}`,
            inline: true,
          },
        )
        .setTimestamp();

      // 4. SECTION DES MEILLEURS JOUEURS (PODIUM)
      if (top3.length > 0) {
        const podiumText = top3
          .map((p, i) => {
            const icons = ["🥇", "🥈", "🥉"];
            // Les points sont ici affichés normalement entre parenthèses, sans gras
            return `${icons[i]} **${p.name}** (${p.fame})`;
          })
          .join("  |  ");

        embed.addFields({
          name: "\u200B\n🏆 TOP PERFORMERS",
          value: podiumText,
          inline: false,
        });
      }

      // 5. LISTE DES JOUEURS N'AYANT PAS FINI LEURS ATTAQUES
      const sortedMissedKeys = Object.keys(lowDecksMap).sort((a, b) => b - a);

      if (sortedMissedKeys.length > 0) {
        embed.addFields({
          name: "\u200B\n🚨 ATTAQUES NON COMPLETÉES",
          value: "",
          inline: false,
        });

        sortedMissedKeys.forEach((missedCount) => {
          const count = parseInt(missedCount, 10);
          const title = `▶️ ${count} ${count > 1 ? "attaques" : "attaque"}`;

          const playersList = lowDecksMap[missedCount].sort(
            (a, b) => b.fame - a.fame,
          );

          // Séparation de la liste en deux colonnes pour réduire la hauteur du message
          const midpoint = Math.ceil(playersList.length / 2);

          // On affiche le pseudo en gras et les points en texte normal pour une lecture fluide
          const col1 = playersList
            .slice(0, midpoint)
            .map((p) => `• **${p.name}** (${p.fame})`)
            .join("\n");
          const col2 = playersList
            .slice(midpoint)
            .map((p) => `• **${p.name}** (${p.fame})`)
            .join("\n");

          embed.addFields(
            { name: title, value: col1 || "\u200B", inline: true },
            { name: "\u200B", value: col2 || "\u200B", inline: true },
            { name: "\u200B", value: "\u200B", inline: true }, // Champ vide pour forcer l'alignement de la grille
          );
        });
      } else {
        // Message de félicitations si tout le monde a joué
        embed.addFields({
          name: "\u200B\n🎉 ÉTAT DU CLAN",
          value: "Tous les membres sont à jour dans leurs combats !",
        });
      }

      // 6. ENVOI DU MESSAGE
      const channel = await this.client.channels.fetch(discordChannelId);
      await channel.send({ embeds: [embed] });
      console.log("✅ Daily Recap envoyé.");
    }
    catch (error) {
      console.log("Erreur lors du recap daily :", error)
    }
  }

  async recapWeekly(players, discordChannelId, demotePoints, promotePoints ) {

    try {
      // --- 1 : Joueurs en danger ---
      const lowFame = players
        .filter((p) => p.fame < demotePoints)
        .sort((a, b) => b.fame - a.fame); // Tri décroissant

      const embedLow = new EmbedBuilder()
        .setTitle("📉 Weekly Clan War Recap (Avertissements)")
        .setColor("#e74c3c")
        // On met toute la logique directement dans la description
        .setDescription(
          `Joueurs sous la barre des **${demotePoints} Points**\n\n` +
          (lowFame.length
            ? lowFame.map(p => `• **${p.name}** (${p.tag}) — ${p.fame} pts | ${p.decksUsed} decks | ${p.role}`).join("\n")
            : `🎉 Personne en dessous de ${demotePoints} !`)
        );

      // --- 2 : Promotions (>= promotePoints & role === 'member') ---
      const toPromote = players
        .filter((p) => p.fame >= promotePoints && p.role === "member") // Uniquement les 'member'
        .sort((a, b) => b.fame - a.fame); // Tri décroissant (les plus gros scores en haut)

      const embedHigh = new EmbedBuilder()
        .setTitle("🆙 Promotions Recommandées")
        .setColor("#2ecc71") // Vert
        // On fusionne le texte d'intro et la liste dynamique dans la description
        .setDescription(
          `Membres éligibles pour devenir **Elder** (>= ${promotePoints} points)\n\n` +
          (toPromote.length
            ? toPromote
              .map((p) => `• **${p.name}**(${p.tag}) — ${p.fame} points | ${p.decksUsed} decks`)
              .join("\n")
            : "Aucune promotion à faire cette semaine.")
        )
        .setTimestamp();

      // --- ENVOI DISCORD ---
      const channel = await this.client.channels.fetch(discordChannelId);

      // Envoi du rapport négatif
      await channel.send({ embeds: [embedLow] });

      // Envoi du rapport positif
      await channel.send({ embeds: [embedHigh] });

      console.log("✅ Les 2 rapports Discord ont été envoyés.");
    }
    catch (error) {
      console.log("Erreur lors du recap weekly :", error)
    }
  }

  async recapAbsents(messages, discordChannelId) {

    try {


      const embedAbsents = new EmbedBuilder()
        .setTitle("⚠️ Rappel des membres absents")
        .setColor("#3c64e7")
        // .setDescription("Joueurs")
        .addFields({
          name: "Membres concernés",
          value: messages.length
            ? messages
              .map(
                (m) =>
                  `• **${m.name}**(${m.tag}) — ${m.reason}`,
              )
              .join("\n")
            : "🎉 Aucune membre noté absent !",
        }).setTimestamp();

      // --- ENVOI DISCORD ---
      const channel = await this.client.channels.fetch(discordChannelId);

      // Envoi du rapport négatif
      await channel.send({ embeds: [embedAbsents] });

      console.log("✅ Le rapport des absents a été envoyé");
    }
    catch (error) {
      console.error("Erreur lors du recap des absents:", error);
    }
  }
}
module.exports = { DiscordMessage };
