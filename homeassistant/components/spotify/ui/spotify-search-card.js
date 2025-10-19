class SpotifySearchCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("You must define an entity in the card configuration.");
    }
    this._build_card(config);
  }

  set hass(hass) {
    this._hass = hass;
  }

  _build_card(config) {
    this.shadowRoot.innerHTML = `
      <style>
        .card-content { padding: 16px; }
        .title { font-size: 20px; font-weight: 500; margin-bottom: 8px }
        .grid-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); gap: 8px; }
        .button-grid {
          border: 1px solid;
          padding: 8px; border-radius: 4px; display: flex; flex-direction: column;
          cursor: pointer;
          background-color: var(--card-background-color);
        }
        .button-grid:hover { border-color: var(--primary-color); }
        .button-grid ha-icon { margin-bottom: 4px; }
      </style>
      <ha-card>
        <div class="card-content">
          <div class="title">Spotify Search</div>
          <ha-textfield id="query" label="Spotify Query" style="width: 100%;"></ha-textfield>
          <div class="title" style="margin-top: 16px;">Search Type</div>
          <div class="grid-container">
            ${this._render_button("Track", "mdi:music-note", "track")}
            ${this._render_button("Artist", "mdi:account-music", "artist")}
            ${this._render_button("Album", "mdi:album", "album")}
            ${this._render_button("Playlist", "mdi:playlist-music", "playlist")}
            ${this._render_button("All", "mdi:magnify", "")}
          </div>
        </div>
      </ha-card>
    `;

    this.shadowRoot.querySelectorAll(".button-grid").forEach((button) => {
      button.addEventListener("click", () => {
        this._call_spotify_search(button.dataset.searchType, config);
      });
    });
  }

  _render_button(name, icon, searchType) {
    return `
      <button class="button-grid" data-search-type="${searchType}">
        <ha-icon icon="${icon}"></ha-icon><span>${name}</span>
      </button>`;
  }

  async _call_spotify_search(searchType, config) {
    const query = this.shadowRoot.getElementById("query").value;
    if (!query) {
      alert("Empty query.");
      return;
    }
    try {
      const response = await this._hass.callWS({
        type: "call_service",
        domain: "media_player",
        service: "search_media",
        service_data: {
          entity_id: config.entity,
          media_content_type: searchType || "track,artist,album,playlist",
          search_query: query,
        },
        return_response: true,
      });

      this._handleNavigate(config.entity);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  }

  _handleNavigate(entityId) {
    const path = `/media-browser/${entityId}/spotify%3A%2F%2Fsearch_results%2Csearch_results`;
    window.history.pushState(null, "", path);
    window.dispatchEvent(new Event("location-changed"));
  }

  getGridOptions() {
    return {
      rows: 3,
      columns: 6,
      min_rows: 3,
      max_rows: 3,
    };
  }

  static getConfigForm() {
    return {
      schema: [{ name: "entity", required: true, selector: { entity: {} } }],

      computeHelper: (schema) => {
        switch (schema.name) {
          case "entity":
            return "Select the Spotify entity you want to use.";
        }
        return undefined;
      },
      assertConfig: (config) => {
        if (config.other_option) {
          throw new Error("'other_option' is unexpected.");
        }
      },
    };
  }
}

customElements.define("spotify-search-card", SpotifySearchCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "spotify-search-card",
  name: "Spotify Search Card",
  description: "A card to search for media on Spotify.",
  preview: true,
});
