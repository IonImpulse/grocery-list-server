use crate::*;
use ::serde::{Deserialize, Serialize};
use actix_web::{error::*, *};
use openssl::stack::Stack;

#[get("/v1/list/{list_id}")]
pub async fn get_list(list_id: web::Path<i32>) -> Result<HttpResponse, Error> {
    let list = db.lock().await.lists.get(list_id.into_inner())?;

    if list.is_none() {
        return Ok(HttpResponse::NotFound().finish());
    }

    Ok(HttpResponse::Ok().json(list))
   
}