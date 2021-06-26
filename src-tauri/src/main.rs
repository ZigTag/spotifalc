#![cfg_attr(
all(not(debug_assertions), target_os = "windows"),
windows_subsystem = "windows"
)]

use rspotify::{
    oauth2::SpotifyOAuth,
    util::{request_token, process_token},
    oauth2::{TokenInfo, SpotifyClientCredentials},
    client::Spotify
};
use tokio::{
    fs,
    time::Duration
};
use serde::{Deserialize, Serialize};

use std::{
    net::{TcpListener, TcpStream},
    path::PathBuf,
    io,
    time::SystemTime
};
use std::io::{Read, Write};
use time::OffsetDateTime;

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
    credentials: TokenInfo,
    expiry: i64,
}

#[derive(Serialize)]
struct Credentials {
    token: String,
    expiry: i64,
}

#[tauri::command]
fn get_token(state: tauri::State<TauriState>) -> Credentials {
    Credentials { token: state.credentials.access_token.clone(), expiry: state.expiry}
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
    let expiry: SystemTime;

    match get_token_auto(&mut oauth, server_port).await {
        Some(token_info) => {
            let (spotify, token_expiry) = get_spotify(token_info);

            spotify_client = spotify;
            expiry = token_expiry;
        }
        _ => panic!("Auth Failed"),
    }

    let credentials = spotify_client
        .client_credentials_manager.unwrap()
        .token_info.unwrap();

    let expiry = OffsetDateTime::from(expiry);

    tauri::Builder::default()
        .manage(TauriState { credentials, expiry: expiry.unix_timestamp() })
        .invoke_handler(tauri::generate_handler![get_token])
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
fn get_spotify(token_info: TokenInfo) -> (Spotify, SystemTime) {
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
