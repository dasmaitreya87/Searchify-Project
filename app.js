const APIController = (function () {
    const clientId =GIVE_THE_CLIENT_ID;
    const clientSecret = GIVE_THE_CLIENT_SECRET;



    // Fetch Spotify API token
    const _getToken = async () => {
        const result = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Authorization: "Basic " + btoa(clientId + ":" + clientSecret),
            },
            body: "grant_type=client_credentials",
        });

        const data = await result.json();
        return data.access_token;
    };

    // Search for playlists using the Search API
    const _searchPlaylists = async (token, genre) => {
        const result = await fetch(
            `https://api.spotify.com/v1/search?q=${genre}&type=playlist`,
            {
                method: "GET",
                headers: { Authorization: "Bearer " + token },
            }
        );

        const data = await result.json();
        return data.playlists.items;
    };

    // Get detailed information about a playlist by its ID
    const _getPlaylistById = async (token, playlistId) => {
        const result = await fetch(
            `https://api.spotify.com/v1/playlists/${playlistId}`,
            {
                method: "GET",
                headers: { Authorization: "Bearer " + token },
            }
        );

        const data = await result.json();
        return data;
    };

    return {
        getToken() {
            return _getToken();
        },
        searchPlaylists(token, genre) {
            return _searchPlaylists(token, genre);
        },
        getPlaylistById(token, playlistId) {
            return _getPlaylistById(token, playlistId);
        },
    };
})();

const UIController = (function () {
    const DOMElements = {
        selectGenre: "#select_genre",
        selectPlaylist: "#select_playlist",
        buttonSubmit: "#btn_submit",
        divSongDetail: "#song-detail",
        hfToken: "#hidden_token",
        divSonglist: ".song-list", // Ensure this remains a string selector
    };

    return {
        inputField() {
            return {
                genre: document.querySelector(DOMElements.selectGenre),
                playlist: document.querySelector(DOMElements.selectPlaylist),
                tracks: document.querySelector(DOMElements.divSonglist), // This should work
                submit: document.querySelector(DOMElements.buttonSubmit),
                songDetail: document.querySelector(DOMElements.divSongDetail),
            };
        },

        createGenre(text, value) {
            const html = `<option value="${value}">${text}</option>`;
            document.querySelector(DOMElements.selectGenre).insertAdjacentHTML(
                "beforeend",
                html
            );
        },

        createPlaylist(text, value) {
            const html = `<option value="${value}">${text}</option>`;
            document.querySelector(
                DOMElements.selectPlaylist
            ).insertAdjacentHTML("beforeend", html);
        },

        resetPlaylist() {
            this.inputField().playlist.innerHTML = "";
        },

        resetTracks() {
            this.inputField().tracks.innerHTML = "";
            this.inputField().songDetail.innerHTML = "";
        },

        storeToken(value) {
            document.querySelector(DOMElements.hfToken).value = value;
        },

        getStoredToken() {
            return {
                token: document.querySelector(DOMElements.hfToken).value,
            };
        },
        displayTrack(name, artist, imageUrl) {
            // Create the HTML for a track item
            const html = `
                <div class="list-group-item track-item" data-track='${JSON.stringify({
                    name,
                    artist,
                    imageUrl,
                })}'>
                    <img src="${imageUrl}" alt="Album Art" class="track-image mr-3">
                    <div class="track-info">
                        <h6 class="track-name">${name}</h6>
                        <p class="track-artist">By ${artist}</p>
                    </div>
                </div>
            `;
        
            // Append the HTML to the song list container
            document
                .querySelector(DOMElements.divSonglist)
                .insertAdjacentHTML("beforeend", html);
        },
        displaySongDetail(trackDetail) {
            const { name, artist, imageUrl } = trackDetail;
            const html = `
                <img id="song-image" src="${imageUrl}" alt="${name}" class="img-fluid mb-3">
                <h5 id="song-name">Song Name: ${name}</h5>
                <p id="song-artist">Artist: ${artist}</p>
            `;
            this.inputField().songDetail.innerHTML = html;
        },        
    };
})();

// Update JavaScript
const APPController = (function (UICtrl, APICtrl) {
    const DOMInputs = UICtrl.inputField();

    // Predefined genres
    const genres = ["pop", "rock", "hip-hop", "jazz", "classical"];

    const loadGenres = () => {
        genres.forEach((genre) => UICtrl.createGenre(genre, genre));
    };

    // Event listener for genre selection
    DOMInputs.genre.addEventListener("change", async () => {
        UICtrl.resetPlaylist();
        const token = UICtrl.getStoredToken().token;
        const genre = DOMInputs.genre.value;

        const playlists = await APICtrl.searchPlaylists(token, genre);

        if (playlists && playlists.length > 0) {
            playlists.forEach((playlist) => {
                if (playlist && playlist.name && playlist.id) {
                    UICtrl.createPlaylist(playlist.name, playlist.id);
                }
            });
        } else {
            console.log("No playlists found for this genre.");
        }
    });

    // Event listener for submit button
    DOMInputs.submit.addEventListener("click", async (e) => {
        e.preventDefault();
        UICtrl.resetTracks();
        const token = UICtrl.getStoredToken().token;
        const playlistId = DOMInputs.playlist.value;

        if (!playlistId) {
            console.log("Please select a playlist.");
            return;
        }

        const playlist = await APICtrl.getPlaylistById(token, playlistId);

        if (playlist && playlist.tracks.items.length > 0) {
            playlist.tracks.items.forEach((item) => {
                const track = item.track;
                if (track && track.name && track.artists[0].name && track.album.images[0].url) {
                    UICtrl.displayTrack(
                        track.name,
                        track.artists[0].name,
                        track.album.images[0].url
                    );
                }
            });
        } else {
            console.log("No tracks found in this playlist.");
        }        
    });

    // Event listener for song click
    UICtrl.inputField().tracks.addEventListener("click", (e) => {
        if (e.target && e.target.classList.contains("track-item")) {
            const trackDetail = JSON.parse(e.target.dataset.track);
            UICtrl.displaySongDetail(trackDetail);
        }
    });
    
    DOMInputs.tracks.addEventListener("click", (e) => {
        const trackItem = e.target.closest(".track-item");
        if (trackItem) {
            const trackDetail = JSON.parse(trackItem.dataset.track);
            UICtrl.displaySongDetail(trackDetail);
        }
    });    

    return {
        init() {
            console.log("App is starting");
            APICtrl.getToken().then((token) => {
                UICtrl.storeToken(token);
                loadGenres();
            });
        },
    };
})(UIController, APIController);

APPController.init();









