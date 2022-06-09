use std::{fs::OpenOptions, io::Read, sync::Arc};

use serde_derive::{Deserialize, Serialize};
use lazy_static::lazy_static;

mod lists;
mod routes;

use lists::*;
use routes::*;

pub struct MemDatabase {
    lists: GroceryLists,

}

// Debug vs release address
#[cfg(debug_assertions)]
const ADDRESS: &str = "127.0.0.1:8080";
#[cfg(not(debug_assertions))]
const ADDRESS: &str = "0.0.0.0:8080";

lazy_static! {
    pub static ref MEMORY_DATABASE: Arc<Mutex<MemDatabase>> =
        Arc::new(Mutex::new(MemDatabase::new()));
}

const DB_NAME: &str = "db.json";

fn from_slice_lenient<'a, T: ::serde::Deserialize<'a>>(
    v: &'a [u8],
) -> Result<T, serde_json::Error> {
    let mut cur = std::io::Cursor::new(v);
    let mut de = serde_json::Deserializer::new(serde_json::de::IoRead::new(&mut cur));
    ::serde::Deserialize::deserialize(&mut de)
    // note the lack of: de.end()
}

pub fn load_database() -> Result<MemDatabase, Error> {
    let file = OpenOptions::new().read(true).open(DB_NAME);

    if file.is_err() {
        return Ok(MemDatabase::default());
    } else {
        let mut file = file.unwrap();

        let mut data = String::new();
        file.read_to_string(&mut data)?;
        let data: Data = from_slice_lenient(&data.as_bytes()).unwrap();
        Ok(data)
    }
}

pub async fn save_database() -> Result<(), Error> {
    let mut file = OpenOptions::new().write(true).create(true).open(DB_NAME)?;
    let data = MEMORY_DATABASE.lock().await;
    
    // Get data struct from mutex guard
    let data = data.deref();

    let data = serde_json::to_string_pretty(&data)?;
    file.write_all(data.as_bytes())?;
    Ok(())
}

/// Main function to run both actix_web server and API update loop
/// API update loops lives inside a tokio thread while the actix_web
/// server is run in the main thread and blocks until done.
async fn async_main() -> std::io::Result<()> {
    // Load all databases
    let data = load_database().unwrap();
    let mut lock = MEMORY_DATABASE.lock().await;
    *lock = data;
    drop(lock);

    info!("Database(s) loaded!");

    spawn(async move {
        let mut interval = time::interval(Duration::from_secs(60));
        loop {
            interval.tick().await;
            update_loop().await;
            save_database().await;
        }
    });

    // Create builder without ssl
    HttpServer::new(move || {
        let cors = Cors::default()
            .allow_any_origin()
            .allow_any_header()
            .allow_any_method()
            .send_wildcard()
            .max_age(3600);

        App::new()
            .wrap(actix_web::middleware::Logger::default())
            .wrap(actix_web::middleware::Compress::default())
            .wrap(cors)

    })
    .bind(ADDRESS)?
    .run()
    .await
}
fn main() {
    std::env::set_var("RUST_LOG", "info, actix_web=trace");
    env_logger::init();

    ctrlc::set_handler(move || {
        info!("Exiting...");
        thread::sleep(Duration::from_secs(2));
        exit(0);
    })
    .expect("Error setting Ctrl-C handler");

    let _ = actix_web::rt::System::with_tokio_rt(|| {
        tokio::runtime::Builder::new_multi_thread()
            .enable_all()
            .worker_threads(1)
            .thread_name("main-tokio")
            .build()
            .unwrap()
    })
    .block_on(async_main());
}