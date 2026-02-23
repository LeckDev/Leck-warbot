const { ThreadAutoArchiveDuration } = require("discord.js");
class Discord {

  constructor(client) {
    this.client = client;
  }

  async getAbsentsMessages(absentsChannelId) {
    try {
      const forumChannel = await this.client.channels.fetch(absentsChannelId);

      // 1. Récupérer les fils actifs (threads)
      const fetchedThreads = await forumChannel.threads.fetchActive();
      const latestThread = fetchedThreads.threads.first();

      // 2. Vérification de la date (Sécurité anti-vieux thread)
      if (!latestThread) {
        console.log("⚠️ Aucun fil trouvé dans le forum.");
        return { threadId: null, absents: [] };
      }

      console.log(
        `✅ Analyse du fil récent : "${latestThread.name}" (Créé le ${latestThread.createdAt.toLocaleDateString()})`,
      );

      // 3. Récupération des messages
      const messages = await latestThread.messages.fetch();

      // 4. Parsing avec Regex (Multi-ligne et insensible à la casse)
      const absents = messages
        .map((m) => {
          const content = m.content;

          // On cherche "Tag:", "Nom:" et "Raison:" au début de chaque ligne (^ avec flag m)
          const tagMatch = content.match(/^Tag\s*:\s*(#[A-Z0-9]+)/im);
          const nomMatch = content.match(/^Nom\s*:\s*(.+)/im);
          const raisonMatch = content.match(/^Raison\s*:\s*(.+)/im);

          if (tagMatch) {
            return {
              tag: tagMatch[1].toUpperCase().trim(),
              name: nomMatch ? nomMatch[1].trim() : "Inconnu",
              reason: raisonMatch ? raisonMatch[1].trim() : "Non précisée",
            };
          }
          return null;
        })
        .filter(Boolean); // On enlève les messages qui ne respectent pas le template

      return {
        threadId: latestThread.id,
        absents: absents,
      };
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des absents :", error);
      return [];
    }
  }

  async createWeeklyAbsenceThread(absentsChannelId) {
    try {
      const forumChannel = await this.client.channels.fetch(absentsChannelId);

      // Génération d'un nom de fil unique avec la date
      const startDate = new Date();
      const options = { day: "numeric", month: "long" };
      const startString = startDate.toLocaleDateString("fr-FR", options);

      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 7); // On ajoute 7 jours
      const endString = endDate.toLocaleDateString("fr-FR", options);

      // 3. Assemblage du titre
      const threadName = `Absences - Semaine du ${startString} au ${endString}`;
      // Création du fil dans le forum
      const thread = await forumChannel.threads.create({
        name: threadName,
        autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
        message: {
          content: `🚩 **NOUVELLE SEMAINE DE GDC**\n\nMerci de déclarer vos absences ici en respectant le modèle ci-dessous.\n\n**Modèle à copier :**\n\nTag: \nNom: \nRaison: `,
        },
        reason: "Ouverture automatique pour la nouvelle semaine de guerre",
      });

      console.log(`✅ Nouveau fil créé : ${thread.name}`);
      return thread;
    }
    catch(error){
      console.log(`Erreur lors de la récupération des messages des absent : ${error}`)
    }
  }

  async archiveThread(threadId) {
    try {
      const thread = await this.client.channels.fetch(threadId);
      if (thread.isThread()) {
        await thread.setLocked(true); // Personne ne peut plus écrire
        await thread.setArchived(true); // Le fil est masqué/archivé
        console.log(`🔒 Fil ${thread.name} archivé et verrouillé.`);
      }
    }
    catch(error) {
      console.log(`Erreur lors de l'archivage du thread : ${error}`)
    }
  }
}

module.exports = { Discord };
