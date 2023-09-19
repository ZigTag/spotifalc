#![cfg_attr(
all(not(debug_assertions), target_os = "windows"),
windows_subsystem = "windows"
)]

use rspotify::{
    oauth2::SpotifyOAuth,
    util::{request_token, process_token},
    oauth2::{TokenInfo, SpotifyClientCredentials},
    client::Spotify,
    model::album::FullAlbum,
    model::context::CurrentlyPlayingContext
};
use tokio::{fs, time::Duration};
use serde::{Deserialize, Serialize};
use time::OffsetDateTime;

use std::{
    net::{TcpListener, TcpStream},
    path::PathBuf,
    time::SystemTime,
    io::{self, Read, Write},
};
use tokio::io::AsyncWriteExt;

const CALLBACK_URL: &str = "http://localhost:3001/callback";

const SCOPE: [&str; 2] = [
    "user-read-currently-playing",
    "user-modify-playback-state"
];

#[derive(Deserialize,Serialize)]
struct ConfigToml {
    client_id: String,
    client_secret: String,
}

struct TauriState {
    spotify_client: Spotify,
    expiry: i64,
}

#[derive(Serialize)]
struct Credentials {
    token: String,
    expiry: i64,
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
#[tokio::main]
async fn get_album(state: tauri::State<'_, TauriState>, album_id: String) -> Result<FullAlbum, String> {
    match state.spotify_client.album(&album_id).await {
        Ok(album) => Ok(album),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
#[tokio::main]
async fn get_currently_playing(state: tauri::State<'_, TauriState>) -> Result<Option<CurrentlyPlayingContext>, String> {
    match state.spotify_client.current_playing(None, None).await {
        Ok(currently_playing) => Ok(currently_playing),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
#[tokio::main]
async fn start_playback(state: tauri::State<'_, TauriState>) -> Result<(), String> {
    match state.spotify_client.start_playback(None, None, None, None, None).await {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
#[tokio::main]
async fn pause_playback(state: tauri::State<'_, TauriState>) -> Result<(), String> {
    match state.spotify_client.pause_playback(None).await {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
#[tokio::main]
async fn next_track(state: tauri::State<'_, TauriState>) -> Result<(), String> {
    match state.spotify_client.next_track(None).await {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
#[tokio::main]
async fn previous_track(state: tauri::State<'_, TauriState>) -> Result<(), String> {
    match state.spotify_client.previous_track(None).await {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
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
        .manage(TauriState { spotify_client, expiry })
        .invoke_handler(tauri::generate_handler![get_auth_token, get_album, get_currently_playing, start_playback, pause_playback, next_track, previous_track])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

async fn init_config(config_dir: PathBuf) -> ConfigToml {
    if !config_dir.exists() {
        fs::create_dir(config_dir.clone()).await.unwrap();
    }

    let config_file = config_dir.join("settings.toml");

    if !config_file.exists() {
        let config_new = ConfigToml {
            client_id: String::new(),
            client_secret: String::new(),
        };

        let mut file = fs::File::create(config_file.clone()).await.unwrap();

        file.write_all(toml::to_string(&config_new).unwrap().as_bytes()).await.unwrap();

        println!("Please add the client_id and client_secret to {:?}", config_file);

        std::process::exit(1);
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
    match spotify_oauth.get_cached_token().await {
        Some(token_info) => Some(token_info),
        None => match redirect_uri_web_server(spotify_oauth, port) {
            Ok(mut url) => process_token(spotify_oauth, &mut url).await,
            Err(()) => {
                println!("Starting webserver failed. Continuing with manual authentication");
                request_token(spotify_oauth);
                println!("Enter the URL you were redirected to: ");
                let mut input = String::new();
                match io::stdin().read_line(&mut input) {
                    Ok(_) => process_token(spotify_oauth, &mut input).await,
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
