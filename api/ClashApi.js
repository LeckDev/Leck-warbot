const axios = require('axios');

class ClashApi {
  constructor(apiKey, baseUrl = 'https://proxy.royaleapi.dev/v1') {
    this.api = axios.create({
      baseURL: baseUrl,
      headers: { Authorization: `Bearer ${apiKey}` }
    });
  }
    
    async getRiverRace(clanTag) {
        const response = await this.api.get(`/clans/${clanTag}/currentriverrace`);
        return response.data;
    }

    async getMembers(clanTag) {
      const response = await this.api.get(`/clans/${clanTag}/members`)
      return response.data;
    }
};

module.exports = {ClashApi};