#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use rspotify::Config;
use rspotify::prelude::{OAuthClient, BaseClient};
use rspotify::{
    model::album::FullAlbum, model::context::CurrentlyPlayingContext, scopes,
    AuthCodeSpotify, Credentials, OAuth,
};
use serde::{Deserialize, Serialize};
use std::fs;

use rspotify::model::{
    AdditionalType, AlbumId,
};
use std::{
    io::Write,
    path::PathBuf,
};
use env_logger::Env;

const CALLBACK_URL: &str = "http://localhost:3001/callback";

const SCOPE: [&str; 2] = ["user-read-currently-playing", "user-modify-playback-state"];

#[derive(Deserialize, Serialize)]
struct ConfigToml {
    client_id: String,
    client_secret: String,
}

struct TauriState {
    spotify_client: AuthCodeSpotify,
    // expiry: i64,
}

#[derive(Serialize)]
struct CredentialsSerial {
    token: String,
    expiry: i64,
}

// #[tauri::command]
// async fn get_auth_token(state: tauri::State<TauriState>) -> CredentialsSerial {
//     let token_temp = state.spotify_client.clone()
//         .token.lock().await.unwrap().clone().unwrap();
//
//     let token_perm = token_temp.clone();
//
//     CredentialsSerial {
//         token: token_perm.access_token.to_string(),
//         expiry: token_perm.expires_at.unwrap().timestamp(),
//     }
// }

#[tauri::command]
async fn get_album(
    state: tauri::State<'_, TauriState>,
    album_id: String,
) -> Result<FullAlbum, String> {
    let album_typed = AlbumId::from_id(album_id).unwrap();

    match state.spotify_client.album(album_typed, None).await {
        Ok(album) => Ok(album),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
async fn get_currently_playing(
    state: tauri::State<'_, TauriState>,
) -> Result<Option<CurrentlyPlayingContext>, String> {
    let additional_types = [AdditionalType::Track];

    match state
        .spotify_client
        .current_playing(None, Some(&additional_types))
        .await
    {
        Ok(currently_playing) => Ok(currently_playing),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
async fn start_playback(state: tauri::State<'_, TauriState>) -> Result<(), String> {
    match state.spotify_client.resume_playback(None, None).await {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
async fn pause_playback(state: tauri::State<'_, TauriState>) -> Result<(), String> {
    match state.spotify_client.pause_playback(None).await {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
async fn next_track(state: tauri::State<'_, TauriState>) -> Result<(), String> {
    match state.spotify_client.next_track(None).await {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

#[tauri::command]
async fn previous_track(state: tauri::State<'_, TauriState>) -> Result<(), String> {
    match state.spotify_client.previous_track(None).await {
        Ok(_) => Ok(()),
        Err(err) => Err(err.to_string()),
    }
}

#[tokio::main]
async fn main() {
    let env = Env::default()
        .filter_or("MY_LOG_LEVEL", "warn")
        .write_style_or("MY_LOG_STYLE", "always");

    env_logger::init_from_env(env);

    let config_dir = dirs::preference_dir().unwrap().join("spotifalc");
    let cache_dir = dirs::cache_dir().unwrap().join("spotifalc");

    let (config_toml, cache_file) = init_config(config_dir.clone(), cache_dir.clone());

    let creds = Credentials::new(&config_toml.client_id, &config_toml.client_secret);

    let oauth = OAuth {
        redirect_uri: CALLBACK_URL.to_string(),
        scopes: scopes!(&SCOPE.join(" ")),
        ..Default::default()
    };

    let spotify_config = Config {
        cache_path: cache_file,
        token_cached: true,
        token_refreshing: true,
        ..Default::default()
    };

    let spotify_client = AuthCodeSpotify::with_config(creds, oauth, spotify_config);

    log::info!("Config path: {}", config_dir.to_str().unwrap());
    log::info!("Cache path: {}", spotify_client.config.cache_path.to_str().unwrap());

    let url = spotify_client.get_authorize_url(false).unwrap();

    spotify_client.refresh_token().await.unwrap();
    
    spotify_client.prompt_for_token(&url).await.unwrap();
    
    spotify_client.write_token_cache().await.unwrap();

    // let mut oauth = SpotifyOAuth::default()
    //     .client_id(&config_toml.client_id)
    //     .client_secret(&config_toml.client_secret)
    //     .redirect_uri(CALLBACK_URL)
    //     .cache_path(config_dir.join(".spotify_token_cache.json"))
    //     .scope(&SCOPE.join(" "))
    //     .build();

    // let server_port = 3001_u16;

    // let spotify_client: Spotify;
    // let expiry: i64;

    // match get_token_auto(&mut oauth, server_port).await {
    //     Some(token_info) => {
    //         let (spotify, token_expiry) = get_spotify(token_info);
    //
    //         spotify_client = spotify;
    //         expiry = token_expiry;
    //     }
    //     _ => panic!("Auth Failed"),
    // }

    tauri::Builder::default()
        .manage(TauriState {
            spotify_client, /* expiry */
        })
        .invoke_handler(tauri::generate_handler![
            get_album,
            get_currently_playing,
            start_playback,
            pause_playback,
            next_track,
            previous_track
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn init_config(config_dir: PathBuf, cache_dir: PathBuf) -> (ConfigToml, PathBuf) {
    if !config_dir.exists() {
        fs::create_dir(config_dir.clone()).unwrap();
    }
    if !cache_dir.exists() {
        fs::create_dir(cache_dir.clone()).unwrap()
    }

    let config_file = config_dir.join("settings.toml");
    let cache_file = cache_dir.join("cache");

    if !config_file.exists() {
        let config_new = ConfigToml {
            client_id: String::new(),
            client_secret: String::new(),
        };

        let mut file = fs::File::create(config_file.clone()).unwrap();

        file.write_all(toml::to_string(&config_new).unwrap().as_bytes())
            .unwrap();

        println!(
            "Please add the client_id and client_secret to {:?}",
            config_file
        );

        std::process::exit(1);
    }

    if !cache_file.exists() {
        fs::File::create(cache_file.clone()).unwrap();
    }
    (
        toml::from_str(&fs::read_to_string(config_file).unwrap_or(String::from(""))).unwrap(),
        cache_file
    )
}

// Code Mostly Copied from https://github.com/Rigellute/spotify-tui/blob/master/src
// fn get_spotify(token_info: TokenInfo) -> (Spotify, i64) {
//     let token_expiry = {
//         if let Some(expires_at) = token_info.expires_at {
//             SystemTime::UNIX_EPOCH
//                 + Duration::from_secs(expires_at as u64)
//                 // Set 10 seconds early
//                 - Duration::from_secs(10)
//         } else {
//             SystemTime::now()
//         }
//     };
//
//     let token_expiry = OffsetDateTime::from(token_expiry).unix_timestamp();
//
//     let client_credential = SpotifyClientCredentials::default()
//         .token_info(token_info)
//         .build();
//
//     let spotify = Spotify::default()
//         .client_credentials_manager(client_credential)
//         .build();
//
//     (spotify, token_expiry)
// }
//
// async fn get_token_auto(spotify_oauth: &mut SpotifyOAuth, port: u16) -> Option<TokenInfo> {
//     match spotify_oauth.get_cached_token().await {
//         Some(token_info) => Some(token_info),
//         None => match redirect_uri_web_server(spotify_oauth, port) {
//             Ok(mut url) => process_token(spotify_oauth, &mut url).await,
//             Err(()) => {
//                 println!("Starting webserver failed. Continuing with manual authentication");
//                 request_token(spotify_oauth);
//                 println!("Enter the URL you were redirected to: ");
//                 let mut input = String::new();
//                 match io::stdin().read_line(&mut input) {
//                     Ok(_) => process_token(spotify_oauth, &mut input).await,
//                     Err(_) => None,
//                 }
//             }
//         },
//     }
// }
//
// fn redirect_uri_web_server(spotify_oauth: &mut SpotifyOAuth, port: u16) -> Result<String, ()> {
//     let listener = TcpListener::bind(format!("127.0.0.1:{}", port));
//
//     match listener {
//         Ok(listener) => {
//             request_token(spotify_oauth);
//
//             for stream in listener.incoming() {
//                 match stream {
//                     Ok(stream) => {
//                         if let Some(url) = handle_connection(stream) {
//                             return Ok(url);
//                         }
//                     }
//                     Err(e) => {
//                         println!("Error: {}", e);
//                     }
//                 };
//             }
//         }
//         Err(e) => {
//             println!("Error: {}", e);
//         }
//     }
//
//     Err(())
// }
//
// fn handle_connection(mut stream: TcpStream) -> Option<String> {
//     // The request will be quite large (> 512) so just assign plenty just in case
//     let mut buffer = [0; 1000];
//     let _ = stream.read(&mut buffer).unwrap();
//
//     // convert buffer into string and 'parse' the URL
//     match String::from_utf8(buffer.to_vec()) {
//         Ok(request) => {
//             let split: Vec<&str> = request.split_whitespace().collect();
//
//             if split.len() > 1 {
//                 respond_with_success(stream);
//                 return Some(split[1].to_string());
//             }
//
//             respond_with_error("Malformed request".to_string(), stream);
//         }
//         Err(e) => {
//             respond_with_error(format!("Invalid UTF-8 sequence: {}", e), stream);
//         }
//     };
//
//     None
// }
//
// fn respond_with_success(mut stream: TcpStream) {
//     let contents = include_str!("redirect.html");
//
//     let response = format!("HTTP/1.1 200 OK\r\n\r\n{}", contents);
//
//     stream.write_all(response.as_bytes()).unwrap();
//     stream.flush().unwrap();
// }
//
// fn respond_with_error(error_message: String, mut stream: TcpStream) {
//     println!("Error: {}", error_message);
//     let response = format!(
//         "HTTP/1.1 400 Bad Request\r\n\r\n400 - Bad Request - {}",
//         error_message
//     );
//
//     stream.write_all(response.as_bytes()).unwrap();
//     stream.flush().unwrap();
// }
// To here
