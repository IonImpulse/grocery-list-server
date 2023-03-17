use crate::*;
use actix_web::error::*;

#[post("/api/v1/list/create/{name}")]
pub async fn create_new_list(name: web::Path<String>) -> Result<HttpResponse, Error> {
    let list = GroceryList::new(name.into_inner()).await;

    MEMORY_DATABASE.lock().await.lists.update_list(list.clone());

    save_database().await?;

    Ok(HttpResponse::Ok().json(list))    
}

#[get("/api/v1/list/share_code/{share_code}")]
pub async fn get_list_by_share_code(share_code: web::Path<String>) -> Result<HttpResponse, Error> {
    let lock = MEMORY_DATABASE.lock().await;
    
    let list = lock.lists.check_share_code(&share_code.into_inner());

    if list.is_none() {
        return Err(ErrorBadRequest("List not found"));
    }

    Ok(HttpResponse::Ok().json(list.unwrap()))
}

#[get("/api/v1/list/{list_uuid}")]
pub async fn get_list(list_uuid: web::Path<String>) -> Result<HttpResponse, Error> {
    let lock = MEMORY_DATABASE.lock().await;
    let list = lock.lists.get_by_uuid(list_uuid.into_inner());

    if list.is_none() {
        return Ok(HttpResponse::NotFound().finish());
    }

    Ok(HttpResponse::Ok().json(list))
   
}

#[get("/api/v1/list/last_updated/{list_uuid}")]
pub async fn get_list_last_updated(list_uuid: web::Path<String>) -> Result<HttpResponse, Error> {
    let lock = MEMORY_DATABASE.lock().await;
    let list = lock.lists.get_by_uuid(list_uuid.into_inner());

    if list.is_none() {
        return Ok(HttpResponse::NotFound().finish());
    }

    Ok(HttpResponse::Ok().json(list.unwrap().get_last_updated()))
   
}

#[post("/api/v1/list/update/{list_uuid}")]
pub async fn update_list(list_uuid: web::Path<String>, list: web::Json<GroceryList>) -> Result<HttpResponse, Error> {
    let mut lock = MEMORY_DATABASE.lock().await;

    let is_list = lock.lists.get_by_uuid(list_uuid.into_inner());

    if is_list.is_none() {
        return Err(ErrorBadRequest("List not found"));
    }

    lock.lists.update_list(list.into_inner());

    drop(lock);

    save_database().await?;

    Ok(HttpResponse::Ok().finish())
}

#[post("/api/v1/list/item/create/{list_uuid}")]
pub async fn create_item(list_uuid: web::Path<String>) -> Result<HttpResponse, Error> {
    let mut lock = MEMORY_DATABASE.lock().await;

    let is_list = lock.lists.get_by_uuid(list_uuid.into_inner());

    if is_list.is_none() {
        return Err(ErrorBadRequest("List not found"));
    }

    let mut list = is_list.unwrap().clone();

    let item = GroceryListItem::new_blank();

    list.add_set_item(item.clone());

    lock.lists.update_list(list);

    drop(lock);

    save_database().await?;

    Ok(HttpResponse::Ok().json(item))
}
