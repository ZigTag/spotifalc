#![cfg_attr(
all(not(debug_assertions), target_os = "windows"),
windows_subsystem = "windows"
)]

use rspotify::{
    blocking::oauth2::SpotifyOAuth,
    blocking::util::{request_token, process_token},
    blocking::oauth2::{TokenInfo, SpotifyClientCredentials},
    blocking::client::Spotify
};
use tokio::{
    fs,
    time::Duration
};
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

use std::{
    net::{TcpListener, TcpStream},
    path::PathBuf,
    time::SystemTime,
    io::{self, Read, Write},
};
use rspotify::model::album::FullAlbum;

const CALLBACK_URL: &str = "http://localhost:3001/callback";

const SCOPE: [&str; 1] = [
    "user-read-currently-playing"
];

#[derive(Deserialize)]
struct ConfigToml {
    client_id: String,
    client_secret: String,
}

struct TauriState {
    oauth: SpotifyOAuth,
    spotify_client: Spotify,
    expiry: i64,
}

#[derive(Serialize)]
struct Credentials {
    token: String,
    expiry: i64,
}

#[derive(Serialize)]
struct SpotifyAlbum {
    images: Vec<SpotifyImage>,
    name: String,
    tracks: Vec<SpotifyTrack>,
}

#[derive(Serialize)]
struct SpotifyImage {
    height: i32,
    width: i32,
    url: String,
}

#[derive(Serialize)]
struct SpotifyTrack {
    artists: Vec<SpotifyTrackArtist>,
    name: String,
    track_number: i32,
}

#[derive(Serialize)]
struct SpotifyTrackArtist {
    name: String,
}

#[tauri::command]
fn get_auth_token(state: tauri::State<TauriState>) -> Credentials {
    Credentials {
        token: state.spotify_client.clone()
            .client_credentials_manager.unwrap()
            .token_info.unwrap()
            .access_token,
        expiry: state.expiry
    }
}

#[tauri::command]
async fn get_now_playing(state: tauri::State<'_, TauriState>, album_id: String) -> Result<FullAlbum, String> {
    let album = state.spotify_client.album(&album_id);
    let returnable = match album {
        Ok(album) => {
            // println!("{:?}", album);
            //
            // let mut images: Vec<SpotifyImage> = Vec::new();
            //
            // for i in album.images {
            //     images.push(SpotifyImage {
            //         height: i.height.unwrap_or(0) as i32,
            //         width: i.width.unwrap_or(0) as i32,
            //         url: i.url
            //     })
            // }
            //
            // let mut tracks: Vec<SpotifyTrack> = Vec::new();
            //
            // for i in album.tracks.items {
            //     let mut track_artists: Vec<SpotifyTrackArtist> = Vec::new();
            //
            //     for j in i.artists {
            //         track_artists.push(SpotifyTrackArtist {
            //             name: j.name,
            //         });
            //     }
            //
            //     tracks.push(SpotifyTrack {
            //         artists: track_artists,
            //         name: i.name,
            //         track_number: i.track_number as i32,
            //     });
            // }
            //
            // Ok(SpotifyAlbum {
            //     images,
            //     name: album.name,
            //     tracks,
            // })
            Ok(album)
        },
        Err(err) => Err(err.to_string()),
    };

    returnable
}

#[tokio::main]
async fn main() {
    let config_dir = dirs::preference_dir().unwrap().join("spotifalc");

    let config_toml = init_config(config_dir.clone()).await;

    let mut oauth = SpotifyOAuth::default()
        .client_id(&config_toml.client_id)
        .client_secret(&config_toml.client_secret)
        .redirect_uri(CALLBACK_URL)
        .cache_path(config_dir.join(".spotify_token_cache.json"))
        .scope(&SCOPE.join(" "))
        .build();

    let server_port = 3001_u16;

    let spotify_client: Spotify;
    let expiry: i64;

    match get_token_auto(&mut oauth, server_port).await {
        Some(token_info) => {
            let (spotify, token_expiry) = get_spotify(token_info);

            spotify_client = spotify;
            expiry = token_expiry;
        }
        _ => panic!("Auth Failed"),
    }

    tauri::Builder::default()
        .manage(TauriState { oauth, spotify_client, expiry })
        .invoke_handler(tauri::generate_handler![get_auth_token, get_now_playing])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn init_config(config_dir: PathBuf) -> ConfigToml {
    if !config_dir.exists() {
        fs::create_dir(config_dir.clone()).await.unwrap();
    }

    let config_file = config_dir.join("settings.toml");

    if !config_file.exists() {
        fs::File::create(config_file.clone()).await.unwrap();
    }

    toml::from_str(&fs::read_to_string(config_file).await.unwrap_or(String::from(""))).unwrap()
}

// Code Mostly Copied from https://github.com/Rigellute/spotify-tui/blob/master/src
fn get_spotify(token_info: TokenInfo) -> (Spotify, i64) {
    let token_expiry = {
        if let Some(expires_at) = token_info.expires_at {
            SystemTime::UNIX_EPOCH
                + Duration::from_secs(expires_at as u64)
                // Set 10 seconds early
                - Duration::from_secs(10)
        } else {
            SystemTime::now()
        }
    };

    let token_expiry = OffsetDateTime::from(token_expiry).unix_timestamp();

    let client_credential = SpotifyClientCredentials::default()
        .token_info(token_info)
        .build();

    let spotify = Spotify::default()
        .client_credentials_manager(client_credential)
        .build();

    (spotify, token_expiry)
}

async fn get_token_auto(spotify_oauth: &mut SpotifyOAuth, port: u16) -> Option<TokenInfo> {
    match spotify_oauth.get_cached_token() {
        Some(token_info) => Some(token_info),
        None => match redirect_uri_web_server(spotify_oauth, port) {
            Ok(mut url) => process_token(spotify_oauth, &mut url),
            Err(()) => {
                println!("Starting webserver failed. Continuing with manual authentication");
                request_token(spotify_oauth);
                println!("Enter the URL you were redirected to: ");
                let mut input = String::new();
                match io::stdin().read_line(&mut input) {
                    Ok(_) => process_token(spotify_oauth, &mut input),
                    Err(_) => None,
                }
            }
        },
    }
}

fn redirect_uri_web_server(spotify_oauth: &mut SpotifyOAuth, port: u16) -> Result<String, ()> {
    let listener = TcpListener::bind(format!("127.0.0.1:{}", port));

    match listener {
        Ok(listener) => {
            request_token(spotify_oauth);

            for stream in listener.incoming() {
                match stream {
                    Ok(stream) => {
                        if let Some(url) = handle_connection(stream) {
                            return Ok(url);
                        }
                    }
                    Err(e) => {
                        println!("Error: {}", e);
                    }
                };
            }
        }
        Err(e) => {
            println!("Error: {}", e);
        }
    }

    Err(())
}

fn handle_connection(mut stream: TcpStream) -> Option<String> {
    // The request will be quite large (> 512) so just assign plenty just in case
    let mut buffer = [0; 1000];
    let _ = stream.read(&mut buffer).unwrap();

    // convert buffer into string and 'parse' the URL
    match String::from_utf8(buffer.to_vec()) {
        Ok(request) => {
            let split: Vec<&str> = request.split_whitespace().collect();

            if split.len() > 1 {
                respond_with_success(stream);
                return Some(split[1].to_string());
            }

            respond_with_error("Malformed request".to_string(), stream);
        }
        Err(e) => {
            respond_with_error(format!("Invalid UTF-8 sequence: {}", e), stream);
        }
    };

    None
}

fn respond_with_success(mut stream: TcpStream) {
    let contents = include_str!("redirect.html");

    let response = format!("HTTP/1.1 200 OK\r\n\r\n{}", contents);

    stream.write_all(response.as_bytes()).unwrap();
    stream.flush().unwrap();
}

fn respond_with_error(error_message: String, mut stream: TcpStream) {
    println!("Error: {}", error_message);
    let response = format!(
        "HTTP/1.1 400 Bad Request\r\n\r\n400 - Bad Request - {}",
        error_message
    );

    stream.write_all(response.as_bytes()).unwrap();
    stream.flush().unwrap();
}
// To here
