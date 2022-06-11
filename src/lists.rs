use crate::*;
use serde_derive::{Deserialize, Serialize};
use uuid::Uuid;
use rand::prelude::SliceRandom;
use rand::rngs::SmallRng;
use rand::SeedableRng;

const POSSIBLE_CODE_CHARS: &'static [char] = &[
    '2', '3', '4', '6', '7', '9', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'P', 'A', 'D', 'F', 'G', 'H',
    'X',
];
const CODE_LENGTH: u8 = 7;


#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GroceryLists {
    lists: Vec<GroceryList>,
}

impl GroceryLists {
    pub fn new() -> Self {
        GroceryLists {
            lists: Vec::new(),
        }
    }

    pub fn check_share_code(&self, code: &str) -> Option<&GroceryList> {
        self.lists.iter().find(|list| list.share_code == code)
    }

    pub fn get_by_uuid(&self, uuid: String) -> Option<&GroceryList> {
        self.lists.iter().find(|list| list.uuid == *uuid)
    }

    pub fn update_list(&mut self, list: GroceryList) {
        let index = self.lists.iter().position(|l| l.uuid == list.uuid);

        if index.is_none() {
            self.lists.push(list);
        } else {
            self.lists[index.unwrap()] = list;
        }
    }
}


#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GroceryList {
    uuid: String,
    share_code: String,
    name: String,
    items: Vec<GroceryListItem>,
    last_updated: u64,
}


impl GroceryList {
    pub async fn new(name: String) -> Self {
        let uuid = Uuid::new_v4().to_string();
        let share_code = GroceryList::generate_share_code().await;
        let items = Vec::new();

        GroceryList {
            uuid,
            share_code,
            name,
            items,
            last_updated: 0,
        }
    }

    pub async fn generate_share_code() -> String {
        let lists = MEMORY_DATABASE.lock().await.lists.clone();

        let mut small_rng = SmallRng::from_entropy();

        loop {
            let mut attempt: Vec<char> = Vec::new();
            for _ in 0..CODE_LENGTH {
                attempt.push(POSSIBLE_CODE_CHARS.choose(&mut small_rng).unwrap().clone());
            }
    
            let attempt = attempt.iter().collect::<String>();
    
            if lists.check_share_code(&attempt).is_some() {
                continue;
            } else {
                return attempt;
            }
        }
    }

    pub fn add_set_item(&mut self, item: GroceryListItem) {
        // Check if item already exists by uuid
        let found = self.items.iter().position(|list_item| list_item.uuid == item.uuid);


        if found.is_some() {
            let index = found.unwrap();
            self.items[index] = item;
        } else {
            self.items.push(item);
        }
    }

    pub fn remove_item(&mut self, uuid: String) {
        let index = self.items.iter().position(|list_item| list_item.uuid == uuid);

        if index.is_some() {
            self.items.remove(index.unwrap());
        }
    }

    pub fn get_uuid(&self) -> String {
        self.uuid.clone()
    }

    pub fn get_last_updated(&self) -> u64 {
        self.last_updated
    }
}


#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GroceryListItem {
    uuid: String,
    name: String,
    quantity: String,
    crossed_off: bool,
}

impl GroceryListItem {
    pub fn new_blank() -> Self {
        GroceryListItem {
            uuid: Uuid::new_v4().to_string(),
            name: "".to_string(),
            quantity: "".to_string(),
            crossed_off: false,
        }
    }

    pub fn get_uuid(&self) -> String {
        self.uuid.clone()
    }

}