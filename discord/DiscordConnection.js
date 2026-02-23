const { Client, GatewayIntentBits } = require("discord.js");

class DiscordConnection {
    // Méthode statique pour créer et connecter le client
    static async createClient(token) {
        console.log("⏳ Connexion du bot Discord en cours...");
        const client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });

        await client.login(token);
        console.log("🟢 Bot Discord connecté avec succès !");
        
        return client;
    }

    // Méthode statique pour fermer la connexion proprement
    static destroyClient(client) {
        if (client) {
            client.destroy();
            console.log("🔴 Bot Discord déconnecté.");
        }
    }
}

module.exports = { DiscordConnection };